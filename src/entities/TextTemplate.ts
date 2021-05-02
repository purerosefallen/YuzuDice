import { TimeBase } from './TimeBase';
import { Column, PrimaryGeneratedColumn } from 'typeorm';
import { decode } from 'he';
import { Utility } from '../utility';

export class TextTemplate extends TimeBase {
  key: string; // column differs
  @Column('text')
  content: string;

  changeContent(content: string) {
    //this.content = Buffer.from(decode(content), 'utf-8').toString('base64');
    this.content = decode(content);
  }

  getContent() {
    //return Buffer.from(this.content, 'base64').toString('utf-8');
    return this.content;
  }

  render(data: any) {
    return Utility.render(this.getContent(), data);
  }

  display() {
    return `${this.key} => ${this.getContent()}`;
  }
}
