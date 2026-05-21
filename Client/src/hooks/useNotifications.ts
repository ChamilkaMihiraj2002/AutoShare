import React from 'react';
import { getMyRents, getMyVehicles, getOwnerRents, getPublicVehicles, getUserPublicProfile } from '../lib/api';
import {
  buildOwnerNotifications,
  buildRenterNotifications,
  getNotificationReadStorageKey,
} from '../lib/notifications';
import type { AppNotification, PublicUserProfile } from '../types';

type NotificationMode = 'owner' | 'renter';

function loadReadIds(mode: NotificationMode): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(getNotificationReadStorageKey(mode));
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistReadIds(mode: NotificationMode, ids: string[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getNotificationReadStorageKey(mode), JSON.stringify(ids));
}

export function useNotifications(mode: NotificationMode) {
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [readIds, setReadIds] = React.useState<string[]>(() => loadReadIds(mode));

  React.useEffect(() => {
    setReadIds(loadReadIds(mode));
  }, [mode]);

  const loadNotifications = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (mode === 'owner') {
        const [rents, vehicles] = await Promise.all([getOwnerRents(), getMyVehicles()]);
        const renterUids = Array.from(new Set(rents.map((rent) => rent.renter_uid)));
        const renterProfiles = await Promise.all(
          renterUids.map(async (uid) => {
            try {
              const profile = await getUserPublicProfile(uid);
              return [uid, profile] as const;
            } catch {
              return [uid, undefined] as const;
            }
          }),
        );

        setNotifications(
          buildOwnerNotifications({
            rents,
            vehicles,
            renterProfiles: new Map<string, PublicUserProfile | undefined>(renterProfiles),
          }),
        );
        return;
      }

      const [rents, vehicles] = await Promise.all([getMyRents(), getPublicVehicles()]);
      const ownerUids = Array.from(new Set(rents.map((rent) => rent.owner_uid)));
      const ownerProfiles = await Promise.all(
        ownerUids.map(async (uid) => {
          try {
            const profile = await getUserPublicProfile(uid);
            return [uid, profile] as const;
          } catch {
            return [uid, undefined] as const;
          }
        }),
      );

      setNotifications(
        buildRenterNotifications({
          rents,
          vehicles,
          ownerProfiles: new Map<string, PublicUserProfile | undefined>(ownerProfiles),
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  React.useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const markRead = React.useCallback(
    (notificationId: string) => {
      setReadIds((current) => {
        if (current.includes(notificationId)) return current;
        const next = [...current, notificationId];
        persistReadIds(mode, next);
        return next;
      });
    },
    [mode],
  );

  const markAllRead = React.useCallback(() => {
    const allIds = notifications.map((notification) => notification.id);
    setReadIds(allIds);
    persistReadIds(mode, allIds);
  }, [mode, notifications]);

  const unreadCount = notifications.filter((notification) => !readIds.includes(notification.id)).length;

  return {
    notifications,
    loading,
    error,
    unreadCount,
    readIds,
    markRead,
    markAllRead,
    reload: loadNotifications,
  };
}
