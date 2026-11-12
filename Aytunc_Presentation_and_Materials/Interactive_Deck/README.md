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

## Outline: Running the levels: Modulate · Balance · Control (28 slides, ≈ 59 min)

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
| 15 | ★ Why the capacitor voltages wiggle at 150 Hz: the midpoint current repeats three times per cycle, the capacitors follow it (simulation) | 1.5 |
| 16 | ★ Why the two capacitors drift apart: only the wiggle in the ideal case, nothing pulls them back, so the modulator must steer it (simulation: leakage on at click 2) | 2 |
| 17 | ★ How the offset pushes charge into or out of the midpoint: one instant, time at P/O/N per leg, r₀ = 0, +0.1, −0.1 (simulation) | 2.5 |
| 18 | ★ Balancing the midpoint with a PI controller: measure ΔV, PI output is the offset r₀, the voltages come back, the I part handles a leak (simulation) | 3 |
| 19 | Flying capacitor: two ways to make 0 V (10 / 01), one charges the capacitor and one discharges it, taking turns leaves an error, choosing by the error removes it (schematic + period-by-period plot) | 2 |
| 20 | Grid step 1, what makes the current flow: equal voltages give no current, a little ahead gives active power, a little bigger gives reactive power (simulation with size and timing sliders) | 2.5 |
| 21 | Grid step 2, let a PI controller set the voltage: set by hand it fails when the grid drops 5 %, the PI corrects it, but a small error stays on a sine (simulation) | 2.5 |
| 22 | Grid step 3, make the target stand still: the current as a turning arrow, seen from the grid arrow it stands still, two flat lines i_d and i_q, one PI each (animation with sliders) | 2.5 |
| 23 | Grid step 4, who decides the wanted current: the DC capacitor as a bucket, more power in makes it overflow, a PI on the DC voltage asks for more grid current (simulation) | 2 |
| 24 | All together: three PI controllers (DC voltage, current, midpoint) in one block diagram | 1 |
| 25 | Grid step 5, the filter: the ripple on the current, 3-level halves it, LCL removes most of it, an LCL rings after a kick and a resistor calms it (simulation) | 2.5 |
| 26 | Where multilevel converters are used (three cards) | 1 |
| 27 | Three things to remember, handover to Elif | 1 |
| 28 | References | |

## Simulation models: what to say if asked

- **SPWM basics (slides 3 and 5):** natural sampling, 2-level leg, V<sub>dc</sub> = 800 V. The spectrum is the FFT of one period (8192 samples); the m<sub>a</sub> curve is the fundamental of the clipped local average.
- **Neutral-point balancing (slide 18):** a switching-period average model, i<sub>O</sub> = Σ(1 − |r<sub>x</sub>|)·i<sub>x</sub>, with an ideal source holding v<sub>C1</sub> + v<sub>C2</sub>. The time constant is τ = πC/(6·I·K·|cos φ|) ≈ 33 ms at unity PF.
- **Flying-capacitor balancing (slide 19):** a simple leg schematic that highlights the current path in state 10 or 01, and the capacitor voltage period by period after a −60 V disturbance, with the states alternated or chosen by the error.
- **Grid basics (slide 20):** steady-state phasors, per phase: grid 327 V peak, L = 2 mH, no resistance; i = (v − e)/(jωL).
- **PI current control (slide 21):** one phase, L = 2 mH, R = 0.1 Ω. By hand: the voltage that gives 30 A at the nominal grid. PI: measured grid voltage + PI correction, 400 Hz bandwidth. The grid drops 5 % at 50 ms.
- **Turning frame (slide 22):** pure geometry: the current arrow is (i<sub>d</sub> + j·i<sub>q</sub>) turned by the grid angle; the phase currents are its projections.
- **DC voltage (slide 23):** energy balance of a 2 mF capacitor at 800 V, C·v·dv/dt = P<sub>in</sub> − P<sub>out</sub>; the current loop is taken as instant. PI: 0.5 A/V and 40 A/(V·s).
- **Grid filter (slide 25):** the phase voltage of naturally sampled sine PWM (2-level, or 3-level PD; 400 V, 50 kVA, 800 V DC) is passed through the complex filter admittance by FFT and inverse FFT; the result is the ripple added to a clean 102 A sine. The kick view is a time-domain simulation of a 200 V, 20 µs pulse on the converter side, with and without the 1.5 Ω resistor in series with the capacitor.

## Printed handouts

To be written once the slides are final (see `../quiz/README.md`).

## Assets

- **`img/odtu_logo.svg`** and **`img/odtu_emblem.svg`:** the ODTÜ logo and emblem, from Wikimedia Commons (`Odtu-metu-logo.svg`, `METU_logo.svg`). For official use, check them against the [ODTÜ logo usage guide](https://www.metu.edu.tr/system/files/odtu_logo_kullanim_klavuzu.pdf).
- **`img/powerlab_logo.png`:** the METU PowerLab logo, from [odtu.github.io](https://odtu.github.io).

## Editing

- **Slides:** each slide is a `<section class="slide">` in `index.html`. Speaker notes are in its `<aside class="notes">`, and the time slot is in `data-min`.
- **Build steps:** elements with `data-step="k"` appear on the k-th click.
- **Code:** `js/sim-basics.js` (SPWM basics; it also holds two sims from Sefer’s deck that are unused here), `js/sim-mod.js` (carrier lab, min-max, space vectors), `js/sim-ctl.js` (neutral-point balancing; also a detailed dq sim, unused), `js/sim-mmc.js` (a detailed L/LCL sim and an MMC sorting sim, both unused), `js/sim-om.js` (overmodulation, states, PD/POD, midpoint ripple, flying capacitor, grid filter), `js/sim-grid.js` (grid basics, PI current control, turning frame, DC voltage), `js/sim-leg.js` (leg explorer for the flying-capacitor slide), shared plotting and FFT code in `js/kit.js`, navigation in `js/deck.js`.
