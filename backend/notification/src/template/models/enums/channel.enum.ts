/* eslint-disable @typescript-eslint/no-unsafe-call */
import { registerEnumType } from '@nestjs/graphql';

export enum Channel {
  IN_APP = 'IN_APP',
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}
registerEnumType(Channel, { name: 'Channel' });
