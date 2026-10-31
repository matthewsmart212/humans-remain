/** Mechanical packaging only: original imagegen artwork, no painted/synthetic foliage. */
import { createRequire } from 'node:module'
import { copyFile, mkdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
const sharp = require('sharp')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const archive = path.join(root, 'artwork-archive/foliage-v1')
const runtime = path.join(root, 'public/survival/foliage-v1')
const sourceRoot = process.argv[2]
const sources = [
  { kind: 'broadleaf', generated: 'exec-6205ea6d-bdfe-4fb0-af1b-4dd724eac89d.png', root: [686, 783], width: 384 },
  { kind: 'fern', generated: 'exec-7e3bcda3-ac73-4e3d-82ae-06f6ad0b2a8a.png', root: [724, 923], width: 384 },
  { kind: 'grass', generated: 'exec-e1289f8c-cfc6-4459-b522-753ec3e74545.png', root: [638, 1026], width: 256, extraBottom: 40 },
]
await mkdir(archive, { recursive: true })
await mkdir(runtime, { recursive: true })
for (const entry of sources) {
  const original = path.join(archive, `${entry.kind}-source.png`)
  if (sourceRoot) await copyFile(path.join(sourceRoot, entry.generated), original)
  const { data, info } = await sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let x0 = info.width, y0 = info.height, x1 = 0, y1 = 0, removedSpecks = 0
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const a = (y * info.width + x) * 4 + 3
    // Remove solely near-invisible generator alpha noise, not the leaf silhouette.
    if (data[a] < 8) { if (data[a]) removedSpecks++; data[a] = 0; continue }
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y)
  }
  const padding = 24 // Survives the resampling filter while keeping every outer edge clear.
  const crop = {
    left: Math.max(0, x0 - padding), top: Math.max(0, y0 - padding),
    width: Math.min(info.width - 1, x1 + padding) - Math.max(0, x0 - padding) + 1,
    height: Math.min(info.height - 1, y1 + padding + (entry.extraBottom ?? 0)) - Math.max(0, y0 - padding) + 1,
  }
  const out = path.join(runtime, `${entry.kind}.webp`)
  const resized = await sharp(data, { raw: info }).extract(crop).resize({ width: entry.width, kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true })
  // Canonicalise invisible RGB after resampling to prevent coloured fringes in consumers.
  for (let i = 0; i < resized.data.length; i += 4) if (resized.data[i + 3] === 0) resized.data.fill(0, i, i + 3)
  await sharp(resized.data, { raw: resized.info }).webp({ lossless: true, effort: 6 }).toFile(out)
  const m = await sharp(out).metadata()
  const anchor = [(entry.root[0] - crop.left) / crop.width, (entry.root[1] - crop.top) / crop.height].map(v => Math.round(v * 10000) / 10000)
  console.log(JSON.stringify({ kind: entry.kind, nativeSize: [info.width, info.height], crop, rootNative: entry.root, anchor, size: [m.width, m.height], bytes: (await stat(out)).size, removedSpecks }))
}
