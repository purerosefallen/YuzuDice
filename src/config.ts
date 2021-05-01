import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from './entities/User';

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
    entities: [User], // entities here
    synchronize: true,
    ...dbConfig(),
  };
}
