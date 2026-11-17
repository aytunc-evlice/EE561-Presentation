# Quiz

| File | What it is |
| --- | --- |
| `Quiz - Modulation and Balancing.pdf` | The quiz handed out after the talk: 2 pages, 50 points. |
| `Quiz Answer Key - Modulation and Balancing.pdf` | Solutions and marking scheme, for the presenter and the instructor. |

The questions stay with the fundamentals of the talk; the only number is the 400 V of Q1(c).

1. **One switching period** (derivation, 20 pts): show that the on-time is (1 + r)/2 and the average is r·V<sub>dc</sub>/2; the fundamental at m<sub>a</sub> = 1 and what overmodulation does.
2. **Modulation and balancing** (multiple choice, 3 × 5 pts): why the load does not see the min-max offset; why PD beats POD; what POO and ONN have in common and what not.
3. **Connecting to the grid** (short answers, 15 pts): which way active power flows and what sets reactive power; why the dq frame; where i<sub>d,ref</sub> and i<sub>q,ref</sub> come from.

## Sources

`src/quiz.html` and `src/quiz_key.html`, styled by `src/handout.css`. To rebuild the PDFs on Windows, run
`powershell -ExecutionPolicy Bypass -File src/build_pdfs.ps1` (prints with Edge). No potential final questions yet.
