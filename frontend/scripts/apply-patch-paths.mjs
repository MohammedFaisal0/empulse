import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const enPath = path.join(__dirname, '../src/i18n/_en.json')
const patchPath = path.join(__dirname, '../src/i18n/overrides/patches.json')
const outPath = path.join(__dirname, '../src/i18n/overrides/_merged-patches.json')

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'))
const patches = JSON.parse(fs.readFileSync(patchPath, 'utf8'))

function setPath(obj, dotPath, value) {
  const parts = dotPath.split('.')
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]
    if (!(p in cur)) cur[p] = {}
    cur = cur[p]
  }
  cur[parts[parts.length - 1]] = value
}

const tree = {}
for (const [k, v] of Object.entries(patches)) {
  setPath(tree, k, v)
}

fs.writeFileSync(outPath, JSON.stringify(tree, null, 2) + '\n', 'utf8')
console.log('Wrote', outPath, Object.keys(patches).length, 'patches')
