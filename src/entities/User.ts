import { QQIDBase } from './QQIDBase';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { GroupUserProfile } from './GroupUserProfile';

@Entity()
export class User extends QQIDBase {
  @Index()
  @Column('varchar', { length: 32, nullable: true })
  name: string;

  @Column('int', { default: 0, unsigned: true }) // default with all read permissions
  permissions: number;

  @OneToMany((type) => GroupUserProfile, (profile) => profile.user)
  groupProfiles: GroupUserProfile[];

  checkPermissions(permissionNeeded: number) {
    return !!(this.permissions & permissionNeeded);
  }

  toDscriptionObject() {
    return this;
  }
}
