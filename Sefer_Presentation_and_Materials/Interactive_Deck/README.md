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
| `P` | On a leg slide: flip the direction of the phase current |
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
- **Step-by-step analysis:** mode-by-mode commutation figures; the derivations are in the speaker notes.
- **No audience questions:** the presenter does not ask the class questions during the talk, so the slides carry none.
- **Syllabus requirements:** commercial products, recent research, simulations, and a four-question quiz (design, concept, simulation what-if, critique).

## Outline: ≈ 41 min, then the printed quiz

Sefer İdacı’s talk of the EE561 multilevel-converter module (team: Sefer İdacı, Mustafa Aytunç Evlice, Elif Topaloğlu Kurmaç). The printed quiz and the potential final questions are separate handouts; see `../quiz/`.

**Building the levels: Clamp · Float · Combine (20 slides, including the title and References).** Theory slides are marked ★. Order: what a multilevel converter is and what its output looks like (3–4), its advantages and disadvantages (5–6) and what they mean in hardware, with example modules and boards (7–8), real switches and why lower-voltage devices help (9–10), then the topologies, whose explorers also show the redundant states of each leg (12–17), a comparison table (18), and a PLECS simulation of a two-level, an NPC and a 5L-ANPC leg to finish (19). Each slide has little text and one large figure; the details are in the speaker notes (`N`). There are no backup slides.

| # | Slide | min |
| --: | --- | --: |
| 1 | Title | 0.5 |
| 2 | Textbooks and resources | 0.5 |
| 3 | What is a multilevel converter? 2-, 3- and 5-level legs drawn as selectors on a capacitor stack (steps of 800, 400, 200 V) | 2 |
| 4 | More levels: the output gets closer to a sine. PWM output of the same three legs, with the voltage THD | 2 |
| 5 | Advantages, one card each with bars for N = 2, 3, 5: device voltage, voltage step, current ripple, switching loss | 2.5 |
| 6 | Disadvantages, same form: switches per leg, devices in series, capacitor voltages to hold, switching states | 2.5 |
| 7 | In practice: cooling, layout (commutation loops, stray inductance), hot spots, gate drivers; three-level legs in one power module (MiniSKiiP 3-level, EasyPACK 3-level, flowNPC) | 2.5 |
| 8 | Examples: Semikron Danfoss three-level modules, a Vincotech flowNPC module, and the TI T-type SiC and ANPC GaN reference-design boards (photos) | 1.5 |
| 9 | Real switches: discrete IGBT, 1.2 kV and 3.3 kV modules, inside a module (photos) | 1 |
| 10 | Lower-voltage devices switch with 10× less energy (leg loss vs f<sub>sw</sub>: 2L 3.3 kV, 3L 1.2 kV IGBT, 3L SiC) | 2.5 |
| 11 | Three ways to make an extra level: clamp, float, combine | 1 |
| 12 | NPC leg explorer (starts from the two-level leg) | 3.5 |
| 13 | ★ NPC commutation P → O: three figures for i<sub>a</sub> &gt; 0, then three for i<sub>a</sub> &lt; 0 | 3 |
| 14 | T-type and ANPC (one explorer, three topologies; the ANPC's two redundant 0 V states) | 3 |
| 15 | Who works hardest? Loss bars: NPC inverter, NPC rectifier, ANPC rectifier | 2 |
| 16 | Flying capacitor (explorer: states 11, 10, 01; 10 and 01 are redundant) | 3 |
| 17 | 5-level ANPC (explorer; redundant +200 a and +200 b) | 3 |
| 18 | Choosing a topology: one row per leg with a thumbnail, its devices, blocking voltage, states per level, one advantage, one disadvantage and typical use; handover to the next talk | 2.5 |
| 19 | PLECS simulation: two-level, NPC and 5L-ANPC legs, same link, load and switching frequency (steps of 800, 400 and 200 V; ripple 1, 0.55× and 0.15×) | 2.5 |
| 20 | References |  |

If the talk runs long on the day, shorten slide 10 (skip the frequency comparison) and slide 15 (show only the two NPC charts): about 2 minutes.

The slides removed in this version (the leg-voltage basics with v<sub>ab</sub> and the common mode, drift-region physics, learning objectives, two-level recap, staircase Fourier analysis, flying capacitor in practice, component counts, the one-line summary, device currents and midpoint current in an NPC leg, the 1500 V design example, the gate-combination count of one leg, the flying-capacitor charge balance with phase-shifted carriers, the three-leg state count with the POO / ONN redundant states) are in the git history.

CHB and MMC are not covered: they belong to other talks.

**Schematics:** a green dot means the gate signal is on; a dark device carries current; a grey device carries none, even when its gate is on (complementary gating). The orange dotted line is the current path.

## Simulation models: what to say if asked

- **Leg explorer and commutation figures:** ideal switches and ideal capacitors (the split link and the flying capacitor hold their nominal voltages). Blocking voltages assume ideal static sharing; for example, D6 holds node Y at O.
- **What is a multilevel converter? (slides 3–4):** an ideal selector on N − 1 equal capacitors, V<sub>dc</sub> = 800 V; phase-disposition PWM (N − 1 in-phase carriers), m = 0.9, 15 carrier periods per fundamental period, the same for all three legs.
- **Advantages and disadvantages (slides 5–6):** the bars are for N = 2, 3, 5 on an 800 V link; the ripple bars are computed from the slide 4 PWM waveforms into 5 mH + 10 Ω (1, 0.55, 0.31), the switching-loss bars show the switched voltage only. general N-level ratios against a 2-level leg on the same V<sub>dc</sub> and f<sub>sw</sub>; the speaker notes give the 3-level numbers: 3-level NPC vs 2-level, 1500 V link, m = 0.9, the same 10 kHz carrier. Ripple and harmonic line voltage from a PWM simulation (sine-triangle 2-level, phase-disposition 3-level): 0.46–0.49 of the 2-level value. Common mode: step V<sub>dc</sub>/6 instead of V<sub>dc</sub>/3, peak V<sub>dc</sub>/3 instead of V<sub>dc</sub>/2. Losses from the slide 10 model at 10 kHz, 100 A: conduction 234 W vs 155 W (1.5×), switching 196 W vs 1958 W (1/10), total 430 W vs 2.1 kW.
- **Loss bars (slide 15):** m = 0.9, 10 kHz, 100 A peak, illustrative device data, simulated over one period with the same switching states as the explorer. Switching energy is charged to the device that hard-switches against a voltage. Use them for trends, not datasheet numbers.
- **Redundant states of one leg (slides 14, 16, 17):** NPC 3 states for 3 levels (none redundant); ANPC 6 for 3 (four at 0 V); flying capacitor 4 for 3 (10, 01); 5L-ANPC 8 for 5 (a and b at +200, 0, −200 V).
- **Loss view (slide 10):** analytic average and RMS device currents (unity PF, m = 0.9, Î = 100 A, 1500 V link), with E<sub>sw</sub> ∝ V·I. Device data are illustrative (T<sub>j</sub> ≈ 125 °C): 3.3 kV IGBT 1.3 V + 15 mΩ, 2.05 µJ/(V·A); 1.2 kV IGBT 1.0 V + 11 mΩ, 0.41 µJ/(V·A); 1.2 kV SiC MOSFET 20 mΩ, 0.045 µJ/(V·A).

## PLECS model (`../simulations/`)

- **`multilevel_legs.plecs`:** a two-level leg, a three-level NPC leg and a five-level ANPC leg (selector S5–S8 plus a flying-capacitor cell, C_fly = 1 mF) with the same 800 V link, 5 mH output filter inductor, 10 Ω load and sine reference (m = 0.9, 50 Hz). Each leg has its own switching frequency in the initialization commands (`f_sw_two_level`, `f_sw_three_level`, `f_sw_five_level`, all 2 kHz by default); `L_filter` and `R_load` are shared by the three legs. Open it in PLECS 5.0 and run it; the scope shows the three output voltages, the three load currents and the flying-capacitor voltage. The parameters to play with are at the top of the initialization commands.
- **Models:** the two-level and NPC legs use ideal IGBTs and diodes. The 5L-ANPC leg uses MOSFETs with 1 mΩ on-resistance: with fully ideal switches PLECS stops when S1 turns on while the body diode of its complement conducts, because the flying capacitor is then in a loop with the DC source. Its cell is modulated with two carriers half a period apart and no balancing loop.
- **`build_multilevel_legs.py`:** generates the model with plecskit, runs it over RPC and writes the schematic (`multilevel_legs.png`) and the figure on slide 19 (`multilevel_legs_waveforms.png`, copied to `img/plecs_multilevel_legs.png`).
- **Check (12 Nov 2026):** fundamental 360.0 V = m·V_dc/2 in all three legs, 35.56 A = 360 V / |10 + j1.571| Ω; RMS current ripple 3.77 A (two-level), 2.06 A (NPC), 0.56 A (5L-ANPC); C_fly stays within 196.9–203.0 V around 200 V. With the same filter, 7.4 kHz (two-level), 3.7 kHz (NPC) and 1 kHz (5L-ANPC) give the same RMS ripple, 1.03, 1.12 and 1.11 A.
- A full three-phase 5L-ANPC model with closed-loop control and thermal modelling is in the research repository (`04_Tools/PLECS_Toolkit/5LVL_ANPC_Sim.plecs`); it is not part of this folder.

## Printed handouts (`../quiz/`)

- **`Quiz - Building the Levels.pdf`:** one A4 page, about 8 minutes, two easy questions on the fundamentals of this talk (levels: step, device voltage, switch count, advantages and disadvantages; drawing the current path of the 0 V state on NPC, T-type and ANPC schematics and naming each leg; the two redundant zero states of the flying-capacitor leg, shown with their current paths), 50 points.
- **`Quiz Answer Key - Building the Levels.pdf`:** worked solutions with point splits. For the presenter and the instructor only.
- **`Potential Final Questions - Building the Levels.pdf`:** two fundamental final-exam questions, about 12 minutes each, with no derivations (levels, device voltage and the NPC states; the states of a flying-capacitor leg), with solutions and a marking guide.
- The modulation and balancing questions of the earlier joint quiz are separated into the shared `quiz/` folder at the repository root.
- **Sources:** in `../quiz/src/`. Edit the HTML, then run `build_pdfs.ps1` to regenerate the PDFs with Edge.

## Assets

- **`img/odtu_logo.svg`** and **`img/odtu_emblem.svg`:** the ODTÜ logo and emblem, from Wikimedia Commons (`Odtu-metu-logo.svg`, `METU_logo.svg`). For official use, check them against the [ODTÜ logo usage guide](https://www.metu.edu.tr/system/files/odtu_logo_kullanim_klavuzu.pdf).
- **`img/powerlab_logo.png`:** the METU PowerLab logo, from [odtu.github.io](https://odtu.github.io).
- **`img/photos/` (manufacturer images, slides 7 and 8):** taken from the manufacturers’ public documents for this course presentation and credited on the slides; they remain the property of their owners and are not covered by this repository’s licence.
  - `semikron_npc_long_commutation.png`, `semikron_3L_modules.jpg`: Semikron Danfoss, Application Note AN 11-001 “3L NPC, TNPC & ANPC Topology”, Fig. 11 and Fig. 36.
  - `vincotech_flownpc.jpg`: Vincotech, flowNPC E3BP (30-EP12NIC560H7-PU10F57T) product page.
  - `ti_tida01606_board.jpg`: Texas Instruments, TIDA-01606 design guide (TIDUE53). `ti_tida010210_board.jpg`: Texas Instruments, TIDA-010210 design guide (TIDUEZ0).
- **`img/photos/` (device photos):** from Wikimedia Commons, used under their CC BY-SA licences and credited on slide 9:
  - `igbt_discrete_1200V.jpg`: [ProfiCook PC-EKI 1016 - board 1 - Infineon H20R1203-2607.jpg](https://commons.wikimedia.org/wiki/File:ProfiCook_PC-EKI_1016_-_board_1_-_Infineon_H20R1203-2607.jpg), Raimond Spekking, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0).
  - `igbt_module_1200V.jpg`: [MITSUBISHI IGBT module.jpg](https://commons.wikimedia.org/wiki/File:MITSUBISHI_IGBT_module.jpg), Sthdhk, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0).
  - `igbt_module_3300V.jpg`: [IGBT 3300V 1200A Mitsubishi.jpg](https://commons.wikimedia.org/wiki/File:IGBT_3300V_1200A_Mitsubishi.jpg), ArséniureDeGallium, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0).
  - `igbt_module_inside.jpg`: [Ausschnitt Infineon IGBT-Modul.jpg](https://commons.wikimedia.org/wiki/File:Ausschnitt_Infineon_IGBT-Modul.jpg), Leonrosenbaum, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0).

## Editing

- **Slides:** each slide is a `<section class="slide">` in `index.html`. Speaker notes are in its `<aside class="notes">`, and the time slot is in `data-min`.
- **Build steps:** elements with `data-step="k"` appear on the k-th click. On leg slides, `data-config.steps` sets the schematic state for each click.
- **Static circuit figures:** use `data-sim="legfig"` with a list of `{state, sign, cap, step}`.
- **Code:** simulations are in `js/sim-*.js` (`sim-basics.js`: leg loss vs switching frequency; `sim-leg.js`: the leg explorers, figures and loss bars; `sim-intro.js`: the 2-, 3- and 5-level selectors and their PWM outputs), and shared plotting and FFT code is in `js/kit.js`.
