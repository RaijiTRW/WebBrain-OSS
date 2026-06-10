#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const input = args.find((arg) => !arg.startsWith("--"));

if (!input) {
  console.error("Usage: node scripts/ingest-design-video.mjs <video-file> [--name \"Style name\"] [--tag tag] [--out data/webbrain-design-library]");
  process.exit(1);
}

const name = readFlag("--name") || path.basename(input, path.extname(input));
const outRoot = readFlag("--out") || process.env.WEBBRAIN_DESIGN_LIBRARY_DIR || path.join(process.cwd(), "data", "webbrain-design-library");
const tags = readFlags("--tag");
const interval = Number(readFlag("--interval") || 2);
const id = `${slugify(name)}-${new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-")}`;
const styleDir = path.join(outRoot, "styles", id);
const framesDir = path.join(styleDir, "frames");
const framePattern = path.join(framesDir, "frame-%04d.jpg");

await mkdir(framesDir, { recursive: true });
await run("ffmpeg", [
  "-hide_banner",
  "-y",
  "-i",
  input,
  "-vf",
  `fps=1/${Math.max(1, interval)},scale='min(1440,iw)':-2`,
  "-q:v",
  "3",
  framePattern,
]);

const manifest = {
  id,
  title: name,
  sourceVideo: path.basename(input),
  sourceVideoPath: path.resolve(input),
  importedAt: new Date().toISOString(),
  frameIntervalSeconds: Math.max(1, interval),
  tags,
  frames: [],
  analysis: null,
};

await writeFile(path.join(styleDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(`Design style imported: ${id}`);
console.log(styleDir);

function readFlag(flag) {
  const index = args.indexOf(flag);
  if (index < 0) return "";

  return args[index + 1] && !args[index + 1].startsWith("--") ? args[index + 1] : "";
}

function readFlags(flag) {
  const values = [];

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === flag && args[index + 1] && !args[index + 1].startsWith("--")) {
      values.push(args[index + 1]);
    }
  }

  return values;
}

function slugify(value) {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");

  return slug || "style";
}

function run(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { stdio: "inherit" });

    child.on("error", (error) => {
      reject(new Error(`${command} failed to start. Make sure ffmpeg is installed. ${error.message}`));
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}
