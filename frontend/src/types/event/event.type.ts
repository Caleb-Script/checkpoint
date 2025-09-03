export type Event = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  allowReEntry: boolean;
  rotateSeconds: number;
  maxSeats?: number | null;
  createdAt: string;
  updatedAt: string;
};


export type CreateEventInput = {
  name: string;
  startsAt: string; // datetime-local (YYYY-MM-DDTHH:mm)
  endsAt: string; // datetime-local (YYYY-MM-DDTHH:mm)
  allowReEntry: boolean;
  rotateSeconds: number;
  maxSeats: number;
};
