# Logo exploration — fonts and licences

All characters in the logo directions are vector outlines baked into the SVGs. No font is loaded at runtime.
Glyphs were converted to outlines with fontTools (`docs/brand/extract_glyphs.py`) and are stored in `docs/brand/glyphs.json`.
The SIL Open Font License 1.1 allows this, and artwork made from converted outlines is not itself a "Font Software" derivative.
The fonts themselves are **not** redistributed in this repository.

| Used for | Font | Designer / copyright | Licence | Source |
|---|---|---|---|---|
| A · 鍛える (brush) | Yuji Syuku Regular | Copyright 2021 The Yuji Project Authors (github.com/Kinutafontfactory/Yuji) | SIL OFL 1.1 | github.com/google/fonts/tree/main/ofl/yujisyuku |
| A · "Kitaeru" wordmark | Shippori Mincho ExtraBold | Copyright 2021 The Shippori Mincho Project Authors (github.com/fontdasu/ShipporiMincho) | SIL OFL 1.1 | github.com/google/fonts/tree/main/ofl/shipporimincho |
| B · 鍛える and "KITAERU" | Zen Antique Regular | Copyright 2021 The Zen Antique Project Authors (github.com/googlefonts/zen-antique) | SIL OFL 1.1 | github.com/google/fonts/tree/main/ofl/zenantique |
| C · "KITAERU" wordmark | Jost (variable, instanced at wght 500) | Copyright 2020 The Jost Project Authors (github.com/indestructible-type) | SIL OFL 1.1 | github.com/google/fonts/tree/main/ofl/jost |
| C · 鍛える | none — drawn by hand as centre-line strokes in `build_logos.py` | Kitaeru | project's own | — |

The OFL text for each font was downloaded with it (`OFL.txt` in each font's folder at the sources above).

Zen Antique was also used to check C's stroke structure: its outline was overlaid on the hand-drawn strokes during design. It isn't shipped in C.

## Not used
There are no commercial or unknown-licence fonts, no system fonts (Yu Gothic, MS Gothic and similar), and no images from the web.

## Seal script
No OFL-licensed seal-script (篆書) font or vector is available for 鍛, so direction B uses a regular-script structure. The small-seal form is documented in 説文解字 (金部: 鍛，小冶也。从金段聲). A real seal-script mark would have to be carved and scanned by a seal carver (篆刻家).
