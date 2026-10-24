import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  clearReadNotifications,
  getGetNotificationQueryKey,
  getListNotificationsQueryKey,
  markAllNotificationsRead,
  markNotificationRead,
  useListNotifications,
  type CitizenNotification,
} from "@workspace/api-client-react";

const POLL_MS = 60_000;

/**
 * The citizen's broadcast inbox with per-notification read state, shared via
 * React Query between the home screen badge, the inbox and the detail screen.
 * Read/clear actions update the cache optimistically, then sync with the server.
 */
export function useNotificationsInbox(userId: string | null) {
  const queryClient = useQueryClient();
  const listKey = getListNotificationsQueryKey();

  const listQuery = useListNotifications({
    query: {
      queryKey: listKey,
      enabled: !!userId,
      refetchInterval: POLL_MS,
    },
  });

  const notifications = listQuery.data ?? [];
  const hasUnread = notifications.some((n) => !n.read);
  const hasRead = notifications.some((n) => n.read);

  const updateList = useCallback(
    (fn: (list: CitizenNotification[]) => CitizenNotification[]) => {
      queryClient.setQueryData<CitizenNotification[]>(listKey, (old) => (old ? fn(old) : old));
    },
    [queryClient, listKey],
  );

  const sync = useCallback(
    () => queryClient.invalidateQueries({ queryKey: listKey }),
    [queryClient, listKey],
  );

  const markRead = useCallback(
    async (id: string) => {
      updateList((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
      queryClient.setQueryData<CitizenNotification>(getGetNotificationQueryKey(id), (old) =>
        old ? { ...old, read: true } : old,
      );
      await markNotificationRead(id).catch(() => sync());
    },
    [updateList, queryClient, sync],
  );

  const markAllRead = useCallback(async () => {
    updateList((list) => list.map((n) => ({ ...n, read: true })));
    await markAllNotificationsRead().catch(() => {});
    await sync();
  }, [updateList, sync]);

  const clearRead = useCallback(async () => {
    updateList((list) => list.filter((n) => !n.read));
    await clearReadNotifications().catch(() => {});
    await sync();
  }, [updateList, sync]);

  return {
    notifications,
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    refetch: listQuery.refetch,
    hasUnread,
    hasRead,
    markRead,
    markAllRead,
    clearRead,
  };
}
