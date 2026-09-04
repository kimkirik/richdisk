import { copyFile, mkdir } from "node:fs/promises";

const source = new URL("../data/notices.json", import.meta.url);
const targetDirectory = new URL("../public/data/", import.meta.url);
const target = new URL("notices.json", targetDirectory);

await mkdir(targetDirectory, { recursive: true });
await copyFile(source, target);
