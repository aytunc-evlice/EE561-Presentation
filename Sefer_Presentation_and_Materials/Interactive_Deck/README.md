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

## Outline: ≈ 40 min, then the printed quiz

Sefer İdacı’s talk of the EE561 multilevel-converter module (team: Sefer İdacı, Mustafa Aytunç Evlice, Elif Topaloğlu Kurmaç). The printed quiz and the potential final questions are separate handouts; see `../quiz/`.

**Building the levels: Clamp · Float · Combine (19 slides + References).** Theory slides are marked ★. Order: what a multilevel leg is (3–4), real switches (5), why lower-voltage devices help (6–7), then the topologies. Each title states the slide’s point, the grey line under it defines the new words, and every equation slide has a picture of what the equation means.

| # | Slide | min |
| --: | --- | --: |
| 1 | Title | 0.5 |
| 2 | Textbooks and resources | 0.5 |
| 3 | ★ Basics: the leg and its voltages (three-phase circuit with v<sub>aO</sub>, v<sub>ab</sub>, v<sub>nO</sub> arrows; waveforms with 3 and 5 levels) | 1.5 |
| 4 | More levels: smaller steps, lower device voltage (N-level staircase/PWM, live THD) | 2.5 |
| 5 | Real switches: discrete IGBT, 1.2 kV and 3.3 kV modules, inside a module (photos) | 1 |
| 6 | ★ A higher voltage rating costs resistance: drift region, R<sub>on,sp</sub> ∝ V<sub>B</sub><sup>2.5</sup>, n dies in series (animated cross-section) | 2.5 |
| 7 | Lower-voltage devices switch with 10× less energy: turn-off v·i triangle; 2L 3.3 kV vs 3L 1.2 kV IGBT vs 3L SiC over f<sub>sw</sub> (simulation) | 2 |
| 8 | Three ideas: clamp, float, combine | 1 |
| 9 | NPC leg explorer (starts from the two-level leg) | 4.5 |
| 10 | ★ NPC commutation P → O: one row of three figures for i<sub>a</sub> &gt; 0, then one for i<sub>a</sub> &lt; 0 | 2.5 |
| 11 | ★ NPC in equations: state table, time at P/O/N per switching period, midpoint current (one leg and three legs) | 2 |
| 12 | T-type and ANPC (one explorer, three topologies) | 2.5 |
| 13 | ★ Device currents in an NPC leg: duty × current, S1/D5 split of the phase current, average and RMS formulas | 3 |
| 14 | Who works hardest? (loss simulation; same numbers as slide 13) | 2.5 |
| 15 | Flying capacitor | 3 |
| 16 | ★ Flying capacitor in equations: phase-shifted carriers, states, i<sub>fc</sub> and V<sub>fc</sub> | 2 |
| 17 | 5-level ANPC | 2.5 |
| 18 | ★ Design example: one leg for a 1500 V link (2/3 derating rule, C<sub>fc</sub> sizing from the ripple picture, pre-charge) | 2.5 |
| 19 | Choosing a topology, handover to the next talk | 1.5 |
| 20 | References | |

If the talk runs long on the day, shorten slide 4 (skip the PWM half of the simulation) and slide 14 (show only the NPC inverter and rectifier points): about 2 minutes.

**Backup slides (21–26, not timed; for questions).** They sit after the References slide and are listed under “backup” in the index (`O`).

| # | Slide | Use it when |
| --: | --- | --- |
| 21 | Learning objectives | the instructor asks for them |
| 22 | The switch is the bottleneck (device-rating chooser) | someone asks how the device class follows from V<sub>dc</sub> |
| 23 | Basics: the two-level leg | the class needs the recap |
| 24 | ★ Staircase Fourier analysis and selective harmonic elimination | a question on fundamental-frequency switching |
| 25 | Flying capacitor in practice (pre-charge, measurement, size, faults) | a question on start-up or protection |
| 26 | Scaling to N levels: component counts | “why not seven or nine levels?” |

To bring a backup slide back into the talk, move its `<section>` before the References slide and set its `data-section` and `data-min`.

CHB and MMC are excluded on purpose because another module covers them. Slide 8 mentions this in one line.

**Schematics:** a green dot means the gate signal is on; a dark device carries current; a grey device carries none, even when its gate is on (complementary gating). The orange dotted line is the current path.

## Simulation models: what to say if asked

- **Leg explorer and commutation figures:** use ideal switches. Blocking voltages assume ideal static sharing; for example, D6 holds node Y at O.
- **Loss bars:** 10 kHz, 100 A peak, illustrative 650 V / 1200 V device data. Switching energy is charged to the device that hard-switches against a voltage. Use them for trends, not datasheet numbers.
- **Equation pictures (slides 3, 7, 11, 13, 16, 18):** slide 3 uses nearest-level (staircase) switching of 3-level legs at m = 0.8 so the levels are easy to count; slide 11 plots the switching-period averages d<sub>P</sub> = max(r, 0), d<sub>N</sub> = max(−r, 0), ⟨i<sub>O</sub>⟩ = (1 − |r|)·i<sub>a</sub> with i<sub>a</sub> = Î sin(θ − φ); slide 13 splits Î sin θ into m sin θ (S1) and 1 − m sin θ (D5); slide 16 compares two triangular carriers half a period apart with one reference per cell; slide 7 is the linear turn-off model (v rises, then i falls).
- **Drift-region cross-section (slide 6):** ideal non-punch-through Si drift region from Baliga's power-law fits: W<sub>D</sub> = 2.58·10<sup>−2</sup> V<sub>B</sub><sup>7/6</sup> µm, N<sub>D</sub> = 2·10<sup>18</sup> V<sub>B</sub><sup>−4/3</sup> cm<sup>−3</sup>, R<sub>on,sp</sub> = 5.93·10<sup>−6</sup> V<sub>B</sub><sup>2.5</sup> mΩ·cm². The 4H-SiC line uses E<sub>c</sub> ×10, ε<sub>r</sub> 9.7 and μ<sub>n</sub> 950 cm²/Vs, which gives about 1/580 of Si. These are ideal limits; real devices sit above them.
- **Loss view (slide 7):** analytic average and RMS device currents (unity PF, m = 0.9, Î = 100 A, 1500 V link), with E<sub>sw</sub> ∝ V·I. Device data are illustrative (T<sub>j</sub> ≈ 125 °C): 3.3 kV IGBT 1.3 V + 15 mΩ, 2.05 µJ/(V·A); 1.2 kV IGBT 1.0 V + 11 mΩ, 0.41 µJ/(V·A); 1.2 kV SiC MOSFET 20 mΩ, 0.045 µJ/(V·A).

## Printed handouts (`../quiz/`)

- **`Multilevel Converters Quiz.pdf`:** two A4 pages, 15 minutes, four written questions (design, concept, simulation what-if, critique). Questions 1–2 cover this talk; questions 3–4 cover modulation and balancing from the earlier joint version.
- **`Multilevel Converters Quiz - Answer Key.pdf`:** worked solutions with point splits. For the presenters only.
- **`Potential Final Questions.pdf`:** four final-exam questions for the instructor, with solutions and a marking guide.
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
- **Code:** simulations are in `js/sim-*.js` (`sim-basics.js`: device physics and device losses; `sim-leg.js`: the leg explorers and figures; `sim-vis.js`: the pictures on the equation slides; `sim-intro.js`: the level staircase and the backup rating chooser), and shared plotting and FFT code is in `js/kit.js`.
