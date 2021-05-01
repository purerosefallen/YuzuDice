import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppLogger } from './app.logger';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeormConfig } from './config';

@Module({
  imports: [TypeOrmModule.forRoot(typeormConfig())],
  controllers: [AppController],
  providers: [AppService, AppLogger],
})
export class AppModule {}
