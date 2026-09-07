import { spawnSync } from 'node:child_process';
import { readdir, cp, writeFile, readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const frontend = new URL('frontend/', root);
const build = spawnSync('npm', ['run', 'build'], {cwd:frontend, stdio:'inherit'});
if (build.status !== 0) process.exit(build.status || 1);
const dist = new URL('dist/', frontend);
for (const name of await readdir(dist)) {
 if (['data','index.html'].includes(name)) continue;
 await cp(new URL(name, dist), new URL('public/'+name, root), {recursive:true});
}
await writeFile(new URL('lib/app-html.ts', root), 'export default '+JSON.stringify(await readFile(new URL('index.html',dist),'utf8'))+';\n');
