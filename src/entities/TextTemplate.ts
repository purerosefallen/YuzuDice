import { TimeBase } from './TimeBase';
import { Column, PrimaryGeneratedColumn } from 'typeorm';
import {
  DefaultRollText,
  TooMuchCountText,
  TooMuchSizeText,
} from '../DefaultTemplate';
import * as Mustache from 'mustache';
import _ from 'lodash';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
Mustache.escape = (text) => {
  return text;
};
export class TextTemplate extends TimeBase {
  key: string; // column differs
  @Column('text')
  content: string;

  render(data: any) {
    return Mustache.render(this.content, data);
  }
}
