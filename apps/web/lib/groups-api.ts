import { authFetch } from "./auth";

export type GroupSummary = {
  id: string;
  name: string;
  code: string;
  ownerId: string;
  _count: { members: number };
};

export type GroupMember = {
  id: string;
  name: string;
  isOwner: boolean;
  completedCount: number;
  streakCurrent: number;
  weeklyMinutes: number;
};

export type GroupDetail = {
  id: string;
  name: string;
  code: string;
  isOwner: boolean;
  members: GroupMember[];
};

export const getMyGroups = () => authFetch<GroupSummary[]>("/groups");
export const createGroup = (name: string) =>
  authFetch<{ id: string; name: string; code: string }>("/groups", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
export const joinGroup = (code: string) =>
  authFetch<{ id: string; name: string }>("/groups/join", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
export const getGroup = (id: string) => authFetch<GroupDetail>(`/groups/${id}`);
export const leaveGroup = (id: string) =>
  authFetch<{ ok: boolean; deleted: boolean }>(`/groups/${id}/leave`, { method: "DELETE" });
