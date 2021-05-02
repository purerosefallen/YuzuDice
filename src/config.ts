import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from './entities/User';
import { Group } from './entities/Group';
import { DefaultTemplate } from './entities/DefaultTemplate';
import { GroupTemplate } from './entities/GroupTemplate';
import { GroupUserProfile } from './entities/GroupUserProfile';

export function dbConfig() {
  return {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  };
}
export function typeormConfig(): TypeOrmModuleOptions {
  return {
    name: 'app',
    type: 'mysql',
    entities: [User, Group, DefaultTemplate, GroupTemplate, GroupUserProfile], // entities here
    synchronize: true,
    ...dbConfig(),
  };
}
export interface DiceConfig {
  maxDiceCount: number;
  maxDiceSize: number;
  killSwitch: boolean;
}

export function diceConfig(): DiceConfig {
  return {
    maxDiceCount: parseInt(process.env.DICE_MAX_COUNT) || 1000,
    maxDiceSize: parseInt(process.env.DICE_MAX_SIZE) || 1000,
    killSwitch: !process.env.NO_KILL_SWITCH,
  };
}
