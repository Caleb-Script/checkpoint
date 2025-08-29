// /frontend/srv/graphql/tickets/query.ts
import { gql } from '@apollo/client';

/** Alle Tickets (einfacher Überblick) */
export const GET_TICKETS = gql /* GraphQL */ `
  query GetTickets {
    getTickets {
      id
      eventId
      invitationId
      guestProfileId
      seatId
      currentState
      deviceBoundKey
      revoked
      createdAt
      updatedAt
    }
  }
`;

/** Einzelnes Ticket nach ID */
export const GET_TICKET_BY_ID = gql /* GraphQL */ `
  query GetTicketById($id: ID!) {
    getTicketById(id: $id) {
      eventId
      id
      invitationId
      seatId
      currentState
      deviceBoundKey
    }
  }
`;
