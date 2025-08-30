// /frontend/src/graphql/notifications.ts
import { gql } from '@apollo/client';

export const NOTIFICATION_FIELDS = gql`
  fragment NotificationFields on Notification {
    id
    recipientUsername
    recipientId
    recipientTenant
    templateId
    variables
    renderedTitle
    renderedBody
    data
    linkUrl
    priority
    category
    status
    read
    deliveredAt
    readAt
    archivedAt
    expiresAt
    sensitive
    createdAt
    updatedAt
    createdBy
  }
`;

export const SUB_NOTIFICATION_ADDED = gql`
  subscription OnNotificationAdded($recipientUsername: String!) {
    notificationAdded(recipientUsername: $recipientUsername) {
      ...NotificationFields
    }
  }
  ${NOTIFICATION_FIELDS}
`;

export const SUB_NOTIFICATION_UPDATED = gql`
  subscription OnNotificationUpdated($recipientUsername: String!) {
    notificationUpdated(recipientUsername: $recipientUsername) {
      ...NotificationFields
    }
  }
  ${NOTIFICATION_FIELDS}
`;

export const QUERY_MY_NOTIFICATIONS = gql`
  query MyNotifications($input: ListNotificationsInput!) {
    myNotifications(input: $input) {
      nextCursor
        items {
            id
            recipientUsername
            recipientId
            recipientTenant
            templateId
            variables
            renderedTitle
            renderedBody
            data
            linkUrl
            priority
            category
            status
            read
            deliveredAt
            readAt
            archivedAt
            expiresAt
            sensitive
            createdAt
            updatedAt
            createdBy
        }
    }
  }
`;

/** Optional: Wenn du eine Admin-Query hast, die *alle* liefert. */
export const QUERY_ADMIN_NOTIFICATIONS = gql`
  query AdminNotifications{
     notifications {
        id
        recipientUsername
        recipientId
        recipientTenant
        templateId
        variables
        renderedTitle
        renderedBody
        data
        linkUrl
        priority
        category
        status
        read
        deliveredAt
        readAt
        archivedAt
        expiresAt
        sensitive
        createdAt
        updatedAt
        createdBy
    }
}

  ${NOTIFICATION_FIELDS}
`;

export const MUT_MARK_READ = gql`
  mutation MarkNotificationRead($input: MarkReadInput!) {
    markNotificationRead(input: $input) { ...NotificationFields }
  }
  ${NOTIFICATION_FIELDS}
`;

export const MUT_ARCHIVE = gql`
  mutation ArchiveNotification($id: ID!) {
    archiveNotification(id: $id) { ...NotificationFields }
  }
  ${NOTIFICATION_FIELDS}
`;
