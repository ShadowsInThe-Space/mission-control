#!/usr/bin/env node
/**
 * gen-buzz-keys.mjs — Generate per-agent Nostr keypairs for Buzz communication.
 *
 * Each agent gets its own secp256k1 keypair (private key hex + derived pubkey hex).
 * The private key signs Nostr events (NIP-42 auth) when the `buzz` CLI sends messages.
 *
 * Output:
 *   - scripts/buzz-keys.json  (agentId → { pubkey, privateKey }) — GITIGNORED, never commit
 *   - Also prints .env.local snippet to copy-paste
 *
 * Usage:
 *   node scripts/gen-buzz-keys.mjs              # generate for all chat-capable agents
 *   node scripts/gen-buzz-keys.mjs hermes claude # generate only for specific agents
 *
 * Security: Private keys are secrets. This script writes them to a gitignored JSON file
 * and prints a .env snippet. Store the .env values, then delete buzz-keys.json if you
 * don't need the intermediate file.
 */
import { randomBytes } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEYS_FILE = join(__dirname, 'buzz-keys.json');

// The chat-capable agents that need Buzz identities
const DEFAULT_AGENTS = ['hermes', 'openclaw', 'claude', 'gemini', 'mmx', 'codex', 'antigravity'];

/**
 * Generate a Nostr-compatible secp256k1 keypair.
 * Private key = 32 random bytes (hex).
 * Public key = secp256k1 multiply: G * privKey → x-only (32 bytes, hex).
 *
 * We use the @noble/secp256k1 library if available (it's a transitive dep of nostr tools),
 * otherwise fall back to a raw implementation note. For now, we generate the private key
 * and let the `buzz` CLI derive and verify the pubkey on first use.
 */
function generateKeypair() {
  // Generate 32 cryptographically secure random bytes
  const privKeyBytes = randomBytes(32);
  const privateKey = privKeyBytes.toString('hex');

  // The pubkey must be derived via secp256k1 elliptic curve multiplication.
  // We can't do this with plain Node crypto. Instead of pulling in a dependency,
  // we generate the private key and let the operator verify the pubkey via:
  //   buzz --private-key <hex> users get-profile
  // Or we use the `noble` package if installed.
  return { privateKey, pubkey: null };
}

async function main() {
  const requestedAgents = process.argv.slice(2);
  const agents = requestedAgents.length > 0 ? requestedAgents : DEFAULT_AGENTS;

  // Try to derive pubkeys via @noble/secp256k1 if available
  let derivePubkey = null;
  try {
    const noble = await import('@noble/secp256k1');
    derivePubkey = (privHex) => {
      const point = noble.Point.fromPrivateKey(privHex);
      // Nostr uses x-only (32-byte) pubkeys
      return point.toRawBytes().subarray(1).toString('hex');
    };
  } catch {
    console.log('⚠ @noble/secp256k1 not installed — pubkeys will be derived on first CLI use.');
    console.log('  To get pubkeys now: npm install --no-save @noble/secp256k1\n');
  }

  // Load existing keys to preserve already-generated agents
  const existing = existsSync(KEYS_FILE)
    ? JSON.parse(readFileSync(KEYS_FILE, 'utf-8'))
    : {};

  const keys = { ...existing };

  for (const agent of agents) {
    if (keys[agent]) {
      console.log(`✓ ${agent}: already has a keypair (skipping)`);
      continue;
    }
    const pair = generateKeypair();
    if (derivePubkey) {
      pair.pubkey = derivePubkey(pair.privateKey);
    }
    keys[agent] = pair;
    console.log(`✓ ${agent}: generated keypair${pair.pubkey ? ` (pubkey: ${pair.pubkey.slice(0, 16)}…)` : ''}`);
  }

  // Write the gitignored JSON file
  writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2) + '\n');
  console.log(`\n📄 Written ${KEYS_FILE} (gitignored — do NOT commit)`);

  // Print .env.local snippet
  console.log('\n📋 Add these to your .env.local:\n');
  for (const agent of agents) {
    const envVar = `BUZZ_${agent.toUpperCase().replace(/-/g, '_')}_KEY`;
    console.log(`${envVar}=${keys[agent].privateKey}`);
  }

  // Verify .gitignore covers buzz-keys.json
  const gitignorePath = join(__dirname, '..', '.gitignore');
  if (existsSync(gitignorePath)) {
    const gitignore = readFileSync(gitignorePath, 'utf-8');
    if (!gitignore.includes('buzz-keys.json')) {
      console.log('\n⚠ WARNING: buzz-keys.json is not in .gitignore! Add it to prevent leaking private keys.');
    }
  }

  console.log('\n🔒 Private keys are secrets. Store them in .env.local and never commit.');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
