import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {fileURLToPath} from "node:url";
const base = "/richdisk/kkirikiri-haerugil";
export default defineConfig({
  base: base + "/", publicDir: false,
  resolve: {alias: {"next/link": fileURLToPath(new URL("./link.tsx", import.meta.url))}},
  plugins: [{name: "pages-paths", enforce: "pre", transform(code, id) {
    if (!/\.(tsx?|jsx?)$/.test(id) || id.includes("node_modules")) return;
    return code.replaceAll('fetch(`/api/conditions', 'fetch(`' + (process.env.KKIRIKIRI_API_ORIGIN || "https://haerugil-guide.kimkirik.chatgpt.site") + '/api/conditions')
      .replaceAll('src="/kkirikiri-', 'src="' + base + '/kkirikiri-')
      .replaceAll('register("/sw.js"', 'register("' + base + '/sw.js"')
      .replaceAll('`/calendar?location=', '`' + base + '/calendar/?location=');
  }}, react()],
  build: {outDir: ".build", emptyOutDir: true, manifest: true, rollupOptions: {input: {main: "index.html", calendar: "calendar/index.html"}}},
});
