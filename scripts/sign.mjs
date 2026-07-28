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

/** Local .bin binaries need the .cmd wrapper on Windows. */
function bin(name) {
  const suffix = process.platform === 'win32' ? '.cmd' : '';
  return join(root, 'node_modules', '.bin', `${name}${suffix}`);
}

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
    // .cmd wrappers are not executables, so Windows needs a shell to invoke them.
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    console.error(`\nStep failed: ${command} ${args.join(' ')}`);
    process.exit(result.status ?? 1);
  }
}

run(bin('wxt'), ['zip', '--browser', 'firefox']);

run(
  bin('web-ext'),
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

run(process.execPath, [join(root, 'scripts', 'make-update-manifest.mjs')]);
