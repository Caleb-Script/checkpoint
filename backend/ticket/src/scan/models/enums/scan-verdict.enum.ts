import { registerEnumType } from '@nestjs/graphql';

export enum ScanVerdict {
  OK = 'OK',
  REVOKED = 'REVOKED',
  BLOCKED = 'BLOCKED',
  ALREADY_INSIDE = 'ALREADY_INSIDE',
  ALREADY_OUTSIDE = 'ALREADY_OUTSIDE',
}

registerEnumType(ScanVerdict, {
  name: 'ScanVerdict',
});
