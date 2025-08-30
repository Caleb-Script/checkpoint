import { registerEnumType } from '@nestjs/graphql';

export enum DeliveryStatus {
  NEW = 'NEW',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
}
registerEnumType(DeliveryStatus, { name: 'DeliveryStatus' });
