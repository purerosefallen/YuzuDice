import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { TextTemplate } from './TextTemplate';
import { Group } from './Group';

@Entity()
export class GroupTemplate extends TextTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 32 })
  @Index()
  key: string;

  @ManyToOne((type) => Group, (group) => group.templates)
  group: Group;

  @RelationId((template: GroupTemplate) => template.group)
  groupId: string;
}
