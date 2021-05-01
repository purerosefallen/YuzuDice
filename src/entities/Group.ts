import { QQIDBase } from './QQIDBase';
import { Entity, OneToMany } from 'typeorm';
import { GroupTemplate } from './GroupTemplate';

@Entity()
export class Group extends QQIDBase {
  @OneToMany((type) => GroupTemplate, (template) => template.group)
  templates: GroupTemplate[];

  renderText(key: string, data: any) {
    const template = this.templates.find((t) => key === t.key);
    if (this.templates) {
      return template.render(data);
    }
    return null;
  }
}
