import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppLogger } from './app.logger';
import { Connection } from 'typeorm';
import { InjectConnection } from '@nestjs/typeorm';
import { User } from './entities/User';
import { BotService } from './bot/bot.service';
import { UserPermissions } from './constants';
import { diceConfig, DiceConfig } from './config';
import _ from 'lodash';
import { TextTemplate } from './entities/TextTemplate';
import { GroupTemplate } from './entities/GroupTemplate';
import { DefaultTemplate } from './entities/DefaultTemplate';
import { defaultTemplateMap } from './DefaultTemplate';
import Mustache from 'mustache';

export interface RollResult {
  name: string;
  reason?: string;
  count: number;
  size: number;
  result?: number;
  formula?: string;
  results?: number[];
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
    rollResult.formula = rollResult.results.join('+');
    rollResult.result = _.sum(rollResult.results);
  }

  async checkJoinGroup(userId: string) {
    const user = await this.botService.findOrCreateUser(userId);
    if (user.checkPermissions(UserPermissions.inviteBot)) {
      return true;
    } else if (user.isBanned) {
      return false;
    }
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

  private async getTemplate(key: string, groupId: string) {
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

  private async renderTemplate(key: string, data: any, groupId?: string) {
    const template = await this.getTemplate(key, groupId);
    if (template) {
      return template.render(data);
    }
    return Mustache.render(defaultTemplateMap.get(key), data) || key;
  }

  async isUserHasPermissions(userId: string, username: string, perm: number) {
    const user = await this.botService.findOrCreateUser(userId, username);
    if (user.isBanned) {
      return false;
    }
    return user.checkPermissions(perm);
  }

  private async checkUserAndGroup(
    userId: string,
    username: string,
    groupId: string,
  ) {
    const user = await this.botService.findOrCreateUser(userId, username);
    if (user.isBanned) {
      return false;
    }
    const group = await this.botService.findOrCreateGroup(groupId);
    if (group.isBanned) {
      return false;
    }
    return true;
  }

  async rollDice(
    rollResult: RollResult,
    userId: string,
    groupId: string,
  ): Promise<string> {
    if (!(await this.checkUserAndGroup(userId, rollResult.name, groupId))) {
      return await this.renderTemplate('bad_user', {});
    }
    if (rollResult.count > this.config.maxDiceCount) {
      return await this.renderTemplate('too_much_count', rollResult, groupId);
    }
    if (rollResult.size > this.config.maxDiceSize) {
      return await this.renderTemplate('too_much_size', rollResult, groupId);
    }
    AppService.rollProcess(rollResult);
    return await this.renderTemplate('roll', rollResult, groupId);
  }
  async getGroupTemplate(key: string, groupId: string) {
    const group = await this.botService.findOrCreateGroup(groupId);
    if (group.isBanned) {
      return await this.renderTemplate('bad_user', {});
    }
    const template = await this.getTemplate(key, groupId);
    if (template) {
      return template.display();
    }
    return `${key} => ${defaultTemplateMap.get(key) || '没有这个模板'}`;
  }
  async getAllGroupTemplates(groupId: string) {
    const group = await this.botService.findOrCreateGroup(groupId);
    if (group.isBanned) {
      return await this.renderTemplate('bad_user', {});
    }
    const notSetTemplateNames = Array.from(defaultTemplateMap.keys()).filter(
      (tName) => !group.templates.find((t) => t.key === tName),
    );
    return `本群设置过的自定义模板有:\n${group.templates
      .map((t) => t.display())
      .join('\n')}\n\n还没有设置的自定义模板有:\n${notSetTemplateNames.join(
      '\n',
    )}`;
  }
  async setGroupTemplate(key: string, groupId: string, content: string) {
    const group = await this.botService.findOrCreateGroup(groupId);
    if (group.isBanned) {
      return await this.renderTemplate('bad_user', {});
    }
    if (!defaultTemplateMap.has(key)) {
      return `模板 ${key} 不存在。`;
    }
    let template = await this.getTemplateForGroup(key, groupId);
    if (!template) {
      template = new GroupTemplate();
      template.key = key;
      template.group = group;
    }
    template.changeContent(content);
    await this.db.getRepository(GroupTemplate).save(template);
    return `成功设置自定义模板: ${template.display()}`;
  }
  async clearGroupTemplate(key: string, groupId: string) {
    const group = await this.botService.findOrCreateGroup(groupId);
    if (group.isBanned) {
      return await this.renderTemplate('bad_user', {});
    }
    const template = await this.getTemplateForGroup(key, groupId);
    if (!template) {
      return `自定义模板 ${key} 没有设置过。`;
    }
    await this.db.getRepository(GroupTemplate).delete(template);
    return `成功清除模板 ${key}`;
  }
}
