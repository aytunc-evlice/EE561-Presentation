# Multilevel Converters: interactive lecture deck

Open `index.html` in Chrome or Edge. It runs offline, with no installation or internet connection required. All plots are computed live in the browser.

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

## Style follows the instructor's EE561 modules

The instructor's decks (kept locally in `private/`, not in the repository) share the following conventions, and this deck follows them:

- **Plain design:** white background, Calibri, small title top-left, slide number bottom-right. Here, ODTÜ red is the only accent colour, and the ODTÜ and METU PowerLab logos sit top-right.
- **Title slide:** EE561 / Advanced Static Power Conversion / topic / "Prepared by …".
- **Slide 2:** "Textbooks and Resources", covering textbooks, survey papers, application notes and links.
- **Reading pointers:** "read: Wu & Narimani, Ch. 8" and similar notes appear in the small line above each title.
- **Step-by-step analysis:** switching functions → local averaging, mode-by-mode commutation figures, and derivations shown in full.
- **Questions on the slides:** "Question:" prompts with answers revealed one click later.
- **Design procedure:** numbered "Step 1 … Step 5", as in the instructor's LLC module.
- **Syllabus requirements:** commercial products, recent research, simulations, and a four-question quiz (design, concept, simulation what-if, critique).

## Outline: Part I ≈ 46.5 min, Part II ≈ 45 min, then a printed 15-minute quiz

The quiz is no longer part of the deck. It is a separate printed handout covering both parts; see `../../quiz/`.

**Part I · Building the levels: Clamp · Float · Combine (27 slides).** Theory slides are marked ★.

| # | Slide | min |
| --: | --- | --: |
| 1 | Title | 0.5 |
| 2 | Textbooks and resources | 0.5 |
| 3 | Learning objectives | 0.5 |
| 4 | The switch is the bottleneck (device-rating chooser) | 1 |
| 5 | ★ Why a lower blocking voltage? Semiconductor view: drift region, R<sub>on,sp</sub> ∝ V<sub>B</sub><sup>2.5</sup>, n dies in series (animated cross-section) | 2 |
| 6 | Why a lower blocking voltage? Loss view: 2L 3.3 kV vs 3L 1.2 kV IGBT vs 3L SiC over f<sub>sw</sub> (simulation) | 2 |
| 7 | ★ Basics: the two-level leg | 1 |
| 8 | ★ Basics: pole, phase and line-to-line voltages; m, m<sub>f</sub>, THD, dv/dt | 2 |
| 9 | More levels, smaller steps (N-level staircase/PWM, live THD) | 2.5 |
| 10 | ★ Staircase Fourier analysis and harmonic elimination (angle explorer) | 3 |
| 11 | Three ideas: clamp, float, combine | 1 |
| 12 | NPC leg explorer | 4 |
| 13 | ★ NPC commutation step by step, current out of the leg | 1.5 |
| 14 | ★ NPC commutation step by step, current into the leg | 1.5 |
| 15 | ★ NPC in equations: switching functions and averaging | 2 |
| 16 | T-type | 1.5 |
| 17 | ANPC | 1.5 |
| 18 | ★ Device currents in an NPC leg: average/RMS integrals → losses | 3 |
| 19 | Who works hardest? (loss simulation; same numbers as slide 18) | 2.5 |
| 20 | Flying capacitor | 3 |
| 21 | ★ Flying capacitor in equations: averaging, phase-shifted carriers | 2 |
| 22 | Flying capacitor in practice | 1 |
| 23 | 5-level ANPC | 2.5 |
| 24 | Scaling to N levels: component counts | 1 |
| 25 | ★ Design example: one leg for a 1500 V link | 2 |
| 26 | Choosing a topology | 1 |
| 27 | Handover | 0.5 |

To bring Part I to about 45 min, skip slides 22 and 24 and shorten slide 26. That saves about 3 minutes.

**Part II · Running the levels: Modulate · Balance · Control (20 slides)**

| # | Slide | min |
| --: | --- | --: |
| 28 | Title | 0.5 |
| 29 | Learning objectives | 0.5 |
| 30 | ★ Basics: sine-triangle PWM: carrier, reference, comparator, duty cycle, local average (animated) | 2.5 |
| 31 | ★ Basics: modulation index m<sub>a</sub> and frequency ratio m<sub>f</sub>: linear range, overmodulation, sideband clusters | 2.5 |
| 32 | Reference → level → state → gates | 1.5 |
| 33 | Carrier lab (PD/POD/APOD/phase-shifted) | 4.5 |
| 34 | Min-max injection | 3 |
| 35 | Space-vector hexagon (2L/3L/5L) | 4 |
| 36 | Worked example: dwell times | 2.5 |
| 37 | Switching sequence | 2 |
| 38 | Why capacitors drift | 1.5 |
| 39 | Derivation: balancing authority ∝ cos φ | 3 |
| 40 | Neutral-point balancing simulation | 4 |
| 41 | Flying-capacitor balancing | 2 |
| 42 | Averaged model for control | 2.5 |
| 43 | Control structure | 2.5 |
| 44 | dq current control (simulation) | 3 |
| 45 | Where multilevel lives today | 2 |
| 46 | Three things to remember | 1 |
| 47 | References | |

Slides 30–31 are self-contained. If you would rather cover the PWM basics in Part I, move them after slide 8.

CHB and MMC are excluded on purpose because another module covers them. Slide 11 mentions this in one line.

## Simulation models: what to say if asked

- **Leg explorer and commutation figures:** use ideal switches. Blocking voltages assume ideal static sharing; for example, D6 holds node Y at O.
- **Loss bars:** 10 kHz, 100 A peak, illustrative 650 V / 1200 V device data. Switching energy is charged to the device that hard-switches against a voltage. Use them for trends, not datasheet numbers.
- **Neutral-point balancing:** a switching-period average model, i<sub>O</sub> = Σ(1 − |r<sub>x</sub>|)·i<sub>x</sub>, with an ideal source holding v<sub>C1</sub> + v<sub>C2</sub>. The time constant matches the derivation on slide 39 (τ ≈ 33 ms at unity PF).
- **dq control:** an L-filter average model with a voltage limit and an optional one-sample delay.
- **Drift-region cross-section (slide 5):** ideal non-punch-through Si drift region from Baliga's power-law fits: W<sub>D</sub> = 2.58·10<sup>−2</sup> V<sub>B</sub><sup>7/6</sup> µm, N<sub>D</sub> = 2·10<sup>18</sup> V<sub>B</sub><sup>−4/3</sup> cm<sup>−3</sup>, R<sub>on,sp</sub> = 5.93·10<sup>−6</sup> V<sub>B</sub><sup>2.5</sup> mΩ·cm². The 4H-SiC line uses E<sub>c</sub> ×10, ε<sub>r</sub> 9.7 and μ<sub>n</sub> 950 cm²/Vs, which gives about 1/580 of Si. These are ideal limits; real devices sit above them.
- **Loss view (slide 6):** analytic average and RMS device currents (unity PF, m = 0.9, Î = 100 A, 1500 V link), with E<sub>sw</sub> ∝ V·I. Device data are illustrative (T<sub>j</sub> ≈ 125 °C): 3.3 kV IGBT 1.3 V + 15 mΩ, 2.05 µJ/(V·A); 1.2 kV IGBT 1.0 V + 11 mΩ, 0.41 µJ/(V·A); 1.2 kV SiC MOSFET 20 mΩ, 0.045 µJ/(V·A).
- **SPWM basics (slides 30–31):** natural sampling, 2-level leg, V<sub>dc</sub> = 800 V. The spectrum is the FFT of one period (8192 samples); the m<sub>a</sub> curve is the fundamental of the clipped local average.

## Printed handouts (`../../quiz/`)

- **`Multilevel Converters Quiz.pdf`:** two A4 pages, 15 minutes, four written questions, two per part (design, concept, simulation what-if, critique). Hand it out after Part II.
- **`Multilevel Converters Quiz - Answer Key.pdf`:** worked solutions with point splits. For the presenters only.
- **`Potential Final Questions.pdf`:** four final-exam questions for the instructor, with solutions and a marking guide.
- **Sources:** in `quiz/src/`. Edit the HTML, then run `build_pdfs.ps1` to regenerate the PDFs with Edge.

## Assets

- **`img/odtu_logo.svg`** and **`img/odtu_emblem.svg`:** the ODTÜ logo and emblem, from Wikimedia Commons (`Odtu-metu-logo.svg`, `METU_logo.svg`). For official use, check them against the [ODTÜ logo usage guide](https://www.metu.edu.tr/system/files/odtu_logo_kullanim_klavuzu.pdf).
- **`img/powerlab_logo.png`:** the METU PowerLab logo, from [odtu.github.io](https://odtu.github.io).

## Editing

- **Slides:** each slide is a `<section class="slide">` in `index.html`. Speaker notes are in its `<aside class="notes">`, and the time slot is in `data-min`.
- **Build steps:** elements with `data-step="k"` appear on the k-th click. On leg slides, `data-config.steps` sets the schematic state for each click.
- **Static circuit figures:** use `data-sim="legfig"` with a list of `{state, sign, cap, step}`.
- **Code:** simulations are in `js/sim-*.js` (`sim-basics.js` holds the device-physics, device-loss and SPWM-basics slides), and shared plotting and FFT code is in `js/kit.js`.
