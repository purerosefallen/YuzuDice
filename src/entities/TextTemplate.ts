import { TimeBase } from './TimeBase';
import { Column, PrimaryGeneratedColumn } from 'typeorm';
import Mustache from 'mustache';

export class TextTemplate extends TimeBase {
  key: string; // column differs
  @Column('text')
  content: string;

  changeContent(content: string) {
    this.content = Buffer.from(content, 'utf-8').toString('base64');
  }

  render(data: any) {
    return Mustache.render(
      Buffer.from(this.content, 'base64').toString('utf-8'),
      data,
    );
  }
}
