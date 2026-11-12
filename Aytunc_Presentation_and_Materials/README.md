# M. Aytunç Evlice — Multilevel converters: running the levels

EE561 Advanced Static Power Conversion, METU, Fall 2026. Part of the multilevel-converter module presented by
Sefer İdacı, Mustafa Aytunç Evlice and Elif Topaloğlu Kurmaç.

| Folder | Contents |
|---|---|
| [`Interactive_Deck/`](Interactive_Deck/) | Slides for this part: an offline HTML deck with live simulations (22 slides, about 45 minutes). Open `Interactive_Deck/index.html` in Chrome or Edge; keys and outline in its [README](Interactive_Deck/README.md). |
| [`quiz/`](quiz/) | Quiz (one page, two questions), answer key and potential final questions on modulation and balancing (PDFs), with their HTML sources in `quiz/src/` (rebuild with `build_pdfs.ps1`). |

Topics: sine-triangle PWM, carrier-based multilevel PWM, min-max injection and its link to space vectors (one slide),
neutral-point and flying-capacitor balancing, the modular multilevel converter (submodule sorting, circulating current),
the averaged model and dq current control, and L vs. LCL grid filters.

Order in the module: Sefer (building the levels) → this talk → Elif (cascaded H-bridge, [`../Elif_Presentation_and_Materials/`](../Elif_Presentation_and_Materials/)). This talk starts from Sefer’s
⟨i<sub>O</sub>⟩ = (1 − |r|)·i<sub>a</sub> and redundant states, and hands over to Elif’s phase-shifted and level-shifted carriers on the CHB.

The deck started as Part II of the original joint deck (commit `d01966a`). In November 2026 it was reworked for three
presenters: the three space-vector slides became one, the overlap with Sefer’s talk was cut to a recap, and an MMC section
and an L/LCL filter slide were added.
