# design/

- `tokens.json`: colors, fonts, radii, shadows, layout numbers extracted from Figma. Single source of truth for Tailwind config.
- `SCREENS.md`: the 45 screens, roles, routes, Figma node ids.
- `png/`: one PNG per screen, named by ID (`A01.png`, `E01.png`, `M06.png`, `H13.png` ...). **Cursor must open the matching PNG before building a screen.**

## How to export the PNGs (one time, about 5 minutes)
1. Open the Figma file "Final design".
2. In the Layers panel expand the four sections: ACCESS, EMPLOYEE, MANAGER, HR & EXECUTIVE.
3. Click the first screen, then Shift+click the last one inside the first section. Hold Ctrl and add the other sections' screens too (or repeat per section).
4. In the right panel, under Export, click `+`, choose `PNG` and `1x`, then press **Export N layers**.
5. Figma downloads a zip. Unzip it into `design/png/`.
6. Rename files so each starts with its ID (`E01 My Overview.png` becomes `E01.png`).

If a screen is very tall, 1x is fine. Do not export at 2x (files get huge).
