# M. Aytunç Evlice — Multilevel converters: running the levels

EE561 Advanced Static Power Conversion, METU, Fall 2026. Part of the multilevel-converter module presented by
Sefer İdacı, Mustafa Aytunç Evlice and Elif Topaloğlu Kurmaç.

| Folder | Contents |
|---|---|
| [`Interactive_Deck/`](Interactive_Deck/) | Slides for this part: an offline HTML deck with live simulations (28 slides, about 59 minutes). Open `Interactive_Deck/index.html` in Chrome or Edge; keys and outline in its [README](Interactive_Deck/README.md). |
| [`quiz/`](quiz/) | Quiz and exam questions: to be written once the slides are final (template in `quiz/src/`). |

Topics: sine-triangle PWM from the basics (one switching period, m_a, overmodulation), min-max injection, switching
states and space-vector PWM (and why min-max gives the same pulses), multilevel carrier PWM (PD vs POD),
neutral-point and flying-capacitor balancing, the averaged model and dq current control, and L vs. LCL grid filters.

Order in the module: Sefer (building the levels) → this talk → Elif (cascaded H-bridge, [`../Elif_Presentation_and_Materials/`](../Elif_Presentation_and_Materials/)). This talk starts from Sefer’s
⟨i<sub>O</sub>⟩ = (1 − |r|)·i<sub>a</sub> and redundant states, and hands over to Elif’s phase-shifted and level-shifted carriers on the CHB.

The deck started as Part II of the original joint deck (commit `d01966a`) and was reworked in November 2026 for three
presenters: modulation rebuilt from the basics, overlap with Sefer’s talk cut to a recap, phase-shifted carriers and the
MMC left out (CHB and phase-shifted PWM are in Elif’s talk), and an L/LCL filter slide added.