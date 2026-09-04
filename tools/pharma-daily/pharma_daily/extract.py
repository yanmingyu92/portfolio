"""Heuristic structuring of raw items into deals. No LLM, no paid APIs.

Field-mining rules (ticker, parties, therapeutic area, modality, phase,
target) are deliberately conservative regex/keyword maps: they fire only on
explicit phrasing and leave the field NULL otherwise — honesty over guessing.
"""
from __future__ import annotations

import logging
import re

log = logging.getLogger(__name__)

AMOUNT_RE = re.compile(r"\$\s*(\d+(?:\.\d+)?)\s*(billion|million|bn|mn|b|m)\b", re.I)

DEAL_TYPE_RULES = [
    ("acquisition", re.compile(r"\b(acquir|merger|takeover|to be bought|tender offer)\b", re.I)),
    ("license", re.compile(r"\blicen[cs]e\b", re.I)),
    ("collaboration", re.compile(r"\b(collaborat|partner(ship|ed)?|co-develop|alliance|option agreement)\b", re.I)),
    ("approval", re.compile(r"\b(approv|clearance|pdufa|marketing authorisation|marketing authorization)\b", re.I)),
    ("clinical-readout", re.compile(
        r"\b(topline|top-line|primary endpoint|phase\s*[23].{0,40}(results?|data|readout)|"
        r"readout|met its|fails? to meet)\b", re.I)),
    ("financing", re.compile(r"\b(public offering|private placement|pipe|raises? \$|series [a-e])\b", re.I)),
]

UPFRONT_RE = re.compile(r"\bupfront\b", re.I)
TOTAL_RE = re.compile(r"\b(up to|total|potentially|milestones?|contingent)\b", re.I)

# --- ticker: explicit "(NASDAQ: ABCD)" style mentions only ---
TICKER_RE = re.compile(
    r"\((?:NASDAQ|Nasdaq|NasdaqCM|NasdaqGS|NasdaqGM|NYSE|NYSE American|TSX)"
    r"[:\s]+([A-Z]{1,6})(?:\s|;|\)|,)"
)
TICKER_RE2 = re.compile(r"\b(?:NASDAQ|Nasdaq|NYSE)[:\s]+([A-Z]{2,5})\b")
TICKER_STOPWORDS = {"THE", "AND", "FOR", "FDA", "CEO", "CFO", "IPO", "USA", "INC", "LTD"}

# --- parties: only unambiguous grant/license phrasing ---
_NAME = r"([A-Z][\w&.'-]*(?:\s+[A-Z][\w&.'-]*){0,4})"
GRANT_RE = re.compile(_NAME + r"\s+(?:has\s+)?grant(?:s|ed)?\s+" + _NAME + r"\s+(?:an?\s+)?(?:exclusive\s+|worldwide\s+)*licen[cs]e")
LICENSE_FROM_RE = re.compile(_NAME + r"\s+(?:has\s+)?licen[cs]e[sd]?\b[^.]{0,80}?\bfrom\s+" + _NAME)

# --- therapeutic area: first matching keyword group wins ---
THERAPEUTIC_AREAS = [
    ("oncology", r"\b(oncolog|cancer|tumou?r|carcinoma|leukemia|lymphoma|myeloma|melanoma|sarcoma)\b"),
    ("neurology", r"\b(neurolog|alzheimer|parkinson|epilep|multiple sclerosis|\bals\b|dementia|migraine)\b"),
    ("immunology", r"\b(immunolog|autoimmune|inflammat|rheumatoid|lupus|psoriasis|atopic dermatitis|ibd|crohn)\b"),
    ("metabolic", r"\b(diabet|obesity|obese|metabolic|nash|mash|thyroid)\b"),
    ("cardiology", r"\b(cardio|heart failure|hypertension|atherosclero|arrhythmia)\b"),
    ("infectious disease", r"\b(infecti|viral|virus|bacteri|antibiotic|antiviral|hiv|hepatitis|rsv|influenza|covid)\b"),
    ("rare disease", r"\b(rare disease|orphan)\b"),
    ("hematology", r"\b(hematolog|haematolog|anemia|anaemia|hemophilia|sickle cell|blood disorder)\b"),
    ("ophthalmology", r"\b(ophthalm|retina|ocular|glaucoma|macular)\b"),
    ("respiratory", r"\b(respirator|asthma|copd|pulmonary|lung)\b"),
    ("dermatology", r"\b(dermatolog|skin)\b"),
    ("psychiatry", r"\b(psychiatr|depress|schizophren|anxiety|bipolar)\b"),
    ("vaccines", r"\bvaccin"),
]
_TA_RES = [(name, re.compile(pat, re.I)) for name, pat in THERAPEUTIC_AREAS]

# --- modality ---
MODALITIES = [
    ("ADC", r"\b(antibody[- ]drug conjugate|\badc\b)"),
    ("bispecific antibody", r"\bbispecific\b"),
    ("monoclonal antibody", r"\b(monoclonal antibody|\bmab\b|antibody\b)"),
    ("cell therapy", r"\b(cell therapy|car[- ]?t\b|tcr[- ]t|nk cell)"),
    ("gene therapy", r"\b(gene therapy|gene editing|crispr|aav\b)"),
    ("RNA therapeutic", r"\b(sirna|mrna|antisense|\baso\b|oligonucleotide|rna therap|rna interfer)"),
    ("radiopharmaceutical", r"\bradiopharma|radioligand|radioisotope"),
    ("vaccine", r"\bvaccin"),
    ("peptide", r"\bpeptide\b"),
    ("protein/enzyme", r"\b(fusion protein|enzyme|recombinant protein)\b"),
    ("small molecule", r"\bsmall molecule"),
]
_MODALITY_RES = [(name, re.compile(pat, re.I)) for name, pat in MODALITIES]

PHASE_RE = re.compile(r"\bphase\s*(1/2|2/3|1a|1b|2a|2b|1|2|3|i{1,3})\b", re.I)
_ROMAN = {"i": "1", "ii": "2", "iii": "3"}

# --- target: gene-like tokens after an explicit targeting verb ---
TARGET_RE = re.compile(
    r"\b(?:targeting|targets?|directed against|against|inhibits?|blocking|blocks?)\s+"
    r"([A-Z][A-Za-z0-9]{1,15}(?:-[A-Za-z0-9]{1,8})?(?:\s*/\s*[A-Z][A-Za-z0-9-]{1,15})?)"
)
_TARGET_STOPWORDS = {
    "Solid", "Advanced", "Metastatic", "Patients", "The", "This", "Tumors",
    "Tumours", "Cancer", "Rare", "Both", "Multiple", "Human", "New", "Novel",
}


def _usd(value: float, unit: str) -> float:
    return value * (1e9 if unit.lower() in ("billion", "bn", "b") else 1e6)


def classify(text: str) -> str:
    for name, rule in DEAL_TYPE_RULES:
        if rule.search(text):
            return name
    return "other"


def parse_amounts(text: str) -> dict:
    """Extract dollar amounts with upfront/total context from free text."""
    upfront, total = None, None
    for sent in re.split(r"(?<=[.!?])\s+", text):
        amounts = [_usd(float(v), u) for v, u in AMOUNT_RE.findall(sent)]
        if not amounts:
            continue
        biggest = max(amounts)
        if UPFRONT_RE.search(sent) and upfront is None:
            upfront = biggest
        elif TOTAL_RE.search(sent):
            total = max(total or 0, biggest)
        elif total is None:
            total = biggest
    if total is not None and upfront is not None and upfront > total:
        upfront, total = total, upfront
    return {"upfront_usd": upfront, "total_usd": total}


def find_ticker(text: str) -> str | None:
    for m in TICKER_RE.finditer(text):
        t = m.group(1).upper()
        if t not in TICKER_STOPWORDS:
            return t
    m = TICKER_RE2.search(text)
    if m and m.group(1).upper() not in TICKER_STOPWORDS:
        return m.group(1).upper()
    return None


def find_parties(text: str) -> tuple[str | None, str | None]:
    """(licensor, licensee) from explicit grant phrasing, else (None, None)."""
    m = GRANT_RE.search(text)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    m = LICENSE_FROM_RE.search(text)
    if m:
        return m.group(2).strip(), m.group(1).strip()
    return None, None


def find_keyword(text: str, rules) -> str | None:
    for name, rx in rules:
        if rx.search(text):
            return name
    return None


def find_phase(text: str) -> str | None:
    m = PHASE_RE.search(text)
    if not m:
        return None
    p = m.group(1).lower()
    p = _ROMAN.get(p, p)
    return f"Phase {p.upper() if '/' in p else p.capitalize()}"


def find_target(text: str) -> str | None:
    for m in TARGET_RE.finditer(text):
        tok = m.group(1).strip()
        head = tok.split("/")[0].strip()
        if head in _TARGET_STOPWORDS:
            continue
        # gene-like: has a digit, a hyphen, or is all-caps (HER2, PD-1, EGFR)
        if any(c.isdigit() for c in tok) or "-" in tok or tok.isupper():
            return tok
    return None


def mine_fields(text: str) -> dict:
    """Best-effort structured fields; None when no explicit signal exists."""
    licensor, licensee = find_parties(text)
    return {
        "ticker": find_ticker(text),
        "licensor": licensor,
        "licensee": licensee,
        "therapeutic_area": find_keyword(text, _TA_RES),
        "modality": find_keyword(text, _MODALITY_RES),
        "phase": find_phase(text),
        "target": find_target(text),
    }


def _merge_amounts(primary: dict, fallback: dict) -> dict:
    """Fill still-None fields of `primary` from `fallback` (priority merge)."""
    return {k: primary[k] if primary[k] is not None else fallback[k] for k in primary}


def _content_words(title: str) -> set[str]:
    words = re.sub(r"[^a-z0-9 ]", " ", title.lower()).split()
    return {w for w in words if len(w) >= 5}


def dedupe_deals(deals: list[dict]) -> list[dict]:
    """Collapse cross-outlet duplicates: same date + same disclosed total +
    overlapping headline/URL vocabulary. Richest row (most non-null fields)
    wins. Works on both fresh extractions and DB period rows."""
    def richness(d: dict) -> int:
        return sum(v is not None and v != "" for v in d.values())

    ordered = sorted(deals, key=richness, reverse=True)
    kept: list[dict] = []
    for d in ordered:
        d_words = _content_words(f"{d.get('headline', '')} {d.get('source_url', '')}")
        dupe = False
        for k in kept:
            if d.get("date") != k.get("date"):
                continue
            dt_, dk = d.get("total_usd"), k.get("total_usd")
            if dt_ is None or dk is None or abs(dt_ - dk) > 1:
                continue
            if d_words & _content_words(f"{k.get('headline', '')} {k.get('source_url', '')}"):
                dupe = True
                break
        if not dupe:
            kept.append(d)
    if len(kept) < len(deals):
        log.info("dedupe: %d -> %d deals", len(deals), len(kept))
    return kept


def extract_deals(items: list[dict], filing_text=None) -> list[dict]:
    """Turn raw items into structured deal rows.

    `filing_text`: optional callable(url) -> str to pull filing bodies for
    amount and field extraction on sec-edgar items (kept optional so tests
    stay offline). The body is fetched at most once per item and mined for
    amounts, ticker, parties and target/phase hints.

    Amounts are mined with strict priority title > summary > body: the
    headline number is the deal's number, while later sentences often quote
    context figures (e.g. an acquirer's earlier $43B buyout).
    """
    deals = []
    for it in items:
        if it.get("source") == "openfda":
            continue  # approvals are their own category, not deals
        text = f"{it.get('title', '')} {it.get('summary', '')}"
        deal_type = classify(text)
        if it.get("source") == "sec-edgar":
            q = it.get("query", "")
            if "license" in q:
                deal_type = "license"
            elif "collaboration" in q:
                deal_type = "collaboration"
        body = ""
        if it.get("source") == "sec-edgar" and filing_text:
            body = filing_text(it["url"])
        amounts = parse_amounts(it.get("title", ""))
        if amounts["total_usd"] is None:
            amounts = _merge_amounts(amounts, parse_amounts(it.get("summary", "")))
        if body and amounts["total_usd"] is None:
            amounts = _merge_amounts(amounts, parse_amounts(body))
        if deal_type == "other" and amounts["total_usd"] is None:
            continue
        fields = mine_fields(f"{text} {body}")
        deals.append(
            {
                "date": it.get("date", ""),
                "companies": it.get("entity") or fields.get("licensee") or fields.get("licensor") or "",
                "deal_type": deal_type,
                "upfront_usd": amounts["upfront_usd"],
                "total_usd": amounts["total_usd"],
                "headline": it.get("title", ""),
                "source_url": it.get("url", ""),
                "source": it.get("source", ""),
                **fields,
            }
        )
    log.info("extracted %d deals from %d items", len(deals), len(items))
    return dedupe_deals(deals)


def categorize_item(item: dict) -> str:
    if item.get("source") == "ctgov":
        return "readout-calendar"
    if item.get("source") == "openfda":
        return "approval"
    if item.get("source") == "fda-press":
        title = item.get("title", "")
        if re.search(r"\b(approv|clearance|authori[sz])\w*", title, re.I):
            return "approval"
        return "regulatory"
    if item.get("source") == "ema-news":
        return "regulatory"
    return classify(f"{item.get('title', '')} {item.get('summary', '')} {item.get('query', '')}")
