import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { TextTemplate } from './TextTemplate';
import { Group } from './Group';

@Entity()
export class GroupTemplate extends TextTemplate {
  @PrimaryColumn('varchar', { length: 32 })
  key: string;
}
