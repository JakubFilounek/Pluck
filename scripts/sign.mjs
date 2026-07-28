import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveCredentials, validateCredentials, reportProblems } from './credentials.mjs';

/**
 * The release pipeline: validate credentials, build, sign, regenerate updates.json.
 *
 * This exists rather than a chain of && in package.json so the resolved credentials
 * can be handed to web-ext through the child's environment. Passing them as
 * --api-key/--api-secret would put the secret in the process list; injecting them
 * into the environment keeps it out of both that and the shell history.
 *
 * Run with --check to validate and stop.
 */

const root = fileURLToPath(new URL('..', import.meta.url));
const checkOnly = process.argv.includes('--check');

const credentials = resolveCredentials();
const problems = validateCredentials(credentials);

if (problems.length > 0) {
  reportProblems(problems);
  process.exit(1);
}

console.log('AMO credentials look well-formed.');
if (checkOnly) process.exit(0);

/**
 * Each tool's JS entry point, run under this same node.
 *
 * Not node_modules/.bin: those are .cmd shims on Windows, which need a shell to
 * invoke, and a shell re-splits the command on whitespace — so any checkout whose
 * path contains a space (this one: "Browser extensions") breaks. Calling the entry
 * script directly needs no shell and therefore no quoting.
 */
const ENTRY = {
  wxt: join(root, 'node_modules', 'wxt', 'bin', 'wxt.mjs'),
  'web-ext': join(root, 'node_modules', 'web-ext', 'bin', 'web-ext.js'),
};

function run(label, script, args, extraEnv = {}) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  });

  if (result.error) {
    console.error(`\nCould not start ${label}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`\nStep failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

run('wxt zip', ENTRY.wxt, ['zip', '--browser', 'firefox']);

run(
  'web-ext sign',
  ENTRY['web-ext'],
  [
    'sign',
    '--source-dir',
    '.output/firefox-mv3',
    '--artifacts-dir',
    '.output/signed',
    '--channel',
    'unlisted',
  ],
  // web-ext reads these names itself; supplying them here covers the case where the
  // terminal's own environment is stale.
  { WEB_EXT_API_KEY: credentials.key, WEB_EXT_API_SECRET: credentials.secret },
);

run('update manifest', join(root, 'scripts', 'make-update-manifest.mjs'), []);
