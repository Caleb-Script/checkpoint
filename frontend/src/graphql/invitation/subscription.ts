// /frontend/src/graphql/invitation/subscription.ts
import { gql } from '@apollo/client';

export const INVITATION_UPDATED_SUB = gql`
  subscription InvitationUpdated($id: ID!) {
    invitationUpdated(id: $id) {
        id
        guestProfileId
        status
        userId
        rsvpChoice
    }
}

`;
