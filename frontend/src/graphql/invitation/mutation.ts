// /web/src/graphql/invitations/mutation.ts
import { gql } from '@apollo/client';

export const CREATE_INVITATION = gql /* GraphQL */ `
  mutation CreateInvitation($eventId: ID!, $maxInvitees: Int!, $firstName: String, $lastName: String) {
    createInvitation(input: { eventId: $eventId, maxInvitees: $maxInvitees, firstName: $firstName, lastName: $lastName }) {
      firstName
        lastName
      approved
      approvedById
        approvedAt
      eventId
      guestProfileId
      id
      invitedByInvitationId
       invitedById
        plusOnes
      maxInvitees
      rsvpChoice
      rsvpAt
      status
      createdAt
        updatedAt
    }
  }
`;

export const CREATE_PLUS_ONES_INVITATION = gql /* GraphQL */ `
  mutation CreatePlusOnesInvitation(
    $eventId: ID!
    $invitedByInvitationId: ID!
  ) {
    createPlusOnesInvitation(
      input: {
        eventId: $eventId
        invitedByInvitationId: $invitedByInvitationId
      }
    ) {
      approved
      eventId
      guestProfileId
      id
      invitedByInvitationId
      maxInvitees
      rsvpChoice
      status
    }
  }
`;

/** generisches Update (approved, rsvpChoice, maxInvitees ...) */
export const UPDATE_INVITATION = gql /* GraphQL */ `
  mutation UpdateInvitation(
    $id: ID!
    $approved: Boolean
    $rsvpChoice: RsvpChoice
    $maxInvitees: Int
  ) {
    updateInvitation(
      id: $id
      input: {
        approved: $approved
        rsvpChoice: $rsvpChoice
        maxInvitees: $maxInvitees
      }
    ) {
      approved
      eventId
      guestProfileId
      id
      invitedByInvitationId
      maxInvitees
      rsvpChoice
      status
    }
  }
`;

/** ▶️ RSVP-ACCEPT: erstellt bei Bedarf GuestProfile (E-Mail ist optional) */
export const ACCEPT_INVITATION = gql /* GraphQL */ `
  mutation AcceptInvitation(
    $id: ID!
    $firstName: String!
    $lastName: String!
    $email: String
  ) {
    acceptInvitation(
      id: $id
      input: { firstName: $firstName, lastName: $lastName, email: $email }
    ) {
      id
      eventId
      guestProfileId
      status
      rsvpChoice
      maxInvitees
      invitedByInvitationId
      approved
    }
  }
`;
