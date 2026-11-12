# Multilevel Converters: Running the levels (M. Aytunç Evlice)

Open `index.html` in Chrome or Edge. It runs offline, with no installation or internet connection required. All plots are computed live in the browser.

Second of three talks: Sefer’s talk ([`../../Sefer_Presentation_and_Materials/`](../../Sefer_Presentation_and_Materials/)) comes before, Elif’s cascaded H-bridge after.

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
| Click a figure | Enlarge it over the slide; click again or `Esc` to close. Draggable plots show a ⤢ button instead and stay live when enlarged |
| `T` | Restart the clock |
| number + `Enter` | Jump to that slide |

## Outline: Running the levels: Modulate · Balance · Control (25 slides, ≈ 56.5 min)

Theory slides are marked ★; new in the November 2026 rework marked (new).

| # | Slide | min |
| --: | --- | --: |
| 1 | Title | 0.5 |
| 2 | Learning objectives | 0.5 |
| 3 | ★ Basics: one comparator, from DC-DC to sine PWM: carrier, DC reference (buck), comparator, average, then a sine reference (inverter leg) | 2.5 |
| 4 | ★ One switching period: two leg voltages, what r is, why the on-time is (1 + r)/2, why the average is r·V<sub>dc</sub>/2 (figure, built step by step) | 3 |
| 5 | ★ From one period to the sine: m<sub>a</sub>, the fundamental m<sub>a</sub>·V<sub>dc</sub>/2, overmodulation, m<sub>f</sub> and the harmonics (simulation) | 2.5 |
| 6 | ★ Overmodulation, step by step: on-time saturates, clipped sine, Fourier coefficient, why > 400 V, square-wave limit 4/π, harmonics 3/5/7 (simulation) | 3 |
| 7 | Min-max injection | 3 |
| 8 | ★ Switching states of a two-level inverter: P/N per leg, 8 states, line voltages, zero states, states as hexagon corners (simulation) | 2.5 |
| 9 | ★ Space-vector PWM step by step: v* as a rotating arrow, mix the two nearest corners and a zero state, inner-circle limit 1.155, equal zero split = min-max | 2.5 |
| 10 | ★ Why min-max equals SVPWM: one carrier period with three legs, the state sequence, active times fixed by the differences, the offset only moves zero time, min-max = equal split (simulation) | 3 |
| 11 | ★ Three levels: one carrier for each half (upper P/O, lower O/N), same rule inside each half; PD = shifted copy, POD = mirror image (simulation, one leg) | 2.5 |
| 12 | ★ PD or POD? Two phases at one instant: POD makes both legs switch together (800 V jumps), PD one at a time (400 V); full-cycle line THD (simulation) | 3 |
| 13 | More levels: five levels, four carriers, same rule; PD vs POD (simulation) | 1.5 |
| 14 | ★ Same output, two ways: split DC link and midpoint O, POO and ONN give the same line voltages but opposite midpoint current; the free choice balances the capacitors (simulation) | 3 |
| 15 | ★ Why the two capacitors drift apart: time at O is 1 − \|r\|, average midpoint current, C dΔV/dt = i_O, zero on average with 3f₁ ripple, no restoring force (simulation, loop off) | 3 |
| 16 | ★ Derivation: balancing authority ∝ cos φ | 3 |
| 17 | Neutral-point balancing simulation | 3.5 |
| 18 | Flying-capacitor balancing | 2 |
| 19 | ★ Averaged model for control | 2 |
| 20 | Control structure | 2 |
| 21 | dq current control (simulation) | 2.5 |
| 22 | Grid filter: L vs. LCL, 2-level vs. 3-level (simulation, new) | 3 |
| 23 | Where multilevel lives today | 1.5 |
| 24 | Three things to remember, handover to Elif | 1 |
| 25 | References | |

## Simulation models: what to say if asked

- **SPWM basics (slides 3 and 5):** natural sampling, 2-level leg, V<sub>dc</sub> = 800 V. The spectrum is the FFT of one period (8192 samples); the m<sub>a</sub> curve is the fundamental of the clipped local average.
- **Neutral-point balancing (slide 17):** a switching-period average model, i<sub>O</sub> = Σ(1 − |r<sub>x</sub>|)·i<sub>x</sub>, with an ideal source holding v<sub>C1</sub> + v<sub>C2</sub>. The time constant matches the derivation on slide 16 (τ ≈ 33 ms at unity PF).
- **Flying-capacitor balancing (slide 18):** the leg explorer in run mode with ideal switches; the zero-level state is alternated, fixed, or chosen in closed loop.
- **dq control (slide 21):** an L-filter average model with a voltage limit and an optional one-sample delay.
- **Grid filter (slide 22):** the phase-voltage spectrum of naturally sampled sine PWM (2-level, or 3-level PD; 400 V, 50 kVA, 800 V DC) times the filter admittance i<sub>g</sub>/v<sub>c</sub>, with a stiff, clean grid. R<sub>d</sub> is in series with C<sub>f</sub>.

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
- **Code:** `js/sim-basics.js` (SPWM basics; it also holds two sims from Sefer’s deck that are unused here), `js/sim-mod.js` (carrier lab, min-max, space vectors), `js/sim-ctl.js` (neutral-point balancing, dq control), `js/sim-mmc.js` (L/LCL filter; also an MMC sorting sim, unused), `js/sim-om.js` (overmodulation), `js/sim-leg.js` (leg explorer for the flying-capacitor slide), shared plotting and FFT code in `js/kit.js`, navigation in `js/deck.js`.
