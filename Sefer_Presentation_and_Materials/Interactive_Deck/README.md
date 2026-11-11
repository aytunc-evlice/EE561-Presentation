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
- **No audience questions:** the presenter does not ask the class questions during the talk, so the slides carry none.
- **Design procedure:** numbered "Step 1 … Step 4", as in the instructor's LLC module.
- **Syllabus requirements:** commercial products, recent research, simulations, and a four-question quiz (design, concept, simulation what-if, critique).

## Outline: ≈ 45 min, then the printed quiz

Sefer İdacı’s talk of the EE561 multilevel-converter module (team: Sefer İdacı, Mustafa Aytunç Evlice, Elif Topaloğlu Kurmaç). The printed quiz and the potential final questions are separate handouts; see `../quiz/`.

**Building the levels: Clamp · Float · Combine (22 slides, including the title and References).** Theory slides are marked ★. Order: what a multilevel leg is (3–4), real switches (5), why lower-voltage devices help (6), the gains and costs of an extra level (7), then the topologies, a gains-and-costs table (18), and finally the switching states: how many there are, and which are redundant (19–21). Each slide has little text and one large figure; the details are in the speaker notes (`N`). There are no backup slides.

| # | Slide | min |
| --: | --- | --: |
| 1 | Title | 0.5 |
| 2 | Textbooks and resources | 0.5 |
| 3 | ★ Basics: the leg and its voltages (three-phase circuit; v<sub>aO</sub> with 3 levels, v<sub>ab</sub> with 5, common mode v<sub>nO</sub>) | 2 |
| 4 | More levels: smaller steps, lower device voltage (N-level staircase, live THD) | 2 |
| 5 | Real switches: discrete IGBT, 1.2 kV and 3.3 kV modules, inside a module (photos) | 1 |
| 6 | Lower-voltage devices switch with 10× less energy (leg loss vs f<sub>sw</sub>: 2L 3.3 kV, 3L 1.2 kV IGBT, 3L SiC) | 2.5 |
| 7 | What the extra level gains, and what it costs: 3-level NPC vs 2-level (½ device voltage, ½ step, ½ ripple, 1/10 switching loss; 2× parts, 1.5× conduction loss, a capacitor to hold, 27 states) | 3 |
| 8 | Three ways to make an extra level: clamp, float, combine | 1 |
| 9 | NPC leg explorer (starts from the two-level leg) | 3.5 |
| 10 | ★ NPC commutation P → O: three figures for i<sub>a</sub> &gt; 0, then three for i<sub>a</sub> &lt; 0 | 3 |
| 11 | ★ NPC midpoint current: state table, time at P/O/N, ⟨i<sub>O</sub>⟩ = (1 − \|r\|)·i<sub>a</sub> | 2.5 |
| 12 | T-type and ANPC (one explorer, three topologies) | 3 |
| 13 | Who works hardest? Loss bars: NPC inverter, NPC rectifier, ANPC rectifier | 2 |
| 14 | Flying capacitor (explorer: states 11, 10, 01) | 3 |
| 15 | ★ Flying capacitor: phase-shifted carriers, states, i<sub>fc</sub>; equal duties give no net charge | 2 |
| 16 | 5-level ANPC (explorer) | 3 |
| 17 | ★ Design example: one leg for a 1500 V link (2/3 rule, topology, C<sub>fc</sub> sizing) | 2 |
| 18 | Choosing a topology: gain, cost and typical use of each leg | 2 |
| 19 | ★ States of one leg: 2<sup>k</sup> gate combinations → valid states (NPC grid 16 → 4 → 3; table for all legs) | 2 |
| 20 | ★ Three legs: N³ states on 3N(N − 1) + 1 space vectors (2, 3 and 5 levels) | 2.5 |
| 21 | Redundant states POO and ONN: same line voltages, opposite midpoint current; handover to the next talk | 2 |
| 22 | References |  |

If the talk runs long on the day, shorten slide 6 (skip the frequency comparison) and slide 13 (show only the two NPC charts): about 2 minutes.

The slides removed in this version (drift-region physics, learning objectives, two-level recap, staircase Fourier analysis, flying capacitor in practice, component counts, the one-line summary, device currents in an NPC leg) are in the git history (commit f27809b and earlier).

CHB and MMC are not covered: they belong to other talks.

**Schematics:** a green dot means the gate signal is on; a dark device carries current; a grey device carries none, even when its gate is on (complementary gating). The orange dotted line is the current path.

## Simulation models: what to say if asked

- **Leg explorer and commutation figures:** ideal switches and ideal capacitors (the split link and the flying capacitor hold their nominal voltages). Blocking voltages assume ideal static sharing; for example, D6 holds node Y at O.
- **Gains and costs (slide 7):** 3-level NPC vs 2-level, 1500 V link, m = 0.9, the same 10 kHz carrier. Ripple and harmonic line voltage from a PWM simulation (sine-triangle 2-level, phase-disposition 3-level): 0.46–0.49 of the 2-level value. Common mode: step V<sub>dc</sub>/6 instead of V<sub>dc</sub>/3, peak V<sub>dc</sub>/3 instead of V<sub>dc</sub>/2. Losses from the slide 6 model at 10 kHz, 100 A: conduction 234 W vs 155 W (1.5×), switching 196 W vs 1958 W (1/10), total 430 W vs 2.1 kW.
- **Loss bars (slide 13):** m = 0.9, 10 kHz, 100 A peak, illustrative device data, simulated over one period with the same switching states as the explorer. Switching energy is charged to the device that hard-switches against a voltage. Use them for trends, not datasheet numbers.
- **Equation pictures (slides 3, 11, 15):** slide 3 uses nearest-level (staircase) switching of 3-level legs at m = 0.8 so the levels are easy to count; slide 11 plots the switching-period averages d<sub>P</sub> = max(r, 0), d<sub>N</sub> = max(−r, 0), ⟨i<sub>O</sub>⟩ = (1 − |r|)·i<sub>a</sub>; slide 15 compares one duty with two triangular carriers half a period apart.
- **State counts (slides 19–21):** a state is one switching state per leg (one leg) or one level per leg (three legs). One leg: complementary pairs, then no current-dependent output and no device above its share of the link (NPC 16 → 4 → 3; ANPC pairs (S1, S5), (S2, S3), (S4, S6) → 8 → 6; 5L-ANPC selector pairs must agree → 8). Three legs: N³ states, 3N(N − 1) + 1 distinct line-voltage sets; a vector whose legs span s levels has N − s states. Slide 21 shows the instant i<sub>a</sub> &gt; 0, i<sub>b</sub> = i<sub>c</sub> = −i<sub>a</sub>/2.
- **Loss view (slide 6):** analytic average and RMS device currents (unity PF, m = 0.9, Î = 100 A, 1500 V link), with E<sub>sw</sub> ∝ V·I. Device data are illustrative (T<sub>j</sub> ≈ 125 °C): 3.3 kV IGBT 1.3 V + 15 mΩ, 2.05 µJ/(V·A); 1.2 kV IGBT 1.0 V + 11 mΩ, 0.41 µJ/(V·A); 1.2 kV SiC MOSFET 20 mΩ, 0.045 µJ/(V·A).

## Printed handouts (`../quiz/`)

- **`Quiz - Building the Levels.pdf`:** one A4 page, about 8 minutes, two written questions on this talk (device selection: numerical design; NPC zero state: concept and critique), 50 points.
- **`Quiz Answer Key - Building the Levels.pdf`:** worked solutions with point splits. For the presenter and the instructor only.
- **`Potential Final Questions - Building the Levels.pdf`:** two final-exam questions (NPC device stress; flying-capacitor model and design), with solutions and a marking guide.
- The modulation and balancing questions of the earlier joint quiz are separated into the shared `quiz/` folder at the repository root.
- **Sources:** in `../quiz/src/`. Edit the HTML, then run `build_pdfs.ps1` to regenerate the PDFs with Edge.

## Assets

- **`img/odtu_logo.svg`** and **`img/odtu_emblem.svg`:** the ODTÜ logo and emblem, from Wikimedia Commons (`Odtu-metu-logo.svg`, `METU_logo.svg`). For official use, check them against the [ODTÜ logo usage guide](https://www.metu.edu.tr/system/files/odtu_logo_kullanim_klavuzu.pdf).
- **`img/powerlab_logo.png`:** the METU PowerLab logo, from [odtu.github.io](https://odtu.github.io).
- **`img/photos/`:** device photos from Wikimedia Commons, used under their CC BY-SA licences and credited on slide 5:
  - `igbt_discrete_1200V.jpg`: [ProfiCook PC-EKI 1016 - board 1 - Infineon H20R1203-2607.jpg](https://commons.wikimedia.org/wiki/File:ProfiCook_PC-EKI_1016_-_board_1_-_Infineon_H20R1203-2607.jpg), Raimond Spekking, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0).
  - `igbt_module_1200V.jpg`: [MITSUBISHI IGBT module.jpg](https://commons.wikimedia.org/wiki/File:MITSUBISHI_IGBT_module.jpg), Sthdhk, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0).
  - `igbt_module_3300V.jpg`: [IGBT 3300V 1200A Mitsubishi.jpg](https://commons.wikimedia.org/wiki/File:IGBT_3300V_1200A_Mitsubishi.jpg), ArséniureDeGallium, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0).
  - `igbt_module_inside.jpg`: [Ausschnitt Infineon IGBT-Modul.jpg](https://commons.wikimedia.org/wiki/File:Ausschnitt_Infineon_IGBT-Modul.jpg), Leonrosenbaum, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0).

## Editing

- **Slides:** each slide is a `<section class="slide">` in `index.html`. Speaker notes are in its `<aside class="notes">`, and the time slot is in `data-min`.
- **Build steps:** elements with `data-step="k"` appear on the k-th click. On leg slides, `data-config.steps` sets the schematic state for each click.
- **Static circuit figures:** use `data-sim="legfig"` with a list of `{state, sign, cap, step}`.
- **Code:** simulations are in `js/sim-*.js` (`sim-basics.js`: leg loss vs switching frequency; `sim-leg.js`: the leg explorers, figures and loss bars; `sim-vis.js`: the pictures on the equation slides and the redundant-state circuits; `sim-states.js`: the gate-combination grid and the space-vector count; `sim-intro.js`: the level staircase), and shared plotting and FFT code is in `js/kit.js`.
