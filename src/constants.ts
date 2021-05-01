export const UserPermissions = {
  // read
  UserRead: 0x1,
  GroupRead: 0x2,
  TemplateRead: 0x4,
  // write
  UserWrite: 0x100,
  GroupWrite: 0x200,
  TemplateWrite: 0x400,
  // others
  inviteBot: 0x10000,
  GroupCheck: 0x20000,
};
