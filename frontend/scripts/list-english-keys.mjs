import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const en = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/i18n/_en.json'), 'utf8'),
)
const src = fs.readFileSync(path.join(__dirname, '../src/i18n/ar.ts'), 'utf8')
const m = src.match(/export const ar: EnStrings = (\{[\s\S]*\})\s*$/)
const ar = Function('return (' + m[1] + ')')()

function list(obj, enObj, prefix = '') {
  for (const key of Object.keys(enObj)) {
    const p = prefix ? `${prefix}.${key}` : key
    if (typeof enObj[key] === 'string') {
      if (obj[key] === enObj[key]) console.log(p, '|', enObj[key])
    } else {
      list(obj[key], enObj[key], p)
    }
  }
}

list(ar, en)
