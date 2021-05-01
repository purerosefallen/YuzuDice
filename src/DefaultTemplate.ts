const reasonString = `{{#reason}}因为 {{reason}} {{/reason}}`;

export const DefaultRollText =
  '{{name}} {{#reason}}因为 {{reason}} {{/reason}}而投掷了 {{count}} 个 {{size}} 面骰子，投掷出了 {{result}} 点。\n{{formula}}={{result}}';
export const TooMuchCountText =
  '{{name}} {{#reason}}因为 {{reason}} {{/reason}}而投掷了 {{count}} 个 {{size}} 面骰子。\n骰子滚落了一地，找不到了。';
export const TooMuchSizeText =
  '{{name}} {{#reason}}因为 {{reason}} {{/reason}}而投掷了 {{count}} 个 {{size}} 面骰子。\n丢了个球。丢个球啊！';

export const defaultTemplateMap = new Map<string, string>();
defaultTemplateMap.set('roll', DefaultRollText);
defaultTemplateMap.set('too_much_count', TooMuchCountText);
defaultTemplateMap.set('too_much_size', TooMuchSizeText);
