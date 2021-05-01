import { CreateDateColumn, UpdateDateColumn } from 'typeorm';

export class TimeBase {
  @CreateDateColumn({ select: false })
  createTime: Date;

  @UpdateDateColumn({ select: false })
  updateTime: Date;

  toObject() {
    return JSON.parse(JSON.stringify(this));
  }
}
