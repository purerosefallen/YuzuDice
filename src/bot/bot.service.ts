import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { BotLogger } from './bot.logger';
import { User } from '../entities/User';
import { Group } from '../entities/Group';

@Injectable()
export class BotService {
  constructor(
    @InjectConnection('app')
    private db: Connection,
    public log: BotLogger,
  ) {
    this.log.setContext('bot');
  }

  async findOrCreateUser(id: string, name?: string) {
    const repo = this.db.getRepository(User);
    let ent = await repo.findOne({ where: { id } });
    if (ent) {
      if (!ent.name && name) {
        ent.name = name;
        return await repo.save(ent);
      } else {
        return ent;
      }
    }
    ent = new User();
    ent.id = id;
    ent.name = name;
    try {
      ent = await repo.save(ent);
    } catch (e) {
      this.log.error(`Failed to save user ${id}: ${e.toString()}`);
      return null;
    }
    return ent;
  }
  async findOrCreateGroup(id: string) {
    const repo = this.db.getRepository(Group);
    let ent = await repo.findOne({ where: { id }, relations: ['templates'] });
    if (ent) {
      return ent;
    }
    ent = new Group();
    ent.id = id;
    try {
      ent = await repo.save(ent);
    } catch (e) {
      this.log.error(`Failed to save group ${id}: ${e.toString()}`);
      return null;
    }
    return ent;
  }
}
