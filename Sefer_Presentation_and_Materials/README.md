# Sefer İdacı — Multilevel converters: building the levels

EE561 Advanced Static Power Conversion, METU, Fall 2026. Part of the multilevel-converter module presented by
Sefer İdacı, Mustafa Aytunç Evlice and Elif Topaloğlu Kurmaç.

| Folder | Contents |
|---|---|
| [`Interactive_Deck/`](Interactive_Deck/) | The talk: an offline HTML deck with live simulations (20 slides including the title and References, about 41 minutes). Open `Interactive_Deck/index.html` in Chrome or Edge; keys and outline in its [README](Interactive_Deck/README.md). |
| [`quiz/`](quiz/) | Quiz (one page, two questions), answer key and potential final questions for this talk only (PDFs), with their HTML sources in `quiz/src/` (rebuild with `build_pdfs.ps1`). |
| [`simulations/`](simulations/) | PLECS model for the last slide: a two-level, a three-level NPC and a five-level ANPC leg side by side (`multilevel_legs.plecs`), with the script that builds and runs it. |
| [`references/`](references/) | Open-access paper used as background for the 5-level ANPC (Redouane et al., 2023, CC BY). |

Topics: what a multilevel converter is, its advantages and disadvantages (device physics, switching losses, real devices), NPC, T-type and ANPC legs, the flying capacitor,
the 5-level ANPC, the redundant states of each leg, device losses and topology selection.
