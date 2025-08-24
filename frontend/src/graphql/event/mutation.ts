// /web/src/graphql/events/mutation.ts
import { gql } from '@apollo/client';

/**
 * Event erstellen
 */
export const CREATE_EVENT = gql`
  mutation CreateEvent(
    $name: String!
    $startsAt: DateTime!
    $endsAt: DateTime!
    $allowReEntry: Boolean!
    $rotateSeconds: Int!
    $maxSeats: Int
  ) {
    createEvent(
      input: {
        name: $name
        startsAt: $startsAt
        endsAt: $endsAt
        allowReEntry: $allowReEntry
        rotateSeconds: $rotateSeconds
        maxSeats: $maxSeats
      }
    ) {
      allowReEntry
      createdAt
      endsAt
      id
      maxSeats
      name
      rotateSeconds
      startsAt
      updatedAt
    }
  }
`;

/**
 * Event aktualisieren (Beispiel: allowReEntry togglen)
 */
export const UPDATE_EVENT = gql`
  mutation UpdateEvent(
    $id: ID!
    $allowReEntry: Boolean
    $name: String
    $rotateSeconds: Int
    $maxSeats: Int
    $startsAt: DateTime
    $endsAt: DateTime
  ) {
    updateEvent(
      input: {
        id: $id
        allowReEntry: $allowReEntry
        name: $name
        rotateSeconds: $rotateSeconds
        maxSeats: $maxSeats
        startsAt: $startsAt
        endsAt: $endsAt
      }
    ) {
      allowReEntry
      createdAt
      endsAt
      id
      maxSeats
      name
      rotateSeconds
      startsAt
      updatedAt
    }
  }
`;

/**
 * Event löschen
 */
export const DELETE_EVENT = gql`
  mutation DeleteEvent($id: ID!) {
    deleteEvent(id: $id) {
      allowReEntry
      createdAt
      endsAt
      id
      maxSeats
      name
      rotateSeconds
      startsAt
      updatedAt
    }
  }
`;

/**
 * Einzelsitz anlegen
 */
export const CREATE_SEAT = gql`
  mutation CreateSeat(
    $eventId: ID!
    $note: String
    $number: String
    $section: String
    $table: String
  ) {
    createSeat(
      input: {
        eventId: $eventId
        note: $note
        number: $number
        section: $section
        table: $table
      }
    ) {
      eventId
      id
      note
      number
      section
      table
    }
  }
`;

/**
 * Mehrere Sitze importieren
 */
export const IMPORT_SEATS = gql`
  mutation ImportSeats($eventId: ID!, $seats: [SeatImportInput!]!) {
    importSeats(input: { eventId: $eventId, seats: $seats }) {
      eventId
      id
      note
      number
      section
      table
    }
  }
`;
