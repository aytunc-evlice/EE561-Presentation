# Multilevel Converters, Part II: interactive lecture deck

Open `index.html` in Chrome or Edge. It runs offline, with no installation or internet connection required. All plots are computed live in the browser.

These are the Part II slides of the original joint deck (commit `d01966a`), restored unchanged as a deck of their own. The engine and simulation files are the versions of that commit. Some notes still refer to “Part I”: that is now Sefer’s talk in [`../../Sefer_Presentation_and_Materials/`](../../Sefer_Presentation_and_Materials/).

## Presenter keys

| Key | Action |
| --- | --- |
| `→` `Space` `PgDn` | Next build step or next slide; presentation clickers work |
| Swipe left / right | Next / back on a phone or tablet (◀ ▶ buttons are also shown there) |
| `←` `PgUp` | Back |
| `N` | Speaker notes, slot time and running clock (opens below the slide) |
| `O` | Slide index (click a slide to jump) |
| `P` / `R` | Play/pause or reset the simulation on the current slide |
| `F` | Fullscreen |
| `D` | Dark or light theme; light is better for a lit room |
| `B` | Black screen |
| `T` | Restart the clock |
| number + `Enter` | Jump to that slide |

## Outline: Running the levels: Modulate · Balance · Control (20 slides, ≈ 45 min)

Theory slides are marked ★.

| # | Slide | min |
| --: | --- | --: |
| 1 | Title | 0.5 |
| 2 | Learning objectives | 0.5 |
| 3 | ★ Basics: sine-triangle PWM: carrier, reference, comparator, duty cycle, local average (animated) | 2.5 |
| 4 | ★ Basics: modulation index m<sub>a</sub> and frequency ratio m<sub>f</sub>: linear range, overmodulation, sideband clusters | 2.5 |
| 5 | Reference → level → state → gates | 1.5 |
| 6 | Carrier lab (PD/POD/APOD/phase-shifted) | 4.5 |
| 7 | Min-max injection | 3 |
| 8 | Space-vector hexagon (2L/3L/5L) | 4 |
| 9 | Worked example: dwell times | 2.5 |
| 10 | Switching sequence | 2 |
| 11 | Why capacitors drift | 1.5 |
| 12 | Derivation: balancing authority ∝ cos φ | 3 |
| 13 | Neutral-point balancing simulation | 4 |
| 14 | Flying-capacitor balancing | 2 |
| 15 | Averaged model for control | 2.5 |
| 16 | Control structure | 2.5 |
| 17 | dq current control (simulation) | 3 |
| 18 | Where multilevel lives today | 2 |
| 19 | Three things to remember | 1 |
| 20 | References | |

CHB and MMC are left out on purpose: they are covered in another talk of the module.

## Simulation models: what to say if asked

- **SPWM basics (slides 3–4):** natural sampling, 2-level leg, V<sub>dc</sub> = 800 V. The spectrum is the FFT of one period (8192 samples); the m<sub>a</sub> curve is the fundamental of the clipped local average.
- **Neutral-point balancing (slide 13):** a switching-period average model, i<sub>O</sub> = Σ(1 − |r<sub>x</sub>|)·i<sub>x</sub>, with an ideal source holding v<sub>C1</sub> + v<sub>C2</sub>. The time constant matches the derivation on slide 12 (τ ≈ 33 ms at unity PF).
- **Flying-capacitor balancing (slide 14):** the leg explorer in run mode with ideal switches; the zero-level state is alternated, fixed, or chosen in closed loop.
- **dq control (slide 17):** an L-filter average model with a voltage limit and an optional one-sample delay.

## Printed handouts (`../quiz/`)

- **`Quiz - Modulation and Balancing.pdf`:** one A4 page, two questions (DC-bus utilization and min-max injection; neutral-point balancing), 50 points.
- **`Quiz Answer Key - Modulation and Balancing.pdf`:** worked solutions and marking. For the presenter and the instructor only.
- **`Potential Final Questions - Modulation and Balancing.pdf`:** three-level space-vector modulation; designing a neutral-point balancing loop, with solutions.
- **Sources:** in `../quiz/src/`. Edit the HTML, then run `build_pdfs.ps1` to regenerate the PDFs with Edge.

## Assets

- **`img/odtu_logo.svg`** and **`img/odtu_emblem.svg`:** the ODTÜ logo and emblem, from Wikimedia Commons (`Odtu-metu-logo.svg`, `METU_logo.svg`). For official use, check them against the [ODTÜ logo usage guide](https://www.metu.edu.tr/system/files/odtu_logo_kullanim_klavuzu.pdf).
- **`img/powerlab_logo.png`:** the METU PowerLab logo, from [odtu.github.io](https://odtu.github.io).

## Editing

- **Slides:** each slide is a `<section class="slide">` in `index.html`. Speaker notes are in its `<aside class="notes">`, and the time slot is in `data-min`.
- **Build steps:** elements with `data-step="k"` appear on the k-th click.
- **Code:** `js/sim-basics.js` (SPWM basics; it also holds two Part I sims that are unused here), `js/sim-mod.js` (carrier lab, min-max, space vectors), `js/sim-ctl.js` (neutral-point balancing, dq control), `js/sim-leg.js` (leg explorer for the flying-capacitor slide), shared plotting and FFT code in `js/kit.js`, navigation in `js/deck.js`.
