export const UserPermissions = {
  // read
  UserRead: 0x1,
  GroupUserRead: 0x2,
  TemplateRead: 0x4,
  GroupTemplateRead: 0x8,
  // write
  UserWrite: 0x100,
  GroupUserWrite: 0x200,
  TemplateWrite: 0x400,
  GroupTemplateWrite: 0x800,
  // others
  inviteBot: 0x10000,
};
