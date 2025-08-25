// /web/src/graphql/invitations/query.ts
import { gql } from '@apollo/client';

export const INVITATIONS = gql /* GraphQL */ `
  query Invitations {
    invitations {
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

export const INVITATION = gql /* GraphQL */ `
  query Invitation($id: ID!) {
    invitation(id: $id) {
      approved
      eventId
      guestProfileId
      id
      invitedByInvitationId
      maxInvitees
      rsvpChoice
      status
      plusOnes {
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
  }
`;
