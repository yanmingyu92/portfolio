# Synthetic ADaM Data That Actually Holds Together: Knowledge Graphs, LLMs, and Faker Templates

<!-- Wechatsync target: Zhihu. Canonical: https://jaimeyan.com/blog/synthetic-adam-datasets-llm-knowledge-graph.html -->

If you've ever needed synthetic ADaM data before first patient in — to start TLF programming early, test a pipeline, or train new programmers — you know the failure mode. Point an LLM at your ADaM spec spreadsheet, ask for JSON, feed it to Faker, and you get datasets where each variable looks plausible in isolation: AGE is between 18 and 90, SEX is in {M, F, U}. Then you join ADLB to ADSL and the subject IDs don't line up, PARAMCD has no consistent relationship to AVAL and CHG, and AESTDY comes after AEENDY half the time.

In our PhUSE US Connect 2025 paper (ML12, with Chao Su), we quantified exactly this: direct JSON-schema generation scored **0.45** on our composite quality metric. The full pipeline — schemas enriched from clinical documentation knowledge graphs plus structure-aware templates — reached **0.70**. Here's what made the difference.

## Why schema-only generation plateaus

A JSON conversion of an ADaM spec captures names, types, lengths, and codelists. What it *doesn't* capture is the two things that make data realistic:

- **Domain knowledge.** A spec says AVAL is numeric; it doesn't say systolic blood pressure clusters around 120–140 or which MedDRA preferred terms belong in AEDECOD. That knowledge lives in the protocol, SAP, and CRFs.
- **Structure.** A spec lists PARAMCD, AVAL, BASE, and CHG as sibling variables. The BDS contract — one record per subject per parameter per visit, with CHG = AVAL − BASE *within* a parameter — is nowhere in that flat list. The LLM generating values has no way to see it.

The measured consequence: direct JSON generation scored 0.38 on relationship preservation — the weakest of its three component scores.

## The pipeline

The pipeline has four stages: convert specs to JSON, enhance the schema, generate with Faker, evaluate. The enhancement stage is where the quality comes from, and it has two prongs:

1. **Knowledge enrichment.** We build a structured knowledge graph from the trial documentation (protocol, SAP, CRFs) and query it block by block against the JSON schema — pulling out variable ranges, derivation equations, and allowed values — then have the LLM insert that extracted knowledge into the schema following a predefined structure. An LLM pass additionally proposes realistic value ranges and distributions. One honest caveat from the paper: the output quality here is highly sensitive to how relevant the input documentation is to ADaM dataset creation.
2. **Structure optimization.** Rule-based LLM prompts reorganize the flat schema into the actual ADaM structure — ADSL (one record per subject), BDS (one record per subject per parameter per visit), OCCDS (one record per subject per occurrence) — so relationships become explicit. For BDS, each PARAMCD gets its own nested block mapping to its AVAL/BASE/CHG variables instead of sitting in a sibling list.

Generation then uses Faker two ways: direct translation of the enhanced schema into Faker calls for simple structures, and predefined Python templates for the complex ones. The template path is deliberately **ADSL-first** — generate the subject-level dataset, then propagate subjects consistently into every downstream dataset. That's what makes cross-dataset joins work.

```python
# Direct Faker generation (fine for ADSL — breaks down for BDS/OCCDS)
def generate_adsl(num_subjects):
    return [{
        "STUDYID": fake.pystr(max_chars=8),
        "USUBJID": fake.pystr(max_chars=20),
        "AGE": fake.random_int(min=18, max=90),
        "SEX": fake.random_element(elements=("M", "F", "U")),
    } for _ in range(num_subjects)]
```

## The numbers

We evaluated against reference datasets from a Phase III trial: ADSL (n=500), two BDS datasets (ADVS, ADLB), and one OCCDS dataset (ADAE). The overall score is a weighted combination of data structure, subject-level, and relationship scores, with components checked via KS tests, chi-square tests, Jensen–Shannon divergence, and cross-dataset key consistency.

| Metric | Direct JSON | Enhanced JSON (KG+LLM) | Template-Based |
|---|---|---|---|
| Data Structure | 0.52 | 0.68 | 0.75 |
| Subject-level | 0.45 | 0.63 | 0.70 |
| Relationship | 0.38 | 0.58 | 0.65 |
| **Overall Quality** | **0.45** | **0.63** | **0.70** |

Two things are worth noticing. First, knowledge enrichment alone (0.45 → 0.63) buys more than half the total gain — the documentation knowledge graph is doing real work, not decoration. Second, templates add the rest (0.63 → 0.70) by hard-coding the structural patterns and the ADSL-first generation order.

## Where it still breaks

The paper is direct about the limits:

- **Temporal sequences are the weak spot.** Temporal sequence validity in OCCDS data ran only 50–65%, and event relationship preservation 45–60%. Complex event sequences remain genuinely hard.
- **Consistency degrades with complexity.** One-record-per-subject held at 98% in ADSL, but subject-level consistency drops to 70–75% in complex BDS relationships, and keeping treatment arms aligned across many datasets is still problematic.
- **Rare events.** Templates over- or under-represent low-frequency adverse events and uncommon demographic combinations.
- **Rigidity.** Templates win on quality but cost maintenance overhead, and strict structural enforcement can squeeze out legitimate edge cases and novel study designs.

The practical takeaway matches the pattern I keep seeing in this space: the LLM is not the generator of record. Domain knowledge extracted from your protocol, SAP, and CRFs — organized so the model can actually query it — plus deterministic templates that own the structure, is what turns plausible-looking columns into datasets that survive a join.

Full details, including the evaluation metric formalization, are in the [full paper](/papers/phuse-2025-ml12.html), presented at PhUSE US Connect 2025.

---
原文发布于 jaimeyan.com: https://jaimeyan.com/blog/synthetic-adam-datasets-llm-knowledge-graph.html
