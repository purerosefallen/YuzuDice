import { QQIDBase } from './QQIDBase';
import { Column, Entity, Index } from 'typeorm';

@Entity()
export class User extends QQIDBase {
  @Index()
  @Column('varchar', { length: 32, nullable: true })
  name: string;

  @Column('int', { default: 0, unsigned: true }) // default with all read permissions
  permissions: number;

  checkPermissions(permissionNeeded: number) {
    return !!(this.permissions & permissionNeeded);
  }
}
