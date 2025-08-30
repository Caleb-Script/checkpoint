// /frontend/src/components/notifications/useUnreadCount.ts
'use client';

import { useEffect, useMemo } from 'react';
import { useQuery, useSubscription } from '@apollo/client';
import { QUERY_MY_NOTIFICATIONS, SUB_NOTIFICATION_ADDED, SUB_NOTIFICATION_UPDATED } from '../../graphql/notification';
import { QUERY_NOTIFICATIONS_ALL } from '../../app/admin/notifications/page';
import { useAuth } from '../../context/AuthContext';

export function useUnreadCount(recipientUsername?: string | null) {
    const { isAdmin } = useAuth();
    const enabled = Boolean(recipientUsername);

    // --- User Query ---
    const { data: userData, refetch: userRefetch } = useQuery(QUERY_MY_NOTIFICATIONS, {
        skip: !enabled || isAdmin, // nur wenn user und kein Admin
        variables: {
            input: { recipientUsername, includeRead: false, limit: 50 },
        },
        fetchPolicy: 'cache-and-network',
    });

    // --- Admin Query ---
    const { data: adminData, refetch: adminRefetch } = useQuery(QUERY_NOTIFICATIONS_ALL, {
        skip: !isAdmin, // nur Admins laden
        variables: {
            input: { recipientUsername, includeRead: false, limit: 50 },
        },
        fetchPolicy: 'cache-and-network',
    });


    // --- Refetch wählen ---
    const refetch = isAdmin ? adminRefetch : userRefetch;

    const notificationsLength = isAdmin
        ? adminData?.notifications?.length ?? 0
        : userData?.myNotifications?.items?.length ?? 0;

    const unread = useMemo(() => notificationsLength, [notificationsLength]);

    // --- Subscriptions ---
    useSubscription(SUB_NOTIFICATION_ADDED, {
        skip: !enabled,
        variables: { recipientUsername },
        onData: () => void refetch(),
    });

    useSubscription(SUB_NOTIFICATION_UPDATED, {
        skip: !enabled,
        variables: { recipientUsername },
        onData: () => void refetch(),
    });

    return unread;
}
