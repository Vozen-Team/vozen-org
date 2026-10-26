import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(repositoryRoot, 'apps/helper-panel/dist');
const destination = resolve(repositoryRoot, 'site/panel/helper-tracker');
const approvedDestinationRoot = `${resolve(repositoryRoot, 'site/panel')}${sep}`;

try {
  await access(resolve(source, 'index.html'), constants.R_OK);
} catch {
  throw new Error('Helper panel build is missing dist/index.html. Run the Helper build first.');
}

if (!destination.startsWith(approvedDestinationRoot)) {
  throw new Error('Refusing to install outside site/panel/helper-tracker.');
}

await rm(destination, { recursive: true, force: true });
await cp(source, destination, { recursive: true, force: true, errorOnExist: false });

const output = await readFile(resolve(destination, 'index.html'), 'utf8');
if (!output.includes('/panel/helper-tracker/')) {
  throw new Error('The Helper build does not use the /panel/helper-tracker/ production base.');
}
if (/\.map(?:["']|$)|sourceMappingURL/i.test(output)) {
  throw new Error('The Helper build must not publish source maps.');
}

console.log('Installed Helper panel into site/panel/helper-tracker/.');

// Real static entry documents make clean deep links and reloads work on GitHub Pages.
const featurePaths = JSON.parse(await readFile(resolve(repositoryRoot, 'apps/helper-panel/src/panel-paths.json'), 'utf8'));
const slugs = ['', 'servers', 'setup', 'features', 'activity', 'collection', ...Object.values(featurePaths)];
for (const slug of new Set(slugs)) {
  if (slug !== '' && !/^[a-z][a-z0-9-]*$/.test(slug)) throw new Error('Invalid panel route');
  const target = resolve(repositoryRoot, 'site/panel', slug, 'index.html');
  if (!target.startsWith(approvedDestinationRoot) || slug === 'helper') throw new Error('Invalid clean panel destination');
  await mkdir(dirname(target), { recursive: true });
  const canonical = `https://vozen.org/panel/${slug ? `${slug}/` : ''}`;
  await writeFile(target, output.replace('https://vozen.org/panel/helper-tracker/', canonical));
}
console.log(`Installed ${new Set(slugs).size} clean Helper entry documents.`);
