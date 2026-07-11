import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgSchema,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const appSchema = pgSchema("showradar");

export const avatarSourceEnum = appSchema.enum("avatar_source", [
  "default",
  "upload",
  "oauth",
]);
export const mediaTypeEnum = appSchema.enum("media_type", ["movie", "tv"]);
export const libraryStatusEnum = appSchema.enum("library_status", [
  "plan_to_watch",
  "watching",
  "completed",
  "dropped",
]);
export const notificationChannelEnum = appSchema.enum(
  "notification_channel",
  ["email", "push"],
);
export const notificationTypeEnum = appSchema.enum("notification_type", [
  "new_episode",
  "new_season",
  "new_movie_release",
]);
export const notificationStatusEnum = appSchema.enum("notification_status", [
  "pending",
  "sent",
  "failed",
]);
export const followStatusEnum = appSchema.enum("follow_status", ["pending", "accepted"]);

// Auth.js adapter requires these exact JS property names (id/name/email/emailVerified/image)
// on the users table it's handed; everything else here is app-specific.
export const users = appSchema.table("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").unique(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  avatarUrl: text("avatar_url"),
  avatarSource: avatarSourceEnum("avatar_source").notNull().default("default"),
  passwordHash: text("password_hash"),
  sessionVersion: integer("session_version").notNull().default(0),
  // Closed by default: existing accounts never opted into a publicly viewable
  // library, so new/existing rows start private until the user opens up.
  isPrivate: boolean("is_private").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const accounts = appSchema.table(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

// Own table for password recovery — not part of the Auth.js adapter contract,
// since Credentials-based auth gets no built-in "forgot password" flow.
export const passwordResetTokens = appSchema.table("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  usedAt: timestamp("used_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const titles = appSchema.table(
  "titles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tmdbId: integer("tmdb_id").notNull(),
    mediaType: mediaTypeEnum("media_type").notNull(),
    name: text("name").notNull(),
    overview: text("overview"),
    posterPath: text("poster_path"),
    backdropPath: text("backdrop_path"),
    releaseDate: date("release_date", { mode: "string" }),
    firstAirDate: date("first_air_date", { mode: "string" }),
    runtime: integer("runtime"),
    episodeRunTime: integer("episode_run_time").array(),
    genres: jsonb("genres").$type<{ id: number; name: string }[]>(),
    credits: jsonb("credits"),
    voteAverage: numeric("vote_average", { precision: 3, scale: 1 }),
    popularity: numeric("popularity"),
    status: text("status"),
    inProduction: boolean("in_production"),
    originCountry: text("origin_country").array(),
    nextEpisodeToAir: jsonb("next_episode_to_air"),
    lastEpisodeToAir: jsonb("last_episode_to_air"),
    watchProvidersBr: jsonb("watch_providers_br"),
    lastSyncedAt: timestamp("last_synced_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("titles_tmdb_id_media_type_idx").on(t.tmdbId, t.mediaType)],
);

export const seasons = appSchema.table(
  "seasons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    titleId: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    seasonNumber: integer("season_number").notNull(),
    name: text("name"),
    overview: text("overview"),
    airDate: date("air_date", { mode: "string" }),
    posterPath: text("poster_path"),
    episodeCount: integer("episode_count"),
    lastSyncedAt: timestamp("last_synced_at", { mode: "date" }),
  },
  (t) => [uniqueIndex("seasons_title_id_season_number_idx").on(t.titleId, t.seasonNumber)],
);

export const episodes = appSchema.table(
  "episodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    titleId: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    episodeNumber: integer("episode_number").notNull(),
    name: text("name"),
    overview: text("overview"),
    airDate: date("air_date", { mode: "string" }),
    runtime: integer("runtime"),
    stillPath: text("still_path"),
    lastSyncedAt: timestamp("last_synced_at", { mode: "date" }),
  },
  (t) => [uniqueIndex("episodes_season_id_episode_number_idx").on(t.seasonId, t.episodeNumber)],
);

export const userLibrary = appSchema.table(
  "user_library",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    titleId: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    status: libraryStatusEnum("status").notNull().default("plan_to_watch"),
    isFavorite: boolean("is_favorite").notNull().default(false),
    personalRating: smallint("personal_rating"),
    addedAt: timestamp("added_at", { mode: "date" }).notNull().defaultNow(),
    watchedAt: timestamp("watched_at", { mode: "date" }),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_library_user_id_title_id_idx").on(t.userId, t.titleId)],
);

// followerId sends the request; followingId is the target who must accept it
// before the relationship is "accepted" (Instagram-style private follow).
export const follows = appSchema.table(
  "follows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: followStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    respondedAt: timestamp("responded_at", { mode: "date" }),
  },
  (t) => [uniqueIndex("follows_follower_id_following_id_idx").on(t.followerId, t.followingId)],
);

export const userEpisodeProgress = appSchema.table(
  "user_episode_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    episodeId: uuid("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    watchedAt: timestamp("watched_at", { mode: "date" }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_episode_progress_user_id_episode_id_idx").on(t.userId, t.episodeId)],
);

export const pushSubscriptions = appSchema.table("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  platform: text("platform").notNull().default("web"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { mode: "date" }).notNull().defaultNow(),
});

export const notificationPreferences = appSchema.table(
  "notification_preferences",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    emailEnabled: boolean("email_enabled").notNull().default(true),
    pushEnabled: boolean("push_enabled").notNull().default(true),
    notifyNewEpisode: boolean("notify_new_episode").notNull().default(true),
    notifyNewSeason: boolean("notify_new_season").notNull().default(true),
    quietHoursStart: time("quiet_hours_start"),
    quietHoursEnd: time("quiet_hours_end"),
    timezone: text("timezone").notNull().default("UTC"),
  },
);

export const notificationLog = appSchema.table("notification_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  titleId: uuid("title_id").references(() => titles.id, { onDelete: "cascade" }),
  episodeId: uuid("episode_id").references(() => episodes.id, { onDelete: "cascade" }),
  seasonId: uuid("season_id").references(() => seasons.id, { onDelete: "cascade" }),
  channel: notificationChannelEnum("channel").notNull(),
  notificationType: notificationTypeEnum("notification_type").notNull(),
  status: notificationStatusEnum("status").notNull().default("pending"),
  dedupKey: text("dedup_key").notNull().unique(),
  sentAt: timestamp("sent_at", { mode: "date" }),
  error: text("error"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  library: many(userLibrary),
  episodeProgress: many(userEpisodeProgress),
  notificationPreferences: one(notificationPreferences, {
    fields: [users.id],
    references: [notificationPreferences.userId],
  }),
  outgoingFollows: many(follows, { relationName: "user_follows_as_follower" }),
  incomingFollows: many(follows, { relationName: "user_follows_as_target" }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: "user_follows_as_follower",
  }),
  followingUser: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: "user_follows_as_target",
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const titlesRelations = relations(titles, ({ many }) => ({
  seasons: many(seasons),
  episodes: many(episodes),
  libraryEntries: many(userLibrary),
}));

export const seasonsRelations = relations(seasons, ({ one, many }) => ({
  title: one(titles, { fields: [seasons.titleId], references: [titles.id] }),
  episodes: many(episodes),
}));

export const episodesRelations = relations(episodes, ({ one, many }) => ({
  season: one(seasons, { fields: [episodes.seasonId], references: [seasons.id] }),
  title: one(titles, { fields: [episodes.titleId], references: [titles.id] }),
  progress: many(userEpisodeProgress),
}));

export const userLibraryRelations = relations(userLibrary, ({ one }) => ({
  user: one(users, { fields: [userLibrary.userId], references: [users.id] }),
  title: one(titles, { fields: [userLibrary.titleId], references: [titles.id] }),
}));

export const userEpisodeProgressRelations = relations(userEpisodeProgress, ({ one }) => ({
  user: one(users, { fields: [userEpisodeProgress.userId], references: [users.id] }),
  episode: one(episodes, { fields: [userEpisodeProgress.episodeId], references: [episodes.id] }),
}));
