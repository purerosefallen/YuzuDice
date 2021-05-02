import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppLogger } from './app.logger';
import { Brackets, Connection, In } from 'typeorm';
import { InjectConnection } from '@nestjs/typeorm';
import { User } from './entities/User';
import { Group } from './entities/Group';
import { BotService } from './bot/bot.service';
import { UserPermissions } from './constants';
import { diceConfig, DiceConfig } from './config';
import _ from 'lodash';
import { TextTemplate } from './entities/TextTemplate';
import { GroupTemplate } from './entities/GroupTemplate';
import { DefaultTemplate } from './entities/DefaultTemplate';
import { defaultTemplateMap } from './DefaultTemplate';
import Mustache from 'mustache';
import { GroupUserProfile } from './entities/GroupUserProfile';
import moment from 'moment';

export interface CommonResult {
  name: string;
  reason?: string;
  result?: number;
}
export interface DiceParam {
  count: number;
  size: number;
}

export interface RollResult extends CommonResult, DiceParam {
  formula?: string;
  results?: number[];
}

export interface RcResult extends CommonResult {
  maximumValue: number;
  success?: boolean;
}

export interface KoishiSessionLike {
  userId?: string;
  username?: string;
  groupId?: string;
}

export interface DatabaseUserData {
  banReason: string;
  user?: User;
  group?: Group;
  profile?: GroupUserProfile;
}

@Injectable()
export class AppService {
  config: DiceConfig;
  constructor(
    @InjectConnection('app')
    private db: Connection,
    private log: AppLogger,
    private botService: BotService,
  ) {
    this.log.setContext('app');
    this.config = diceConfig();
  }

  static rollProcess(rollResult: RollResult) {
    rollResult.results = _.range(rollResult.count).map(
      () => Math.floor(Math.random() * rollResult.size) + 1,
    );
    rollResult.result = _.sum(rollResult.results);
    rollResult.formula =
      rollResult.count > 1
        ? `${rollResult.results.join('+')}=${rollResult.result}`
        : null;
  }

  async findOrCreateGroupUserProfile(user: User, group: Group) {
    const query = this.db
      .getRepository(GroupUserProfile)
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .innerJoinAndSelect('profile.group', 'group')
      .where('user.id = :userId', { userId: user.id })
      .andWhere('group.id = :groupId', { groupId: group.id });
    let profile = await query.getOne();
    if (!profile) {
      profile = new GroupUserProfile();
      profile.user = user;
      profile.group = group;
      profile.name = user.name;
      return await this.db.getRepository(GroupUserProfile).save(profile);
    }
    return profile;
  }

  async checkJoinGroup(userData: KoishiSessionLike) {
    this.log.log(
      `Bot being invited to ${userData.groupId} by ${userData.username} ${userData.userId}`,
    );
    const { user, group, profile, banReason } = await this.getDatabaseUserData(
      userData,
    );
    if (banReason) {
      this.log.log(`Bot rejected because of: ${banReason}.`);
      return false;
    }
    if (group && group.allowedToJoin) {
      this.log.log(`Bot accepted for being allowed.`);
      return true;
    }
    if (user.checkPermissions(UserPermissions.inviteBot)) {
      this.log.log(`Bot accepted for admin.`);
      return true;
    }

    this.log.log(`Bot ignored.`);
    return undefined;
  }

  private logReturn(msg: string) {
    this.log.log(`msg: ${msg}`);
    return msg;
  }

  private async getTemplateForGroup(key: string, groupId: string) {
    return await this.db
      .getRepository(GroupTemplate)
      .createQueryBuilder('template')
      .where('template.key = :key', { key })
      .andWhere('template.groupId = :groupId', { groupId })
      .getOne();
  }

  private async getTemplate(key: string, groupId?: string) {
    let template: TextTemplate;
    if (groupId) {
      template = await this.getTemplateForGroup(key, groupId);
      if (template) {
        return template;
      }
    }
    template = await this.db
      .getRepository(DefaultTemplate)
      .findOne({ where: { key } });
    if (template) {
      return template;
    }
    return null;
  }

  async renderTemplate(key: string, data: any, groupId?: string) {
    const template = await this.getTemplate(key, groupId);
    if (template) {
      return template.render(data);
    }
    return Mustache.render(defaultTemplateMap.get(key), data) || key;
  }

  async isUserHasPermissions(userId: string, username: string, perm: number) {
    const user = await this.botService.findOrCreateUser(userId, username);
    if (user.banReason) {
      return false;
    }
    return user.checkPermissions(perm);
  }

  private async getDatabaseUserData(
    userData: KoishiSessionLike,
  ): Promise<DatabaseUserData> {
    let user: User = null;
    if (userData.userId) {
      user = await this.botService.findOrCreateUser(
        userData.userId,
        userData.username,
      );
      if (user.banReason) {
        return { banReason: user.banReason };
      }
    }
    let group: Group = null;
    if (userData.groupId) {
      group = await this.botService.findOrCreateGroup(userData.groupId);
      if (group.banReason) {
        return { banReason: group.banReason };
      }
    }
    let profile: GroupUserProfile = null;
    if (user && group) {
      profile = await this.findOrCreateGroupUserProfile(user, group);
      if (profile.banReason) {
        return { banReason: profile.banReason };
      }
    }
    return { user, group, profile, banReason: null };
  }

  parseDiceParam(param: string): DiceParam {
    if (!param) {
      return null;
    }
    let match = param.match(/^d?(\d+)$/);
    if (match) {
      return {
        size: parseInt(match[1]),
        count: 1,
      };
    }
    match = param.match(/^(\d+)d(\d+)$/);
    if (match) {
      return {
        size: parseInt(match[2]),
        count: parseInt(match[1]),
      };
    }
    return null;
  }

  async rollDice(
    rollResult: RollResult,
    userData: KoishiSessionLike,
  ): Promise<string> {
    const { user, group, profile, banReason } = await this.getDatabaseUserData(
      userData,
    );
    if (banReason) {
      return await this.renderTemplate('bad_user', { reason: banReason });
    }
    if (rollResult.count > this.config.maxDiceCount) {
      return await this.renderTemplate(
        'too_much_count',
        rollResult,
        userData.groupId,
      );
    }
    if (rollResult.size > this.config.maxDiceSize) {
      return await this.renderTemplate(
        'too_much_size',
        rollResult,
        userData.groupId,
      );
    }
    rollResult.name = profile
      ? profile.getDisplayUsername(userData.username)
      : user.name;
    AppService.rollProcess(rollResult);
    return await this.renderTemplate('roll', rollResult, userData.groupId);
  }

  async rcCheck(
    userData: KoishiSessionLike,
    maximumValue: number,
    reason: string,
  ): Promise<string> {
    const { user, group, profile, banReason } = await this.getDatabaseUserData(
      userData,
    );
    if (banReason) {
      return await this.renderTemplate('bad_user', { reason: banReason });
    }
    if (!maximumValue || maximumValue < 0 || maximumValue > 100) {
      return await this.renderTemplate('bad_params', {}, userData.groupId);
    }
    const result = Math.floor(Math.random() * 101);
    const rcResult: RcResult = {
      name: profile ? profile.getDisplayUsername(userData.username) : user.name,
      reason,
      maximumValue,
      result,
      success: result <= maximumValue,
    };
    return await this.renderTemplate('rc', rcResult, userData.groupId);
  }
  async getGroupTemplate(userData: KoishiSessionLike, key: string) {
    const { user, group, profile, banReason } = await this.getDatabaseUserData(
      userData,
    );
    if (banReason) {
      return await this.renderTemplate('bad_user', { reason: banReason });
    }
    const template = await this.getTemplate(key, userData.groupId);
    if (template) {
      return template.display();
    }
    return `${key} => ${defaultTemplateMap.get(key) || '没有这个模板'}`;
  }
  async getAllGroupTemplates(userData: KoishiSessionLike) {
    const { user, group, profile, banReason } = await this.getDatabaseUserData(
      userData,
    );
    if (banReason) {
      return await this.renderTemplate('bad_user', { reason: banReason });
    }
    const notSetTemplateNames = Array.from(defaultTemplateMap.keys()).filter(
      (tName) => !group.templates.find((t) => t.key === tName),
    );
    return `本群设置过的自定义模板有:\n${
      group.templates
        ? group.templates.map((t) => t.display()).join('\n')
        : '无'
    }\n\n还没有设置的自定义模板有:\n${notSetTemplateNames.join('\n')}`;
  }
  async setGroupTemplate(
    userData: KoishiSessionLike,
    key: string,
    content: string,
  ) {
    const { user, group, profile, banReason } = await this.getDatabaseUserData(
      userData,
    );
    if (banReason) {
      return await this.renderTemplate('bad_user', { reason: banReason });
    }
    if (!defaultTemplateMap.has(key)) {
      return `模板 ${key} 不存在。`;
    }
    let template = await this.getTemplateForGroup(key, userData.groupId);
    if (!template) {
      template = new GroupTemplate();
      template.key = key;
      template.group = group;
    }
    template.changeContent(content);
    await this.db.getRepository(GroupTemplate).save(template);
    return `成功设置自定义模板: ${template.display()}`;
  }
  async clearGroupTemplate(userData: KoishiSessionLike, key: string) {
    const { user, group, profile, banReason } = await this.getDatabaseUserData(
      userData,
    );
    if (banReason) {
      return await this.renderTemplate('bad_user', { reason: banReason });
    }
    const template = await this.getTemplateForGroup(key, userData.groupId);
    if (!template) {
      return `自定义模板 ${key} 没有设置过。`;
    }
    await this.db.getRepository(GroupTemplate).delete(template);
    return `成功清除模板 ${key}`;
  }
  async getGlobalTemplate(userData: KoishiSessionLike, key: string) {
    const { user, banReason } = await this.getDatabaseUserData(userData);
    if (banReason) {
      return await this.renderTemplate('bad_user', { reason: banReason });
    }
    const template = await this.getTemplate(key);
    if (template) {
      return template.display();
    }
    return `${key} => ${defaultTemplateMap.get(key) || '没有这个模板'}`;
  }
  async getAllGlobalTemplates(userData: KoishiSessionLike) {
    const { user, banReason } = await this.getDatabaseUserData(userData);
    if (banReason) {
      return await this.renderTemplate('bad_user', { reason: banReason });
    }
    const allTemplatesList = Array.from(defaultTemplateMap.keys());
    const templates = await this.db
      .getRepository(DefaultTemplate)
      .find({ where: { key: In(allTemplatesList) } });
    const notSetTemplateNames = Array.from(defaultTemplateMap.keys()).filter(
      (tName) => !templates.find((t) => t.key === tName),
    );
    return `设置过的默认模板有:\n${templates
      .map((t) => t.display())
      .join('\n')}\n\n还没有设置的默认模板有:\n${notSetTemplateNames.join(
      '\n',
    )}`;
  }
  async setGlobalTemplate(
    userData: KoishiSessionLike,
    key: string,
    content: string,
  ) {
    const { user, banReason } = await this.getDatabaseUserData(userData);
    if (banReason) {
      return await this.renderTemplate('bad_user', { reason: banReason });
    }
    if (!defaultTemplateMap.has(key)) {
      return `模板 ${key} 不存在。`;
    }
    let template = await this.getTemplateForGroup(key, userData.groupId);
    if (!template) {
      template = new GroupTemplate();
      template.key = key;
    }
    template.changeContent(content);
    await this.db.getRepository(DefaultTemplate).save(template);
    return `成功设置默认模板: ${template.display()}`;
  }
  async clearGlobalTemplate(userData: KoishiSessionLike, key: string) {
    const { user, banReason } = await this.getDatabaseUserData(userData);
    if (banReason) {
      return await this.renderTemplate('bad_user', { reason: banReason });
    }
    const template = await this.db
      .getRepository(DefaultTemplate)
      .findOne({ where: { key } });
    if (!template) {
      return `默认模板 ${key} 没有设置过。`;
    }
    await this.db.getRepository(DefaultTemplate).delete(template);
    return `成功清除模板 ${key}`;
  }
  async setGroupUsername(userData: KoishiSessionLike, name: string) {
    const { user, group, profile, banReason } = await this.getDatabaseUserData(
      userData,
    );
    if (banReason) {
      return await this.renderTemplate('bad_user', { reason: banReason });
    }
    if (!name || name.length > 32) {
      return await this.renderTemplate('bad_name', { name }, userData.groupId);
    }
    profile.name = name;
    await this.db.getRepository(GroupUserProfile).save(profile);
    return await this.renderTemplate(
      'group_name_changed',
      { name },
      userData.groupId,
    );
  }
  async setGlobalUsername(userData: KoishiSessionLike, name: string) {
    const { user, banReason } = await this.getDatabaseUserData(userData);
    if (banReason) {
      return await this.renderTemplate('bad_user', { reason: banReason });
    }
    if (!name || name.length > 32) {
      return await this.renderTemplate('bad_name', { name });
    }
    user.name = name;
    await this.db.getRepository(User).save(user);
    return await this.renderTemplate('global_name_changed', { name });
  }
  async getGroupUserProfile(userData: KoishiSessionLike, field?: string) {
    const { user, group, profile, banReason } = await this.getDatabaseUserData(
      userData,
    );
    if (banReason) {
      return await this.renderTemplate('bad_user', { reason: banReason });
    }
    let targetProfiles = [profile];
    if (field) {
      targetProfiles = await this.db
        .getRepository(GroupUserProfile)
        .createQueryBuilder('profile')
        .innerJoinAndSelect('profile.user', 'user')
        .innerJoinAndSelect('profile.group', 'group')
        .where('group.id = :groupId')
        .andWhere(
          new Brackets((qb) => {
            qb.where('profile.name = :field')
              .orWhere('user.id = :field')
              .orWhere('user.name = :field');
          }),
        )
        .setParameters({ groupId: group.id, field })
        .getMany();
      if (!targetProfiles) {
        return await this.renderTemplate(
          'user_not_found',
          { field },
          userData.groupId,
        );
      }
    }
    return (
      await Promise.all(
        targetProfiles.map((targetProfile) =>
          this.renderTemplate(
            'group_user_profile',
            targetProfile.toDscriptionObject(),
            userData.groupId,
          ),
        ),
      )
    ).join('\n----------\n');
  }
  async getGlobalUserProfile(userData: KoishiSessionLike, field?: string) {
    const { user, banReason } = await this.getDatabaseUserData(userData);
    let targetUsers = [user];
    if (field) {
      if (banReason) {
        return await this.renderTemplate('bad_user', { reason: banReason });
      }
      targetUsers = await this.db
        .getRepository(User)
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.groupProfiles', 'profile')
        .leftJoinAndSelect('profile.group', 'group')
        .where('user.id = :field')
        .orWhere('user.name = :field')
        .setParameters({ field })
        .getMany();
      if (!targetUsers) {
        return await this.renderTemplate(
          'user_not_found',
          { field },
          userData.groupId,
        );
      }
    }
    return (
      await Promise.all(
        targetUsers.map((targetUser) =>
          this.renderTemplate(
            'global_user_profile',
            targetUser.toDescriptionObject(),
            userData.groupId,
          ),
        ),
      )
    ).join('\n----------\n');
  }
  async getWelcomeMessage(userData: KoishiSessionLike) {
    const { user, group, profile, banReason } = await this.getDatabaseUserData(
      userData,
    );
    if (banReason) {
      return await this.renderTemplate('bad_user', { reason: banReason });
    }
    if (group.welcomeMessage) {
      return await this.renderTemplate(
        'welcome_message_demo',
        { message: group.welcomeMessage, demo: group.welcomeUser(user) },
        userData.groupId,
      );
    } else {
      return await this.renderTemplate(
        'welcome_message_not_found',
        {},
        userData.groupId,
      );
    }
  }
  async setWelcomeMessage(userData: KoishiSessionLike, message: string) {
    const { user, group, profile, banReason } = await this.getDatabaseUserData(
      userData,
    );
    if (banReason) {
      return await this.renderTemplate('bad_user', { reason: banReason });
    }
    group.setWelcomeMessage(message);
    await this.db.getRepository(Group).save(group);
    return await this.renderTemplate(
      'welcome_message_set',
      { message },
      userData.groupId,
    );
  }
  async handleWelcome(userData: KoishiSessionLike) {
    const { user, group, profile, banReason } = await this.getDatabaseUserData(
      userData,
    );
    if (banReason) {
      return null;
    }
    return group.welcomeUser(user);
  }
  async setGroupAllow(
    userData: KoishiSessionLike,
    groupId: string,
    value: number,
  ) {
    const { user, banReason } = await this.getDatabaseUserData(userData);
    if (banReason) {
      return await this.renderTemplate('bad_user', { reason: banReason });
    }
    const group = await this.botService.findOrCreateGroup(groupId);
    group.allowedToJoin = value;
    await this.db.getRepository(Group).save(group);
    return await this.renderTemplate('group_allow_set', { groupId, value });
  }
  async banForKicked(groupId: string, operatorId: string) {
    if (!this.config.killSwitch) {
      return false;
    }
    const group = await this.botService.findOrCreateGroup(groupId);
    const operator = await this.botService.findOrCreateUser(operatorId);
    const dateString = moment().format('YYYY-MM-DD HH:mm:ss');
    group.banReason = `于 ${dateString} 被用户 ${operatorId} 踢出了群。`;
    operator.banReason = `于 ${dateString} 把我踢出了群 ${groupId}。`;
    await Promise.all([
      this.db.getRepository(Group).save(group),
      this.db.getRepository(User).save(operator),
    ]);
    return true;
  }
  async banForMuted(groupId: string) {
    if (!this.config.killSwitch) {
      return false;
    }
    const group = await this.botService.findOrCreateGroup(groupId);
    const dateString = moment().format('YYYY-MM-DD HH:mm:ss');
    group.banReason = `于 ${dateString} 在群 ${groupId} 把我禁言。`;
    await this.db.getRepository(Group).save(group);
    return true;
  }
}
