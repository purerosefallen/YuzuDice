import { QQIDBase } from './QQIDBase';
import { Column, Entity, OneToMany } from 'typeorm';
import { GroupTemplate } from './GroupTemplate';
import { GroupUserProfile } from './GroupUserProfile';

@Entity()
export class Group extends QQIDBase {
  @OneToMany((type) => GroupTemplate, (template) => template.group)
  templates: GroupTemplate[];

  @OneToMany((type) => GroupUserProfile, (profile) => profile.group)
  userProfiles: GroupUserProfile[];

  renderText(key: string, data: any) {
    const template = this.templates.find((t) => key === t.key);
    if (this.templates) {
      return template.render(data);
    }
    return null;
  }
}
