import {build} from "vite";
import {cp, mkdir} from "node:fs/promises";
await build();
await cp(".build/assets", "../assets", {recursive:true});
await cp(".build/index.html", "../index.html");
await mkdir("../calendar", {recursive:true});
await cp(".build/calendar/index.html", "../calendar/index.html");
