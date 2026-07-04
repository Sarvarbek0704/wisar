import { authFetch } from "./auth";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export const listNotifications = (unreadOnly = false) =>
  authFetch<AppNotification[]>(`/notifications${unreadOnly ? "?unread=1" : ""}`);

export const getUnreadCount = () =>
  authFetch<{ count: number }>("/notifications/unread-count");

export const markNotificationRead = (id: string) =>
  authFetch(`/notifications/${id}/read`, { method: "PATCH" });

export const markAllNotificationsRead = () =>
  authFetch("/notifications/read-all", { method: "PATCH" });
