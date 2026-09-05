---
title: "The New Biotech IPO Class: Bigger, Later-Stage, and Judged Harder"
date: 2026-09-04
description: "21 US biotech IPOs raised ~$6.5B in 2026 through Aug 11 — median check $295M, 18 of 21 above offer as of Aug 28. What the class tells practitioners."
tags: ["biotech", "ipo", "capital-markets"]
kind: deep-dive
canonicalPath: /blog/biotech-ipo-class-2025-2026.html
videoId: NDmoCC39zoM
paperRef: automation-scoping-review
audioPath: /audio/biotech-ipo-class-2025-2026.mp3
---

Twenty-one US biotech IPOs have priced in 2026 through August 11, raising roughly $6.5 billion in gross proceeds — more than four times the $1.6 billion that nine biopharma IPOs raised in all of 2025. As of the August 28 close, 18 of the 21 trade above their offer price.

> **TL;DR** — The 2025–2026 IPO class is smaller in count and far larger in check size than anything since 2021: median 2026 raise is $295M, 14 of 21 deals (67%) raised $250M or more, and two offerings (Kailera $625M, Parabilis $670M) broke the all-time biotech IPO record in the same quarter. The aftermarket rewards late-stage, single-asset stories (Veradermics +476% from offer) and punishes platform narratives (Eikon −39%) — all performance figures as of the August 28, 2026 close unless noted; prices move daily. One caveat: 2026 class data come from an aggregator tracker cross-checked against filings and company releases, not from our own EDGAR pipeline.

## The class, in two tables

2025 was the trough. Ropes & Gray counts nine biopharma IPOs raising $1.6B — the lowest annual IPO capital in five years — against 19 IPOs and $3.8B in 2024. PitchBook's broader count puts 15 US-based biopharma IPOs in 2025, versus 75 in 2020 and 103 in 2021. The notable 2025 names:

| Company | Ticker | Priced | Gross raise | Status / performance |
|---|---|---|---|---|
| Metsera | MTSR | Feb 3, 2025 | $316M (incl. greenshoe) | Acquired by Pfizer, closed Nov 13, 2025: $65.60 cash + up to $20.65 CVR per share — 3.6x the $18 offer in cash |
| Sionna Therapeutics | SION | Feb 6, 2025 | $191M (upsized) | Phase 2a failure of SION-719 on Aug 10, 2026; shares fell ~92% that day; $6.76 as of Sep 3, 2026 (−62% vs $18 offer) |
| LB Pharmaceuticals | LBRX | Sep 10, 2025 | $285M | Broke a 7-month drought of $50M+ biotech IPOs; current vs-offer not reliably tracked here |
| MapLight Therapeutics | MPLT | Oct 26, 2025 | $251M (+ placement to ~$296M) | −24% vs $17 offer as of Apr 2026 snapshot |
| Evommune | EVMN | Nov 6, 2025 | $172.5M (incl. greenshoe) | −18.6% vs $16 offer as of Apr 2026 snapshot |

*Table 1: The 2025 cohort — five names we could source to filings or company releases. Two of five sat below water by mid-2026, one exited via M&A at 3.6x, one lost nine-tenths of its value in a single session.*

The 2026 class, all 21 priced deals through August 11, sorted by date:

| Company | Ticker | Priced | Gross raise | 1-day | vs offer (Aug 28) |
|---|---|---|---|---|---|
| Aktis Oncology | AKTS | Jan 8, 2026 | $318M | +24.4% | +43.2% |
| Veradermics | MANE | Feb 3, 2026 | $295M (incl. greenshoe) | +122.1% | +476.1% |
| Eikon Therapeutics | — | Feb 4, 2026 | $381M | −16.7% | −39.0% |
| SpyGlass Pharma | SGP | Feb 5, 2026 | $172.5M | +65.0% | +65.1% |
| Agomab Therapeutics | — | Feb 5, 2026 | $200M | −8.4% | −17.7% |
| Generate Biomedicines | GBIO | Feb 26, 2026 | $400M | −21.0% | −4.2% |
| Kailera Therapeutics | KLRA | Apr 16, 2026 | $625M (upsized from $500M) | +62.5% | +1.3% |
| Alamar Biosciences | — | Apr 16, 2026 | $220M | +33.0% | +80.7% |
| Avalyn Pharma | — | Apr 29, 2026 | $345M | +63.8% | +92.7% |
| Hemab Therapeutics | COAG | Apr 30, 2026 | $347M | +88.9% | +149.1% |
| Seaport Therapeutics | — | Apr 30, 2026 | $255M | +10.2% | +33.6% |
| Odyssey Therapeutics | ODTX | May 7, 2026 | $279M (+ $25M placement) | −8.8% | +35.3% |
| Parabilis Medicines | PBLS | Jun 9, 2026 | $670M (upsized twice; $771M as-exercised) | +58.0% | +95.6% |
| Kardigan | — | Jun 18, 2026 | $400M | +37.5% | +25.1% |
| Scribe Therapeutics | — | Jul 24, 2026 | $129M | +44.3% | +89.6% |
| Apnimed | — | Jul 30, 2026 | $192M | +56.3% | +85.7% |
| Braveheart Bio | — | Aug 5, 2026 | $382.5M | +66.0% | +52.4% |
| Latigo Biotherapeutics | — | Aug 6, 2026 | $345.6M | +1.0% | +34.6% |
| BlossomHill Therapeutics | — | Aug 6, 2026 | $150M | 0.0% | +22.3% |
| Vogenx | — | Aug 11, 2026 | $81.3M | 0.0% | +161.2% |

*Table 2: The 2026 class. Raise and return figures per the BioBucks tracker (methodology: gross proceeds incl. exercised greenshoe; returns marked to the Aug 28, 2026 close), cross-checked against company releases and SEC filings where linked in Sources. "—" means we did not verify the ticker from a first-hand source.*

The computed shape of the class:

```python
raises = [81.3, 128.7, 150.0, 172.5, 192.0, 200.0, 219.9, 254.9,
          279.0, 289.0, 294.8, 345.0, 345.6, 346.7, 365.4, 381.0,
          382.5, 400.0, 400.0, 625.0, 670.0]  # $M gross, 21 deals, as of 2026-08-30
import statistics
statistics.median(raises)                      # 294.8
sum(raises)                                    # 6523.3 (~$6.5B)
sum(r >= 250 for r in raises)                  # 14 of 21 at $250M+
```

*Listing 1: Reproducible arithmetic behind the headline stats. Median $295M; mean $311M; two-thirds of the class at $250M or above.*

![2026 biotech IPO class: gross raise and return vs offer for all 21 deals](/figures/biotech-ipo-class-2025-2026-raises.png)

*Figure 1: Fewer, bigger, later — gross raise by pricing date, colored by above/below offer as of the Aug 28 close. The three red bars (Eikon, Agomab, Generate) are all platform stories.*

## Pattern 1 — What got funded: late-stage assets, not platforms

Almost all of the 13 companies that had priced by mid-June held drugs in Phase 2 or later, per BioPharma Dive's BIO-convention reporting. The full 21-name table holds that line: Phase 3 or Phase 3-ready assets at Kailera, Veradermics, SpyGlass, Hemab, Braveheart, Latigo, Apnimed; Phase 2 readouts near term at Parabilis, Odyssey, Seaport, Kardigan.

Therapeutic mix: obesity (Kailera), oncology across radiopharma and peptides (Aktis, Parabilis, Eikon, BlossomHill), cardiovascular (Kardigan, Braveheart, Scribe), immunology (Odyssey, Attovia, Agomab, Generate), neuropsychiatry (Seaport, plus 2025's LB Pharmaceuticals and MapLight). Immunology IPO proceeds in 2026 reached $879M by early May, against $174M for all of 2025, per BioPharma Dive.

Origin matters too. Two of the largest 2026 deals rest on molecules in-licensed from Hengrui: Kailera's GLP-1/GIP dual agonist ribupatide and Braveheart's cardiac myosin inhibitor BHB-1893. That is the IPO-market expression of the same China-asset flow we track in the [daily brief](/blog/pharma-daily-2026-09-04.html) — one-third of 2025 licensing and collaboration capital went to Chinese companies, per Stifel via Ropes & Gray.

## Pattern 2 — Check sizes reset the record book, twice

Kailera's $625M in April and Parabilis's $670M in June each passed the previous record for a biotech IPO — Moderna's 2018 offering, per BioPharma Dive — within three months of each other. Upsizing was routine: Aktis went from an 11.8M-share plan to 17.65M shares at the top of range; Kailera upsized from a $500M target; Veradermics, Odyssey, and Parabilis (twice) all grew their deals at pricing. Anchors absorbed real chunks: Eli Lilly took roughly $100M of Aktis's $318M, and Regeneron added a $75M concurrent placement to Parabilis at a 10% discount to the IPO price.

The historical frame: 103 US biopharma IPOs priced in 2021 (PitchBook). 2026 will not match that count, but the median 2026 check of $295M is a different product from the 2021 class, which J.P. Morgan's Michael Cembalest summarized this way in August 2025: 80% of biotech IPOs since 2018 had "imploded." Fewer, bigger, later — that is the structural break.

## Pattern 3 — The aftermarket verdict is bifurcated, not benign

Eighteen of 21 above water sounds like a bull market. The composition says otherwise. All three below-issue names as of August 28 — Eikon (−39%), Agomab (−18%), Generate (−4%) — are platform or multi-asset stories. J.P. Morgan's Wonhee Oh, a bookrunner on Kardigan, told BioPharma Dive that drugmakers learned they are "not in an environment that entertains the promise of a platform." The tape agrees: the week's selling in late August landed on the platform and preclinical cohort, per the BioBucks tracker.

First-day pops also proved fragile. Kailera closed +62.5% on debut and has since round-tripped to +1.3%. And the 2025 class carries the two extreme outcomes: Metsera returned 3.6x its offer in cash inside nine months via the Pfizer–Novo Nordisk bidding war, while Sionna lost ~92% in one session on a Phase 2a miss — a $18-to-$6.76 path that no syndicate structure protects against. Single-asset binary risk cuts in both directions.

## Pattern 4 — What got pulled, paused, or delayed

Odyssey Therapeutics pulled its first IPO attempt in June 2025 as the tariff-driven bear market bottomed the XBI in April; it re-priced in May 2026 at the top of its range. Between Metsera/Sionna in February 2025 and LB Pharmaceuticals on September 10, 2025, no biotech IPO above $50M priced — a seven-month shutdown. And the window is paused again right now: as of August 30, four weeks had passed without a pricing, the longest shut stretch since February, with Vogenx's non-upsized $81.3M on August 11 the last deal through. Pending names include Tarsier Pharma (~$45M) and the Oak Hill Bio SPAC (~$175M).

## One Take

This is not 2021 again, and I do not think it becomes 2021: the capital-concentration pattern — median checks near $300M pointed at Phase 2+ assets, with platform narratives actively punished in the aftermarket — is self-reinforcing because M&A is recycling capital back to the crossover funds that anchor these deals, and Pfizer paying 3.6x for a nine-month-old IPO validates the entire pipeline of IPO-to-acquisition returns. Conviction: moderate. Three things would change my mind: Kailera closing below issue (it sat at +1.3% on August 28 — the marginal name and the canary), a Q4 failure to price the pending backlog at scale (watch Tarsier and the next $300M-plus filer), or two or more Sionna-style binary failures in the 2026 class before year-end. If the record-size deals hold above water and the backlog prices, the window extends into 2027; if the big names leak, 2026 gets remembered as the year the window opened just wide enough for the best-prepared companies to leave through it.

## Key takeaways

- 21 US biotech IPOs raised ~$6.5B through August 11, 2026 — a median check of $295M, with 14 of 21 deals (67%) at $250M or more, against nine biopharma IPOs and $1.6B for all of 2025.
- 18 of 21 2026 IPOs traded above offer as of the August 28 close — but all three below-issue names are platform stories, and first-day pops (Kailera +62.5% → +1.3%) did not stick.
- Kailera ($625M, April) and Parabilis ($670M, June) both broke the biotech IPO record in one quarter; upsizing at pricing was the norm, not the exception.
- The 2025 class already contains both tails: Metsera exited at 3.6x its offer in cash in nine months; Sionna fell ~92% in one day on a Phase 2a miss.
- The primary window has been shut since August 11 — four weeks without a pricing as of August 30, the longest pause since February.

## FAQ

### Is the biotech IPO window open right now?

Open but paused. The last pricing was Vogenx on August 11, and as of August 30 the window had been shut for four weeks — the longest gap since February. Nasdaq's new-listings head predicted roughly a dozen biotech IPOs in Q3; eleven priced in July–August before the pause.

### What stage does a biotech need to go public in this market?

Phase 2 or later with human data, on the evidence of this class: nearly every 2026 debut held a Phase 2+ asset, and the three names trading below offer are the platform stories. A Phase 1 company can still price — Scribe did, at $129M, and trades +90% — but it is the exception, and it priced at roughly one-third of the class median.

### How does the 2026 class compare with 2021?

Narrower and bigger. 2021 produced 103 US biopharma IPOs; 2026 has 21 through August 11. The median 2026 raise of $295M buys a company through multiple readouts, which is precisely what the 2021 class's small checks failed to do — the cited failure mode being that subscale raises never produced "an investable data point."

## Sources

First-hand (filings and company releases):

- [Kailera Therapeutics S-1/A (price range $14–16)](https://www.sec.gov/Archives/edgar/data/2096997/000119312526151904/d113532ds1a.htm) — SEC EDGAR
- [Kailera Reports First Quarter 2026 Financial Results (KLRA trading began April 17, 2026)](https://investors.kailera.com/news-releases/news-releases-details/kailera-reports-first-quarter-2026-financial-results-and) — Kailera Therapeutics
- [Parabilis Medicines S-1/A (25M shares at $17–19)](https://www.sec.gov/Archives/edgar/data/1657677/000119312526256398/ck0001657677-20260604.htm) — SEC EDGAR
- [Odyssey Therapeutics S-1/A (range $16–18)](https://www.sec.gov/Archives/edgar/data/1882782/000119312526202398/odtx-20260504.htm) — SEC EDGAR
- [Odyssey Therapeutics Announces Pricing of Upsized IPO](https://www.nasdaq.com/press-release/odyssey-therapeutics-announces-pricing-upsized-initial-public-offering-2026-05-08) — Nasdaq / GlobeNewswire
- [Aktis Oncology Announces Pricing of its Upsized IPO (17.65M shares at $18)](https://investors.aktisoncology.com/news-releases/news-release-details/aktis-oncology-announces-pricing-its-upsized-initial-public/) — Aktis Oncology
- [Veradermics Announces Pricing of Upsized IPO (NYSE: MANE)](https://ir.veradermics.com/news-releases/news-release-details/veradermics-announces-pricing-upsized-initial-public-offering) — Veradermics
- [Sionna Therapeutics Prices Upsized IPO](https://investors.sionnatx.com/news-releases/news-release-details/sionna-therapeutics-prices-upsized-initial-public-offering/) — Sionna Therapeutics
- [Evommune Q3 2025 results (IPO: 10,781,250 shares at $16, $172.5M gross)](https://www.businesswire.com/news/home/20251211387121/en/Evommune-Reports-Third-Quarter-2025-Financial-Results-and-Provides-Business-Update) — Business Wire
- [MapLight Therapeutics free writing prospectus (pricing, Oct 26, 2025)](https://www.sec.gov/Archives/edgar/data/1770069/000119312525250609/d33606dfwp.htm) — SEC EDGAR

Analysis and aftermarket context:

- [From Volatility to Vitality: How 2025 Reset the Life Sciences Market](https://www.ropesgray.com/en/insights/alerts/2026/03/from-volatility-to-vitality-how-2025-reset-the-life-sciences-market-and-whats-next-for-2026) — Ropes & Gray, 2026-03-12
- [After two record-setting biotech IPOs, public markets are back](https://www.fiercebiotech.com/biotech/after-two-record-setting-biotech-ipos-public-markets-are-back) — Fierce Biotech, 2026-06-12
- [At BIO, investors take stock of a growing class of biotech IPOs](https://www.biopharmadive.com/news/bio-2026-ipo-biotech-performance-predictions/823474/) — BioPharma Dive, 2026-06-23
- [Biotech IPO Tracker 2026: 21 IPOs, ~$6.5B raised](https://www.biobucks.co/biotech-ipo-tracker-2026) — BioBucks, refreshed 2026-08-30 (returns as of Aug 28 close)
- [Odyssey, on second try, snags $279M in an IPO](https://www.biopharmadive.com/news/odyssey-ipo-price-biotech-gary-glick-immune-drugs/819465/) — BioPharma Dive, 2026-05-07
- [Aktis raises $318M in 2026's first biotech IPO](https://www.biopharmadive.com/news/aktis-biotech-ipo-radiopharmaceutical-cancer/809066/) — BioPharma Dive, 2026-01-08
- [Kailera completes $625 million IPO (first-day +62.5%)](https://www.theaic.co.uk/companydata/rtw-biotech-opportunities/announcements/9526992) — RTW Biotech Opportunities, 2026-04-20
- [Pfizer finalizes Metsera buy after contentious bidding war](https://www.fiercebiotech.com/biotech/pfizer-finalizes-metsera-buy-after-contentious-bidding-war-novo-nordisk) — Fierce Biotech, 2025-11-13
- [Odyssey bails on public listing as US IPO landscape stutters](https://www.pharmaceutical-technology.com/news/odyssey-bails-on-public-listing-as-us-ipo-landscape-stutters/) — Pharmaceutical Technology, 2025-06-10
- [Sionna stock on track for worst day ever after 90% drop](https://finance.yahoo.com/healthcare/articles/sion-stock-track-worst-day-171837113.html) — Benzinga via Yahoo Finance, 2026-08-10
- [Sionna Therapeutics (SION) quote, $6.76](https://www.morningstar.com/stocks/xnas/sion/quote) — Morningstar, as of 2026-09-03
- [Life Sciences Capital Markets: Preparing for Your 2026 IPO](https://www.goodwinlaw.com/en/insights/publications/2026/01/insights-lifesciences-cm-preparing-for-your-2026-ipo) — Goodwin, 2026-01-13
- [Sick as a Dog (Eye on the Market)](https://am.jpmorgan.com/content/dam/jpm-am-aem/global/en/insights/eye-on-the-market/healthcare-sick-as-a-dog-amv.pdf) — J.P. Morgan Asset Management, 2025-08-12
- [Cancer R&D Partnerships, M&A, Venture Funding and IPO Activity — Q2 2026 Review](https://dealforma.com/cancer-rd-partnerships-ma-venture-funding-and-ipo-activity-q2-2026-review/) — Dealforma, 2026-09-03
- [Biopharma Therapeutics and Platforms IPO Activity — Q1 2025 Review](https://dealforma.com/biopharma-therapeutics-and-platforms-ipo-activity-q1-2025-review/) — Dealforma, 2025-05-29
- [Soaring Veradermics IPO shows investor interest in hair-loss companies](https://news.crunchbase.com/public/veradermics-shares-soar-in-ipo/) — Crunchbase News, 2026-02-04

Provenance: collected 2026-09-04 via web retrieval against the sources above. LB Pharmaceuticals' current-vs-offer level is not reliably tracked here; the 2026 class table leans on one aggregator (BioBucks), cross-checked against filings and releases for the named record deals. Performance figures are marked to 2026-08-28 (2026 class) or 2026-09-03 (Sionna) and will move with the market.
