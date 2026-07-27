import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Regenerates updates.json — the file Firefox polls to discover new versions.
 *
 * Run after signing. The signed .xpi has to be uploaded to the matching GitHub
 * release, because the update_link below is where Firefox will go looking for it.
 */

const REPO = 'JakubFilounek/Pluck';
const EXTENSION_ID = 'pluck@slyjacobthebeast.dev';
const MIN_FIREFOX = '121.0';

// fileURLToPath, not .pathname — the repo path contains a space, which stays
// percent-encoded in a URL and produces a path that does not exist.
const root = fileURLToPath(new URL('..', import.meta.url));

const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));

// Confirm a signed build for this exact version actually exists — publishing an
// update manifest that points at a missing file makes Firefox retry forever.
let signedName;
try {
  const files = await readdir(join(root, '.output', 'signed'));
  signedName = files.find((file) => file.endsWith(`${version}.xpi`));
} catch {
  signedName = undefined;
}

if (!signedName) {
  console.error(
    `No signed .xpi for version ${version} in .output/signed.\n` +
      `Run "npm run sign" first, or bump the version if ${version} was already published.`,
  );
  process.exit(1);
}

const manifest = {
  addons: {
    [EXTENSION_ID]: {
      updates: [
        {
          version,
          update_link: `https://github.com/${REPO}/releases/download/v${version}/${signedName}`,
          applications: { gecko: { strict_min_version: MIN_FIREFOX } },
        },
      ],
    },
  },
};

await writeFile(join(root, 'updates.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`updates.json written for v${version} (${signedName})`);
console.log('\nTo publish:');
console.log(`  gh release create v${version} ".output/signed/${signedName}" --title "v${version}" --notes ""`);
console.log('  git add updates.json && git commit -m "Release v' + version + '" && git push');
