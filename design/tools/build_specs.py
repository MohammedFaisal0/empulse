"""Convert the decoded Figma nodes (nodes.json from dec.js) into one readable text spec per screen."""
import json, re, sys
from collections import defaultdict
from pathlib import Path

SCREENS = {
 "A01":"54:1384","A02":"3:26461","E01":"3:26531","E02":"3:26833","E03":"3:27035","E04":"3:27333","E05":"3:27545","E06":"3:27752",
 "E07":"72:6","E08":"212:2","E09":"209:2","E10":"205:2","E11":"204:2","M01":"207:2","M02":"206:2","M03":"210:2","M04":"211:2",
 "M04b":"208:2","M05":"237:3","M06":"237:239","M07":"237:680","M08":"237:892","M09":"237:1200","M10":"237:1450","M11":"237:1808",
 "M12":"237:2053","M13":"237:2429","H01":"253:888","H02":"253:1639","H02b":"253:2158","H03":"253:4244","H03b":"253:4937",
 "H04":"253:5980","H05":"253:6405","H06":"253:7231","H07":"253:7805","H08":"191:874","H09":"241:2","H10":"241:3","H11":"241:4",
 "H12":"241:5","H13":"241:6","H14":"241:7","H15":"241:8","H16":"241:9"}
out_dir = Path(sys.argv[1]); out_dir.mkdir(parents=True, exist_ok=True)
nodes = json.load(open('nodes.json'))
key = lambda g: f"{g['sessionID']}:{g['localID']}"
by_id = {key(n['guid']): n for n in nodes}
kids = defaultdict(list)
for n in nodes:
    p = n.get('parentIndex')
    if p: kids[key(p['guid'])].append(n)
for k in kids: kids[k].sort(key=lambda n: n['parentIndex']['position'])

def hexc(c, extra=1.0):
    h = '#%02x%02x%02x' % tuple(round(c[x]*255) for x in 'rgb')
    a = c.get('a', 1) * extra
    return h if a >= 0.995 else f"{h}@{a:.2f}".rstrip('0').rstrip('.')
def paints(ps):
    out = []
    for p in ps or []:
        if p.get('visible') is False: continue
        t = p['type']
        if t == 'SOLID': out.append(hexc(p['color'], p.get('opacity', 1)))
        elif t.startswith('GRADIENT'): out.append('gradient(' + ','.join(hexc(s['color']) for s in p.get('stops', [])) + ')')
        elif t == 'IMAGE': out.append('image')
    return '+'.join(out)
def num(v): 
    v = round(v, 1); return str(int(v)) if v == int(v) else str(v)

def describe(n, ox, oy, depth, lines):
    if n.get('visible') is False: return
    t = n['type']; tr = n.get('transform', {}); sz = n.get('size', {'x': 0, 'y': 0})
    x, y = ox + tr.get('m02', 0), oy + tr.get('m12', 0)
    name = n.get('name', '')
    parts = [f"{t} \"{name}\"", f"@{num(x)},{num(y)} {num(sz['x'])}x{num(sz['y'])}"]
    f = paints(n.get('fillPaints'))
    if t == 'TEXT':
        td = n.get('textData', {}); fn = n.get('fontName', {})
        parts.append('"' + td.get('characters', '').replace('\n', '\\n') + '"')
        parts.append(f"{fn.get('family','')} {fn.get('style','')} {num(n.get('fontSize',0))}px")
        if f: parts.append('color ' + f)
        lh = n.get('lineHeight')
        if lh and lh.get('units') == 'PIXELS': parts.append('lh ' + num(lh['value']))
        ls = n.get('letterSpacing')
        if ls and ls.get('value'): parts.append('ls ' + num(ls['value']) + ('%' if ls['units']=='PERCENT' else 'px'))
        if n.get('textAlignHorizontal') not in (None, 'LEFT'): parts.append('align ' + n['textAlignHorizontal'].lower())
        if n.get('textCase') not in (None, 'ORIGINAL'): parts.append(n['textCase'].lower())
    else:
        if f: parts.append('fill ' + f)
    sp = paints(n.get('strokePaints'))
    if sp and t != 'TEXT':
        w = n.get('strokeWeight', 1)
        ind = [n.get('borderTopWeight'), n.get('borderRightWeight'), n.get('borderBottomWeight'), n.get('borderLeftWeight')]
        parts.append('stroke ' + sp + ' ' + (('T/R/B/L ' + '/'.join(num(v or 0) for v in ind)) if n.get('borderStrokeWeightsIndependent') else num(w)))
    if n.get('rectangleCornerRadiiIndependent'):
        parts.append('radius ' + '/'.join(num(n.get(k, 0)) for k in ('rectangleTopLeftCornerRadius','rectangleTopRightCornerRadius','rectangleBottomRightCornerRadius','rectangleBottomLeftCornerRadius')))
    elif n.get('cornerRadius'): parts.append('radius ' + num(n['cornerRadius']))
    if t == 'ELLIPSE': parts.append('ellipse')
    if n.get('opacity', 1) < 1: parts.append('opacity ' + num(n['opacity']))
    for e in n.get('effects') or []:
        if e.get('visible') is False: continue
        if e['type'] in ('DROP_SHADOW', 'INNER_SHADOW'):
            o = e.get('offset', {})
            parts.append(f"{e['type'].lower().replace('_',' ')} {num(o.get('x',0))} {num(o.get('y',0))} blur {num(e.get('radius',0))} {hexc(e['color'])}")
        elif e['type'] in ('FOREGROUND_BLUR', 'BACKGROUND_BLUR'): parts.append(e['type'].lower() + ' ' + num(e.get('radius', 0)))
    sm = n.get('stackMode')
    if sm and sm != 'NONE':
        pad = [n.get('stackPaddingLeft', n.get('stackHorizontalPadding', 0)), n.get('stackPaddingRight', n.get('stackHorizontalPadding', 0)), n.get('stackVerticalPadding', 0), n.get('stackPaddingBottom', n.get('stackVerticalPadding', 0))]
        bits = [f"layout {sm.lower()}", f"gap {num(n.get('stackSpacing', 0))}"]
        if any(pad): bits.append('pad L/R/T/B ' + '/'.join(num(v or 0) for v in pad))
        if n.get('stackPrimaryAlignItems'): bits.append('main ' + n['stackPrimaryAlignItems'].lower())
        if n.get('stackCounterAlignItems'): bits.append('cross ' + n['stackCounterAlignItems'].lower())
        parts.append(' '.join(bits))
    if t in ('FRAME', 'SECTION') and n.get('frameMaskDisabled') is False: parts.append('clip')
    lines.append('  ' * depth + ' | '.join(parts))
    if t == 'VECTOR' or t == 'BRUSH': return
    for c in kids.get(key(n['guid']), []):
        describe(c, x, y, depth + 1, lines)

index = []
for sid, nid in SCREENS.items():
    n = by_id.get(nid)
    if not n: print('MISSING', sid, nid); continue
    lines = []
    describe(n, -n.get('transform', {}).get('m02', 0), -n.get('transform', {}).get('m12', 0), 0, lines)
    head = [f"# {sid}: {n.get('name','')}", "", f"Figma node `{nid}`. Frame {num(n['size']['x'])}x{num(n['size']['y'])}px. Coordinates are px from the frame's top-left corner (@x,y), children listed under their parent (indented).", "See design/specs/README.md for how to read this.", "", "```"]
    text = "\n".join(head + lines + ["```", ""])
    (out_dir / f"{sid}.md").write_text(text, encoding='utf-8')
    index.append((sid, n.get('name',''), len(lines), len(text)))
for i in index: print(i)
print(sum(i[3] for i in index)/1e6, 'MB total')
