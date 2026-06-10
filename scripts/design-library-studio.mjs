#!/usr/bin/env node
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const host = readFlag("--host") || process.env.WEBBRAIN_DESIGN_STUDIO_HOST || "127.0.0.1";
const port = Number(readFlag("--port") || process.env.WEBBRAIN_DESIGN_STUDIO_PORT || 4177);
const libraryDir =
  readFlag("--out") ||
  process.env.WEBBRAIN_DESIGN_LIBRARY_DIR ||
  path.join(process.cwd(), "data", "webbrain-design-library");
const maxUploadBytes = Number(process.env.WEBBRAIN_DESIGN_STUDIO_MAX_UPLOAD_BYTES || 2 * 1024 * 1024 * 1024);
const noOpen = args.includes("--no-open") || process.env.WEBBRAIN_DESIGN_STUDIO_NO_OPEN === "1";
const ingestScript = path.join(__dirname, "ingest-design-video.mjs");
const jobs = new Map();
const queue = [];
let activeJob = null;

await mkdir(path.join(libraryDir, "styles"), { recursive: true });
await mkdir(path.join(libraryDir, "uploads"), { recursive: true });

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

    if (request.method === "GET" && url.pathname === "/") {
      sendHtml(response, renderStudioHtml());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/styles") {
      sendJson(response, { styles: await listStyles() });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/jobs") {
      sendJson(response, { jobs: Array.from(jobs.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
      return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/styles/")) {
      await serveStyleFrame(url.pathname, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/import") {
      const result = await handleImport(request);
      sendJson(response, result);
      return;
    }

    sendJson(response, { error: "Not found" }, 404);
  } catch (error) {
    sendJson(response, { error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

server.listen(port, host, () => {
  const url = `http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}`;
  console.log(`WebBrain Design Library Studio: ${url}`);
  console.log(`Library: ${libraryDir}`);
  console.log("UI is local-only. To use the library on VDS, sync the data/webbrain-design-library folder to the server.");

  if (!noOpen && process.platform === "darwin") {
    spawn("open", [url], { stdio: "ignore", detached: true }).unref();
  }
});

async function handleImport(request) {
  const contentType = request.headers["content-type"] || "";
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[1] || contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[2];

  if (!boundary) throw new Error("Multipart boundary was not found.");

  const body = await readRequestBuffer(request, maxUploadBytes);
  const { fields, files } = parseMultipart(body, boundary);
  if (!files.length) throw new Error("Drop at least one video.");

  const interval = normalizeInterval(fields.interval?.[0]);
  const tags = parseTags(fields.tags?.[0]);
  const namePrefix = (fields.name?.[0] || "").trim();
  const uploadDir = path.join(libraryDir, "uploads", `${Date.now()}-${Math.random().toString(16).slice(2)}`);

  await mkdir(uploadDir, { recursive: true });

  const createdJobs = [];
  for (const file of files) {
    const safeName = sanitizeFilename(file.filename || "video.mp4");
    const filePath = path.join(uploadDir, safeName);
    const title = namePrefix || path.basename(safeName, path.extname(safeName));

    await writeFile(filePath, file.data);

    const job = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      filename: safeName,
      status: "queued",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      interval,
      tags,
      styleId: null,
      stylePath: null,
      logs: ["В очереди"],
      error: null,
    };

    jobs.set(job.id, job);
    queue.push({ jobId: job.id, filePath, title, interval, tags });
    createdJobs.push(job);
  }

  processQueue();

  return { jobs: createdJobs };
}

function processQueue() {
  if (activeJob || !queue.length) return;

  const item = queue.shift();
  const job = jobs.get(item.jobId);
  if (!job) {
    processQueue();
    return;
  }

  activeJob = job.id;
  updateJob(job.id, { status: "processing", logs: [...job.logs, "Разбиваю видео на кадры каждые " + item.interval + " сек."] });

  const commandArgs = [
    ingestScript,
    item.filePath,
    "--name",
    item.title,
    "--out",
    libraryDir,
    "--interval",
    String(item.interval),
    ...item.tags.flatMap((tag) => ["--tag", tag]),
  ];
  const child = spawn(process.execPath, commandArgs, { cwd: process.cwd() });

  child.stdout.on("data", (chunk) => appendJobLog(job.id, chunk.toString()));
  child.stderr.on("data", (chunk) => appendJobLog(job.id, chunk.toString()));
  child.on("error", (error) => {
    updateJob(job.id, { status: "failed", error: error.message });
  });
  child.on("exit", (code) => {
    const nextJob = jobs.get(job.id);
    const logText = nextJob?.logs.join("\n") || "";
    const styleId = logText.match(/Design style imported:\s*([^\s]+)/)?.[1] || null;
    const stylePath = logText.match(new RegExp(`${escapeRegExp(path.sep)}styles${escapeRegExp(path.sep)}[^\\n\\r]+`))?.[0] || null;

    updateJob(job.id, {
      status: code === 0 ? "done" : "failed",
      styleId,
      stylePath,
      error: code === 0 ? null : `ffmpeg/import exited with code ${code}`,
      logs: [...(nextJob?.logs || []), code === 0 ? "Готово" : `Ошибка: code ${code}`],
    });
    activeJob = null;
    processQueue();
  });
}

async function listStyles() {
  const stylesDir = path.join(libraryDir, "styles");
  const entries = await readdir(stylesDir, { withFileTypes: true }).catch(() => []);
  const styles = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const dir = path.join(stylesDir, entry.name);
    const manifest = await readJson(path.join(dir, "manifest.json"));
    const framesDir = path.join(dir, "frames");
    const frames = (await readdir(framesDir).catch(() => []))
      .filter((file) => /\.(?:jpg|jpeg|png|webp)$/i.test(file))
      .sort();
    const frameUrls = frames.map((file) => `/api/styles/${encodeURIComponent(entry.name)}/frames/${encodeURIComponent(file)}`);
    const firstFrame = frameUrls[0] || null;
    const dirStat = await stat(dir).catch(() => null);

    styles.push({
      id: manifest?.id || entry.name,
      title: manifest?.title || entry.name,
      tags: Array.isArray(manifest?.tags) ? manifest.tags : [],
      importedAt: manifest?.importedAt || dirStat?.mtime?.toISOString?.() || "",
      frameIntervalSeconds: Number(manifest?.frameIntervalSeconds || 2),
      frameCount: frames.length,
      thumbnail: firstFrame,
      frames: frameUrls,
      analyzed: Boolean(manifest?.analysis),
    });
  }

  return styles.sort((a, b) => String(b.importedAt).localeCompare(String(a.importedAt)));
}

async function serveStyleFrame(pathname, response) {
  const match = pathname.match(/^\/api\/styles\/([^/]+)\/frames\/([^/]+)$/);
  if (!match) {
    sendJson(response, { error: "Not found" }, 404);
    return;
  }

  const styleId = decodeURIComponent(match[1]);
  const filename = decodeURIComponent(match[2]);
  if (!/^[a-z0-9._-]+$/i.test(styleId) || !/^[a-z0-9._-]+$/i.test(filename)) {
    sendJson(response, { error: "Invalid path" }, 400);
    return;
  }

  const filePath = path.join(libraryDir, "styles", styleId, "frames", filename);
  const fileStat = await stat(filePath).catch(() => null);
  if (!fileStat?.isFile()) {
    sendJson(response, { error: "Frame not found" }, 404);
    return;
  }

  response.writeHead(200, {
    "Content-Type": filename.endsWith(".png") ? "image/png" : "image/jpeg",
    "Cache-Control": "public, max-age=3600",
  });
  createReadStream(filePath).pipe(response);
}

function updateJob(jobId, patch) {
  const job = jobs.get(jobId);
  if (!job) return;

  jobs.set(jobId, {
    ...job,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

function appendJobLog(jobId, text) {
  const job = jobs.get(jobId);
  if (!job) return;

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return;

  updateJob(jobId, {
    logs: [...job.logs, ...lines].slice(-120),
  });
}

function parseMultipart(buffer, boundary) {
  const delimiter = Buffer.from(`--${boundary}`);
  const fields = {};
  const files = [];
  let cursor = 0;

  while (cursor < buffer.length) {
    const start = buffer.indexOf(delimiter, cursor);
    if (start < 0) break;

    const partStart = start + delimiter.length;
    const next = buffer.indexOf(delimiter, partStart);
    if (next < 0) break;

    let part = buffer.subarray(partStart, next);
    if (part.subarray(0, 2).toString() === "--") break;
    if (part.subarray(0, 2).toString() === "\r\n") part = part.subarray(2);
    if (part.subarray(part.length - 2).toString() === "\r\n") part = part.subarray(0, part.length - 2);

    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd >= 0) {
      const rawHeaders = part.subarray(0, headerEnd).toString("utf8");
      const data = part.subarray(headerEnd + 4);
      const disposition = rawHeaders.match(/content-disposition:\s*form-data;([^\n\r]+)/i)?.[1] || "";
      const name = disposition.match(/name="([^"]+)"/i)?.[1] || "";
      const filename = disposition.match(/filename="([^"]*)"/i)?.[1] || "";
      const contentType = rawHeaders.match(/content-type:\s*([^\n\r]+)/i)?.[1]?.trim() || "application/octet-stream";

      if (name && filename) {
        files.push({ fieldName: name, filename, contentType, data });
      } else if (name) {
        fields[name] = [...(fields[name] || []), data.toString("utf8")];
      }
    }

    cursor = next;
  }

  return { fields, files };
}

function readRequestBuffer(request, limitBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    request.on("data", (chunk) => {
      total += chunk.length;
      if (total > limitBytes) {
        reject(new Error(`Upload is too large. Limit: ${Math.round(limitBytes / 1024 / 1024)} MB.`));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });
    request.on("error", reject);
    request.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

function sendJson(response, payload, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sendHtml(response, html) {
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(html);
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

function normalizeInterval(value) {
  const interval = Number(value || 2);

  return Number.isFinite(interval) && interval > 0 ? Math.max(1, Math.min(30, interval)) : 2;
}

function parseTags(value) {
  return String(value || "")
    .split(/[,\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function sanitizeFilename(value) {
  const ext = path.extname(value) || ".mp4";
  const base = path.basename(value, ext).replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "video";

  return `${base}${ext.toLowerCase()}`;
}

function readFlag(flag) {
  const index = args.indexOf(flag);
  if (index < 0) return "";

  return args[index + 1] && !args[index + 1].startsWith("--") ? args[index + 1] : "";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderStudioHtml() {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WebBrain Design Library</title>
  <style>
    :root { color-scheme: dark; --lime:#bfff45; --bg:#070807; --panel:#111411; --line:rgba(255,255,255,.1); --muted:rgba(255,255,255,.52); }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; background: radial-gradient(circle at 78% -10%, rgba(191,255,69,.16), transparent 34%), #050605; color:#f5f5f0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    header { position:sticky; top:0; z-index:10; height:72px; display:flex; align-items:center; justify-content:space-between; padding:0 28px; border-bottom:1px solid var(--line); background:rgba(7,8,7,.82); backdrop-filter: blur(18px); }
    .brand { display:flex; align-items:center; gap:12px; font-weight:900; letter-spacing:-.03em; }
    .mark { width:34px; height:34px; border-radius:10px; background:var(--lime); color:#050605; display:grid; place-items:center; font-weight:1000; }
    main { display:grid; grid-template-columns: 430px minmax(0, 1fr); gap:22px; padding:22px; }
    .panel { border:1px solid var(--line); background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.02)); border-radius:18px; box-shadow:0 30px 90px rgba(0,0,0,.32); }
    .drop { min-height:340px; display:flex; flex-direction:column; justify-content:center; gap:18px; padding:24px; border:1px dashed rgba(191,255,69,.35); background:rgba(191,255,69,.045); transition:.2s ease; }
    .drop.drag { border-color:var(--lime); background:rgba(191,255,69,.11); transform:translateY(-1px); }
    h1 { margin:0; font-size:34px; line-height:1; letter-spacing:-.055em; }
    h2 { margin:0; font-size:18px; letter-spacing:-.02em; }
    p { color:var(--muted); line-height:1.55; }
    label { display:block; color:rgba(255,255,255,.58); font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.12em; margin:14px 0 7px; }
    input { width:100%; height:44px; border-radius:12px; border:1px solid var(--line); background:#0b0d0b; color:white; padding:0 13px; font:inherit; outline:none; }
    input:focus { border-color:rgba(191,255,69,.65); box-shadow:0 0 0 3px rgba(191,255,69,.12); }
    button { height:46px; border:0; border-radius:13px; background:var(--lime); color:#050605; padding:0 18px; font-weight:950; cursor:pointer; }
    button.secondary { background:rgba(255,255,255,.06); color:white; border:1px solid var(--line); }
    .file-list { display:grid; gap:8px; margin-top:10px; }
    .file-pill { display:flex; justify-content:space-between; gap:10px; padding:10px 12px; border:1px solid var(--line); border-radius:12px; background:rgba(0,0,0,.24); color:rgba(255,255,255,.76); font-size:13px; }
    .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:14px; }
    .card { overflow:hidden; border:1px solid var(--line); border-radius:16px; background:#0d100d; cursor:pointer; transition:transform .18s ease, border-color .18s ease, background .18s ease; }
    .card:hover { transform:translateY(-2px); border-color:rgba(191,255,69,.38); background:#111611; }
    .thumb { aspect-ratio:16/9; background:#030403; display:grid; place-items:center; color:rgba(255,255,255,.28); overflow:hidden; }
    .thumb img { width:100%; height:100%; object-fit:cover; display:block; }
    .card-body { padding:13px; }
    .meta { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; color:rgba(255,255,255,.42); font-size:12px; }
    .tag { border:1px solid rgba(191,255,69,.22); color:var(--lime); background:rgba(191,255,69,.07); border-radius:999px; padding:3px 8px; font-size:11px; font-weight:800; }
    .jobs { display:grid; gap:10px; margin-bottom:20px; }
    .job { border:1px solid var(--line); border-radius:15px; background:rgba(255,255,255,.035); padding:13px; }
    .job-head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .status { border-radius:999px; padding:4px 9px; font-size:11px; font-weight:900; text-transform:uppercase; background:rgba(255,255,255,.08); color:rgba(255,255,255,.7); }
    .status.processing { background:rgba(191,255,69,.11); color:var(--lime); }
    .status.done { background:rgba(67,255,155,.11); color:#79ffb4; }
    .status.failed { background:rgba(255,80,80,.14); color:#ff9a9a; }
    pre { max-height:110px; overflow:auto; margin:10px 0 0; color:rgba(255,255,255,.48); font-size:11px; white-space:pre-wrap; }
    .toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
    .modal-backdrop { position:fixed; inset:0; z-index:50; display:none; align-items:center; justify-content:center; padding:24px; background:rgba(0,0,0,.74); backdrop-filter:blur(18px); }
    .modal-backdrop.open { display:flex; }
    .modal { width:min(1180px,100%); max-height:min(860px,92vh); overflow:hidden; border:1px solid rgba(255,255,255,.12); border-radius:22px; background:radial-gradient(circle at 82% 0%, rgba(191,255,69,.12), transparent 30%), #070907; box-shadow:0 42px 140px rgba(0,0,0,.62); display:flex; flex-direction:column; }
    .modal-head { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; padding:20px; border-bottom:1px solid var(--line); }
    .modal-head h2 { font-size:24px; letter-spacing:-.04em; }
    .modal-grid { overflow:auto; padding:18px; display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:12px; }
    .frame-card { overflow:hidden; border:1px solid var(--line); border-radius:14px; background:#0d100d; }
    .frame-card img { display:block; width:100%; aspect-ratio:16/9; object-fit:cover; background:#030403; }
    .frame-caption { padding:8px 10px; color:rgba(255,255,255,.5); font-size:12px; }
    @media (max-width: 920px) { main { grid-template-columns:1fr; } header { padding:0 18px; } }
  </style>
</head>
<body>
  <header>
    <div class="brand"><div class="mark">W</div><div>WebBrain Design Library</div></div>
    <button class="secondary" id="refreshBtn">Обновить</button>
  </header>
  <main>
    <section class="panel drop" id="drop">
      <div>
        <h1>Скинь видео сюда</h1>
        <p>Видео разобьется на кадры каждые 2 секунды и попадет в библиотеку как отдельный стиль.</p>
      </div>
      <input id="fileInput" type="file" accept="video/*" multiple hidden />
      <button id="pickBtn">Выбрать видео</button>
      <div>
        <label>Название стиля</label>
        <input id="nameInput" placeholder="Например: Dark glossy landing" />
        <label>Теги</label>
        <input id="tagsInput" placeholder="premium dark motion" />
        <label>Кадр каждые, сек</label>
        <input id="intervalInput" type="number" min="1" max="30" value="2" />
      </div>
      <div class="file-list" id="fileList"></div>
      <button id="uploadBtn">Добавить в библиотеку</button>
    </section>
    <section>
      <div class="toolbar">
        <h2>Процесс</h2>
        <span style="color:var(--muted);font-size:13px">Library: ${escapeHtml(libraryDir)}</span>
      </div>
      <div class="jobs" id="jobs"></div>
      <div class="toolbar">
        <h2>Стили</h2>
        <span id="styleCount" style="color:var(--muted);font-size:13px"></span>
      </div>
      <div class="grid" id="styles"></div>
    </section>
  </main>
  <div class="modal-backdrop" id="styleModal" role="dialog" aria-modal="true" aria-labelledby="styleModalTitle">
    <div class="modal">
      <div class="modal-head">
        <div>
          <h2 id="styleModalTitle">Стиль</h2>
          <div class="meta" id="styleModalMeta"></div>
        </div>
        <button class="secondary" id="styleModalClose">Закрыть</button>
      </div>
      <div class="modal-grid" id="styleModalFrames"></div>
    </div>
  </div>
  <script>
    const drop = document.getElementById('drop');
    const input = document.getElementById('fileInput');
    const pickBtn = document.getElementById('pickBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const fileList = document.getElementById('fileList');
    const styleModal = document.getElementById('styleModal');
    const styleModalClose = document.getElementById('styleModalClose');
    const styleModalTitle = document.getElementById('styleModalTitle');
    const styleModalMeta = document.getElementById('styleModalMeta');
    const styleModalFrames = document.getElementById('styleModalFrames');
    let files = [];
    let currentStyles = [];

    pickBtn.onclick = () => input.click();
    input.onchange = () => setFiles(Array.from(input.files || []));
    refreshBtn.onclick = refresh;
    styleModalClose.onclick = closeStyleModal;
    styleModal.addEventListener('click', event => {
      if (event.target === styleModal) closeStyleModal();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeStyleModal();
    });
    ['dragenter','dragover'].forEach(type => drop.addEventListener(type, event => { event.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave','drop'].forEach(type => drop.addEventListener(type, event => { event.preventDefault(); drop.classList.remove('drag'); }));
    drop.addEventListener('drop', event => setFiles(Array.from(event.dataTransfer.files || []).filter(file => file.type.startsWith('video/'))));

    uploadBtn.onclick = async () => {
      if (!files.length) return;
      const form = new FormData();
      for (const file of files) form.append('videos', file);
      form.append('name', document.getElementById('nameInput').value);
      form.append('tags', document.getElementById('tagsInput').value);
      form.append('interval', document.getElementById('intervalInput').value || '2');
      uploadBtn.disabled = true;
      uploadBtn.textContent = 'Загружаю...';
      try {
        const response = await fetch('/api/import', { method:'POST', body: form });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Upload failed');
        setFiles([]);
        input.value = '';
        refresh();
      } catch (error) {
        alert(error.message || String(error));
      } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Добавить в библиотеку';
      }
    };

    function setFiles(next) {
      files = next;
      fileList.innerHTML = files.map(file => '<div class="file-pill"><span>' + escapeHtml(file.name) + '</span><span>' + Math.round(file.size/1024/1024) + ' MB</span></div>').join('');
    }

    async function refresh() {
      const [jobsRes, stylesRes] = await Promise.all([fetch('/api/jobs'), fetch('/api/styles')]);
      const jobs = (await jobsRes.json()).jobs || [];
      const styles = (await stylesRes.json()).styles || [];
      renderJobs(jobs);
      renderStyles(styles);
    }

    function renderJobs(jobs) {
      document.getElementById('jobs').innerHTML = jobs.length ? jobs.slice(0, 12).map(job => {
        return '<div class="job"><div class="job-head"><strong>' + escapeHtml(job.title) + '</strong><span class="status ' + job.status + '">' + job.status + '</span></div><div class="meta"><span>' + escapeHtml(job.filename) + '</span><span>' + job.interval + ' sec</span></div><pre>' + escapeHtml((job.logs || []).slice(-8).join('\\n')) + '</pre></div>';
      }).join('') : '<p>Пока нет задач.</p>';
    }

    function renderStyles(styles) {
      currentStyles = styles;
      document.getElementById('styleCount').textContent = styles.length + ' styles';
      document.getElementById('styles').innerHTML = styles.length ? styles.map(style => {
        const tags = (style.tags || []).map(tag => '<span class="tag">' + escapeHtml(tag) + '</span>').join('');
        const thumb = style.thumbnail ? '<img src="' + escapeHtml(style.thumbnail) + '" alt="">' : 'No frame';
        return '<article class="card" data-style-id="' + escapeHtml(style.id) + '" tabindex="0"><div class="thumb">' + thumb + '</div><div class="card-body"><strong>' + escapeHtml(style.title) + '</strong><div class="meta"><span>' + style.frameCount + ' frames</span><span>' + style.frameIntervalSeconds + ' sec</span>' + (style.analyzed ? '<span>analyzed</span>' : '') + '</div><div class="meta">' + tags + '</div></div></article>';
      }).join('') : '<p>Стили появятся после импорта видео.</p>';
      document.querySelectorAll('[data-style-id]').forEach(card => {
        card.onclick = () => openStyleModal(card.dataset.styleId);
        card.onkeydown = event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openStyleModal(card.dataset.styleId);
          }
        };
      });
    }

    function openStyleModal(styleId) {
      const style = currentStyles.find(item => item.id === styleId);
      if (!style) return;

      const tags = (style.tags || []).map(tag => '<span class="tag">' + escapeHtml(tag) + '</span>').join('');
      const frames = style.frames || [];
      styleModalTitle.textContent = style.title || 'Стиль';
      styleModalMeta.innerHTML = '<span>' + frames.length + ' frames</span><span>' + style.frameIntervalSeconds + ' sec</span>' + (style.analyzed ? '<span>analyzed</span>' : '') + tags;
      styleModalFrames.innerHTML = frames.length ? frames.map((frame, index) => {
        return '<figure class="frame-card"><img src="' + escapeHtml(frame) + '" alt="Кадр ' + (index + 1) + '"><figcaption class="frame-caption">Кадр ' + String(index + 1).padStart(2, '0') + '</figcaption></figure>';
      }).join('') : '<p>У этого стиля пока нет кадров.</p>';
      styleModal.classList.add('open');
    }

    function closeStyleModal() {
      styleModal.classList.remove('open');
    }

    function escapeHtml(value) {
      return String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    }

    refresh();
    setInterval(refresh, 1800);
  </script>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[char]);
}
