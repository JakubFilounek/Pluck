import { spawnSync } from 'node:child_process';

/**
 * Resolves the AMO credentials.
 *
 * Reads the process environment first, then — on Windows — falls back to the User
 * environment in the registry. That fallback matters because Windows Terminal and
 * VS Code snapshot the environment when the *application* starts: opening a new tab
 * inherits the stale copy, so a freshly set variable stays invisible until the whole
 * app is restarted. Reading the registry directly sidesteps it.
 *
 * Nothing here ever prints a credential value.
 */

const ISSUER = /^user:\d+:\d+$/;
const SECRET = /^[0-9a-f]{40,}$/i;

/** Reads a User-scope environment variable straight from the registry. */
function fromWindowsUserEnv(name) {
  if (process.platform !== 'win32') return undefined;

  const result = spawnSync('reg', ['query', 'HKCU\\Environment', '/v', name], {
    encoding: 'utf8',
    windowsHide: true,
  });

  if (result.status !== 0 || !result.stdout) return undefined;

  // "    WEB_EXT_API_KEY    REG_SZ    user:123:4"
  const match = /REG_(?:EXPAND_)?SZ\s+(.*)/.exec(result.stdout);
  return match?.[1]?.trim() || undefined;
}

export function resolveCredentials() {
  const key = process.env.WEB_EXT_API_KEY || fromWindowsUserEnv('WEB_EXT_API_KEY');
  const secret = process.env.WEB_EXT_API_SECRET || fromWindowsUserEnv('WEB_EXT_API_SECRET');

  return { key, secret };
}

/** Returns a list of human-readable problems; empty means the pair looks usable. */
export function validateCredentials({ key, secret }) {
  const problems = [];

  if (!key) {
    problems.push('WEB_EXT_API_KEY is not set.');
  } else if (SECRET.test(key)) {
    problems.push(
      'WEB_EXT_API_KEY holds a long hex string — that is the SECRET.\n' +
        '    It wants the JWT issuer, which looks like "user:19614329:531".\n' +
        '    (Mozilla calls the issuer the "API key", which is where this goes wrong.)',
    );
  } else if (!ISSUER.test(key)) {
    problems.push(
      `WEB_EXT_API_KEY does not look like a JWT issuer (expected "user:NNN:NNN", got ${key.length} characters).`,
    );
  }

  if (!secret) {
    problems.push('WEB_EXT_API_SECRET is not set.');
  } else if (ISSUER.test(secret)) {
    problems.push('WEB_EXT_API_SECRET holds the issuer — the two values are swapped.');
  } else if (!SECRET.test(secret)) {
    problems.push(
      `WEB_EXT_API_SECRET does not look like a JWT secret (expected a long hex string, got ${secret.length} characters).`,
    );
  }

  return problems;
}

export function reportProblems(problems) {
  console.error('\nAMO credentials are not usable:\n');
  for (const problem of problems) console.error(`  - ${problem}`);

  console.error(
    '\nBoth values come from https://addons.mozilla.org/en-US/developers/addon/api/key/',
  );
  console.error('The issuer is always visible there; the secret is shown only once.\n');
  console.error('Set them with:');
  console.error(
    "  [Environment]::SetEnvironmentVariable('WEB_EXT_API_KEY', 'user:NNN:NNN', 'User')",
  );
  console.error(
    "  [Environment]::SetEnvironmentVariable('WEB_EXT_API_SECRET', '<64 hex chars>', 'User')",
  );
  console.error('');
}
