# PLECS model: three-phase three-level NPC, open loop

`npc_3phase.plecs` shows the basics of *Running the levels* on one scope. Open it in PLECS (standalone, 5.0), press
Simulate, and open the scope. All settings are in **Simulation → Simulation parameters → Initialization**.

The scope plots are in the order of the demo, top to bottom:

| # | Scope plot | What to look at | Slides |
| --- | --- | --- | --- |
| 1 | r_a and the carriers | the reference against the two carriers (PD or POD) | 4, 12–13 |
| 2 | v_aO | three levels: +400, 0, −400 V | 12 |
| 3 | v_ab | line voltage in steps of 400 V with PD (five levels) | 13 |
| 4 | i_a, i_b, i_c | load currents, about 36 A peak, with a small switching ripple | 15 |
| 5 | i_O | midpoint current: three humps per cycle (150 Hz), zero average | 16–17 |
| 6 | v_C1, v_C2 | 400 V each, with a 150 Hz ripple of about 18 V peak to peak | 17 |

## Demo, about 4 minutes

| Step | Setting | Plots | Point at |
| --- | --- | --- | --- |
| 1 | default | 1 → 2 → 3 → 4 | comparator rule, 3 levels, 5 levels, clean sine currents |
| 2 | `pod = 1` | 1 → 3 → 4 | mirrored carrier, 800 V jumps, bigger ripple |
| 3 | `m_index = 1.1` | 1 → 4 | reference above the carriers, distorted currents |
| 4 | `zs = 1` (keep 1.1) | 1 → 3 → 4 | back inside ±1, line voltage unchanged, clean currents |
| 5 | `m_index = 0.9`, `zs = 0` | 5 → 6 | 150 Hz midpoint current, capacitor ripple |
| 6 | `dv0 = 40` | 6 | the 80 V gap does not come back by itself |

In the deck, the speaker notes of slides 7, 8, 12, 13, 15, 17 and 18 start with an orange **▶ PLECS** line: what to
set and which plot to show at that point of the talk.

## Things to try

| Change | What happens |
| --- | --- |
| `pod = 1` | POD carriers: v_ab now jumps 0 ↔ 800 V, the current ripple grows |
| `m_index = 1.1` | overmodulation: the reference leaves the carriers, the currents become distorted |
| `m_index = 1.1`, `zs = 1` | the 1/6 third harmonic brings the references back inside ±1 (same +15 % as min-max) |
| `dv0 = 40` | the capacitors start 80 V apart; without a controller the difference does not come back quickly |
| `f_sw = 5000` | smaller current ripple |

The zero-sequence option is the 1/6 third harmonic, not min-max: it reaches the same 2/√3 limit with fixed blocks.
For exact min-max, replace the third-harmonic source with r₀ = −(max + min)/2 from a Min/Max block.

## Circuit

DC source (800 V, 0.05 Ω) feeding two 1 mF capacitors with the midpoint O; three NPC legs (S1–S4 with clamp diodes
D5, D6, ideal switches); RL load per phase (10 Ω, 5 mH), star point floating. Each leg: S1 = r > upper carrier
(0…1), S3 = not S1; S2 = r > lower carrier (−1…0), S4 = not S2.

## Rebuilding

`build_npc_3phase.py` writes the `.plecs` file as plain text (`python build_npc_3phase.py`); it needs only Python,
not PLECS. It was written without PLECS at hand, so the wiring in the schematic may need tidying after opening.
