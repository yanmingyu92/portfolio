"""One-off figure for the Parabilis IPO deep-dive (ipo-parabilis-2026):
how the record June 2026 deal was built, step by step, in shares sold.
Data transcribed from SEC filings (S-1/A Jun 4, S-1/A Jun 9, FWP Jun 9,
Q2 2026 10-Q for greenshoe exercise; 424B4 for the Regeneron placement).
Not DB-driven — one-shot analysis figure.
"""
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

INK, INK_SOFT, INK_MUTE = "#1c1917", "#44403c", "#78716c"
PAPER, LINE = "#fbfaf8", "#e7e5e4"
TEAL, TEAL_SOFT = "#0f766e", "#99e3d5"

# (label, shares M, note, is_regeneron)
STEPS = [
    ("Marketed (S-1/A, Jun 4)\n$17–19 range", 25.0, "", False),
    ("Upsized S-1/A (Jun 9 am)\n$17–19 range", 33.333, "", False),
    ("Priced (Jun 9 pm)\n33.5M @ $20.00", 33.5, "$670M gross", False),
    ("Greenshoe exercised in full\n38.525M @ $20.00", 38.525, "$770.5M gross", False),
    ("Regeneron placement (separate)\n4.167M @ $18.00", 4.167, "$75M · not in IPO headline", True),
]

fig = plt.figure(figsize=(7.5, 5.0))  # 1200x800 @160dpi
fig.patch.set_facecolor(PAPER)
ax = fig.add_axes([0.315, 0.10, 0.455, 0.70])
ax.set_facecolor(PAPER)

labels = [s[0] for s in STEPS]
shares = [s[1] for s in STEPS]
ypos = list(range(len(STEPS)))[::-1]

# IPO steps as cumulative bars; Regeneron as a standalone bar
for y, s in zip(ypos, STEPS):
    color = TEAL_SOFT if s[3] else TEAL
    ax.barh(y, s[1], color=color, height=0.62)
    note = f"{s[1]:,.1f}M sh" + (f"  ·  {s[2]}" if s[2] else "")
    ax.text(s[1] + 0.7, y, note, va="center", fontsize=8.5, color=INK_SOFT)

ax.set_yticks(ypos, labels)
ax.set_xlim(0, 56)
ax.set_xticks([])
for s in ("top", "right", "bottom"):
    ax.spines[s].set_visible(False)
ax.spines["left"].set_color(LINE)
ax.tick_params(axis="y", labelsize=8.5, colors=INK, length=0)
ax.grid(False)

fig.text(0.03, 0.965, "The record deal was built in three steps —",
         fontsize=13, fontweight="bold", color=INK, ha="left", va="top")
fig.text(0.03, 0.928, "and the strategic check is not in the headline",
         fontsize=13, fontweight="bold", color=INK, ha="left", va="top")
fig.text(0.03, 0.892, "Parabilis (PBLS) shares sold in June 2026, millions · IPO in teal, Regeneron concurrent placement in light teal",
         fontsize=9.5, color=INK_MUTE, ha="left", va="top")
fig.text(0.03, 0.018, "Source: Parabilis S-1/A (Jun 4 and Jun 9, 2026), pricing FWP (Jun 9), Q2 2026 10-Q (greenshoe), 424B4 (Regeneron placement) — SEC EDGAR.",
         fontsize=7.5, color=INK_MUTE, ha="left", va="bottom")
fig.text(0.97, 0.052, "Pharma Daily · jaimeyan.com", fontsize=7.5, color=TEAL,
         ha="right", va="bottom", fontweight="bold")

out = "public/figures/ipo-parabilis-2026-deal-build.png"
fig.savefig(out, dpi=160)
print("wrote", out)
