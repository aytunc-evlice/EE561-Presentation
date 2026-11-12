"""EE561 multilevel talk: a two-level leg, a three-level NPC leg and a five-level ANPC leg.

Same DC link, same output filter and load, same sine reference.  Each leg has its
own switching frequency in the initialization commands (all 2 kHz by default).  The scope shows what slides 3 and 4 claim: the output
moves in steps of V_dc, V_dc/2 and V_dc/4, and the load-current ripple shrinks
with the step.

    python build_multilevel_legs.py          # PLECS 5.0 open, RPC on port 1080

Writes multilevel_legs.plecs, multilevel_legs.png (the schematic) and
multilevel_legs_waveforms.png (the result) next to this script.
Built with plecskit (C:/git/sefer_idaci_research/04_Tools/PLECS_Toolkit).
"""
from __future__ import annotations

from pathlib import Path

import numpy as np

from plecskit import blocks as B
from plecskit.model import Model
from plecskit.session import Session

HERE = Path(__file__).resolve().parent
NAME = "multilevel_legs"

INIT = """% switching frequencies (Hz): two-level, NPC, 5L-ANPC
f_sw_two_level = 2000; f_sw_three_level = 2000; f_sw_five_level = 2000;   % case 1: same f_sw
% f_sw_two_level = 7400; f_sw_three_level = 3700; f_sw_five_level = 1000; % case 2: same ripple
% f_sw_two_level = 8000; f_sw_three_level = 2000; f_sw_five_level = 2000; % case 3: fast two-level

L_filter = 5e-3;      % output filter inductor (H), same for all legs
% L_filter = 2.5e-3;  % case 4: half the filter
R_load   = 10;        % load (ohm), same for all legs

V_dc_link = 800;      % DC link (V)
m_index   = 0.9;      % modulation index
f_output  = 50;       % output frequency (Hz)
T_sim     = 0.04;     % simulated time (s)
C_flying  = 1e-3;     % 5L-ANPC flying capacitor (F)
R_on      = 1e-3;     % 5L-ANPC switch on-resistance (ohm)
"""


def dc_link(s, x, y_mid, tag):
    """Two ideal halves of the DC link; their midpoint O is the reference (ground)."""
    up = s.add(B.DCSource(f"V_dc1 {tag}", V="V_dc_link/2"), at=(x, y_mid - 40))
    lo = s.add(B.DCSource(f"V_dc2 {tag}", V="V_dc_link/2"), at=(x, y_mid + 40))
    g = s.add(B.Ground(f"O {tag}"), align=("g", (x - 50, y_mid + 10)))
    return up, lo, g


def load_and_meters(s, node_terms, x, y, tag):
    """v_aO voltmeter, then ammeter, filter inductor and load resistor from the leg output to the midpoint O."""
    vm = s.add(B.Voltmeter(f"v {tag}"), align=("p", (x, y + 20)))
    gv = s.add(B.Ground(f"O meter {tag}"), align=("g", (x, vm.n.xy[1] + 15)))
    am = s.add(B.Ammeter(f"i {tag}"), align=("p", (x + 50, y)), direction="left")
    s.connect(*node_terms, vm.p, am.p)
    s.connect(vm.n, gv.g)
    end = s.series(am.n, [B.Inductor(f"L filter {tag}", L="L_filter"), B.Resistor(f"R load {tag}", R="R_load")], gap=40)
    gl = s.add(B.Ground(f"O load {tag}"), align=("g", (end.xy[0] + 30, y + 40)))
    s.connect(end, gl.g)
    return vm, am


def build() -> Model:
    m = Model(NAME, init=INIT, TimeSpan="T_sim", MaxStep="1e-6")
    s = m.root

    # ---------------- modulators for the two-level and NPC legs ----------------
    ref = s.add(B.Sine("reference", Amplitude="m_index", Frequency="2*pi*f_output"), at=(60, 50))
    for x0, name, lim, on, off, fsw in ((60, "two-level", ("-1", "1"), "T1", "T2", "f_sw_two_level"),
                                        (400, "upper", ("0", "1"), "S1", "S3", "f_sw_three_level"),
                                        (740, "lower", ("-1", "0"), "S2", "S4", "f_sw_three_level")):
        car = s.add(B.Triangle(f"carrier {name} {lim[0]}..{lim[1]}", Min=lim[0], Max=lim[1],
                               f=fsw), at=(x0, 130))
        cmp_ = s.add(B.Comparator(f"PWM {name}"), at=(x0 + 110, 100))
        inv = s.add(B.Logical(f"not {on}", "not"), at=(x0 + 190, 140))
        s.connect(ref.out, cmp_.in1)
        s.connect(car.out, cmp_.in2)
        s.connect(cmp_.out, inv.in_)
        s.tag(cmp_.out, on, name=f"to {on}", gap=110)
        s.tag(inv.out, off, name=f"to {off}", gap=30)

    # ---------------- two-level leg ----------------
    y0 = 320
    up, lo, g = dc_link(s, 100, y0, "2L")
    t1 = s.add(B.Igbt("T1"), at=(260, y0 - 40))
    t2 = s.add(B.Igbt("T2"), at=(260, y0 + 40))
    s.connect(up.p, t1.c)
    s.connect(lo.n, t2.e)
    s.connect(up.n, lo.p, g.g)
    vm2, am2 = load_and_meters(s, [t1.e, t2.c], 320, y0, "two-level")
    s.fetch("T1", t1.g, name="get T1")
    s.fetch("T2", t2.g, name="get T2")

    # ---------------- three-level NPC leg ----------------
    y1 = 660
    up3, lo3, g3 = dc_link(s, 100, y1, "NPC")
    sw = [s.add(B.Igbt(f"S{k + 1}"), at=(300, y1 - 150 + 100 * k)) for k in range(4)]
    d5 = s.add(B.Diode("D5"), at=(180, y1 - 50), direction="down")   # anode at O, cathode at X
    d6 = s.add(B.Diode("D6"), at=(180, y1 + 50), direction="down")   # anode at Y, cathode at O
    s.connect(up3.p, sw[0].c, points=[(100, y1 - 170)])
    s.connect(lo3.n, sw[3].e, points=[(100, y1 + 170)])
    s.connect(up3.n, lo3.p, g3.g, d5.a, d6.k, trunk=("y", y1))
    s.connect(d5.k, sw[0].e, sw[1].c)
    s.connect(d6.a, sw[2].e, sw[3].c)
    vm3, am3 = load_and_meters(s, [sw[1].e, sw[2].c], 360, y1, "three-level")
    for k in range(4):
        s.fetch(f"S{k + 1}", sw[k].g, name=f"get S{k + 1}")

    # ---------------- five-level ANPC leg: selector S5..S8, then a flying-capacitor cell ----------------
    # MOSFETs with a small on-resistance: with ideal switches, turning S1 on while the body diode of S1c
    # conducts puts C_fly in a loop with the DC source, and PLECS stops ("state/source dependence").
    y2 = 1110
    up5, lo5, g5 = dc_link(s, 100, y2, "5L")
    sel = [s.add(B.Mosfet(f"5L S{k + 5}", Ron="R_on"), at=(260, y2 - 150 + 100 * k)) for k in range(4)]
    # S1c and S2c are the complements of S1 and S2 (S1′ and S2′ on the slides)
    cell = [s.add(B.Mosfet(n, Ron="R_on"), at=(520, y2 - 120 + 80 * k))
            for k, n in enumerate(("5L S1", "5L S2", "5L S2c", "5L S1c"))]
    cfly = s.add(B.Capacitor("C_fly", C="C_flying", v_init="V_dc_link/4"), at=(430, y2))
    vfly = s.add(B.Voltmeter("v C_fly"), at=(380, y2))
    s.connect(up5.p, sel[0].d, points=[(100, y2 - 170)])
    s.connect(lo5.n, sel[3].s, points=[(100, y2 + 170)])
    s.connect(up5.n, lo5.p, g5.g, sel[1].s, sel[2].d, trunk=("y", y2))
    s.connect(sel[0].s, sel[1].d, cell[0].d)                 # node U: P or O
    s.connect(sel[2].s, sel[3].d, cell[3].s)                 # node L: O or N
    s.connect(cell[0].s, cell[1].d, cfly.p, vfly.p)
    s.connect(cell[2].s, cell[3].d, cfly.n, vfly.n)
    vm5, am5 = load_and_meters(s, [cell[1].s, cell[2].d], 630, y2, "five-level")

    # its modulator: the sign of the reference picks the half, two carriers half a period apart run the cell
    ym = y2 + 260
    ref5 = s.add(B.Sine("reference 5L", Amplitude="m_index", Frequency="2*pi*f_output"), at=(60, ym))
    upper = s.add(B.CompareConst("upper half", ">=", "0"), at=(170, ym - 40))
    lower = s.add(B.Logical("lower half", "not"), at=(330, ym - 40))
    duty = s.add(B.Sum("cell duty", "++"), at=(420, ym))      # ref (upper half) or ref + 1 (lower half)
    s.connect(ref5.out, upper.in_, duty.in1)
    s.connect(upper.out, lower.in_)
    s.connect(lower.out, duty.in2)
    s.tag(upper.out, "upper", name="to upper", gap=20)
    s.tag(lower.out, "lower", name="to lower", gap=20)
    for k, (cname, delay, on, off) in enumerate((("carrier 1", "0", "5L S1", "5L S1c"),
                                                 ("carrier 2, half a period later", "0.5/f_sw_five_level", "5L S2", "5L S2c"))):
        x0 = 520 + 300 * k
        car = s.add(B.Triangle(cname, Min="0", Max="1", f="f_sw_five_level", Delay=delay), at=(x0, ym + 60))
        cmp_ = s.add(B.Comparator(f"PWM {on}"), at=(x0 + 90, ym + 20))
        inv = s.add(B.Logical(f"not {on}", "not"), at=(x0 + 170, ym + 60))
        s.connect(duty.out, cmp_.in1)
        s.connect(car.out, cmp_.in2)
        s.connect(cmp_.out, inv.in_)
        s.tag(cmp_.out, on, name=f"to {on}", gap=100)
        s.tag(inv.out, off, name=f"to {off}", gap=30)
    for blk, tag in zip(sel, ("upper", "lower", "upper", "lower")):
        s.fetch(tag, blk.g, name=f"get {blk.name}")
    for blk in cell:
        s.fetch(blk.name, blk.g, name=f"get {blk.name}")

    # ---------------- scope and outports ----------------
    xs, ys = 900, y1
    mux = s.add(B.Mux("all currents", 3), at=(xs - 60, ys + 30))
    sc = s.add(B.Scope("Scope", ["v_aO two-level / V", "v_aO three-level / V", "v_aO five-level / V",
                                 "load current / A", "v C_fly / V"]), at=(xs, ys))
    s.connect(vm2.out, sc.in1)
    s.connect(vm3.out, sc.in2)
    s.connect(vm5.out, sc.in3)
    s.connect(am2.out, mux.in1)
    s.connect(am3.out, mux.in2)
    s.connect(am5.out, mux.in3)
    s.connect(mux.out, sc.in4)
    s.connect(vfly.out, sc.in5)
    for k, (name, term, y) in enumerate((("v_two_level", vm2.out, y0 + 40), ("i_two_level", am2.out, y0 - 40),
                                         ("v_three_level", vm3.out, y1 - 120), ("i_three_level", am3.out, y1 - 180),
                                         ("v_five_level", vm5.out, y2 + 40), ("i_five_level", am5.out, y2 - 40),
                                         ("v_fly", vfly.out, y2 + 100))):
        m.output(name, term, at=(xs + 140, y))
    return m


def fundamental(t, y, f):
    """Peak of the component at f over an integer number of periods."""
    return 2 * abs(np.mean(y * np.exp(-2j * np.pi * f * t)))


def main():
    m = build()
    for issue in m.check():
        print("check:", issue)
    with Session() as ses:
        r = m.simulate(ses, HERE / f"{NAME}.plecs", step=2e-6, span=0.04)
        ses.render(NAME, HERE / f"{NAME}.png", resolution=110)
    t = r.t
    k = r.window(0.02)                       # second period: start-up transient gone
    f = 50.0
    print(f"run {r.runtime:.1f} s, {len(t)} samples")
    for tag in ("two_level", "three_level", "five_level"):
        v, i = r[f"v_{tag}"], r[f"i_{tag}"]
        c = np.mean(i[k] * np.exp(-2j * np.pi * f * t[k]))
        i1 = 2 * abs(c)
        ripple = i[k] - i1 * np.cos(2 * np.pi * f * t[k] + np.angle(c))
        print(f"{tag:12s}: levels {sorted(set((np.round(v[k] / 10) * 10).astype(int).tolist()))}, "
              f"v1 = {fundamental(t[k], v[k], f):.1f} V, i1 = {i1:.2f} A, "
              f"ripple rms = {np.sqrt(np.mean(ripple ** 2)):.3f} A")
    vf = r["v_fly"]
    print(f"v_fly: {vf[k].min():.1f} .. {vf[k].max():.1f} V, mean {vf[k].mean():.1f} V (first period mean {vf[~k].mean():.1f} V)")
    plot(t, r, k)


def plot(t, r, k):
    """The figure on the simulation slide: one output period of the three legs."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    red, blue, ink = "#c8102e", "#1f4e9c", "#222222"
    ms = (t[k] - t[k][0]) * 1e3
    plt.rcParams.update({"font.family": "Calibri", "font.size": 15})
    fig, ax = plt.subplots(4, 1, figsize=(11, 7.6), sharex=True,
                           gridspec_kw={"height_ratios": [1, 1, 1, 1.35], "hspace": 0.42})
    for a, tag, col, title in ((ax[0], "two_level", ink, "Two-level leg: steps of 800 V"),
                               (ax[1], "three_level", red, "Three-level NPC leg: steps of 400 V"),
                               (ax[2], "five_level", blue, "Five-level ANPC leg: steps of 200 V")):
        a.plot(ms, r[f"v_{tag}"][k], color=col, lw=1.0)
        a.set_title(title, loc="left", fontweight="bold", pad=3)
        a.set_yticks([-400, 0, 400]); a.set_ylim(-480, 480); a.set_ylabel("V")
    ax[3].plot(ms, r["i_two_level"][k], color=ink, lw=1.2, label="two-level")
    ax[3].plot(ms, r["i_three_level"][k], color=red, lw=1.2, label="three-level NPC")
    ax[3].plot(ms, r["i_five_level"][k], color=blue, lw=1.2, label="five-level ANPC")
    ax[3].set_title("Load current", loc="left", fontweight="bold", pad=3)
    ax[3].set_ylabel("A"); ax[3].set_xlabel("time (ms)")
    ax[3].legend(loc="lower left", frameon=False, ncol=1, fontsize=13)
    for a in ax:
        a.grid(color="#dddddd", lw=0.8); a.set_xlim(0, 20)
        for side in ("top", "right"):
            a.spines[side].set_visible(False)
    fig.savefig(HERE / f"{NAME}_waveforms.png", dpi=150, bbox_inches="tight")


if __name__ == "__main__":
    main()
