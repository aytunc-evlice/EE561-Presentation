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
| Click a figure | Enlarge it over the slide; click again or `Esc` to close. Draggable plots show a ⤢ button instead and stay live when enlarged |
| `T` | Restart the clock |
| number + `Enter` | Jump to that slide |

## Outline: Running the levels: Modulate · Balance · Control (25 slides, ≈ 53 min)

Theory slides are marked ★; new in the November 2026 rework marked (new).

| # | Slide | min |
| --: | --- | --: |
| 1 | Title | 0.5 |
| 2 | Further reading: videos and short notes, grouped by part of the talk (shown briefly after the title, not presented) | 0 |
| 3 | Learning objectives | 0.5 |
| 4 | ★ Basics: one comparator, from DC-DC to sine PWM: carrier, DC reference (buck), comparator, average, then a sine reference (inverter leg) | 2.5 |
| 5 | ★ One switching period: two leg voltages, what r is, why the on-time is (1 + r)/2, why the average is r·V<sub>dc</sub>/2 (figure, built step by step) | 3 |
| 6 | ★ From one period to the sine: m<sub>a</sub>, the fundamental m<sub>a</sub>·V<sub>dc</sub>/2, overmodulation, m<sub>f</sub> and the harmonics (simulation) | 2.5 |
| 7 | ★ Overmodulation, step by step: on-time saturates, clipped sine, Fourier coefficient, why > 400 V, square-wave limit 4/π, harmonics 3/5/7 (simulation) | 3 |
| 8 | Min-max injection | 3 |
| 9 | ★ Switching states of a two-level inverter: P/N per leg, 8 states, line voltages, zero states, states as hexagon corners (simulation) | 2.5 |
| 10 | ★ Space-vector PWM step by step: v* as a rotating arrow, mix the two nearest corners and a zero state, inner-circle limit 1.155, equal zero split = min-max | 2.5 |
| 11 | ★ Why min-max equals SVPWM: one carrier period with three legs, the state sequence, active times fixed by the differences, the offset only moves zero time, min-max = equal split (simulation) | 3 |
| 12 | ★ Three levels: one carrier for each half (upper P/O, lower O/N), same rule inside each half; PD = shifted copy, POD = mirror image (simulation, one leg) | 2.5 |
| 13 | ★ PD or POD? Two phases at one instant: POD makes both legs switch together (800 V jumps), PD one at a time (400 V); full-cycle line THD (simulation) | 3 |
| 14 | More levels: five levels, four carriers, same rule; PD vs POD (simulation) | 1.5 |
| 15 | The filter, from pulses to a sine: the leg output is pulses, an inductor keeps only the average, 3-level halves the ripple, LCL removes most of it, an LCL rings after a kick and a resistor calms it (simulation) | 2.5 |
| 16 | ★ Same output, two ways: split DC link and midpoint O, POO and ONN give the same line voltages but opposite midpoint current; the free choice balances the capacitors (simulation) | 3 |
| 17 | ★ Why the capacitor voltages wiggle at 150 Hz: the midpoint current repeats three times per cycle, the capacitors follow it (simulation) | 1.5 |
| 18 | ★ Why the two capacitors drift apart: only the wiggle in the ideal case, nothing pulls them back, so the modulator must steer it (simulation: leakage on at click 2) | 2 |
| 19 | ★ How the offset pushes charge into or out of the midpoint: one instant, time at P/O/N per leg, r₀ = 0, +0.1, −0.1 (simulation) | 2.5 |
| 20 | ★ Balancing the midpoint with a PI controller: measure ΔV, PI output is the offset r₀, the voltages come back, the I part handles a leak (simulation) | 3 |
| 21 | Flying capacitor: two ways to make 0 V (10 / 01), one charges the capacitor and one discharges it, taking turns leaves an error, choosing by the error removes it (schematic + period-by-period plot) | 2 |
| 22 | Grid step 1 of 2, what makes the current flow: equal voltages give no current; the leading side sends active power to the lagging side; the higher-voltage side sends reactive power (simulation with size and timing sliders) | 2.5 |
| 23 | Grid step 2 of 2, the control structure block by block: PLL and abc→dq on the measurements, current PIs (i_d,ref, i_q,ref → v_d,ref, v_q,ref), outer voltage PI makes i_d,ref, dq→abc gives the modulation references, plus the midpoint PI; three cards explain grid-following, the PLL, and abc→dq and why (block diagram) | 3 |
| 24 | Four things to remember (modulation, carriers, balancing, dq control), handover to Elif | 1 |
| 25 | Thank you, questions | |

## Simulation models: what to say if asked

- **SPWM basics (slides 4 and 6):** natural sampling, 2-level leg, V<sub>dc</sub> = 800 V. The spectrum is the FFT of one period (8192 samples); the m<sub>a</sub> curve is the fundamental of the clipped local average.
- **Neutral-point balancing (slide 20):** a switching-period average model, i<sub>O</sub> = Σ(1 − |r<sub>x</sub>|)·i<sub>x</sub>, with an ideal source holding v<sub>C1</sub> + v<sub>C2</sub>. The time constant is τ = πC/(6·I·K·|cos φ|) ≈ 33 ms at unity PF.
- **Flying-capacitor balancing (slide 21):** a simple leg schematic that highlights the current path in state 10 or 01, and the capacitor voltage period by period after a −60 V disturbance, with the states alternated or chosen by the error.
- **Grid basics (slide 22):** steady-state phasors, per phase: grid 327 V peak, L = 2 mH, no resistance; i = (v − e)/(jωL).
- **Grid filter (slide 15):** the phase voltage of naturally sampled sine PWM (2-level, or 3-level PD; 400 V, 50 kVA, 800 V DC) is passed through the complex filter admittance by FFT and inverse FFT; the result is the ripple added to a clean 102 A sine. The kick view is a time-domain simulation of a 200 V, 20 µs pulse on the converter side, with and without the 1.5 Ω resistor in series with the capacitor.

## Printed handouts

To be written once the slides are final (see `../quiz/README.md`).

## Assets

- **`img/odtu_logo.svg`** and **`img/odtu_emblem.svg`:** the ODTÜ logo and emblem, from Wikimedia Commons (`Odtu-metu-logo.svg`, `METU_logo.svg`). For official use, check them against the [ODTÜ logo usage guide](https://www.metu.edu.tr/system/files/odtu_logo_kullanim_klavuzu.pdf).
- **`img/powerlab_logo.png`:** the METU PowerLab logo, from [odtu.github.io](https://odtu.github.io).

## Editing

- **Slides:** each slide is a `<section class="slide">` in `index.html`. Speaker notes are in its `<aside class="notes">`, and the time slot is in `data-min`.
- **Build steps:** elements with `data-step="k"` appear on the k-th click.
- **Code:** `js/sim-basics.js` (SPWM basics; it also holds two sims from Sefer’s deck that are unused here), `js/sim-mod.js` (carrier lab, min-max, space vectors), `js/sim-ctl.js` (neutral-point balancing; also a detailed dq sim, unused), `js/sim-mmc.js` (a detailed L/LCL sim and an MMC sorting sim, both unused), `js/sim-om.js` (overmodulation, states, PD/POD, midpoint ripple, flying capacitor, grid filter), `js/sim-grid.js` (grid basics; also PI-by-hand, turning-frame and DC-bucket sims, unused), `js/sim-leg.js` (leg explorer for the flying-capacitor slide), shared plotting and FFT code in `js/kit.js`, navigation in `js/deck.js`.
