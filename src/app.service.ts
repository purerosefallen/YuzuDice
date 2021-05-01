import { Injectable } from '@nestjs/common';
import { AppLogger } from './app.logger';
import { Connection } from 'typeorm';
import { InjectConnection } from '@nestjs/typeorm';

@Injectable()
export class AppService {
  constructor(
    @InjectConnection('app')
    private db: Connection,
    private log: AppLogger,
  ) {
    this.log.setContext('app');
  }

  getHello(): string {
    return 'Hello World!';
  }
}
