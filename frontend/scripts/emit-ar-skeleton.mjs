import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const enPath = path.join(__dirname, '../src/i18n/en.ts')
const outPath = path.join(__dirname, '../src/i18n/ar.ts')

const src = fs.readFileSync(enPath, 'utf8')
const m = src.match(/export const en = (\{[\s\S]*\}) as const/)
if (!m) throw new Error('Could not parse en.ts')
const en = Function('return (' + m[1] + ')')()

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
const body = emit(en)
fs.writeFileSync(outPath, header + body + '\n', 'utf8')
console.log('Wrote', outPath)
