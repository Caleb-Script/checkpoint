// /frontend/srv/graphql/invitations/query.ts
import { gql } from '@apollo/client';

export const INVITATIONS = gql /* GraphQL */ `
  query Invitations {
    invitations {
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

export const INVITATION = gql /* GraphQL */ `
  query Invitation($id: ID!) {
    invitation(id: $id) {
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
