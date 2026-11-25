"""EE561 multilevel talk, part 2 (Running the levels): a three-phase three-level NPC inverter, open loop.

Writes npc_3phase.plecs next to this script (plain text in the PLECS 5.0 format; the header is copied from
header_template.txt, taken from Sefer's multilevel_legs.plecs). No PLECS is needed to build it.
Shows the basics of the talk on one scope:
  * leg voltage v_aO with three levels, line voltage v_ab with five levels (steps of V_dc/2 with PD),
  * sine-triangle PWM with two carriers, PD or POD (switch `pod`),
  * zero-sequence injection on or off (switch `zs`: 1/6 third harmonic, same +15 % limit as min-max),
  * load currents, the two DC-link capacitor voltages (150 Hz ripple) and the midpoint current.

    python build_npc_3phase.py
"""
from __future__ import annotations

import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
NAME = "npc_3phase"

INIT = """% ===== EE561 Running the levels: three-phase 3-level NPC, open loop =====
% Change a switch, run, compare the scope.

m_index = 0.9;     % modulation index (peak reference). Try 1.1 with zs = 0 and zs = 1
zs      = 0;       % zero-sequence injection: 0 = plain sine PWM, 1 = add 1/6 third harmonic (+15 %)
pod     = 0;       % carriers: 0 = PD (in phase, standard), 1 = POD (lower carrier mirrored)
f_sw    = 2000;    % carrier (switching) frequency (Hz)

V_dc    = 800;     % DC link (V)
C_dc    = 1e-3;    % each DC-link capacitor C1, C2 (F)
dv0     = 0;       % start with v_C1 - v_C2 = 2*dv0 (V); try 40: no controller, it does not come back quickly
R_dc    = 0.05;    % source resistance (ohm), lets the capacitors carry the ripple

L_load  = 5e-3;    % load inductance per phase (H)
R_load  = 10;      % load resistance per phase (ohm), star point floating
f_out   = 50;      % output frequency (Hz)
T_sim   = 0.1;     % simulated time (s)
"""

# --------------------------------------------------------------------------- text helpers
comps: list[str] = []
conns: list[str] = []
names: set[str] = set()


def q(s: str) -> str:
    return '"' + s.replace('\\', '\\\\').replace('"', '\\"') + '"'


def param(var: str, val: str, show: str = "off") -> str:
    return (f"      Parameter {{\n        Variable      {q(var)}\n        Value         {q(val)}\n"
            f"        Show          {show}\n      }}\n")


def comp(typ: str, name: str, pos, direction="up", params=(), show="off", label="south", extra="") -> str:
    assert name not in names, name
    names.add(name)
    s = (f"    Component {{\n      Type          {typ}\n      Name          {q(name)}\n      Show          {show}\n"
         f"      Position      [{pos[0]}, {pos[1]}]\n      Direction     {direction}\n      Flipped       off\n"
         f"      LabelPosition {label}\n{extra}")
    for p in params:
        s += param(*p)
    s += "    }\n"
    comps.append(s)
    return name


def pts(points) -> str:
    return "[" + "; ".join(f"{x}, {y}" for x, y in points) + "]"


def connect(kind: str, src, dsts, points=None):
    """kind 'Wire' or 'Signal'; src=(name, terminal); dsts=[(name, terminal, points or None), ...]."""
    s = f"    Connection {{\n      Type          {kind}\n      SrcComponent  {q(src[0])}\n      SrcTerminal   {src[1]}\n"
    if len(dsts) == 1:
        p = list(points or []) + list(dsts[0][2] or [])
        if p:
            s += f"      Points        {pts(p)}\n"
        s += f"      DstComponent  {q(dsts[0][0])}\n      DstTerminal   {dsts[0][1]}\n"
    else:
        if points:
            s += f"      Points        {pts(points)}\n"
        for d in dsts:
            s += "      Branch {\n"
            if d[2]:
                s += f"        Points        {pts(d[2])}\n"
            s += f"        DstComponent  {q(d[0])}\n        DstTerminal   {d[1]}\n      }}\n"
    s += "    }\n"
    conns.append(s)


def wire(src, *dsts, points=None):
    connect("Wire", src, [d if len(d) == 3 else (d[0], d[1], None) for d in dsts], points)


def sig(src, *dsts, points=None):
    connect("Signal", src, [d if len(d) == 3 else (d[0], d[1], None) for d in dsts], points)


# --------------------------------------------------------------------------- component makers
SW_PARAMS = (("s_init", "0"), ("thermal", ""), ("Rth", "0"), ("T_init", ""))
DIODE_PARAMS = (("Vf", "0"), ("Ron", "0"), ("thermal", ""), ("Rth", "0"), ("Np", "1"), ("T_init", ""),
                ("SwitchModel", "1"), ("f_grid", "0"))
GOTO_FROM = lambda tag, nomatch: (("Tag", tag), ("Visibility", "2"), ("NoMatchingCounterpartAction", nomatch),
                                  ("CustomMessage", ""), ("HighlightLevel", "0"))


def igbt(name, pos):
    return comp("IgbtWithDiode", name, pos, "up", SW_PARAMS, show="on", label="east")


def diode(name, pos):
    return comp("Diode", name, pos, "down", DIODE_PARAMS, show="on", label="east")


def ground(name, pos):
    return comp("Ground", name, pos, "up", (), label="east")


def goto(name, tag, pos, direction="right"):
    return comp("Goto", name, pos, direction, GOTO_FROM(tag, "2"), label="north")


def from_(name, tag, pos, direction="right"):
    return comp("From", name, pos, direction, GOTO_FROM(tag, "1"), label="north")


def sine(name, pos, amp, freq, phase):
    return comp("SineGenerator", name, pos, "right",
                (("Amplitude", amp), ("Bias", "0"), ("Frequency", freq), ("Phase", phase), ("Units", "1")))


def triangle(name, pos, lo, hi, delay):
    return comp("TriangleGenerator", name, pos, "right",
                (("Min", lo), ("Max", hi), ("f", "f_sw"), ("DutyCycle", "0.5"), ("Delay", delay)))


def summ(name, pos, signs="++"):
    return comp("Sum", name, pos, "up", (("IconShape", "1"), ("Inputs", signs), ("DataType", "10"),
                                         ("DataTypeOverflowMode", "1")))


def comparator(name, pos):
    return comp("Comparator", name, pos, "right")


def logic_not(name, pos):
    return comp("LogicalOperator", name, pos, "right", (("Operator", "6"), ("Inputs", "1")))


def voltmeter(name, pos, direction="up"):
    return comp("Voltmeter", name, pos, direction, (), label="east")


def ammeter(name, pos, direction="left"):
    return comp("Ammeter", name, pos, direction, (), label="north")


def mux(name, pos, width):
    return comp("SignalMux", name, pos, "right", (("Width", str(width)),), extra="      Frame         [-2, -15; 7, 15]\n")


def scope(name, pos, axes):
    ax = "".join(f"""      Axis {{
        Name          {q(a)}
        AutoScale     1
        MinValue      0
        MaxValue      1
        Signals       {{}}
        SignalTypes   [ ]
        Untangle      0
        KeepBaseline  off
        BaselineValue 0
      }}
""" for a in axes)
    fax = "".join("""        Axis {
          Name          ""
          AutoScale     1
          MinValue      0
          MaxValue      1
          Signals       {}
          Untangle      0
          KeepBaseline  off
          BaselineValue 0
        }
""" for _ in axes)
    h = 15 * len(axes)
    extra = f"""      Frame         [-15, -{h}; 15, {h}]
      Location      [100, 60; 900, 900]
      State         ""
      SavedViews    ""
      HeaderState   ""
      PlotPalettes  ""
      Axes          "{len(axes)}"
      TimeRange     "0.0"
      ScrollingMode "1"
      SingleTimeAxis "1"
      Open          "0"
      Ts            "-1"
      SampleLimit   "0"
      XAxisLabel    "Time / s"
      ShowLegend    "1"
{ax}      Fourier {{
        SingleXAxis       on
        AxisLabel         "Frequency"
        Scaling           0
        PhaseDisplay      0
        ShowFourierLegend off
{fax}      }}
"""
    return comp("Scope", name, pos, "up", (), show="on", extra=extra)


# --------------------------------------------------------------------------- the model
def build():
    # ---------------- modulator (top) ----------------
    phases = (("a", "0"), ("b", "-2*pi/3"), ("c", "2*pi/3"))
    third = sine("third harmonic zs*m/6", (80, 290), "zs*m_index/6", "3*2*pi*f_out", "0")
    goto("to r0", "r0", (200, 290))
    sig((third, 1), ("to r0", 1, None))
    for k, (ph, phase) in enumerate(phases):
        y = 50 + 70 * k
        s = sine(f"reference {ph}", (80, y), "m_index", "2*pi*f_out", phase)
        f0 = from_(f"r0 for {ph}", "r0", (80, y + 30))
        sm = summ(f"r{ph} = sine + r0", (170, y + 10))
        g = goto(f"to r{ph}", f"r{ph}", (240, y + 10))
        sig((s, 1), (sm, 2, [(170, y)]))
        sig((f0, 1), (sm, 3, [(170, y + 30)]))
        sig((sm, 1), (g, 1))
    up = triangle("upper carrier 0..1", (80, 360), "0", "1", "0")
    lo = triangle("lower carrier -1..0 (PD or POD)", (80, 420), "-1", "0", "pod*0.5/f_sw")
    goto("to car up", "car_up", (200, 360))
    goto("to car lo", "car_lo", (200, 420))
    sig((up, 1), ("to car up", 1))
    sig((lo, 1), ("to car lo", 1))

    # gate logic per phase: S1 = r > upper carrier, S3 = not S1; S2 = r > lower carrier, S4 = not S2
    for k, (ph, _) in enumerate(phases):
        x0 = 380 + 300 * k
        for j, (car, on, off) in enumerate((("car_up", "1", "3"), ("car_lo", "2", "4"))):
            y = 70 + 160 * j
            fr = from_(f"r{ph} for S{on}{ph}", f"r{ph}", (x0, y - 15))
            fc = from_(f"{car} for S{on}{ph}", car, (x0, y + 15))
            c = comparator(f"PWM S{on}{ph}", (x0 + 80, y))
            n = logic_not(f"not S{on}{ph}", (x0 + 140, y + 40))
            g1 = goto(f"to S{on}{ph}", f"S{on}{ph}", (x0 + 200, y))
            g2 = goto(f"to S{off}{ph}", f"S{off}{ph}", (x0 + 200, y + 40))
            sig((fr, 1), (c, 1))
            sig((fc, 1), (c, 2))
            sig((c, 3), (g1, 1, None), (n, 2, [(x0 + 110, y + 40)]), points=[(x0 + 110, y)])
            sig((n, 1), (g2, 1))

    # ---------------- DC link (bottom left) ----------------
    yP, yN, yM = 520, 880, 700
    src = comp("DCVoltageSource", "V_dc", (60, yM), "up", (("V", "V_dc"),), show="on", label="east")
    rdc = comp("Resistor", "R_dc", (130, yP), "right", (("R", "R_dc"),), show="on", label="north")
    c1 = comp("Capacitor", "C1", (240, yM - 80), "up", (("C", "C_dc"), ("v_init", "V_dc/2 + dv0")), show="on", label="east")
    c2 = comp("Capacitor", "C2", (240, yM + 80), "up", (("C", "C_dc"), ("v_init", "V_dc/2 - dv0")), show="on", label="east")
    vc1 = voltmeter("v_C1", (180, yM - 80))
    vc2 = voltmeter("v_C2", (180, yM + 80))
    io = ammeter("i_O midpoint", (300, yM), "right")
    gO = ground("O", (340, yM + 20))
    goto("to vC1", "vC1", (150, yM - 110), "left")
    goto("to vC2", "vC2", (150, yM + 50), "left")
    goto("to iO", "iO", (300, yM - 40), "up")
    sig((vc1, 3), ("to vC1", 1))
    sig((vc2, 3), ("to vC2", 1))
    sig((io, 3), ("to iO", 1))

    # ---------------- three NPC legs ----------------
    yl = yM                       # output node height
    xs = (520, 760, 1000)
    legs = {}
    for k, (ph, _) in enumerate(phases):
        x = xs[k]
        S = [igbt(f"S{j + 1}{ph}", (x, yl - 150 + 100 * j)) for j in range(4)]
        d5 = diode(f"D5{ph}", (x - 110, yl - 50))
        d6 = diode(f"D6{ph}", (x - 110, yl + 50))
        go = ground(f"O {ph}", (x - 150, yl + 10))
        for j in range(4):
            from_(f"get S{j + 1}{ph}", f"S{j + 1}{ph}", (x - 55, yl - 150 + 100 * j))
            sig((f"get S{j + 1}{ph}", 1), (S[j], 3))
        wire((S[0], 2), (S[1], 1, None), (d5, 2, [(x - 110, yl - 100)]), points=[(x, yl - 100)])   # node X
        wire((S[2], 2), (S[3], 1, None), (d6, 1, [(x - 110, yl + 100)]), points=[(x, yl + 100)])   # node Y
        wire((d5, 1), (d6, 2, None), (go, 1, [(x - 150, yl)]), points=[(x - 110, yl)])           # clamp to O
        am = ammeter(f"i_{ph}", (x + 50, yl))
        goto(f"to i{ph}", f"i{ph}", (x + 50, yl - 30), "up")
        sig((am, 3), (f"to i{ph}", 1))
        L = comp("Inductor", f"L_{ph}", (x + 90, 980), "up", (("L", "L_load"), ("i_init", "0")), show="on", label="east")
        R = comp("Resistor", f"R_{ph}", (x + 90, 1060), "up", (("R", "R_load"),), show="on", label="east")
        wire((L, 2), (R, 1))
        legs[ph] = dict(S=S, am=am, x=x, L=L, R=R)

    # voltmeters: v_aO (three levels) and v_ab (five levels)
    xa, xb = xs[0], xs[1]
    va = voltmeter("v_aO", (xa + 40, yl + 160))
    gva = ground("O meter", (xa + 40, yl + 210))
    wire((va, 2), (gva, 1))
    vab = voltmeter("v_ab", (xb - 40, yl + 160))
    goto("to vaO", "vaO", (xa + 80, yl + 160))
    goto("to vab", "vab", (xb, yl + 160))
    sig((va, 3), ("to vaO", 1))
    sig((vab, 3), ("to vab", 1))

    # output node of each leg (between S2 and S3): S2 emitter, S3 collector, ammeter in (+ voltmeters)
    for ph in "abc":
        x, S, am = legs[ph]["x"], legs[ph]["S"], legs[ph]["am"]
        extra = []
        if ph == "a":
            extra = [(va, 1, [(x + 20, yl), (x + 20, yl + 120), (x + 40, yl + 120)])]
        if ph == "b":
            extra = [(vab, 2, [(x + 20, yl), (x + 20, yl + 230), (x - 40, yl + 230)])]
        wire((S[1], 2), (S[2], 1, None), (am, 1, [(x + 30, yl)]), *extra, points=[(x, yl)])
    # after the ammeters: to the load inductors (+ v_ab plus terminal on phase a)
    for ph in "abc":
        x, am, L = legs[ph]["x"], legs[ph]["am"], legs[ph]["L"]
        if ph == "a":
            wire((am, 2), (L, 1, [(x + 90, yl)]), (vab, 1, [(x + 90, yl + 110), (xb - 40, yl + 110)]), points=[(x + 90, yl)])
        else:
            wire((am, 2), (L, 1, [(x + 90, yl)]))
    # star point n (floating)
    wire((legs["a"]["R"], 2), (legs["b"]["R"], 2, [(xs[1] + 90, 1110)]), (legs["c"]["R"], 2, [(xs[2] + 90, 1110)]),
         points=[(xs[0] + 90, 1110)])

    # DC rails and midpoint
    wire((rdc, 2), (c1, 1, [(240, yP)]), (vc1, 1, [(180, yP)]),
         *[(legs[ph]["S"][0], 1, [(legs[ph]["x"], yP)]) for ph in "abc"], points=[(240, yP)])
    wire((src, 2), (c2, 2, [(240, yN)]), (vc2, 2, [(180, yN)]),
         *[(legs[ph]["S"][3], 2, [(legs[ph]["x"], yN)]) for ph in "abc"], points=[(60, yN)])
    wire((src, 1), (rdc, 1, [(60, yP)]))
    wire((c1, 2), (c2, 1, None), (vc1, 2, [(180, yM)]), (vc2, 1, [(180, yM)]), (io, 1, None), points=[(240, yM)])
    wire((io, 2), (gO, 1, [(340, yM)]))

    # ---------------- scope (right) ----------------
    xs_ = 1400
    # top to bottom in the order of the demo: carriers, leg voltage, line voltage, currents, midpoint, capacitors
    axes = ["1  r_a and the two carriers", "2  v_aO: three levels / V", "3  v_ab: line voltage / V",
            "4  load currents i_a, i_b, i_c / A", "5  midpoint current i_O / A", "6  v_C1, v_C2 / V"]
    sc = scope("Scope", (xs_, 300), axes)
    feeds = [("ra", "car_up", "car_lo"), ("vaO",), ("vab",), ("ia", "ib", "ic"), ("iO",), ("vC1", "vC2")]
    for k, tags in enumerate(feeds):
        y = 300 - 15 * len(axes) + 15 + 30 * k
        if len(tags) == 1:
            f = from_(f"{tags[0]} to scope", tags[0], (xs_ - 90, y))
            sig((f, 1), (sc, k + 1))
        else:
            mx = mux(f"mux {k + 1}", (xs_ - 50, y), len(tags))
            for j, t in enumerate(tags):
                f = from_(f"{t} to scope", t, (xs_ - 130, y - 10 * (len(tags) - 1) + 20 * j + 400 * 0))
                sig((f, 1), (mx, j + 2))
            sig((mx, 1), (sc, k + 1))


def header() -> str:
    chunks = []
    s = INIT.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
    while s:
        n = 76
        while s[n - 1:n] == "\\":   # never split an escape sequence
            n -= 1
        chunks.append(s[:n])
        s = s[n:]
    init = '"' + '"\n"'.join(chunks) + '"'
    h = (HERE / "header_template.txt").read_text(encoding="utf-8")
    h = h.replace("@NAME@", NAME).replace("@INIT@", init)
    h = h.replace('TimeSpan      "T_sim"', 'TimeSpan      "T_sim"')
    return h + """  Schematic {
    Location      [40, 40; 1600, 1000]
    ZoomFactor    0.8
    SliderPosition [0, 0]
    ShowBrowser   off
    BrowserWidth  100
"""


def main():
    build()
    text = header() + "".join(comps) + "".join(conns) + "  }\n}\n"
    out = HERE / f"{NAME}.plecs"
    out.write_bytes(text.replace("\n", "\r\n").encode("utf-8"))
    print(out, len(comps), "components,", len(conns), "connections")


if __name__ == "__main__":
    main()
