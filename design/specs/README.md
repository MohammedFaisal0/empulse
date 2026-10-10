# design/specs: the Figma design as text

One file per screen (`A01.md` ... `H16.md`, 45 files), extracted directly from the final Figma file (`Final design.fig`, exported 2026-10-10).
This is the **primary source for building screens**. It needs no Figma access, no rate limit and no screenshots. Every text, size, color, radius, border, shadow, font and layout setting is in it.

## How to read a line
```
FRAME "Role promise" | @14,99 220x46 | fill #e6f7f5 | radius 9 | layout horizontal gap 8 pad L/R/T/B 10/10/7/7 cross center | clip
  TEXT "Question" | @47,106 177x32 | "How am I doing, and how can I grow?" | DM Sans SemiBold 12px | color #0f766e
```
- Indentation = nesting (children are indented under their parent). The first line is the screen frame.
- `@x,y WxH` = position (px from the screen frame's top-left) and size. Use these to understand the layout and as size hints; build with flexbox/grid, not absolute positioning.
- `FRAME` = a `div` (name hints at its role; names such as `span`, `a.navd`, `div:margin` came from an HTML import). `TEXT` = text. `VECTOR` = an icon (use the matching `lucide-react` icon). `ELLIPSE`/`ROUNDED_RECTANGLE` = shapes (dots, bars, rings).
- `fill #hex` / `color #hex` = background / text color. `#hex@0.16` = with 16% opacity. `gradient(...)` = gradient fill. Map each hex to a token in `tailwind.config.ts` (see `design/tokens.json`); never hard-code hex.
- `stroke #hex 1` = border; `stroke #hex T/R/B/L 0/1/0/0` = border only on those sides. `radius 10` = border radius px (`10/10/0/0` = per corner TL/TR/BR/BL).
- `layout vertical|horizontal gap N` = flex column/row with gap. `pad L/R/T/B a/b/c/d` = padding. `main`/`cross` = justify-content / align-items (`space_between`, `center`, `min`, `max`). `clip` = overflow hidden.
- `drop shadow x y blur N #color` = box shadow. `opacity` = element opacity.
- Text: `"content" | Family Weight sizepx | color | lh N (line height px) | ls N% (letter spacing) | align | upper/lower`. DM Mono is used for numbers, IDs and small uppercase labels.

## Rules
- The words in the file are the exact UI copy. Put them in `frontend/src/i18n/en.ts`.
- Numbers that appear in the design (e.g. 72%, 1,240 people) are demo values. Show real values from the API; the seed data (`data/generated`) was built to match the demo people.
- If the spec and the PNG (when present) disagree, the spec wins on text and numbers; ask when unclear.
- To regenerate after the Figma file changes: unzip the `.fig`, run `node design/tools/fig_decode.js` then `python design/tools/build_specs.py design/specs` (see the scripts).
