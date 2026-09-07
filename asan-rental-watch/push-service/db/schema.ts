import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const devices = sqliteTable('devices', {
  id: text('id').primaryKey(), tokenHash: text('token_hash').notNull(), subscription: text('subscription').notNull(),
  createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(),
}, t => [index('idx_devices_token').on(t.tokenHash)]);
export const state = sqliteTable('state', { key: text('key').primaryKey(), value: text('value').notNull() });
export const events = sqliteTable('events', {
  id: text('id').primaryKey(), title: text('title').notNull(), body: text('body').notNull(),
  createdAt: integer('created_at').notNull(), expiresAt: integer('expires_at').notNull(), audience: text('audience'),
}, t => [index('idx_events_expiry').on(t.expiresAt)]);
export const deliveries = sqliteTable('deliveries', {
  deviceId: text('device_id').notNull(), eventId: text('event_id').notNull(), sentAt: integer('sent_at'), receivedAt: integer('received_at'),
  attempts: integer('attempts').notNull().default(0), nextAttemptAt: integer('next_attempt_at').notNull().default(0), lastError: text('last_error'),
}, t => [primaryKey({ columns: [t.deviceId, t.eventId] })]);
