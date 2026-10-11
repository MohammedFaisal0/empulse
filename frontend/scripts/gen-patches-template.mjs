import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const en = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/i18n/_en.json'), 'utf8'),
)

function paths(obj, prefix = '') {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') out[p] = v
    else Object.assign(out, paths(v, p))
  }
  return out
}

const flat = paths(en)
fs.writeFileSync(
  path.join(__dirname, '../src/i18n/overrides/patches-template.json'),
  JSON.stringify(flat, null, 2),
  'utf8',
)
console.log(Object.keys(flat).length)
