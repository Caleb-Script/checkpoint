import { ObjectType, Field } from '@nestjs/graphql';
import { ScanLog } from '../entity/scan-log.entity.js';
import { Ticket } from '../entity/ticket.entity.js';
import { ScanVerdict } from '../enums/scan-verdict.enum.js';

@ObjectType()
export class ScanPayload {
  @Field(() => ScanVerdict)
  verdict!: ScanVerdict;
  @Field(() => Ticket)
  ticket!: Ticket;
  @Field(() => ScanLog)
  log!: ScanLog;
}
