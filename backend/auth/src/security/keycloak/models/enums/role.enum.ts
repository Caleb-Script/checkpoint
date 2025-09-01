import { registerEnumType } from '@nestjs/graphql';

export type RoleData = {
  id: string;
  name: string;
};

export enum Role {
  ADMIN = 'ADMIN',
  SECURITY = 'SECURITY',
  GUEST = 'GUEST',
}
registerEnumType(Role, { name: 'Role' });

/** Mapping deines internen Role-Typs → tatsächlicher Rollenname in Keycloak */
export const ROLE_NAME_MAP: Record<Role, string> = {
  ADMIN: Role.ADMIN,
  SECURITY: Role.SECURITY,
  GUEST: Role.GUEST,
};
