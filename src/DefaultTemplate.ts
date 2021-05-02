export const defaultTemplateMap = new Map<string, string>();

export const DefaultRollText =
  '{{&name}} {{#reason}}因为 {{&reason}} 而{{/reason}}投掷了 {{count}} 个 {{size}} 面骰子，投掷出了 {{result}} 点。{{#formula}}\n{{&formula}}{{/formula}}';
defaultTemplateMap.set('roll', DefaultRollText);

export const TooMuchCountText =
  '{{&name}} {{#reason}}因为 {{&reason}} 而{{/reason}}投掷了 {{count}} 个 {{size}} 面骰子。\n骰子滚落了一地，找不到了。';
defaultTemplateMap.set('too_much_count', TooMuchCountText);

export const TooMuchSizeText =
  '{{&name}} {{#reason}}因为 {{&reason}} 而{{/reason}}投掷了 {{count}} 个 {{size}} 面骰子。\n丢了个球。丢个球啊！';
defaultTemplateMap.set('too_much_size', TooMuchSizeText);

export const BadUserText =
  '您已被禁止使用该骰娘。{{#reason}}原因是: {{&reason}}{{/reason}}';
defaultTemplateMap.set('bad_user', BadUserText);

export const BadNameText = `你的名字 {{&name}} 不合法或者太长啦！`;
defaultTemplateMap.set('bad_name', BadNameText);

export const GroupNameChangedText = `成功修改您在本群的昵称为 {{&name}}。`;
defaultTemplateMap.set('group_name_changed', GroupNameChangedText);

export const GlobalNameChangedText = `成功修改您的昵称为 {{&name}}。`;
defaultTemplateMap.set('global_name_changed', GlobalNameChangedText);

const banReasonText =
  '{{#banReason}}\n被封禁: 是\n封禁原因: {{&banReason}}{{/banReason}}';

export const GroupUserProfileText = `{{&displayUsername}}({{&user.id}}) 在群 {{&group.id}} 的资料:\n昵称: {{&displayUsername}}${banReasonText}`;
defaultTemplateMap.set('group_user_profile', GroupUserProfileText);

export const GlobalUserProfileText = `{{&name}}({{id}}) 的资料:\n昵称: {{&name}}${banReasonText}\n\n在过的群:{{#groupProfiles}}\n{{group.id}} -> {{&name}}{{/groupProfiles}}`;
defaultTemplateMap.set('global_user_profile', GlobalUserProfileText);

export const UserNotFoundText = `用户 {{&field}} 不存在。`;
defaultTemplateMap.set('user_not_found', UserNotFoundText);

export const PermissionDeniedText = `你没有权限进行 {{&action}} 。`;
defaultTemplateMap.set('permission_denied', PermissionDeniedText);

export const BadParamsText = `参数不正确。`;
defaultTemplateMap.set('bad_params', BadParamsText);

export const AdminQuitGroup = `已退出群 {{groupId}}。`;
defaultTemplateMap.set('admin_quit_group', AdminQuitGroup);
