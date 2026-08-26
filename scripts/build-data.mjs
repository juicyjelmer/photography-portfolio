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

  const looseFiles = dedupeMinVariants(loose).map(f => `/content/${category.name}/${f}`)
  fs.writeFileSync(path.join(categoryDir, 'data.json'), JSON.stringify({ featured, loose: looseFiles }))
  written++
}

console.log(`Wrote ${written} data.json file(s).`)
