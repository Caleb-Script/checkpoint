// /web/src/graphql/tickets/mutation.ts
import { gql } from '@apollo/client';

/** Ticket erzeugen (nach Approval) */
export const CREATE_TICKET = gql /* GraphQL */ `
  mutation CreateTicket(
    $eventId: ID!
    $invitationId: ID!
    $seatId: ID
    $guestProfileId: ID
  ) {
    createTicket(
      input: {
        eventId: $eventId
        invitationId: $invitationId
        seatId: $seatId
        guestProfileId: $guestProfileId
      }
    ) {
      eventId
      id
      invitationId
      seatId
    }
  }
`;

/** Rotierenden Token ausstellen (für „Mein QR“ / Scanner) */
export const ROTATE_TOKEN = gql /* GraphQL */ `
  mutation RotateToken(
    $ticketId: ID!
    $deviceHash: String!
    $ttlSeconds: Int!
  ) {
    rotateToken(
      input: {
        deviceHash: $deviceHash
        ticketId: $ticketId
        ttlSeconds: $ttlSeconds
      }
    ) {
      token
      ttlSeconds
    }
  }
`;

/** Scan am Gate (Security) */
export const HANDLE_SCAN = gql /* GraphQL */ `
  mutation HandleScan($token: String!) {
    handleScan(token: $token) {
      currentState
      deviceBoundKey
      eventId
      id
      invitationId
      revoked
      seatId
    }
  }
`;
