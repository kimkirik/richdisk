import { cp, readFile, readdir, rm } from 'node:fs/promises';
const dist = new URL('../dist/', import.meta.url);
const target = new URL('../../', import.meta.url);
const html = await readFile(new URL('index.html', dist), 'utf8');
if (!html.includes('assets/')) throw new Error('Run npm run build before publishing static output.');
// Only replace generated assets. Leave data, source and collectors intact.
await rm(new URL('assets/', target), { recursive: true, force: true });
for (const entry of await readdir(dist)) {
  if (entry === 'data') continue;
  await cp(new URL(entry, dist), new URL(entry, target), { recursive: true });
}
console.log('Published static build to asan-rental-watch/; source data preserved.');
