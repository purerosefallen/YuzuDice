import { QQIDBase } from './QQIDBase';
import { Column, Entity, OneToMany } from 'typeorm';
import { GroupTemplate } from './GroupTemplate';
import { GroupUserProfile } from './GroupUserProfile';
import he from 'he';
import { User } from './User';
import Mustache from 'mustache';

@Entity()
export class Group extends QQIDBase {
  @OneToMany((type) => GroupTemplate, (template) => template.group)
  templates: GroupTemplate[];

  @OneToMany((type) => GroupUserProfile, (profile) => profile.group)
  userProfiles: GroupUserProfile[];

  @Column('text', { nullable: true })
  welcomeMessage: string;

  @Column('tinyint', { default: 0 })
  allowedToJoin: number;

  setWelcomeMessage(message: string) {
    if (!message || message === 'null') {
      this.welcomeMessage = null;
    } else {
      this.welcomeMessage = he.decode(message);
    }
  }

  welcomeUser(user: User) {
    if (!this.welcomeMessage) {
      return null;
    }
    return Mustache.render(this.welcomeMessage, user);
  }

  renderText(key: string, data: any) {
    const template = this.templates.find((t) => key === t.key);
    if (this.templates) {
      return template.render(data);
    }
    return null;
  }
}
