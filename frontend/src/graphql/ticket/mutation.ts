// /frontend/srv/graphql/tickets/mutation.ts
import { gql } from '@apollo/client';

/** Ticket erzeugen (nach Approval) */
export const CREATE_TICKET = gql /* GraphQL */ `
  mutation CreateTicket(
    $eventId: ID!
    $invitationId: ID!
    $seatId: ID
    $guestProfileId: ID!
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
export const CREATE_TOKEN = gql /* GraphQL */ `
  mutation CreateToken($ticketId: ID!, $deviceHash: String!) {
    createToken(ticketId: $ticketId, deviceHash: $deviceHash) {
      token
      exp
      jti
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

export const DELETE_TICKET = gql /* GraphQL */ `
  mutation DeleteTicket($id: ID!) {
    deleteTicket(id: $id) {
      id
      eventId
      invitationId
      seatId
      currentState
      deviceBoundKey
      revoked
    }
  }
`;
