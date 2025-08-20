import { registerEnumType } from '@nestjs/graphql';

export enum PresenceState {
  OUTSIDE = 'OUTSIDE',
  INSIDE = 'INSIDE',
}

registerEnumType(PresenceState, {
  name: 'PresenceState',
  description:
    'The state of presence for a ticket, indicating whether the ticket holder is outside or inside the event.',
});
