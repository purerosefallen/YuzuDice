import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { AppLogger } from '../app.logger';
import { BotService } from '../bot/bot.service';
import { User } from '../entities/User';
import { HttpServerLogger } from './http-server.logger';
import { UserPermissions } from '../constants';

@Injectable()
export class HttpServerService {
  adminToken: string;
  constructor(
    @InjectConnection('app')
    private db: Connection,
    private log: HttpServerLogger,
    private botService: BotService,
  ) {
    this.log.setContext('http-api');
    this.adminToken = process.env.ADMIN_TOKEN;
  }

  checkAccess(token: string) {
    if (this.adminToken && token !== this.adminToken) {
      throw new ForbiddenException({ success: false, message: 'Forbidden.' });
    }
  }

  async getUser(id: string, name: string) {
    const query = this.db.getRepository(User).createQueryBuilder().where('1');
    if (id) {
      query.andWhere('id = :id', { id });
    }
    if (name) {
      query.andWhere('name = :name', { name });
    }
    try {
      const user = await query.getMany();
      return user;
    } catch (e) {
      throw new NotFoundException({
        success: false,
        message: `Database fail: ${e.toString()}`,
      });
    }
  }

  async setUser(
    id: string,
    name: string,
    permissions: number,
    addperm: string,
    removeperm: string,
  ) {
    try {
      const user = await this.botService.findOrCreateUser(id);
      if (name) {
        user.name = name;
      }
      if (permissions || permissions === 0) {
        if (permissions < 0) {
          throw new BadRequestException({
            success: false,
            message: `Permission cannot be less than zero: ${permissions}`,
          });
        }
        user.permissions = permissions;
      }
      if (addperm) {
        const value: number = UserPermissions[addperm];
        if (!value) {
          throw new BadRequestException({
            success: false,
            message: `Permission not found: ${addperm}`,
          });
        }
        user.permissions |= value;
      }
      if (removeperm) {
        const value: number = UserPermissions[removeperm];
        if (!value) {
          throw new BadRequestException({
            success: false,
            message: `Permission not found: ${removeperm}`,
          });
        }
        user.permissions &= ~value;
      }
      await this.db.getRepository(User).save(user);
    } catch (e) {
      throw new NotFoundException({
        success: false,
        message: `Database fail: ${e.toString()}`,
      });
    }
  }
}
