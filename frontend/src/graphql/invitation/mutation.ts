// /web/src/graphql/invitations/mutation.ts
import { gql } from '@apollo/client';

export const CREATE_INVITATION = gql /* GraphQL */ `
  mutation CreateInvitation($eventId: ID!, $maxInvitees: Int!) {
    createInvitation(input: { eventId: $eventId, maxInvitees: $maxInvitees }) {
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

/** Ein generisches Update – du kannst approved, rsvpChoice, maxInvitees usw. setzen */
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
