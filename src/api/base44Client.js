import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion } = appParams;

//Create a client with authentication required
// SECURITY: serverUrl is hardcoded to '' (same-origin) — the client must never
// be pointed at an attacker-chosen backend via ?server_url= or localStorage.
export const base44 = createClient({
  appId,
  serverUrl: '',
  token,
  functionsVersion,
  requiresAuth: false
});