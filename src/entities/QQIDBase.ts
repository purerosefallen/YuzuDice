import { TimeBase } from './TimeBase';
import { Column, Index, PrimaryColumn } from 'typeorm';

export class QQIDBase extends TimeBase {
  @PrimaryColumn('varchar', { length: 12 })
  id: string;

  @Column('varchar', { nullable: true, length: 100 })
  banReason: string;
}
