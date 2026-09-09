import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [header, migration, commentMigration, profile] = await Promise.all([
  readFile(new URL('../src/components/global-header.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260906120000_profile_only_follow_notifications.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260909210757_comment_reactions_and_deep_notifications.sql', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/(tabs)/profile.tsx', import.meta.url), 'utf8'),
]);

assert.match(header, /SOCIAL_NOTIFICATION_TYPES = \[[^\]]*'like'[^\]]*'comment'[^\]]*'comment_reply'/);
assert.doesNotMatch(header, /SOCIAL_NOTIFICATION_TYPES = \[[^\]]*'follow'/);
assert.doesNotMatch(header, /Tenés un nuevo seguidor|You have a new follower/);
assert.match(migration, /notify_follow_in_profile_only/);
assert.match(migration, /'follow'/);
assert.doesNotMatch(migration, /net\.http_post|expo_push_token/);
assert.match(commentMigration, /create table public\.traveler_reply_reactions/);
assert.match(commentMigration, /insert into public\.app_options\(kind,/);
assert.doesNotMatch(commentMigration, /app_options\(category,/);
assert.match(commentMigration, /'comment_reaction'/);
assert.match(commentMigration, /'comment_reply'/);
assert.match(profile, /data\.notifications\.map/);

console.log('Follow notifications stay in Profile and are excluded from global and push presentation.');
