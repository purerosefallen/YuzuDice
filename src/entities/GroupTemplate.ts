import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TextTemplate } from './TextTemplate';
import { Group } from './Group';

@Entity()
export class GroupTemplate extends TextTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column('varchar', { length: 32 })
  key: string;
  @ManyToOne((type) => Group, (group) => group.templates)
  group: Group;
}
