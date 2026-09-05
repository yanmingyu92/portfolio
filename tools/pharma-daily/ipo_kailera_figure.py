"""One-off figure for the Kailera IPO deep-dive (ipo-kailera-2026):
KLRA daily close vs the $16 offer, Apr 17 - Jul 2, 2026, with the
Sep 4 close marked separately (the market-data feed used for the series
has a coverage gap Jul 3 - Sep 3; the gap is drawn dashed, not hidden).
Series: tools/pharma-daily/out/klra_pbls_prices.csv (stock_finance_data).
Not DB-driven — one-shot analysis figure.
"""
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.dates as mdates
import matplotlib.pyplot as plt

INK, INK_SOFT, INK_MUTE = "#1c1917", "#44403c", "#78716c"
PAPER, LINE = "#fbfaf8", "#e7e5e4"
TEAL, RED = "#0f766e", "#b91c1c"

OFFER = 16.00
SEP4_CLOSE, SEP4_DATE = 16.23, "2026-09-04"

csv = Path(__file__).parent / "out" / "klra_pbls_prices.csv"
import csv as _csv
import datetime as dt

dates, closes = [], []
with open(csv) as f:
    for row in _csv.DictReader(f):
        if row["thscode"] != "KLRA.O":
            continue
        dates.append(dt.datetime.strptime(row["time"], "%Y%m%d").date())
        closes.append(float(row["close"]))

sep4 = dt.date.fromisoformat(SEP4_DATE)

fig = plt.figure(figsize=(7.5, 5.0))  # 1200x800 @160dpi
fig.patch.set_facecolor(PAPER)
ax = fig.add_axes([0.065, 0.11, 0.865, 0.68])
ax.set_facecolor(PAPER)

ax.plot(dates, closes, color=TEAL, lw=1.8, solid_capstyle="round")
# dashed bridge across the feed gap to the Sep 4 close
ax.plot([dates[-1], sep4], [closes[-1], SEP4_CLOSE], color=TEAL, lw=1.4,
        ls=(0, (4, 3)), alpha=0.6)
ax.plot([sep4], [SEP4_CLOSE], marker="o", ms=5, color=TEAL)
ax.annotate(f"Sep 4: \\${SEP4_CLOSE:.2f}  ({SEP4_CLOSE / OFFER - 1:+.1%} vs offer)",
            xy=(sep4, SEP4_CLOSE), xytext=(-8, -26), textcoords="offset points",
            fontsize=8.5, color=INK_SOFT, ha="right")

ax.axhline(OFFER, color=RED, lw=1.0, ls=(0, (5, 3)))
ax.text(dates[2], OFFER + 0.35, "\\$16.00 offer", fontsize=8.5, color=RED)

ax.annotate(f"Debut close \\${closes[0]:.2f}  ({closes[0] / OFFER - 1:+.1%})",
            xy=(dates[0], closes[0]), xytext=(10, -4), textcoords="offset points",
            fontsize=8.5, color=INK_SOFT, ha="left")

ax.set_ylim(13, 29)
ax.set_xlim(dates[0] - dt.timedelta(days=3), sep4 + dt.timedelta(days=4))
ax.xaxis.set_major_locator(mdates.MonthLocator())
ax.xaxis.set_major_formatter(mdates.DateFormatter("%b"))
ax.tick_params(labelsize=8.5, colors=INK_MUTE, length=0)
for s in ("top", "right"):
    ax.spines[s].set_visible(False)
for s in ("left", "bottom"):
    ax.spines[s].set_color(LINE)
ax.grid(axis="y", color=LINE, lw=0.6)
ax.set_axisbelow(True)

fig.text(0.03, 0.965, "The $625M pop that gave it all back:",
         fontsize=13, fontweight="bold", color=INK, ha="left", va="top")
fig.text(0.03, 0.928, "KLRA's debut gain was gone in under five months",
         fontsize=13, fontweight="bold", color=INK, ha="left", va="top")
fig.text(0.03, 0.892, "KLRA daily close, Apr 17 – Jul 2, 2026, vs the 16.00 offer · Sep 4 close marked (dashed = feed coverage gap)",
         fontsize=9.5, color=INK_MUTE, ha="left", va="top")
fig.text(0.03, 0.018, "Source: stock_finance_data daily bars (Apr 17 – Jul 2) and Sep 4 close; offer per Kailera pricing release (Apr 16, 2026).",
         fontsize=7.5, color=INK_MUTE, ha="left", va="bottom")
fig.text(0.97, 0.052, "Pharma Daily · jaimeyan.com", fontsize=7.5, color=TEAL,
         ha="right", va="bottom", fontweight="bold")

out = "public/figures/ipo-kailera-2026-roundtrip.png"
fig.savefig(out, dpi=160)
print("wrote", out)
