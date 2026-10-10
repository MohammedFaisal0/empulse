const fs = require('fs'), zlib = require('zlib');
const d = fs.readFileSync('canvas.fig');
let o = 12; const chunks = [];
while (o + 4 <= d.length) { const n = d.readUInt32LE(o); chunks.push(d.subarray(o + 4, o + 4 + n)); o += 4 + n; }
const schemaBuf = zlib.inflateRawSync(chunks[0]);
let dataBuf; try { dataBuf = zlib.zstdDecompressSync(chunks[1]); } catch (e) { dataBuf = zlib.inflateRawSync(chunks[1]); }
console.log('schema', schemaBuf.length, 'data', dataBuf.length);
class BB { constructor(b) { this.b = b; this.i = 0; }
  byte() { return this.b[this.i++]; }
  varuint() { let r = 0, s = 0, c; do { c = this.b[this.i++]; r += (c & 127) * Math.pow(2, s); s += 7; } while (c & 128); return r; }
  varint() { const v = this.varuint(); return (v % 2) ? -(Math.floor(v / 2)) - 1 : v / 2; }
  varfloat() { const f = this.b[this.i]; if (f === 0) { this.i++; return 0; } let bits = this.b[this.i] | (this.b[this.i+1] << 8) | (this.b[this.i+2] << 16) | (this.b[this.i+3] << 24); this.i += 4; bits = (bits << 23) | (bits >>> 9); const t = Buffer.alloc(4); t.writeInt32LE(bits | 0); return t.readFloatLE(0); }
  string() { let e = this.i; while (this.b[e] !== 0) e++; const s = this.b.toString('utf8', this.i, e); this.i = e + 1; return s; }
  varuint64() { let r = 0n, s = 0n, c; do { c = this.b[this.i++]; r |= BigInt(c & 127) << s; s += 7n; } while (c & 128); return r; }
}
// schema
const sb = new BB(schemaBuf); const defs = []; const n = sb.varuint();
for (let k = 0; k < n; k++) { const name = sb.string(); const kind = sb.byte(); const fc = sb.varuint(); const fields = [];
  for (let j = 0; j < fc; j++) { const fname = sb.string(); const type = sb.varint(); const isArray = !!(sb.byte() & 1); const value = sb.varuint(); fields.push({ name: fname, type, isArray, value }); }
  defs.push({ name, kind, fields }); }
const builtin = ['bool', 'byte', 'int', 'uint', 'float', 'string', 'int64', 'uint64'];
for (const df of defs) for (const f of df.fields) { if (df.kind !== 0) f.type = f.type < 0 ? builtin[~f.type] : defs[f.type].name; }
const byName = Object.fromEntries(defs.map(x => [x.name, x]));
const db = new BB(dataBuf);
function read(type) {
  switch (type) {
    case 'bool': return !!db.byte(); case 'byte': return db.byte(); case 'int': return db.varint(); case 'uint': return db.varuint();
    case 'float': return db.varfloat(); case 'string': return db.string(); case 'int64': return Number(db.varuint64()); case 'uint64': return Number(db.varuint64());
  }
  const df = byName[type];
  if (df.kind === 0) { const v = db.varuint(); const f = df.fields.find(x => x.value === v); return f ? f.name : v; }
  if (df.kind === 1) { const r = {}; for (const f of df.fields) r[f.name] = f.isArray ? Array.from({ length: db.varuint() }, () => read(f.type)) : read(f.type); return r; }
  const r = {};
  for (;;) { const id = db.varuint(); if (id === 0) return r; const f = df.fields.find(x => x.value === id); if (!f) throw new Error('bad field ' + id + ' in ' + type + ' at ' + db.i);
    r[f.name] = f.isArray ? Array.from({ length: db.varuint() }, () => read(f.type)) : read(f.type); }
}
const msg = read('Message');
console.log('keys', Object.keys(msg), 'nodeChanges', (msg.nodeChanges || []).length);
fs.writeFileSync('nodes.json', JSON.stringify(msg.nodeChanges));
