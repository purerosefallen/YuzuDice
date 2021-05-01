import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppLogger } from './app.logger';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeormConfig } from './config';
import { BotService } from './bot/bot.service';
import { BotLogger } from './bot/bot.logger';
import { BotController } from './bot/bot.controller';

@Module({
  imports: [TypeOrmModule.forRoot(typeormConfig())],
  controllers: [AppController, BotController],
  providers: [AppService, AppLogger, BotService, BotLogger],
})
export class AppModule {}
