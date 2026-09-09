import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { IMG_EXT, dedupeMinVariants } from './lib.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT_DIR = path.join(ROOT, 'content')

function readCollectionMeta(dir, slug) {
  let meta = { title: slug, description: '', featured: [] }
  try {
    meta = { ...meta, ...JSON.parse(fs.readFileSync(path.join(dir, 'collection.json'), 'utf8')) }
  } catch {}
  return meta
}

let written = 0

for (const category of fs.readdirSync(CONTENT_DIR, { withFileTypes: true })) {
  if (!category.isDirectory()) continue
  const categoryDir = path.join(CONTENT_DIR, category.name)

  const featured = []
  const loose = []

  for (const entry of fs.readdirSync(categoryDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const slug = entry.name
      const collectionDir = path.join(categoryDir, slug)
      const meta = readCollectionMeta(collectionDir, slug)

      for (const f of meta.featured) {
        featured.push({ src: `/content/${category.name}/${slug}/${f}`, collection: slug, title: meta.title })
      }

      const files = fs.readdirSync(collectionDir).filter(f => IMG_EXT.has(path.extname(f).toLowerCase()))
      const images = dedupeMinVariants(files).map(f => `/content/${category.name}/${slug}/${f}`)
      fs.writeFileSync(
        path.join(collectionDir, 'data.json'),
        JSON.stringify({ title: meta.title, description: meta.description, images })
      )
      written++
    } else if (IMG_EXT.has(path.extname(entry.name).toLowerCase())) {
      loose.push(entry.name)
    }
  }

  // optional content/<category>/order.json: pins specific photos to the front and/or
  // back of the homepage grid. Either a bare array (treated as "front" pins, for
  // backwards compatibility) or { "front": [...], "back": [...] } - each entry is
  // "collection-slug/filename.jpg"
  let orderedFeatured = featured
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(categoryDir, 'order.json'), 'utf8'))
    const frontPins = Array.isArray(raw) ? raw : (raw.front || [])
    const backPins = Array.isArray(raw) ? [] : (raw.back || [])
    const key = (f) => `${f.collection}/${path.basename(f.src)}`
    const front = frontPins.map(p => featured.find(f => key(f) === p)).filter(Boolean).map(f => ({ ...f, pinned: true }))
    const back = backPins.map(p => featured.find(f => key(f) === p)).filter(Boolean)
    const usedKeys = new Set([...front, ...back].map(key))
    orderedFeatured = [...front, ...featured.filter(f => !usedKeys.has(key(f))), ...back]
  } catch {}

  const looseFiles = dedupeMinVariants(loose).map(f => `/content/${category.name}/${f}`)
  fs.writeFileSync(path.join(categoryDir, 'data.json'), JSON.stringify({ featured: orderedFeatured, loose: looseFiles }))
  written++
}

console.log(`Wrote ${written} data.json file(s).`)
