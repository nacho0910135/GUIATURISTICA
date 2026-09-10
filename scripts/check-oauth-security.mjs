import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const provider = readFileSync(new URL('../src/providers/app-provider.tsx', import.meta.url), 'utf8');
const client = readFileSync(new URL('../src/lib/supabase.ts', import.meta.url), 'utf8');

assert.match(client, /flowType:\s*['"]pkce['"]/);
assert.match(client, /appendPkceFlowIdToRedirects:\s*true/);
assert.match(provider, /exchangeCodeForSession\(code, \{ flowId \}\)/);
assert.match(provider, /callbackUrl\.protocol !== 'descubriendocr:'[\s\S]*callbackUrl\.hostname !== 'auth'[\s\S]*callbackUrl\.pathname !== '\/callback'/);
assert.doesNotMatch(provider, /setSession\s*\(/);
assert.doesNotMatch(provider, /searchParams\.get\(['"](?:access_token|refresh_token)['"]\)/);

const storage = new Map();
let tokenRequests = 0;
const auth = createClient('https://example.supabase.co', 'test-key', {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    flowType: 'pkce',
    experimental: { appendPkceFlowIdToRedirects: true },
    persistSession: false,
    storage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
  },
  global: {
    fetch: async () => {
      tokenRequests += 1;
      return new Response(JSON.stringify({ error: 'invalid_grant' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    },
  },
}).auth;

assert.ok((await auth.exchangeCodeForSession('unsolicited', { flowId: '0'.repeat(32) })).error);
assert.equal(tokenRequests, 0, 'a callback without a local PKCE verifier must be rejected locally');

const { data, error } = await auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: 'descubriendocr://auth/callback', skipBrowserRedirect: true },
});
assert.ifError(error);
assert.ok(data.url);
assert.ok(data.flowId);
assert.ok(new URL(data.url).searchParams.get('redirect_to')?.includes(`sb_flow_id=${data.flowId}`));
assert.ok((await auth.exchangeCodeForSession('forged', { flowId: 'f'.repeat(32) })).error);
assert.equal(tokenRequests, 0, 'a forged flow id must not consume another pending verifier');
assert.ok((await auth.exchangeCodeForSession('requested', { flowId: data.flowId })).error);
assert.equal(tokenRequests, 1, 'an initiated flow must reach the code exchange');
assert.ok((await auth.exchangeCodeForSession('replayed', { flowId: data.flowId })).error);
assert.equal(tokenRequests, 1, 'the local PKCE verifier must be single-use');
