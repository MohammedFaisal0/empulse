import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const enPath = path.join(__dirname, '../src/i18n/_en.json')
const overridesDir = path.join(__dirname, '../src/i18n/overrides')
const outPath = path.join(__dirname, '../src/i18n/ar.ts')

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'))

function deepMerge(base, over) {
  if (typeof over === 'undefined') return base
  if (typeof base !== 'object' || base === null) return over ?? base
  if (typeof over !== 'object' || over === null) return over
  const out = Array.isArray(base) ? [...base] : { ...base }
  for (const key of Object.keys(over)) {
    out[key] = deepMerge(base[key], over[key])
  }
  return out
}

let merged = {}
if (fs.existsSync(overridesDir)) {
  const files = fs
    .readdirSync(overridesDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
  for (const f of files) {
    const chunk = JSON.parse(
      fs.readFileSync(path.join(overridesDir, f), 'utf8'),
    )
    merged = deepMerge(merged, chunk)
  }
}

const ar = deepMerge(en, merged)

function emit(obj, depth = 1) {
  const pad = '  '.repeat(depth)
  if (typeof obj === 'string') {
    return JSON.stringify(obj)
  }
  const lines = ['{']
  for (const [k, v] of Object.entries(obj)) {
    const key =
      /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) && !k.includes(' ')
        ? k
        : JSON.stringify(k)
    lines.push(
      pad +
        key +
        ': ' +
        (typeof v === 'string' ? JSON.stringify(v) : emit(v, depth + 1)) +
        ',',
    )
  }
  lines.push('  '.repeat(depth - 1) + '}')
  return lines.join('\n')
}

const header = "import type { EnStrings } from './en'\n\nexport const ar: EnStrings = "
fs.writeFileSync(outPath, header + emit(ar) + '\n', 'utf8')

function countEnglishLeaves(obj, enObj, prefix = '') {
  let n = 0
  for (const key of Object.keys(enObj)) {
    const p = prefix ? `${prefix}.${key}` : key
    if (typeof enObj[key] === 'string') {
      if (obj[key] === enObj[key]) n++
    } else {
      n += countEnglishLeaves(obj[key], enObj[key], p)
    }
  }
  return n
}

console.log('Wrote', outPath)
console.log('Keys still matching English:', countEnglishLeaves(ar, en))
