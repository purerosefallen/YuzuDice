import { TimeBase } from './TimeBase';
import { Column, PrimaryGeneratedColumn } from 'typeorm';
import Mustache from 'mustache';
import { decode } from 'he';

export class TextTemplate extends TimeBase {
  key: string; // column differs
  @Column('text')
  content: string;

  changeContent(content: string) {
    this.content = Buffer.from(decode(content), 'utf-8').toString('base64');
  }

  getContent() {
    return Buffer.from(this.content, 'base64').toString('utf-8');
  }

  render(data: any) {
    return Mustache.render(this.getContent(), data);
  }

  display() {
    return `${this.key} => ${this.getContent()}`;
  }
}
