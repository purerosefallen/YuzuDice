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

  private async renderTemplate(key: string, data: any, groupId?: string) {
    let template: TextTemplate;
    if (groupId) {
      template = await this.db
        .getRepository(GroupTemplate)
        .createQueryBuilder('template')
        .where('template.key = :key', { key })
        .andWhere('template.groupId = :groupId', { groupId })
        .getOne();
      if (template) {
        return template.render(data);
      }
    }
    template = await this.db
      .getRepository(DefaultTemplate)
      .findOne({ where: { key } });
    if (template) {
      return template.render(data);
    }
    return Mustache.render(defaultTemplateMap.get(key), data) || key;
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
}
