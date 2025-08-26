// /web/src/graphql/event/query.ts
import { gql } from '@apollo/client';

/**
 * Liste aller Events
 */
export const EVENTS = gql`
  query Events {
    events {
      allowReEntry
      createdAt
      endsAt
      id
      maxSeats
      name
      rotateSeconds
      startsAt
      updatedAt
    }
  }
`;

/**
 * Einzelnes Event nach ID
 */
export const EVENT_BY_ID = gql`
  query Event($id: ID!) {
    event(id: $id) {
      allowReEntry
      createdAt
      endsAt
      id
      maxSeats
      name
      rotateSeconds
      startsAt
      updatedAt
    }
  }
`;

export const EVENT_SEATS = gql /* GraphQL */ `
  query EventSeats($eventId: ID!) {
    seatsByEvent(eventId: $eventId) {
      id
      eventId
      section
      table
      number
      note
    }
  }
`;
