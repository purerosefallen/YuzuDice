import { Controller } from '@nestjs/common';
import { AppService } from '../app.service';
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
    this.bot.plugin(koishiCommonPlugin);
    this.loadBotRouters();
    await this.bot.start();
    this.botService.log.log(`Bot started.`);
  }
  loadBotRouters() {
    // all middlewares should be here.
  }
}
