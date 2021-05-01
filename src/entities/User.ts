import { QQIDBase } from './QQIDBase';
import { Column, Entity, Index } from 'typeorm';

@Entity()
export class User extends QQIDBase {
  @Index()
  @Column('varchar', { length: 32, nullable: true })
  name: string;
}
