# Multilevel Converters: Running the levels (M. Aytunç Evlice)

Open `index.html` in Chrome or Edge. It runs offline, with no installation or internet connection required. All plots are computed live in the browser.

Second of three talks: Sefer’s talk ([`../../Sefer_Presentation_and_Materials/`](../../Sefer_Presentation_and_Materials/)) comes before, Elif’s cascaded H-bridge ([`../../Elif_Presentation_and_Materials/`](../../Elif_Presentation_and_Materials/)) after.

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

## Outline: Running the levels: Modulate · Balance · Control (22 slides, ≈ 46 min)

Theory slides are marked ★; new in the November 2026 rework marked (new).

| # | Slide | min |
| --: | --- | --: |
| 1 | Title | 0.5 |
| 2 | Learning objectives | 0.5 |
| 3 | ★ Basics: sine-triangle PWM: carrier, reference, comparator, duty cycle, local average (animated) | 2 |
| 4 | ★ Basics: modulation index m<sub>a</sub> and frequency ratio m<sub>f</sub>: linear range, overmodulation, sideband clusters | 2 |
| 5 | Reference → level → state → gates | 1.5 |
| 6 | Carrier lab (PD/POD/APOD/phase-shifted); the module’s main carrier-PWM slide, Elif builds on it | 4.5 |
| 7 | Min-max injection | 3 |
| 8 | Min-max on Sefer’s hexagon: same limit, same pulses, redundancy = offset (new; replaces three SVM slides) | 2 |
| 9 | Why capacitors drift (recap of Sefer’s result) | 1 |
| 10 | ★ Derivation: balancing authority ∝ cos φ | 3 |
| 11 | Neutral-point balancing simulation | 3.5 |
| 12 | Flying-capacitor balancing | 2 |
| 13 | ★ MMC: arms of half-bridge submodules, arm equations (new) | 2.5 |
| 14 | MMC: submodule sorting simulation (new) | 3 |
| 15 | ★ MMC: circulating current and its control (new) | 2.5 |
| 16 | ★ Averaged model for control | 2 |
| 17 | Control structure | 2 |
| 18 | dq current control (simulation) | 2.5 |
| 19 | Grid filter: L vs. LCL, 2-level vs. 3-level (simulation, new) | 3 |
| 20 | Where multilevel lives today | 1.5 |
| 21 | Three things to remember, handover to Elif | 1 |
| 22 | References | |

## Simulation models: what to say if asked

- **SPWM basics (slides 3–4):** natural sampling, 2-level leg, V<sub>dc</sub> = 800 V. The spectrum is the FFT of one period (8192 samples); the m<sub>a</sub> curve is the fundamental of the clipped local average.
- **Neutral-point balancing (slide 11):** a switching-period average model, i<sub>O</sub> = Σ(1 − |r<sub>x</sub>|)·i<sub>x</sub>, with an ideal source holding v<sub>C1</sub> + v<sub>C2</sub>. The time constant matches the derivation on slide 10 (τ ≈ 33 ms at unity PF).
- **Flying-capacitor balancing (slide 12):** the leg explorer in run mode with ideal switches; the zero-level state is alternated, fixed, or chosen in closed loop.
- **dq control (slide 18):** an L-filter average model with a voltage limit and an optional one-sample delay.
- **MMC sorting (slide 14):** one upper arm, 6 kV DC, N SMs of 3 mF, 200 A peak AC, nearest-level modulation every 100 µs. The arm current is imposed (circulating current assumed suppressed); a slow arm-energy loop sets its DC part. Modes: fixed order, full sort every period, or sort only on level changes with a ±5 % tolerance band.
- **Grid filter (slide 19):** the phase-voltage spectrum of naturally sampled sine PWM (2-level, or 3-level PD; 400 V, 50 kVA, 800 V DC) times the filter admittance i<sub>g</sub>/v<sub>c</sub>, with a stiff, clean grid. R<sub>d</sub> is in series with C<sub>f</sub>.

## Printed handouts (`../quiz/`)

- **`Quiz - Modulation and Balancing.pdf`:** one A4 page, two questions (DC-bus utilization and min-max injection; neutral-point balancing), 50 points.
- **`Quiz Answer Key - Modulation and Balancing.pdf`:** worked solutions and marking. For the presenter and the instructor only.
- **`Potential Final Questions - Modulation and Balancing.pdf`:** carrier-based PWM of a 3-level NPC and its offset; designing a neutral-point balancing loop, with solutions.
- **Sources:** in `../quiz/src/`. Edit the HTML, then run `build_pdfs.ps1` to regenerate the PDFs with Edge.

## Assets

- **`img/odtu_logo.svg`** and **`img/odtu_emblem.svg`:** the ODTÜ logo and emblem, from Wikimedia Commons (`Odtu-metu-logo.svg`, `METU_logo.svg`). For official use, check them against the [ODTÜ logo usage guide](https://www.metu.edu.tr/system/files/odtu_logo_kullanim_klavuzu.pdf).
- **`img/powerlab_logo.png`:** the METU PowerLab logo, from [odtu.github.io](https://odtu.github.io).

## Editing

- **Slides:** each slide is a `<section class="slide">` in `index.html`. Speaker notes are in its `<aside class="notes">`, and the time slot is in `data-min`.
- **Build steps:** elements with `data-step="k"` appear on the k-th click.
- **Code:** `js/sim-basics.js` (SPWM basics; it also holds two sims from Sefer’s deck that are unused here), `js/sim-mod.js` (carrier lab, min-max, space vectors), `js/sim-ctl.js` (neutral-point balancing, dq control), `js/sim-mmc.js` (MMC sorting, L/LCL filter), `js/sim-leg.js` (leg explorer for the flying-capacitor slide), shared plotting and FFT code in `js/kit.js`, navigation in `js/deck.js`.
