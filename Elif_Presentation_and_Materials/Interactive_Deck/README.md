# Multilevel Converters: Cascaded H-bridge multilevel inverters (Elif Topaloğlu)

Open `index.html` in Chrome or Edge. It is one self-contained file (plus the logos in `img/`), runs offline and computes
every plot live in the browser.

Third of three talks: Sefer’s ([`../../Sefer_Presentation_and_Materials/`](../../Sefer_Presentation_and_Materials/)) and
Aytunç’s ([`../../Aytunc_Presentation_and_Materials/`](../../Aytunc_Presentation_and_Materials/)) come before.

## Presenter keys

| Key | Action |
| --- | --- |
| `→` `↓` `Space` `PgDn` | Next slide; presentation clickers work |
| `←` `↑` `PgUp` | Back |
| `Home` / `End` | First / last slide |
| Swipe left / right | Next / back on a phone or tablet (◀ ▶ buttons are also shown there) |
| `N` | Speaker notes |
| `D` | Dark or light theme |
| `F` | Fullscreen |

The URL hash (`#slide-7`) opens a given slide.

## Outline (19 slides)

| # | Slide |
| --: | --- |
| 1 | Title |
| 2 | Single-phase H-bridge cell (pick a switching state, see the current path) |
| 3 | Bipolar and unipolar PWM |
| 4 | Unipolar PWM: shift the reference or the carrier |
| 5 | CHB topology, equal DC voltages |
| 6 | Five-level CHB: switching states and redundancy |
| 7 | CHB with unequal DC voltages: more levels without more cells |
| 8 | Seven levels: equal vs. unequal |
| 9 | Phase-shifted PWM, seven levels |
| 10 | Phase-shifted PWM, m<sub>f</sub> = 10 |
| 11 | Phase-shifted PWM: switching frequency and output voltage |
| 12 | Level-shifted PWM: carrier arrangements (IPD, APOD, POD) |
| 13 | Level-shifted PWM, IPD, seven levels |
| 14 | Level-shifted PWM: uneven device use and rotation |
| 15 | Phase-shifted vs. level-shifted |
| 16 | Staircase modulation: selective harmonic elimination |
| 17 | Staircase modulation: drawbacks |
| 18 | Summary, with the Perfect Harmony GH180 drive |
| 19 | References |

## Assets

- **`img/odtu_logo.svg`**, **`img/odtu_emblem.svg`** and **`img/powerlab_logo.png`:** the same ODTÜ and METU PowerLab
  logos as in the other two decks (sources in their READMEs).

## Editing

- **Slides:** each slide is a `<section class="slide">` in `index.html`; speaker notes are in its `<aside class="notes">`,
  and the reference shown in the footer is in `data-ref`.
- **Code:** in the `<script>` at the end of `index.html`: plotting and PWM helpers (kit), the slide engine (`D`), then one
  `D.register(...)` per simulation.
