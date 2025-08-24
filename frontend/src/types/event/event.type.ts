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

export type EventsQueryResult = {
    events: Event[];
};

export type EventByIdQueryResult = {
    event: Event | null;
};
