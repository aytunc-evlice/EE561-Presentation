# Topic breakdown

Syllabus scope (Multilevel Converters module): NPC, ANPC, T-type, CHB, MMC,
topology variants, simulation studies, capacitor voltage-balancing techniques,
relevance to modern research and industrial applications.

## Sefer – Topologies and operating principles

1. **Multilevel concept** – why multilevel, staircase synthesis, device voltage stress, dv/dt, THD vs. level count
2. **2-level baseline** – switching states, limitations that motivate multilevel
3. **3-level NPC (passive)** – clamp diodes, switching states, origin of the neutral-point imbalance problem
4. **ANPC and T-type** – redundant zero states, loss redistribution in ANPC, T-type as the low-voltage variant
5. **Higher-level topologies** – flying capacitor, CHB (isolated DC sources), MMC (submodules, arm inductors), 5L-ANPC
6. **Comparison table** – device count, voltage stress, capacitor count, scalability, typical applications

## Aytunç – Carrier-based modulation, grid control and balancing

7. **Multilevel SPWM** – level-shifted carriers (PD/POD/APOD) for NPC/T-type, phase-shifted carriers for CHB/MMC, harmonic spectra comparison
8. **Zero-sequence injection** – third-harmonic and min-max injection, linear range up to m ≈ 1.15, min-max ≡ SVPWM (one slide)
9. **Capacitor voltage balancing** – NPC: PI on capacitor voltage difference → zero-sequence offset; limits at high m / low PF; flying-capacitor natural balancing; MMC sorting (brief)
10. **Grid-connected multilevel converter control**
    - Synchronization: SRF-PLL, behaviour under distorted/unbalanced grid
    - Current control: dq PI with decoupling and grid-voltage feedforward
    - Outer loops: DC-link voltage control, P/Q reference generation
    - Split DC-link control structure: total V_dc loop → i_d; NP loop → zero-sequence offset
    - Filter design: L vs. LCL, filter size reduction with 3-level, LCL resonance and passive/active damping
    - Unbalanced grid: negative-sequence current and its effect on NP ripple
    - Practical issues: sampling/PWM delay, grid-code harmonic limits (IEEE 519)
11. **Research and industry relevance** – PV/battery inverters, MV drives, MMC-HVDC, SOP as an example

## Joint – Lab demo and simulation

- Demo: 2-level vs. 3-level NPC with PD-SPWM; NP balancing loop off → on (drift and recovery)
- Shared simulation: grid-tied 3-level NPC with dq control + NP balancing (toggle balancing, change PF, L vs. LCL)
