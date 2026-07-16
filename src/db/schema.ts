import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  foreignKey,
  index,
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
export const userRoleEnum = appSchema.enum("user_role", ["user", "admin"]);
export const userPlanEnum = appSchema.enum("user_plan", ["free", "premium"]);
// Single value today (TV Time) — kept as an enum, not a bare column, so
// Trakt/Simkl/Serializd can be appended later without touching any other
// table or query shape.
export const importSourceEnum = appSchema.enum("import_source", ["tv_time"]);
export const importJobStatusEnum = appSchema.enum("import_job_status", [
  "processing",
  "completed",
  "completed_with_errors",
  "failed",
]);
export const importItemStatusEnum = appSchema.enum("import_item_status", [
  "pending",
  "processing",
  "matched",
  "unmatched",
  "error",
]);

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
  role: userRoleEnum("role").notNull().default("user"),
  // Manually toggled by an admin today (Fase 7's Stripe webhook will write to
  // this same column later instead of replacing it).
  plan: userPlanEnum("plan").notNull().default("free"),
  isSuspended: boolean("is_suspended").notNull().default(false),
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
    voteAverage: numeric("vote_average", { precision: 3, scale: 1 }),
    voteCount: integer("vote_count"),
    lastSyncedAt: timestamp("last_synced_at", { mode: "date" }),
  },
  (t) => [uniqueIndex("episodes_season_id_episode_number_idx").on(t.seasonId, t.episodeNumber)],
);

// One row per post — a user can comment on the same episode more than once
// (unlike user_library's one-row-per-title rating), each post optionally
// carrying its own rating snapshot. "Nota média" for an episode is computed
// from each user's most recent non-null rating (DISTINCT ON), not a raw
// average of every row, so repeat commenters don't skew it — see
// lib/episode-comments.ts::getEpisodeRatingSummary.
export const episodeComments = appSchema.table(
  "episode_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    episodeId: uuid("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    rating: smallint("rating"),
    replyToId: uuid("reply_to_id"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("episode_comments_episode_id_created_at_idx").on(t.episodeId, t.createdAt),
    foreignKey({ columns: [t.replyToId], foreignColumns: [t.id] }).onDelete("set null"),
  ],
);

export const episodeCommentLikes = appSchema.table(
  "episode_comment_likes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => episodeComments.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("episode_comment_likes_comment_id_user_id_idx").on(t.commentId, t.userId)],
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
    reviewText: text("review_text"),
    // Bumped on every save (create or edit) — drives "most recent first" in
    // the public reviews list. reviewCreatedAt below is set once and never
    // touched again, so the feed can tell "first rating" from "edited it
    // again" without the two colliding.
    reviewUpdatedAt: timestamp("review_updated_at", { mode: "date" }),
    reviewCreatedAt: timestamp("review_created_at", { mode: "date" }),
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

// One row per title a user has swiped away from "Recomendados para você" —
// checked on every recompute so a dismissed title never resurfaces there.
export const dismissedRecommendations = appSchema.table(
  "dismissed_recommendations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tmdbId: integer("tmdb_id").notNull(),
    mediaType: mediaTypeEnum("media_type").notNull(),
    dismissedAt: timestamp("dismissed_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("dismissed_recommendations_user_id_tmdb_id_media_type_idx").on(t.userId, t.tmdbId, t.mediaType)],
);

export const importJobs = appSchema.table("import_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  source: importSourceEnum("source").notNull().default("tv_time"),
  status: importJobStatusEnum("status").notNull().default("processing"),
  totalItems: integer("total_items").notNull().default(0),
  processedItems: integer("processed_items").notNull().default(0),
  matchedItems: integer("matched_items").notNull().default(0),
  unmatchedItems: integer("unmatched_items").notNull().default(0),
  errorItems: integer("error_items").notNull().default(0),
  // Top-level failure only (e.g. "not a TV Time export") — per-item failures
  // live on import_job_items.error_message instead.
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { mode: "date" }),
});

// One row per distinct show/movie found while parsing the source export —
// episodesJson carries the raw (season, episode, watchedAt) tuples for a TV
// item so matching+writing can happen in small client-driven batches
// (processImportBatch) instead of one long-running action.
export const importJobItems = appSchema.table(
  "import_job_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => importJobs.id, { onDelete: "cascade" }),
    rawTitle: text("raw_title").notNull(),
    canonicalKey: text("canonical_key").notNull(),
    mediaType: mediaTypeEnum("media_type").notNull(),
    yearHint: integer("year_hint"),
    episodesJson: jsonb("episodes_json").$type<{ seasonNumber: number; episodeNumber: number; watchedAt: string }[]>(),
    movieWatchedAt: timestamp("movie_watched_at", { mode: "date" }),
    status: importItemStatusEnum("status").notNull().default("pending"),
    tmdbId: integer("tmdb_id"),
    titleId: uuid("title_id").references(() => titles.id, { onDelete: "set null" }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { mode: "date" }),
  },
  (t) => [
    uniqueIndex("import_job_items_job_id_canonical_key_media_type_idx").on(t.jobId, t.canonicalKey, t.mediaType),
    index("import_job_items_job_id_status_idx").on(t.jobId, t.status),
  ],
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

export const importJobsRelations = relations(importJobs, ({ one, many }) => ({
  user: one(users, { fields: [importJobs.userId], references: [users.id] }),
  items: many(importJobItems),
}));

export const importJobItemsRelations = relations(importJobItems, ({ one }) => ({
  job: one(importJobs, { fields: [importJobItems.jobId], references: [importJobs.id] }),
  title: one(titles, { fields: [importJobItems.titleId], references: [titles.id] }),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  library: many(userLibrary),
  episodeProgress: many(userEpisodeProgress),
  importJobs: many(importJobs),
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
