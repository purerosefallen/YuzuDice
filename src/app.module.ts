import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppLogger } from './app.logger';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeormConfig } from './config';
import { HttpServerService } from './http-server/http-server.service';
import { BotController } from './bot/bot.controller';
import { HttpServerLogger } from './http-server/http-server.logger';
import { BotService } from './bot/bot.service';
import { BotLogger } from './bot/bot.logger';

@Module({
  imports: [TypeOrmModule.forRoot(typeormConfig())],
  controllers: [AppController, BotController],
  providers: [
    AppService,
    AppLogger,
    HttpServerService,
    HttpServerLogger,
    BotService,
    BotLogger,
  ],
})
export class AppModule {}
