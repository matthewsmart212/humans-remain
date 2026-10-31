#!/usr/bin/env node
/**
 * Export support, added during the 2026-10-31 source migration.
 * Runs the ORIGINAL built Worker with local SQLite, object storage and assets.
 * This loopback-only development adapter is not production hosting or auth.
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createHash, randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let port = 8787, readOnly = false, dataDir = path.join(root, '.local-preview');
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) port = Number(args[++i]);
  else if (args[i] === '--data-dir' && args[i + 1]) dataDir = path.resolve(args[++i]);
  else if (args[i] === '--read-only') readOnly = true;
  else if (args[i] === '--help') {
    console.log('Usage: node tools/local-preview.mjs [--port 8787] [--read-only] [--data-dir PATH]');
    process.exit(0);
  } else throw new Error(`Unknown or incomplete option: ${args[i]}`);
}
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Choose a port from 1024 to 65535.');
if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Use Node.js 24 or newer; this adapter was checked with Node 24.22.1.');
const workerPath = path.join(root, 'dist/server/index.js');
const clientPath = path.join(root, 'dist/client');
if (!fs.existsSync(workerPath) || !fs.existsSync(path.join(clientPath, 'index.html'))) {
  throw new Error('Build the project first: npm ci && npm run build');
}
const clientDir = fs.realpathSync(clientPath);
const {default: worker} = await import(pathToFileURL(workerPath).href);
if (typeof worker?.fetch !== 'function') throw new Error('The built Worker has no default fetch handler.');

const snapshots = path.join(root, 'migration-data');
const originalFiles = path.join(root, 'public/api/asset-files');
const objectsDir = path.join(dataDir, 'objects');
await fsp.mkdir(objectsDir, {recursive: true});
const sql = new DatabaseSync(path.join(dataDir, 'database.sqlite'));
sql.exec('PRAGMA journal_mode=WAL;');
sql.exec('CREATE TABLE IF NOT EXISTS _export_preview_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
const readJson = name => JSON.parse(fs.readFileSync(path.join(snapshots, name), 'utf8'));
const optionalRows = name => {
  if (!fs.existsSync(path.join(snapshots, name))) return null;
  const value = readJson(name), rows = Array.isArray(value) ? value : value.rows;
  if (!Array.isArray(rows)) throw new Error(`Unrecognized database row export: ${name}`);
  return rows;
};
const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
const timestamp = '1970-01-01T00:00:00.000Z';

// Recognize the bytes instead of trusting renamed/reskinned public DTO metadata.
function imageInfo(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const str = (start, length) => bytes.subarray(start, start + length).toString('ascii');
  if (bytes.length >= 24 && bytes[0] === 137 && str(1, 3) === 'PNG' && str(12, 4) === 'IHDR') {
    return {mime: 'image/png', extension: 'png', width: view.getUint32(16), height: view.getUint32(20)};
  }
  if (bytes.length >= 30 && str(0, 4) === 'RIFF' && str(8, 4) === 'WEBP') {
    const kind = str(12, 4);
    if (kind === 'VP8X') return {mime: 'image/webp', extension: 'webp', width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16)};
    if (kind === 'VP8 ' && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) return {mime: 'image/webp', extension: 'webp', width: view.getUint16(26, true) & 16383, height: view.getUint16(28, true) & 16383};
    if (kind === 'VP8L' && bytes[20] === 47) return {mime: 'image/webp', extension: 'webp', width: 1 + (bytes[21] | ((bytes[22] & 63) << 8)), height: 1 + ((bytes[22] >> 6) | (bytes[23] << 2) | ((bytes[24] & 15) << 10))};
  }
  if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216) {
    let p = 2;
    while (p + 9 < bytes.length) {
      if (bytes[p] !== 255) break;
      const marker = bytes[p + 1];
      if (marker === 217 || marker === 218) break;
      if (marker === 216 || marker === 1) { p += 2; continue; }
      const length = view.getUint16(p + 2);
      if (length < 2 || p + 2 + length > bytes.length) break;
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
        return {mime: 'image/jpeg', extension: 'jpg', width: view.getUint16(p + 7), height: view.getUint16(p + 5)};
      }
      p += length + 2;
    }
  }
  throw new Error('Unsupported or invalid cached artwork. Expected PNG, JPEG or WebP.');
}

function seed() {
  if (sql.prepare('SELECT value FROM _export_preview_meta WHERE key=?').get('seeded')) return;
  const world = readJson('world-layout.json');
  const art = readJson('artwork.json');
  const checklistPath = path.join(snapshots, 'checklist.json');
  const checklist = fs.existsSync(checklistPath) ? readJson('checklist.json') : {rows: []};
  const customRows = optionalRows('custom-assets.json');
  const checklistRows = optionalRows('checklist-rows.json') ?? checklist.rows ?? [];
  const originalFileRows = optionalRows('asset-art-files.json') ?? [];
  if (!Number.isInteger(world.revision) || !Array.isArray(art.records) || !Array.isArray(art.customAssets)) {
    throw new Error('Unrecognized public snapshot format in migration-data/.');
  }
  const fileMetadata = new Map();
  const collect = (value, entryId) => {
    if (!value || typeof value !== 'object') return;
    if (validId(value.id) && typeof value.url === 'string' && typeof value.width === 'number' && typeof value.height === 'number') {
      fileMetadata.set(value.id, {...value, entryId});
    }
    for (const child of Object.values(value)) collect(child, entryId);
  };
  for (const record of art.records) collect(record.config, record.id);
  for (const layout of [world.draft, world.applied]) if (layout?.terrainImage) collect(layout.terrainImage, 'world-terrain');
  const cachedIds = fs.existsSync(originalFiles) ? fs.readdirSync(originalFiles).filter(validId).sort() : [];
  // A first start must not silently produce a world with missing uploaded art.
  const requireCachedReferences = value => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.url === 'string' && value.url.startsWith('/api/asset-files/')) {
      const id = value.url.slice('/api/asset-files/'.length);
      if (!validId(id) || !fs.existsSync(path.join(originalFiles, id))) throw new Error(`Missing exported artwork: ${value.url}`);
    }
    for (const child of Object.values(value)) requireCachedReferences(child);
  };
  requireCachedReferences(world);
  requireCachedReferences(art);
  sql.exec('BEGIN');
  try {
    const migrationDir = path.join(root, 'drizzle');
    for (const file of fs.readdirSync(migrationDir).filter(file => /^\d+.*\.sql$/.test(file)).sort()) {
      sql.exec(fs.readFileSync(path.join(migrationDir, file), 'utf8'));
    }
    sql.prepare("UPDATE world_layout SET draft_json=?,applied_json=?,revision=?,updated_at=? WHERE id='main'").run(
      world.draft ? JSON.stringify(world.draft) : null, world.applied ? JSON.stringify(world.applied) : null, world.revision, world.updatedAt ?? null);
    const custom = sql.prepare('INSERT INTO custom_assets(id,name,created_at) VALUES(?,?,?)');
    for (const item of customRows ?? art.customAssets) custom.run(item.id, item.name, item.created_at ?? item.createdAt ?? timestamp);
    const artwork = sql.prepare('INSERT INTO asset_artwork(id,entry_id,revision,config_json,created_at) VALUES(?,?,?,?,?)');
    for (const record of art.records) artwork.run(`export-${record.id}`, record.id, record.revision, JSON.stringify(record.config), record.updatedAt ?? timestamp);
    const file = sql.prepare('INSERT INTO asset_art_files(id,entry_id,object_key,name,mime,width,height,bytes,published,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)');
    const originalById = new Map(originalFileRows.map(row => [row.id, row]));
    let unavailableFiles = 0;
    // Preserve original metadata even when a pending upload's bytes could not be
    // exported. Its route will correctly return 404; no substitute is created.
    for (const row of originalFileRows) {
      if (!validId(row.id)) throw new Error('Invalid original artwork file ID.');
      const cached = path.join(originalFiles, row.id);
      if (fs.existsSync(cached)) {
        const bytes = fs.readFileSync(cached), info = imageInfo(bytes);
        if (bytes.length !== row.bytes || info.mime !== row.mime || info.width !== row.width || info.height !== row.height) {
          throw new Error(`Cached upload does not match original metadata: ${row.id}`);
        }
      } else unavailableFiles++;
      file.run(row.id, row.entry_id, `export-cache/${row.id}`, row.name, row.mime, row.width, row.height, row.bytes, row.published, row.created_at);
    }
    for (const id of cachedIds) {
      if (originalById.has(id)) continue;
      const bytes = fs.readFileSync(path.join(originalFiles, id));
      const info = imageInfo(bytes), meta = fileMetadata.get(id);
      const name = meta?.mime === info.mime && meta?.name ? meta.name : `${id}.${info.extension}`;
      file.run(id, meta?.entryId ?? 'export-archive', `export-cache/${id}`, name, info.mime, info.width, info.height, bytes.length, 1, timestamp);
    }
    const row = sql.prepare('INSERT INTO base_checklist(id,art,implemented,tested,concept,export_complete,updated_at) VALUES(?,?,?,?,?,?,?)');
    const flag = value => value === true ? 1 : value === false ? 0 : value ?? null;
    for (const item of checklistRows) row.run(item.id, flag(item.art), flag(item.implemented), flag(item.tested), flag(item.concept), flag(item.export_complete), item.updated_at ?? timestamp);
    sql.prepare('INSERT INTO _export_preview_meta(key,value) VALUES(?,?)').run('seeded', JSON.stringify({worldRevision: world.revision, artworkRecords: art.records.length, cachedFiles: cachedIds.length, unavailableFiles, seededAt: new Date().toISOString(), source: 'migration-data public API snapshots and included original table metadata'}));
    sql.exec('COMMIT');
    console.log(`Seeded local world revision ${world.revision}, ${art.records.length} artwork records and ${cachedIds.length} cached files.`);
    if (unavailableFiles) console.log(`Preserved metadata for ${unavailableFiles} unavailable upload(s); those files remain unavailable locally.`);
  } catch (error) { sql.exec('ROLLBACK'); throw error; }
}
seed();

const DB = {
  prepare(query) {
    let parameters = [];
    return {
      bind(...values) { parameters = values; return this; },
      async all() { return {results: sql.prepare(query).all(...parameters)}; },
      async run() { const result = sql.prepare(query).run(...parameters); return {success: true, meta: {changes: Number(result.changes)}}; },
    };
  },
};
const localObjectPath = key => path.join(objectsDir, createHash('sha256').update(key).digest('hex'));
const ARTWORK = {
  async get(key) {
    let file;
    if (key.startsWith('export-cache/')) {
      const id = key.slice('export-cache/'.length);
      if (!validId(id)) return null;
      file = path.join(originalFiles, id);
    } else file = localObjectPath(key);
    if (!fs.existsSync(file)) return null;
    return {body: Readable.toWeb(fs.createReadStream(file))};
  },
  async put(key, value) {
    const file = localObjectPath(key), temporary = `${file}.${randomUUID()}.tmp`;
    try {
      if (value instanceof ArrayBuffer) await fsp.writeFile(temporary, new Uint8Array(value));
      else if (ArrayBuffer.isView(value)) await fsp.writeFile(temporary, value);
      else await pipeline(Readable.fromWeb(value), fs.createWriteStream(temporary));
      await fsp.rename(temporary, file);
    } catch (error) { await fsp.rm(temporary, {force: true}); throw error; }
  },
  async delete(key) { await fsp.rm(localObjectPath(key), {force: true}); },
};
const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.wasm': 'application/wasm',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8',
};
const ASSETS = {
  async fetch(request) {
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', {status: 405});
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url).pathname); } catch { return new Response('Bad path', {status: 400}); }
    const file = path.resolve(clientDir, `.${pathname}`);
    if (!file.startsWith(clientDir + path.sep) || pathname.includes('\0')) return new Response('Not found', {status: 404});
    try {
      const real = await fsp.realpath(file), stat = await fsp.stat(real);
      if (!real.startsWith(clientDir + path.sep) || !stat.isFile()) return new Response('Not found', {status: 404});
      return new Response(request.method === 'HEAD' ? null : Readable.toWeb(fs.createReadStream(real)), {
        headers: {'Content-Type': mimeTypes[path.extname(real).toLowerCase()] ?? 'application/octet-stream', 'Content-Length': String(stat.size), 'X-Content-Type-Options': 'nosniff'},
      });
    } catch (error) {
      if (['ENOENT', 'ENOTDIR'].includes(error.code)) return new Response('Not found', {status: 404});
      throw error;
    }
  },
};

const localEmail = 'local-owner@example.test';
const env = {DB, ARTWORK, ASSETS, SITE_OWNER_EMAIL: localEmail};
const allowedHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
const server = http.createServer(async (incoming, outgoing) => {
  try {
    const host = incoming.headers.host;
    if (!allowedHosts.has(host) || incoming.socket.remoteAddress !== '127.0.0.1') {
      outgoing.writeHead(403); outgoing.end('This preview is available only on localhost.'); return;
    }
    const origin = `http://${host}`;
    const suppliedOrigin = incoming.headers.origin;
    if (incoming.headers['sec-fetch-site'] === 'cross-site' || (suppliedOrigin && suppliedOrigin !== origin)) {
      outgoing.writeHead(403); outgoing.end('Cross-origin requests are not accepted by the local preview.'); return;
    }
    const method = incoming.method ?? 'GET';
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && suppliedOrigin !== origin) {
      outgoing.writeHead(403); outgoing.end('Local writes require a matching Origin header.'); return;
    }
    const url = new URL(incoming.url ?? '/', origin);
    if (url.origin !== origin) { outgoing.writeHead(400); outgoing.end('Invalid request URL.'); return; }
    if (['/signin-with-chatgpt', '/signout-with-chatgpt'].includes(url.pathname)) {
      outgoing.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'});
      outgoing.end('This isolated local preview uses a fictional local owner. It does not sign in to ChatGPT. Start with --read-only to preview visitor access. Return to /#editor.'); return;
    }
    const headers = new Headers();
    for (const [name, value] of Object.entries(incoming.headers)) {
      if (value !== undefined && !['host', 'connection', 'transfer-encoding', 'oai-authenticated-user-id', 'oai-authenticated-user-email'].includes(name)) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
    }
    // Never trust supplied identity. This fictional identity is confined to this
    // loopback adapter, with every mutation also constrained to the same origin.
    if (!readOnly) {
      headers.set('oai-authenticated-user-id', 'humans-remain-local-preview-owner');
      headers.set('oai-authenticated-user-email', localEmail);
    }
    const request = new Request(url, {method, headers, ...(!['GET', 'HEAD'].includes(method) ? {body: Readable.toWeb(incoming), duplex: 'half'} : {})});
    const response = await worker.fetch(request, env);
    // The original Worker may deny a write before reading its body. Drain an
    // unused request stream so Node does not reset an in-flight upload instead
    // of returning the Worker's 403/405 response on a keep-alive connection.
    if (request.body && !request.bodyUsed) {
      const reader = request.body.getReader();
      try { while (!(await reader.read()).done) { /* discard unread input */ } }
      finally { reader.releaseLock(); }
    }
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    if (method === 'HEAD' || !response.body) outgoing.end();
    else await pipeline(Readable.fromWeb(response.body), outgoing);
  } catch (error) {
    console.error('Local preview request failed:', error);
    if (!outgoing.headersSent) outgoing.writeHead(500, {'Content-Type': 'text/plain; charset=utf-8'});
    outgoing.end('Local preview error. See the terminal for details.');
  }
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Humans Remain local preview: http://127.0.0.1:${port}/`);
  console.log(`Mode: ${readOnly ? 'visitor / read-only' : 'fictional local owner; saves stay on this computer'}`);
  console.log(`Local data: ${dataDir}`);
  console.log('Press Ctrl+C to stop. Rebuild and restart after source changes. No live services are written.');
});
server.on('error', error => { console.error(error.message); sql.close(); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { sql.close(); process.exit(0); }));
