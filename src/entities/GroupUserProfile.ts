import { TimeBase } from './TimeBase';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './User';
import { Group } from './Group';

@Entity()
export class GroupUserProfile extends TimeBase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne((type) => User, (user) => user.groupProfiles)
  user: User;

  @ManyToOne((type) => Group, (group) => group.userProfiles)
  group: Group;

  @Index()
  @Column('varchar', { nullable: true, length: 32 })
  name: string;

  @Column('varchar', { nullable: true, length: 100 })
  banReason: string;

  getDisplayUsername(fallback?: string) {
    return this.name || this.user.name || fallback;
  }

  toDscriptionObject() {
    return {
      displayUsername: this.getDisplayUsername(),
      ...this,
    };
  }
}
