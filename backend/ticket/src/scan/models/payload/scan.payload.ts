import { Field, ObjectType } from '@nestjs/graphql';
import { Ticket } from '../../../ticket/models/entity/ticket.entity.js';
import { ScanLog } from '../entitys/scan-log.entity.js';
import { ScanVerdict } from '../enums/scan-verdict.enum.js';

@ObjectType('ScanPayload')
export class ScanPayload {
  @Field(() => ScanVerdict) verdict!: ScanVerdict;
  @Field(() => Ticket) ticket!: Ticket;
  @Field(() => ScanLog) log!: ScanLog;
}
