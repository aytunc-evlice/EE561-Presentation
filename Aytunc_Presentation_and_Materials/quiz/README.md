# Quiz

| File | What it is |
| --- | --- |
| `Quiz - Modulation and Balancing.pdf` | The quiz handed out after the talk: 2 pages, 50 points. |
| `Quiz Answer Key - Modulation and Balancing.pdf` | Solutions and marking scheme, for the presenter and the instructor. |
| `Potential Final Questions - Modulation and Balancing.pdf` | Three exam questions (25 points, about 12 minutes each) with solutions and a marking guide. |

The questions stay with the fundamentals of the talk; the only number is the 400 V of Q1(c).

1. **One switching period** (derivation, 20 pts): show that the on-time is (1 + r)/2 and the average is r·V<sub>dc</sub>/2; the fundamental at m<sub>a</sub> = 1 and what overmodulation does.
2. **Modulation and balancing** (multiple choice, 3 × 5 pts): why the load does not see the min-max offset; why PD beats POD; what POO and ONN have in common and what not.
3. **Connecting to the grid** (short answers, 15 pts): which way active power flows and what sets reactive power; why the dq frame; where i<sub>d,ref</sub> and i<sub>q,ref</sub> come from.

Potential final questions, also from the fundamentals, with simple numbers only:

1. **Three-phase modulation and min-max injection**: overmodulation, computing r<sub>0</sub> and the new references, why v<sub>ab</sub> does not change, the linear limits of sine PWM and min-max, the link to SVPWM.
2. **The midpoint of a three-level NPC converter**: time at O = 1 − |r|, i<sub>O</sub> = −Σ|r<sub>x</sub>|·i<sub>x</sub>, why 150 Hz, POO vs ONN and the midpoint PI.
3. **Controlling a grid-connected converter**: phasor diagram at unity power factor, the control block diagram, how the loops react when the PV power doubles.

## Sources

`src/quiz.html`, `src/quiz_key.html` and `src/final_questions.html`, styled by `src/handout.css`. To rebuild the PDFs on Windows, run
`powershell -ExecutionPolicy Bypass -File src/build_pdfs.ps1` (prints with Edge).
