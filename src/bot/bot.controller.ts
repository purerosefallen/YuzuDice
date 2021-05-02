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
        await session.send(
          await this.appService.rollDice(
            rollResult,
            session.userId,
            session.groupId,
          ),
        );
      }
      return next();
    });
    groupCtx
      .command('rolldice', '投掷骰子')
      .option('count', '-c <count:posint> 骰子数量', { fallback: 1 })
      .option('size', '-s <count:posint> 骰子面数', { fallback: 6 })
      .option('reason', '-r <reason:text> 骰子说明')
      .alias('rd', 'roll')
      .usage('也支持 .rd<> 和 .r<count>d<size> [reason] 这样的传统语法。')
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
        return await this.appService.rollDice(
          rollResult,
          session.userId,
          session.groupId,
        );
      });
    groupCtx
      .command('group.template.get [key:string]', '获取本群自定义模板')
      .usage(
        `只有群管理员才能使用。key 为模板名。目前支持的模板有: ${Array.from(
          defaultTemplateMap.keys(),
        ).join(' ')}`,
      )
      .example('.group.template.get roll 获取投掷骰子的消息模板。')
      .action(async (argv, key) => {
        const session = argv.session;
        if (
          !(await this.checkGroupAdminOrPermission(
            session,
            UserPermissions.TemplateRead,
          ))
        ) {
          return `${segment('at', { id: session.userId })} 你没有权限哦。`;
        }
        let ret;
        if (key) {
          ret = await this.appService.getGroupTemplate(key, session.groupId);
        } else {
          ret = await this.appService.getAllGroupTemplates(session.groupId);
        }
        return `${segment('at', { id: session.userId })} ${ret}`;
      });
    groupCtx
      .command(
        'group.template.set <key:string> <content:text>',
        '设置本群自定义模板',
      )
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
            UserPermissions.TemplateWrite,
          ))
        ) {
          return `${segment('at', { id: session.userId })} 你没有权限哦。`;
        }
        if (!key || !content) {
          return `${segment('at', { id: session.userId })} 缺少参数。`;
        }
        const ret = await this.appService.setGroupTemplate(
          key,
          session.groupId,
          content,
        );
        return `${segment('at', { id: session.userId })} ${ret}`;
      });
    groupCtx
      .command('group.template.clear <key:string>', '清除本群自定义模板')
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
            UserPermissions.TemplateWrite,
          ))
        ) {
          return `${segment('at', { id: session.userId })} 你没有权限哦。`;
        }
        if (!key) {
          return `${segment('at', { id: session.userId })} 缺少参数。`;
        }
        const ret = await this.appService.clearGroupTemplate(
          key,
          session.groupId,
        );
        return `${segment('at', { id: session.userId })} ${ret}`;
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
      (await this.appService.isUserHasPermissions(
        session.userId,
        session.username,
        UserPermissions.TemplateRead,
      ))
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
