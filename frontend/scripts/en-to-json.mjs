import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const enPath = path.join(__dirname, '../src/i18n/en.ts')
const src = fs.readFileSync(enPath, 'utf8')
const m = src.match(/export const en = (\{[\s\S]*\}) as const/)
const en = Function('return (' + m[1] + ')')()
fs.writeFileSync(
  path.join(__dirname, '../src/i18n/_en.json'),
  JSON.stringify(en, null, 2),
  'utf8',
)
