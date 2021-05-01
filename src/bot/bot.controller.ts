import { Controller } from '@nestjs/common';
import { AppService, RollResult } from '../app.service';
import { BotService } from './bot.service';
import { App } from 'koishi';
import * as koishiCommonPlugin from 'koishi-plugin-common';
import * as adapter from 'koishi-adapter-onebot';

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
  }
}
