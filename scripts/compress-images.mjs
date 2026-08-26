import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT_DIR = path.join(ROOT, 'content')

const MAX_DIM = 2000
const QUALITY = 78
const SKIP_UNDER_BYTES = 1024 * 1024 // already-small files (e.g. pre-sized "forweb-*" exports) don't need a -min copy

function walk(dir) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(full))
    else files.push(full)
  }
  return files
}

const allFiles = walk(CONTENT_DIR)
const jpegs = allFiles.filter(f => /\.(jpe?g)$/i.test(f) && !/-min\.(jpe?g)$/i.test(f))

let processed = 0
let skipped = 0
let totalBefore = 0
let totalAfter = 0

for (const srcPath of jpegs) {
  const dir = path.dirname(srcPath)
  const base = path.basename(srcPath)
  const minPath = path.join(dir, base.replace(/\.(jpe?g)$/i, '-min.$1'))

  if (fs.existsSync(minPath)) {
    skipped++
    continue
  }

  const srcSize = fs.statSync(srcPath).size
  const meta = await sharp(srcPath).metadata()

  if (Math.max(meta.width, meta.height) <= MAX_DIM && srcSize < SKIP_UNDER_BYTES) {
    skipped++
    continue
  }

  await sharp(srcPath)
    .resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(minPath)

  const outSize = fs.statSync(minPath).size
  totalBefore += srcSize
  totalAfter += outSize
  processed++
  console.log(`${path.relative(CONTENT_DIR, srcPath)}: ${(srcSize / 1024 / 1024).toFixed(2)}MB -> ${path.basename(minPath)}: ${(outSize / 1024 / 1024).toFixed(2)}MB`)
}

console.log(`\n${processed} image(s) compressed, ${skipped} already up to date.`)
if (processed > 0) {
  console.log(`${(totalBefore / 1024 / 1024).toFixed(1)}MB -> ${(totalAfter / 1024 / 1024).toFixed(1)}MB`)
}
