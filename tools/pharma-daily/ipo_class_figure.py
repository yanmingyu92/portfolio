"""One-off figure for the biotech IPO class deep-dive:
2026 class gross raises, chronological, colored by above/below offer.
Data transcribed from the article's Table 2 (BioBucks tracker values,
returns marked to 2026-08-28 close). Not DB-driven — one-shot analysis figure.
"""
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

INK, INK_SOFT, INK_MUTE = "#1c1917", "#44403c", "#78716c"
PAPER, LINE = "#fbfaf8", "#e7e5e4"
TEAL, RED = "#0f766e", "#b91c1c"
TEAL_SOFT, RED_SOFT = "#99e3d5", "#fca5a5"

# (name, priced, gross $M, vs offer %, above?)
ROWS = [
    ("Aktis Oncology", "Jan 8", 318, 43.2, True),
    ("Veradermics", "Feb 3", 295, 476.1, True),
    ("Eikon", "Feb 4", 381, -39.0, False),
    ("SpyGlass", "Feb 5", 172.5, 65.1, True),
    ("Agomab", "Feb 5", 200, -17.7, False),
    ("Generate Bio.", "Feb 26", 400, -4.2, False),
    ("Kailera", "Apr 16", 625, 1.3, True),
    ("Alamar", "Apr 16", 220, 80.7, True),
    ("Avalyn", "Apr 29", 345, 92.7, True),
    ("Hemab", "Apr 30", 347, 149.1, True),
    ("Seaport", "Apr 30", 255, 33.6, True),
    ("Odyssey", "May 7", 279, 35.3, True),
    ("Parabilis", "Jun 9", 670, 95.6, True),
    ("Kardigan", "Jun 18", 400, 25.1, True),
    ("Scribe", "Jul 24", 129, 89.6, True),
    ("Apnimed", "Jul 30", 192, 85.7, True),
    ("Braveheart Bio", "Aug 5", 382.5, 52.4, True),
    ("Latigo", "Aug 6", 345.6, 34.6, True),
    ("BlossomHill", "Aug 6", 150, 22.3, True),
    ("Vogenx", "Aug 11", 81.3, 161.2, True),
]

fig = plt.figure(figsize=(7.5, 5.0))  # 1200x800 @160dpi
fig.patch.set_facecolor(PAPER)
ax = fig.add_axes([0.245, 0.09, 0.645, 0.72])
ax.set_facecolor(PAPER)

names = [r[0] for r in ROWS]
raises = [r[2] for r in ROWS]
colors = [TEAL if r[4] else RED for r in ROWS]
ypos = list(range(len(ROWS)))[::-1]  # chronological top to bottom

ax.barh(ypos, raises, color=colors, height=0.62)
for y, r in zip(ypos, ROWS):
    ax.text(r[2] + 8, y, f"${r[2]:,.0f}M · {r[3]:+.0f}%", va="center",
            fontsize=8.5, color=INK_SOFT)
ax.set_yticks(ypos, [f"{r[0]}  ({r[1]})" for r in ROWS])
ax.set_xlim(0, 760)
ax.set_xticks([])
for s in ("top", "right", "bottom"):
    ax.spines[s].set_visible(False)
ax.spines["left"].set_color(LINE)
ax.tick_params(axis="y", labelsize=8.5, colors=INK, length=0)
ax.grid(False)

fig.text(0.03, 0.97, "Fewer, bigger, later: the 2026 biotech IPO class —",
         fontsize=13, fontweight="bold", color=INK, ha="left", va="top")
fig.text(0.03, 0.932, "and the only losers are platform stories",
         fontsize=13, fontweight="bold", color=INK, ha="left", va="top")
fig.text(0.03, 0.895, "21 US biotech IPOs through Aug 11, 2026 · gross raise ($M) · return vs offer marked to the Aug 28 close",
         fontsize=9.5, color=INK_MUTE, ha="left", va="top")
fig.text(0.03, 0.018, "Source: BioBucks IPO Tracker 2026, cross-checked vs filings (see article Sources).",
         fontsize=7.5, color=INK_MUTE, ha="left", va="bottom")
fig.text(0.97, 0.052, "Pharma Daily · jaimeyan.com", fontsize=7.5, color=TEAL,
         ha="right", va="bottom", fontweight="bold")

out = "public/figures/biotech-ipo-class-2025-2026-raises.png"
fig.savefig(out, dpi=160)
print("wrote", out)
