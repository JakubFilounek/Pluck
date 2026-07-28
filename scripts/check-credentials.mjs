/**
 * Preflight for `npm run sign`.
 *
 * Validates the AMO credentials before anything is built or uploaded. Without this
 * the failure surfaces as web-ext dumping its full help text with "Missing required
 * arguments" at the bottom, which says nothing about *why* — and the easiest mistake
 * to make is pasting the secret into WEB_EXT_API_KEY, since Mozilla confusingly calls
 * the short issuer string the "API key".
 *
 * Nothing here prints a credential value.
 */

const ISSUER = /^user:\d+:\d+$/;
const SECRET = /^[0-9a-f]{40,}$/i;

const key = process.env.WEB_EXT_API_KEY;
const secret = process.env.WEB_EXT_API_SECRET;

const problems = [];

if (!key) {
  problems.push('WEB_EXT_API_KEY is not set in this shell.');
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
  problems.push('WEB_EXT_API_SECRET is not set in this shell.');
} else if (ISSUER.test(secret)) {
  problems.push('WEB_EXT_API_SECRET holds the issuer — the two values are swapped.');
} else if (!SECRET.test(secret)) {
  problems.push(
    `WEB_EXT_API_SECRET does not look like a JWT secret (expected a long hex string, got ${secret.length} characters).`,
  );
}

if (problems.length > 0) {
  console.error('\nAMO credentials are not usable:\n');
  for (const problem of problems) console.error(`  - ${problem}`);

  console.error(
    '\nBoth values come from https://addons.mozilla.org/en-US/developers/addon/api/key/',
  );
  console.error('The issuer is always visible there; the secret is shown only once.\n');
  console.error('Set them for future terminals with:');
  console.error(
    "  [Environment]::SetEnvironmentVariable('WEB_EXT_API_KEY', 'user:NNN:NNN', 'User')",
  );
  console.error(
    "  [Environment]::SetEnvironmentVariable('WEB_EXT_API_SECRET', '<64 hex chars>', 'User')",
  );
  console.error('\nThen open a NEW terminal — a running shell does not pick these up.\n');

  process.exit(1);
}

console.log('AMO credentials look well-formed.');
