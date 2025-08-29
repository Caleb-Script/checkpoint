// /frontend/srv/graphql/invitations/mutation.ts
import { gql } from '@apollo/client';

export const CREATE_INVITATION = gql /* GraphQL */ `
  mutation CreateInvitation(
    $eventId: ID!
    $maxInvitees: Int!
    $firstName: String
    $lastName: String
  ) {
    createInvitation(
      input: {
        eventId: $eventId
        maxInvitees: $maxInvitees
        firstName: $firstName
        lastName: $lastName
      }
    ) {
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
    $input: InvitationCreateInput!
  ) {
    createPlusOnesInvitation(
        input: $input
    ) {
        id
        firstName
        lastName
        eventId
        guestProfileId
        status
        createdAt
        updatedAt
        rsvpChoice
        rsvpAt
        approved
        approvedById
        approvedAt
        maxInvitees
        invitedByInvitationId
        invitedById
        plusOnes
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
    )
  }
`;

/** generisches Update (approved, rsvpChoice, maxInvitees ...) */
export const APPROVE_INVITATION = gql /* GraphQL */ `
  mutation UpdateInvitation($id: ID!, $approved: Boolean) {
    updateInvitation(id: $id, input: { approved: $approved }) {
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
export const REPLY_INVITATION = gql /* GraphQL */ `
  mutation REPLY_INVITATIONeplyInvitation($id: ID!, $reply: RSVPReply!) {
    replyInvitation(id: $id, reply: $reply) {
      id
      firstName
      lastName
      eventId
      guestProfileId
      status
      createdAt
      updatedAt
      rsvpChoice
      rsvpAt
      approved
      approvedById
      approvedAt
      maxInvitees
      invitedByInvitationId
      invitedById
      plusOnes
    }
  }
`;
