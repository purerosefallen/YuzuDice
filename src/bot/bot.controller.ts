import { Controller } from '@nestjs/common';
import { AppService, RollResult } from '../app.service';
import { BotService } from './bot.service';
import { App, Session, segment } from 'koishi';
import * as koishiCommonPlugin from 'koishi-plugin-common';
import * as adapter from 'koishi-adapter-onebot';
import { defaultTemplateMap } from '../DefaultTemplate';
import { UserPermissions } from '../constants';
import { User } from '../entities/User';

const __ = typeof adapter; // just for import
@Controller('_bot')
export class BotController {
  bot: App;
  constructor(
    private readonly appService: AppService,
    private readonly botService: BotService,
  ) {
    this.initializeBot();
  }
  async initializeBot() {
    this.bot = new App({
      type: 'onebot:ws',
      selfId: process.env.CQ_ID,
      server: process.env.CQ_SERVER,
      token: process.env.CQ_TOKEN,
      prefix: process.env.CQ_PREFIX || '.',
    });
    this.bot.plugin(koishiCommonPlugin, {
      onFriendRequest: true,
      onGroupRequest: async (session) => {
        const userId = session.userId;
        return await this.appService.checkJoinGroup(userId);
      },
    });
    this.loadBotRouters();
    await this.bot.start();
    this.botService.log.log(`Bot started.`);
  }
  loadBotRouters() {
    // all middlewares should be here.
    this.bot.command('echo <msg:text>').action((argv, msg) => {
      return msg;
    });
    const groupCtx = this.bot.group(); // change here
    const privateCtx = this.bot.private();
    const globalCtx = this.bot.all();
    groupCtx.middleware(async (session, next) => {
      const content = session.content.trim();
      const rollResult: RollResult = {
        name: session.username,
        count: 1,
        size: 6,
      };
      const rollMatch = content.match(/^\.r(\d*)d(\d+)( .+)?$/);
      if (rollMatch) {
        rollResult.count = parseInt(rollMatch[1]) || 1;
        rollResult.size = parseInt(rollMatch[2]) || 6;
        rollResult.reason = rollMatch[3] ? rollMatch[3].trim() : null;
        await session.send(await this.appService.rollDice(rollResult, session));
      }
      return next();
    });
    globalCtx
      .command('rolldice', '投掷骰子')
      .option('count', '-c <count:posint> 骰子数量', { fallback: 1 })
      .option('size', '-s <count:posint> 骰子面数', { fallback: 6 })
      .option('reason', '-r <reason:text> 骰子说明')
      .alias('rd', 'roll')
      .usage('也支持 .rd<size> 和 .r<count>d<size> [reason] 这样的传统语法。')
      .example('.rolldice -c 2 -s 6 -r "行动判定"')
      .action(async (argv, args) => {
        const session = argv.session;
        const rollResult = {
          name: session.username,
          count: 1,
          size: 6,
          reason: null,
          ...argv.options,
        };
        return await this.appService.rollDice(rollResult, session);
      });
    const groupCommand = groupCtx.command('group', '群内指令');
    const groupTemplateCommand = groupCommand
      .subcommand('.template', '获取本群自定义模板')
      .usage(
        `只有群管理员才能使用。key 为模板名。目前支持的模板有: ${Array.from(
          defaultTemplateMap.keys(),
        ).join(' ')}`,
      )
      .example('.group.template roll 获取投掷骰子的消息模板。')
      .action(async (argv, key) => {
        const session = argv.session;
        if (
          !(await this.checkGroupAdminOrPermission(
            session,
            UserPermissions.GroupTemplateRead,
          ))
        ) {
          return `${segment('at', {
            id: session.userId,
          })} ${await this.appService.renderTemplate(
            'permission_denied',
            { action: '获取本群自定义模板' },
            session.groupId,
          )}`;
        }
        let ret;
        if (key) {
          ret = await this.appService.getGroupTemplate(session, key);
        } else {
          ret = await this.appService.getAllGroupTemplates(session);
        }
        return `${segment('at', { id: session.userId })} ${ret}`;
      });
    groupTemplateCommand
      .subcommand('.set <key:string> <content:text>', '设置本群自定义模板')
      .usage(
        `只有群管理员才能使用。key 为模板名，content为模板内容。目前支持的模板有: ${Array.from(
          defaultTemplateMap.keys(),
        ).join(' ')}`,
      )
      .example('.group.template.set roll <内容> 设置投掷骰子的消息模板。')
      .action(async (argv, key, content) => {
        const session = argv.session;
        if (
          !(await this.checkGroupAdminOrPermission(
            session,
            UserPermissions.GroupTemplateWrite,
          ))
        ) {
          return `${segment('at', {
            id: session.userId,
          })} ${await this.appService.renderTemplate(
            'permission_denied',
            { action: '设置本群自定义模板' },
            session.groupId,
          )}`;
        }
        if (!key || !content) {
          return `${segment('at', {
            id: session.userId,
          })} ${await this.appService.renderTemplate(
            'bad_params',
            {},
            session.groupId,
          )}`;
        }
        const ret = await this.appService.setGroupTemplate(
          session,
          key,
          content,
        );
        return `${segment('at', { id: session.userId })} ${ret}`;
      });
    groupTemplateCommand
      .subcommand('.clear <key:string>', '清除本群自定义模板')
      .usage(
        `只有群管理员才能使用。key 为模板名。目前支持的模板有: ${Array.from(
          defaultTemplateMap.keys(),
        ).join(' ')}`,
      )
      .example('.group.template.set roll <内容> 设置投掷骰子的消息模板。')
      .action(async (argv, key) => {
        const session = argv.session;
        if (
          !(await this.checkGroupAdminOrPermission(
            session,
            UserPermissions.GroupTemplateWrite,
          ))
        ) {
          return `${segment('at', {
            id: session.userId,
          })} ${await this.appService.renderTemplate(
            'permission_denied',
            { action: '清除本群自定义模板' },
            session.groupId,
          )}`;
        }
        if (!key) {
          return `${segment('at', {
            id: session.userId,
          })} ${await this.appService.renderTemplate(
            'bad_params',
            {},
            session.groupId,
          )}`;
        }
        const ret = await this.appService.clearGroupTemplate(session, key);
        return `${segment('at', { id: session.userId })} ${ret}`;
      });
    const groupUserCommand = groupCommand
      .subcommand('.user [field:text]', '查看群内用户信息')
      .usage('带参数查看其他人的用户信息，但是只有管理员可以用。')
      .example(
        '.user 查看自己的用户信息。.user Nanahira 查看 Nanahira 的用户信息。',
      )
      .action(async (argv, field) => {
        const session = argv.session;
        if (
          field &&
          !(await this.checkGroupAdminOrPermission(
            session,
            UserPermissions.GroupUserRead,
          ))
        ) {
          return `${segment('at', {
            id: session.userId,
          })} ${await this.appService.renderTemplate(
            'permission_denied',
            { action: '查看群员的用户信息' },
            session.groupId,
          )}`;
        }
        const ret = await this.appService.getGroupUserProfile(session, field);
        return `${segment('at', { id: session.userId })} ${ret}`;
      });
    groupUserCommand
      .subcommand('.name <name:string>', '修改群内用户昵称')
      .example('.group.user.name Nanahira')
      .action(async (argv, name) => {
        const session = argv.session;
        if (!name) {
          const ret = await this.appService.getGroupUserProfile(session);
          return `${segment('at', { id: session.userId })} ${ret}`;
        }
        const ret = await this.appService.setGroupUsername(session, name);
        return `${segment('at', { id: session.userId })} ${ret}`;
      });
    const userCommand = globalCtx
      .command('account [field:text]', '查看用户信息')
      .usage('带参数查看其他人的用户信息，但是只有管理员可以用。')
      .example(
        '.account 查看自己的用户信息。.account Nanahira 查看 Nanahira 的用户信息。',
      )
      .action(async (argv, field) => {
        const session = argv.session;
        if (
          field &&
          !(await this.checkUserPermission(session, UserPermissions.UserRead))
        ) {
          return await this.appService.renderTemplate(
            'permission_denied',
            { action: '查看用户信息' },
            session.groupId,
          );
        }
        const ret = await this.appService.getGlobalUserProfile(session, field);
        return ret;
      });
    userCommand
      .subcommand('.name <name:string>', '修改用户昵称')
      .example('.account.name Nanahira 修改用户昵称为 Nanahira')
      .action(async (argv, name) => {
        const session = argv.session;
        if (!name) {
          const ret = await this.appService.getGlobalUserProfile(session);
          return ret;
        }
        const ret = await this.appService.setGlobalUsername(session, name);
        return ret;
      });
    const adminCommand = globalCtx
      .command('admin', '管理接口')
      .usage('这里的命令只有管理员可以用。');
    const adminTemplateCommand = adminCommand
      .subcommand('.template', '获取默认模板')
      .usage(
        `只有群管理员才能使用。key 为模板名。目前支持的模板有: ${Array.from(
          defaultTemplateMap.keys(),
        ).join(' ')}`,
      )
      .example('.admin.template roll 获取投掷骰子的消息模板。')
      .action(async (argv, key) => {
        const session = argv.session;
        if (
          !(await this.checkUserPermission(
            session,
            UserPermissions.TemplateRead,
          ))
        ) {
          return await this.appService.renderTemplate(
            'permission_denied',
            { action: '获取默认模板' },
            session.groupId,
          );
        }
        let ret;
        if (key) {
          ret = await this.appService.getGlobalTemplate(session, key);
        } else {
          ret = await this.appService.getAllGlobalTemplates(session);
        }
        return ret;
      });
    adminTemplateCommand
      .subcommand('.set <key:string> <content:text>', '设置默认自定义模板')
      .usage(
        `只有管理员才能使用。key 为模板名，content为模板内容。目前支持的模板有: ${Array.from(
          defaultTemplateMap.keys(),
        ).join(' ')}`,
      )
      .example('.admin.template.set roll <内容> 设置投掷骰子的消息模板。')
      .action(async (argv, key, content) => {
        const session = argv.session;
        if (
          !(await this.checkUserPermission(
            session,
            UserPermissions.TemplateWrite,
          ))
        ) {
          return await this.appService.renderTemplate(
            'permission_denied',
            { action: '设置默认自定义模板' },
            session.groupId,
          );
        }
        if (!key || !content) {
          return await this.appService.renderTemplate(
            'bad_params',
            {},
            session.groupId,
          );
        }
        const ret = await this.appService.setGlobalTemplate(
          session,
          key,
          content,
        );
        return ret;
      });
    adminTemplateCommand
      .subcommand('.clear <key:string>', '清除默认自定义模板')
      .usage(
        `只有群管理员才能使用。key 为模板名。目前支持的模板有: ${Array.from(
          defaultTemplateMap.keys(),
        ).join(' ')}`,
      )
      .example('.admin.template.set roll <内容> 设置投掷骰子的消息模板。')
      .action(async (argv, key) => {
        const session = argv.session;
        if (
          !(await this.checkUserPermission(
            session,
            UserPermissions.TemplateWrite,
          ))
        ) {
          return await this.appService.renderTemplate(
            'permission_denied',
            { action: '清除默认自定义模板' },
            session.groupId,
          );
        }
        if (!key) {
          return await this.appService.renderTemplate(
            'bad_params',
            {},
            session.groupId,
          );
        }
        const ret = await this.appService.clearGlobalTemplate(session, key);
        return ret;
      });
  }
  async checkGroupAdminOrPermission(
    session: Session<
      never,
      never,
      'onebot',
      keyof Session.Events,
      | keyof Session.MessageType
      | 'role'
      | 'ban'
      | keyof Session.GroupMemberChangeType
      | 'poke'
      | 'lucky-king'
      | 'honor'
    >,
    perm: number,
  ) {
    return (
      (await this.checkGroupAdmin(session)) ||
      (await this.checkUserPermission(session, perm))
    );
  }
  async checkUserPermission(
    session: Session<
      never,
      never,
      'onebot',
      keyof Session.Events,
      | keyof Session.MessageType
      | 'role'
      | 'ban'
      | keyof Session.GroupMemberChangeType
      | 'poke'
      | 'lucky-king'
      | 'honor'
    >,
    perm: number,
  ) {
    return await this.appService.isUserHasPermissions(
      session.userId,
      session.username,
      perm,
    );
  }
  async checkGroupAdmin(
    session: Session<
      never,
      never,
      'onebot',
      keyof Session.Events,
      | keyof Session.MessageType
      | 'role'
      | 'ban'
      | keyof Session.GroupMemberChangeType
      | 'poke'
      | 'lucky-king'
      | 'honor'
    >,
  ) {
    const { role } = await session.bot.$getGroupMemberInfo(
      session.groupId,
      session.userId,
    );
    return role === 'owner' || role === 'admin';
  }
}
