# EE561 – Multilevel Converters (Student-Led Module)

METU EE561, Fall 2026 · Presenters: **Sefer** and **Aytunç**

## Repository layout

| Folder | Contents |
|---|---|
| `notes/` | Outline, presenter split, meeting notes, rehearsal feedback |
| `references/` | `references.md` (citation list) and `papers/` (PDFs) |
| `simulations/` | `plecs/` and `simulink/` models shared with the class |
| `slides/` | Presentation slides (working + final versions); `Interactive_Deck/` is the HTML deck for both parts |
| `lab-demo/` | Lab demo plan, setup photos, measurements |
| `quiz/` | Printed 15-min quiz, answer key and potential final questions (PDFs; HTML sources in `quiz/src/`) |
| `private/` | Local only, git-ignored: instructor's slides, syllabus, course admin |

See [`notes/outline.md`](notes/outline.md) for the topic breakdown and
[`notes/deliverables.md`](notes/deliverables.md) for the syllabus checklist.

## Interactive deck

Open [`slides/Interactive_Deck/index.html`](slides/Interactive_Deck/index.html) in Chrome or Edge
(offline, live simulations; keys and slide outline in its [README](slides/Interactive_Deck/README.md)).
With GitHub Pages enabled (Settings → Pages → `main`, `/ (root)`), it is online at
<https://aytunc-evlice.github.io/EE561-Presentation/slides/Interactive_Deck/>.

## Workflow

```bash
git pull            # before you start working
git add -A
git commit -m "..."
git push            # when you're done
```

Slides (`.pptx`) and Simulink models (`.slx`) are binary and can't be merged —
tell each other before editing the same file, or work on separate copies.
