import { registerEnumType } from '@nestjs/graphql';

export enum GuardVerdict {
  ALLOW = 'ALLOW',
  BLOCK_DEVICE_MISMATCH = 'BLOCK_DEVICE_MISMATCH',
  BLOCK_DOUBLE_SCAN = 'BLOCK_DOUBLE_SCAN',
  BLOCK_FLIP_FLOP = 'BLOCK_FLIP_FLOP',
}

registerEnumType(GuardVerdict, {
  name: 'GuardVerdict',
});
