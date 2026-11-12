# EE561 – Multilevel Converters (Student-Led Module)

METU EE561, Fall 2026 · Presenters: **Sefer İdacı**, **Mustafa Aytunç Evlice** and **Elif Topaloğlu Kurmaç**

## Repository layout

| Folder | Contents |
|---|---|
| `notes/` | Outline, presenter split, meeting notes, rehearsal feedback |
| `references/` | `references.md` (citation list) and `papers/` (PDFs) |
| `simulations/` | `plecs/` and `simulink/` models shared with the class |
| `slides/` | Presentation slides (working + final versions) |
| `lab-demo/` | Lab demo plan, setup photos, measurements |
| `quiz/` | Post-presentation quiz and exam questions |
| `Sefer_Presentation_and_Materials/` | Sefer’s part: interactive HTML deck, printed quiz and potential final questions, reference paper (see its [README](Sefer_Presentation_and_Materials/README.md)) |
| `Aytunc_Presentation_and_Materials/` | Aytunç’s part (second talk): modulation, capacitor balancing and grid control slides; quiz to be written (see its [README](Aytunc_Presentation_and_Materials/README.md)) |
| `Elif_Presentation_and_Materials/` | Elif’s part (third talk): cascaded H-bridge multilevel inverters, interactive HTML deck (see its [README](Elif_Presentation_and_Materials/README.md)) |
| `private/` | Local only, git-ignored: instructor's slides, syllabus, course admin |

All three decks are listed on the module home page:
<https://aytunc-evlice.github.io/EE561-Presentation/> (`index.html` at the repository root).

See [`notes/outline.md`](notes/outline.md) for the topic breakdown and
[`notes/deliverables.md`](notes/deliverables.md) for the syllabus checklist.

## Sefer’s interactive deck

Open [`Sefer_Presentation_and_Materials/Interactive_Deck/index.html`](Sefer_Presentation_and_Materials/Interactive_Deck/index.html) in Chrome or Edge
(offline, live simulations; keys and slide outline in its [README](Sefer_Presentation_and_Materials/Interactive_Deck/README.md)).
With GitHub Pages enabled (Settings → Pages → `main`, `/ (root)`), it is online at
<https://aytunc-evlice.github.io/EE561-Presentation/Sefer_Presentation_and_Materials/Interactive_Deck/>.

## Aytunç’s deck

Open [`Aytunc_Presentation_and_Materials/Interactive_Deck/index.html`](Aytunc_Presentation_and_Materials/Interactive_Deck/index.html) the same way
(keys and slide outline in its [README](Aytunc_Presentation_and_Materials/Interactive_Deck/README.md)).
Online at <https://aytunc-evlice.github.io/EE561-Presentation/Aytunc_Presentation_and_Materials/Interactive_Deck/>.

## Elif’s deck

Open [`Elif_Presentation_and_Materials/Interactive_Deck/index.html`](Elif_Presentation_and_Materials/Interactive_Deck/index.html) the same way
(keys and slide outline in its [README](Elif_Presentation_and_Materials/Interactive_Deck/README.md)).
Online at <https://aytunc-evlice.github.io/EE561-Presentation/Elif_Presentation_and_Materials/Interactive_Deck/>.

## Workflow

```bash
git pull            # before you start working
git add -A
git commit -m "..."
git push            # when you're done
```

Slides (`.pptx`) and Simulink models (`.slx`) are binary and can't be merged —
tell each other before editing the same file, or work on separate copies.
