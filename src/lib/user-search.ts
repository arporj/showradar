export type FollowStatus = "none" | "pending" | "accepted";

export interface UserSearchResult {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  titlesInCommon: number;
  followStatus: FollowStatus;
}
