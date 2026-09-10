import { readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
const root = dirname(fileURLToPath(import.meta.url));
const hash = (text) =>
  createHash("sha256").update(text).digest("hex").slice(0, 12);
const write = (prefix, text, ext) => {
  const name = `${prefix}-${hash(text)}.${ext}`;
  for (const old of readdirSync(join(root, "assets"))) {
    if (old.startsWith(`${prefix}-`) && old !== name)
      unlinkSync(join(root, "assets", old));
  }
  writeFileSync(join(root, "assets", name), text);
  return name;
};
const data = write(
  "data-v2",
  readFileSync(join(root, "src/data.mjs"), "utf8"),
  "mjs",
);
const app = write(
  "app-v2",
  readFileSync(join(root, "src/app.js"), "utf8")
    .replaceAll("../assets/", "./")
    .replace("./data.mjs", `./${data}`),
  "js",
);
const css = write(
  "upgrade-v2",
  readFileSync(join(root, "src/upgrade.css"), "utf8"),
  "css",
);
let html = readFileSync(join(root, "index.html"), "utf8")
  .replace(
    /src="\.\/assets\/(?:index-C17BLu-k|app-v2-[a-f0-9]+)\.js"/,
    `src="./assets/${app}"`,
  )
  .replace(
    /\s*<link rel="stylesheet" href="\.\/assets\/upgrade-v2-[a-f0-9]+\.css">/,
    "",
  )
  .replace(
    "</head>",
    `  <link rel="stylesheet" href="./assets/${css}">\n  </head>`,
  );
writeFileSync(join(root, "index.html"), html);
console.log(`Built ${app}, ${data}, ${css}`);
