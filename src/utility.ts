import Mustache from 'mustache';

export class Utility {
  static render(template: string, view: any): string {
    try {
      return Mustache.render(template, view, null, {
        escape: (value) => value,
      });
    } catch (e) {
      return `模板错误: ${JSON.stringify(view)} ${e.toString()}`;
    }
  }
}
