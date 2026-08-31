// Single source of truth for all research outputs.
// Consumed by: Publications.astro, per-paper abstract pages (papers/[slug]),
// RSS feed, sitemap, and the syndication pipeline.

export type PublicationType = 'journal' | 'conference' | 'poster' | 'preprint';

export interface Publication {
	slug: string;
	title: string;
	/** Author names in order, display form. First author is the site owner unless noted. */
	authors: string[];
	venue: string;
	/** e.g. "AI-201" for conference papers, "PP02" for posters. */
	paperId?: string;
	type: PublicationType;
	/** Publication date. "YYYY-MM-DD" when known, otherwise "YYYY". */
	date: string;
	doi?: string;
	/** Canonical external URL (DOI, publisher, arXiv, medRxiv). */
	url?: string;
	/** Locally hosted PDF under /papers/ (same-subdirectory rule for Google Scholar). */
	pdfUrl?: string;
	codeUrl?: string;
	abstract: string;
	keywords: string[];
	/** Extra display note, e.g. "sole author", "DBLP-indexed". */
	note?: string;
}

// Published byline form (all manuscripts list "Jaime Yan"). The legal name
// (Yanming Yu / Mingyu Yan) is used only where legal identity is meant.
export const AUTHOR = 'Jaime Yan';

export const publications: Publication[] = [
	// ── Peer-reviewed journal articles ────────────────────────────────────────
	{
		slug: 'cave-onc',
		title: 'CAVE-Onc: Graph-Constrained Agentic Validation for Cross-Domain Contradictions in CDISC Oncology Submissions',
		authors: [AUTHOR],
		venue: 'PLOS One',
		type: 'journal',
		date: '2026-08-14',
		doi: '10.1371/journal.pone.0350376',
		url: 'https://doi.org/10.1371/journal.pone.0350376',
		note: 'sole author',
		abstract:
			'Regulatory submissions in oncology must remain consistent across interdependent CDISC SDTM domains, yet cross-domain contradictions routinely survive conventional validation. CAVE-Onc introduces a graph-constrained agentic validation framework that models SDTM submission datasets as an RDF knowledge graph, combining declarative SHACL-SPARQL graph constraints with a deterministic LangGraph-based agent layer to detect cross-domain contradictions that domain-scoped rule-based validators cannot express. In a pre-registered evaluation, CAVE-Onc detected all 20 clinician-reviewed injected contradiction archetypes (vs 8/20 for the CDISC CORE engine and 6/20 for the Pinnacle 21 FDA engine, both 0/10 on cross-domain RECIST contradictions) — a construction validation of expressiveness — and stayed specific (0.06–0.09 flags/subject) on two real Project Data Sphere oncology trials mapped to SDTM, detecting 10/11 and 16/18 of applicable injected archetypes. CAVE-Onc writes all validation traces to a Merkle-chained, tamper-evident audit store, providing a foundation for 21 CFR Part 11 compliance.',
		keywords: ['CDISC', 'SDTM', 'SHACL', 'SPARQL', 'RDF knowledge graph', 'RECIST 1.1', 'oncology'],
	},
	{
		slug: 'clinagent-methodology',
		title: 'ClinAgent: AI-Assisted Methodology for Clinical Trial Data Processing and Statistical Programming',
		authors: [AUTHOR],
		venue: 'Biology Methods and Protocols',
		type: 'journal',
		date: '2026',
		doi: '10.1093/biomethods/bpag032',
		url: 'https://doi.org/10.1093/biomethods/bpag032',
		abstract:
			'Clinical trial statistical programming remains labor-intensive: ADaM dataset derivation, TLF generation, and QC programming consume substantial effort per submission. ClinAgent is a skill-and-tool layer that augments any MCP-compatible AI coding agent with clinical-programming capabilities: nine skills (SK-001 Study Setup through SK-009 eSub Packaging) package prompts, deterministic rule engines, and decision trees, while thin MCP tools provide stateless I/O for SAS datasets, Excel specifications, and log files. All nine skills passed functional validation on artifacts from a single production Phase 2 study — deterministic components matched all 56 ADSL variables, and prompt-based specification generation reached 72.1% derivation accuracy (>96% on simple domains, <55% on complex domains, with wide confidence intervals making these point estimates upper bounds) — while end-to-end productivity gains were not measured and remain future work. Human review gates and deterministic audit trails preserve the traceability and reproducibility required for regulatory submissions.',
		keywords: ['clinical trials', 'statistical programming', 'Model Context Protocol', 'AI coding agents', 'CDISC', 'ADaM', 'automation'],
	},

	// ── Conference papers — PhUSE & PharmaSUG ─────────────────────────────────
	{
		slug: 'pharmasug-2026-ai-201',
		doi: '10.5281/zenodo.22182922',
		title: 'Eliminating QC Programming Duplication Through Claude AI-Assisted Independent Code Generation: A Practical Framework for Regulatory-Compliant Validation',
		authors: [AUTHOR, 'Jason Zhang'],
		venue: 'PharmaSUG 2026',
		paperId: 'AI-201',
		type: 'conference',
		date: '2026',
		url: 'https://pharmasug.org/proceedings/2026/AI/PharmaSUG-2026-AI-201.pdf',
		codeUrl: 'https://github.com/yanmingyu92/ai-qc-code-generation',
		abstract:
			'Independent QC programming — recreating production programs from specifications alone — accounts for an estimated 30–50% of total clinical programming effort. This paper presents a Claude AI-assisted workflow that generates independent QC code in Python directly from ADaM specifications, combining a QC Trace Tree, a Decision Router, Agent Skills, and an automated code review engine to reduce duplication between production and QC streams while preserving operational independence through isolated AI instances, with the human QC programmer as the genuinely independent review layer. On the CDISCPilot01 benchmark, the framework achieved 97.1%–100% variable-level match across five ADaM domains and passed all 13 assertions. Companion code is publicly available.',
		keywords: ['QC programming', 'Claude', 'ADaM', 'CDISC', 'AI agents', 'automated code review'],
	},
	{
		slug: 'pharmasug-2026-ap-211',
		doi: '10.5281/zenodo.22182914',
		title: 'Schema-Preserving Generation of Clinical TLF Templates and Executable R Code via Iterative LLM-Guided Debugging',
		authors: [AUTHOR],
		venue: 'PharmaSUG 2026',
		paperId: 'AP-211',
		type: 'conference',
		date: '2026',
		url: 'https://pharmasug.org/proceedings/2026/AP/PharmaSUG-2026-AP-211.pdf',
		codeUrl: 'https://github.com/yanmingyu92/clinical-tlf-automation-system',
		abstract:
			'Manual authoring of CSR TLF templates is resource-intensive, and naive LLM prompting suffers schema drift and regulatory inconsistencies. This paper compares five LLM generation methods for producing ICH E3/CDISC-conformant TLF templates across 1,999 instance-matched bootstrap experiments on three LLM providers, using JSON Patch (RFC 6902) to preserve schema fidelity, and separately evaluates iterative LLM-guided debugging for translating the templates into executable R code. A hybrid RAG approach with reranking significantly outperformed direct prompting (mean quality score 85.7 vs 81.7, p < 0.05, consistent across providers and therapeutic areas), and iterative LLM-guided debugging raised R-code execution success from a low zero-shot rate to 70% within 3–5 rounds, with higher-fidelity templates needing fewer iterations.',
		keywords: ['TLF templates', 'retrieval-augmented generation', 'LLM debugging', 'clinical study reports', 'ICH E3', 'ADaM', 'R code generation'],
	},
	{
		slug: 'phuse-2025-os08',
		doi: '10.5281/zenodo.22182891',
		url: 'https://doi.org/10.5281/zenodo.22182891',
		title: 'An End-to-End Approach to Fine-Tune Small LLMs for Generating Admiral R Code in Statistical Programming',
		authors: [AUTHOR, 'Tingting Tian'],
		venue: 'PhUSE US Connect 2025',
		paperId: 'OS08',
		type: 'conference',
		date: '2025',
		pdfUrl: '/papers/PAP_OS08.pdf',
		abstract:
			'Base small LLMs perform poorly on Admiral code generation (OPS 0.36), and even strong general-purpose LLMs offer no built-in correctness verification for ADaM compliance. This paper presents an end-to-end pipeline for fine-tuning small, locally deployable LLMs on curated Admiral examples — fine-tuning LLaMA 3.1 8B with LoRA and validating output through a knowledge-graph system built from Admiral documentation. The pipeline covers data preparation, training, and evaluation, achieving reliable ADaM code generation without sending proprietary data to external APIs.',
		keywords: ['fine-tuning', 'small LLMs', 'admiral', 'R', 'ADaM', 'LoRA', 'knowledge graph'],
	},
	{
		slug: 'phuse-2025-et01',
		doi: '10.5281/zenodo.22182897',
		url: 'https://doi.org/10.5281/zenodo.22182897',
		title: 'Automating SAS and R Code Interpretation and Debugging: A Practical Pipeline for Statistical Programmers',
		authors: [AUTHOR, 'Tingting Tian'],
		venue: 'PhUSE US Connect 2025',
		paperId: 'ET01',
		type: 'conference',
		date: '2025',
		pdfUrl: '/papers/PAP_ET01.pdf',
		abstract:
			'Statistical programmers spend substantial effort writing and debugging SAS and R code. This paper describes an LLM-based pipeline that translates natural-language queries into executable SAS, R, or Python code, runs it in a Jupyter kernel, captures runtime errors from the kernel, and feeds them back to the LLM for iterative repair until the code succeeds or a retry limit is reached, exposed through a Gradio-based user interface. Evaluated on a factorial corpus of 2,700 runs across Python, R, and SAS with injected syntax, runtime, and logical/statistical errors, the system achieved success rates above 96% across languages, resolving about 95% of syntax and 90% of runtime errors versus about 88% and 87% for logical and statistical errors.',
		keywords: ['SAS', 'R', 'code generation', 'debugging', 'LLM', 'Jupyter kernel', 'statistical programming'],
	},
	{
		slug: 'phuse-2025-dh03',
		doi: '10.5281/zenodo.22182899',
		url: 'https://doi.org/10.5281/zenodo.22182899',
		title: 'Enhancing Clinical Trial Data Queries with LLMs and Neo4j: A Flexible Framework for ADaM Dataset Management',
		authors: [AUTHOR, 'Changhong Shi'],
		venue: 'PhUSE US Connect 2025',
		paperId: 'DH03',
		type: 'conference',
		date: '2025',
		pdfUrl: '/papers/PAP_DH03.pdf',
		abstract:
			'This paper models CDISC ADaM datasets in a Neo4j graph database via a reusable graph schema derived from ADaM specification files, and uses LLMs with LangChain to translate natural-language questions into both Cypher and SQL queries, making data checking more flexible, particularly for ad hoc tasks. Benchmarked head-to-head on 90 protocol-derived questions over synthetic ADaM datasets (ADSL, ADAE, ADCM, ADLB, ADVS) held in both PostgreSQL and Neo4j, LLM-generated Cypher achieved higher accuracy than SQL (73.33% vs 66.67% overall), with the advantage holding across difficulty tiers.',
		keywords: ['Neo4j', 'Cypher', 'graph database', 'ADaM', 'LLM', 'SQL benchmarking', 'LangChain'],
	},
	{
		slug: 'phuse-2025-ml12',
		doi: '10.5281/zenodo.22182901',
		url: 'https://doi.org/10.5281/zenodo.22182901',
		title: 'A Novel Pipeline for Generating Realistic Synthetic CDISC ADaM Datasets Using Large Language Models and Knowledge Graphs',
		authors: [AUTHOR, 'Chao Su'],
		venue: 'PhUSE US Connect 2025',
		paperId: 'ML12',
		type: 'conference',
		date: '2025',
		pdfUrl: '/papers/PAP_ML12.pdf',
		abstract:
			'Creating synthetic ADaM data that faithfully represents real trial characteristics is challenging. This paper combines knowledge graphs built from clinical trial documentation (protocols, SAPs, CRFs) with Faker-based generation, using LLMs to enrich and reorganize the JSON schemas that drive data generation. A three-way comparison of direct JSON, LLM-enhanced JSON, and template-based generation shows the template-based variant achieving the highest overall quality score (0.70 vs 0.45 for direct JSON-schema generation), with improved structural integrity and cross-dataset relationships.',
		keywords: ['synthetic data', 'ADaM', 'CDISC', 'knowledge graphs', 'LLM', 'Faker'],
	},
	{
		slug: 'pharmasug-2025-ai-239',
		doi: '10.5281/zenodo.22182918',
		title: 'GenAI Assisted Code Conversion: From SAS to R Standard ADaM Templates',
		authors: ['Jeff Cheng', 'Srinivas Malipeddi', 'Gurubaran Veeravel', AUTHOR, 'Suhas R. Sanjee'],
		venue: 'PharmaSUG 2025',
		paperId: 'AI-239',
		type: 'conference',
		date: '2025',
		url: 'https://pharmasug.org/proceedings/2025/AI/PharmaSUG-2025-AI-239.pdf',
		abstract:
			'As clinical trial Analysis & Reporting shifts toward open-source languages, our organization needed to convert its SAS-based ADaM standards library to R. This paper presents a GenAI-assisted conversion methodology using a structured workflow of source pre-processing, logical code segmentation, and iterative prompt engineering that accumulates conversion instructions from previously converted templates, followed by human validation comparing converted R outputs against the validated SAS-generated ADaM datasets. Using ChatGPT-4o and Claude 3.5 Sonnet, the effort converted about 78% of the SAS ADaM templates, with about 66% of the converted code used without modification, though macro-heavy templates still required significant human intervention.',
		keywords: ['SAS to R', 'code conversion', 'GenAI', 'ADaM', 'migration', 'prompt engineering'],
	},
	{
		slug: 'pharmasug-2025-si-342',
		doi: '10.5281/zenodo.22182920',
		title: 'Comparing SQL and Graph Database Query Methods for Answering Clinical Trial Questions with LLM-Powered Pipelines',
		authors: [AUTHOR],
		venue: 'PharmaSUG 2025',
		paperId: 'SI-342',
		type: 'conference',
		date: '2025',
		url: 'https://pharmasug.org/proceedings/2025/SI/PharmaSUG-2025-SI-342.pdf',
		note: 'sole author',
		abstract:
			'Should clinical data exploration use SQL or graph databases? This paper benchmarks both query paradigms behind LLM-powered natural-language pipelines on 150 representative clinical trial questions over synthetic ADaM data, comparing accuracy, latency, and the classes of questions each paradigm handles well. The proposed RagQL-Nav framework — query decomposition, intelligent routing, and dual-query validation — reached 91% accuracy on complex queries, roughly 12 points above single-system approaches, offering practical guidance on when graph approaches earn their complexity.',
		keywords: ['SQL', 'graph database', 'LLM pipeline', 'benchmark', 'clinical data', 'ADaM', 'query routing'],
	},
	{
		slug: 'phuse-2024-ic08',
		doi: '10.5281/zenodo.22182904',
		url: 'https://doi.org/10.5281/zenodo.22182904',
		title: 'AI-Enhanced Chatbot for Streamlined Clinical Trials Analysis and Document Management',
		authors: [AUTHOR, 'Chao Su', 'Changhong Shi'],
		venue: 'PhUSE US Connect 2024',
		paperId: 'IC08',
		type: 'conference',
		date: '2024',
		pdfUrl: '/papers/PAP_IC08.pdf',
		abstract:
			'Statistical programming teams lose hours searching specifications, protocols, and analysis documentation. This paper describes a retrieval-augmented chatbot that indexes clinical trial documents and analysis artifacts and answers natural-language questions against the retrieved content, with a local-deployment option that keeps confidential documents and data in-house. A fine-tuned LLM also maps mock table shells to SAS macro calls for end-to-end TLF generation, with a SAS kernel executing the generated code.',
		keywords: ['chatbot', 'RAG', 'document management', 'clinical trials', 'LLM', 'fine-tuning', 'TLF generation'],
	},
	{
		slug: 'pharmasug-2024-si-160',
		doi: '10.5281/zenodo.22182924',
		title: 'LLM-Enhanced Training Agent for Statistical Programming',
		authors: ['Jason Zhang', AUTHOR],
		venue: 'PharmaSUG 2024',
		paperId: 'SI-160',
		type: 'conference',
		date: '2024',
		url: 'https://pharmasug.org/proceedings/2024/SI/PharmaSUG-2024-SI-160.pdf',
		abstract:
			'This paper presents an LLM-enhanced training agent for statistical programming, implemented as a custom GPT-4 GPT built via prompt engineering with uploaded reference documents (SDTMIG, ADaMIG, ICH E9, and internal SAS guidance) and a slash-command interface. The agent guides learners through personalized curricula, lessons, and real-world simulation projects, tests their knowledge with quizzes and coding exercises, and gives immediate, personalized feedback, with positive feedback from a pilot testing phase.',
		keywords: ['training', 'LLM agent', 'statistical programming', 'CDISC', 'SAS', 'prompt engineering'],
	},
	{
		slug: 'pharmasug-2024-mm-226',
		doi: '10.5281/zenodo.22182916',
		title: 'Methodology for Automating TOC Extraction from Word Documents to Excel',
		authors: ['Jeetender Chauhan', 'Madhusudhan Ginnaram', 'Sarad Nepal', AUTHOR],
		venue: 'PharmaSUG 2024',
		paperId: 'MM-226',
		type: 'conference',
		date: '2024',
		url: 'https://pharmasug.org/proceedings/2024/MM/PharmaSUG-2024-MM-226.pdf',
		abstract:
			'Programmers tracking clinical study deliverables often transcribe the table of contents of SAP mock-shell Word documents into Excel trackers by hand. This paper presents an Excel-based VBA tool — chosen because company policy bars external tools — that extracts the TOC from Word mock-shell documents into an Excel tracker at the click of a button, locating the TOC field programmatically and stripping page numbers from entries. The resulting trace system supports monitoring each study deliverable’s progression and validation status.',
		keywords: ['VBA', 'TOC extraction', 'Word', 'Excel', 'mock shells'],
	},
	{
		slug: 'pharmasug-2023-sd-084',
		doi: '10.5281/zenodo.22182926',
		title: 'A Macro Utility for CDISC Datasets Cross Checking',
		authors: ['Chao Su', AUTHOR, 'Changhong Shi'],
		venue: 'PharmaSUG 2023',
		paperId: 'SD-084',
		type: 'conference',
		date: '2023',
		url: 'https://pharmasug.org/proceedings/2023/SD/PharmaSUG-2023-SD-084.pdf',
		abstract:
			'CDISC validation tools such as Pinnacle 21 check standards compliance but not dataset content, and A&R programmers need study- and therapy-area-specific checks throughout the analysis lifecycle. This paper presents a configurable SAS macro utility that systematizes cross checking across SDTM and ADaM datasets; its modular sub-macro framework lets users plug in custom checking rules, extensible beyond CDISC datasets. The macro generates a formatted Excel discrepancy report with a hyperlinked summary tab and one sheet per issue category, supporting faster data review cycles.',
		keywords: ['SAS macro', 'CDISC', 'cross checking', 'data quality', 'ADaM', 'SDTM', 'Excel report'],
	},
	{
		slug: 'pharmasug-2023-qt-085',
		doi: '10.5281/zenodo.22182912',
		title: 'Tips to Read In and Output Excel Spreadsheets in SAS',
		authors: [AUTHOR, 'Chao Su', 'Changhong Shi'],
		venue: 'PharmaSUG 2023',
		paperId: 'QT-085',
		type: 'conference',
		date: '2023',
		url: 'https://pharmasug.org/proceedings/2023/QT/PharmaSUG-2023-QT-085.pdf',
		abstract:
			'Excel is widely used in clinical trials to save and transfer data, and analysis & reporting programmers routinely receive spreadsheets and produce customized Excel reports for other departments. This paper collects practical techniques for reading different Excel formats (xls, xlsx, xlsm, xlsb, csv) into SAS via LIBNAME engines and PROC IMPORT — including how to choose between them by environment and format — and for writing well-formatted outputs with PROC EXPORT and ODS EXCEL. It offers practical decision tips for choosing import/export methods and output formats.',
		keywords: ['SAS', 'Excel', 'ODS EXCEL', 'PROC IMPORT/EXPORT', 'data exchange'],
	},

	// ── Posters — PHUSE/FDA CSS ───────────────────────────────────────────────
	{
		slug: 'css-2024-pp02',
		doi: '10.5281/zenodo.22182906',
		url: 'https://doi.org/10.5281/zenodo.22182906',
		title: 'JSON Data Generation: Linking Statistical Analysis with Large Language Models',
		authors: ['Changhong Shi', AUTHOR],
		venue: 'PHUSE/FDA Computational Science Symposium (CSS) 2024',
		paperId: 'PP02',
		type: 'poster',
		date: '2024',
		pdfUrl: '/papers/POS_PP02.pdf',
		abstract:
			'This poster presents a framework that extracts schema from structured clinical datasets (e.g., CDISC ADaM) into JSON, uses it to design a graph-based database (Neo4j) with graph embeddings stored in a vector database, and enables LLMs to answer natural-language questions by retrieving relevant variables and generating SQL or Cypher queries — automating clinical data analysis workflows.',
		keywords: ['JSON', 'CDISC ADaM', 'Neo4j', 'Cypher', 'LLM', 'vector database'],
	},
	{
		slug: 'css-2023-pp20',
		doi: '10.5281/zenodo.22182908',
		url: 'https://doi.org/10.5281/zenodo.22182908',
		title: 'A Framework for Interactive Ad-hoc Request Handling: Empowering Clinical Insights through Interactive Plots',
		authors: ['Changhong Shi', AUTHOR, 'Chao Su'],
		venue: 'PHUSE/FDA Computational Science Symposium (CSS) 2023',
		paperId: 'PP20',
		type: 'poster',
		date: '2023',
		pdfUrl: '/papers/POS_PP20.pdf',
		abstract:
			'This poster presents a framework for producing interactive plots to handle ad-hoc analysis requests in the clinical domain. It standardizes the end-to-end process — Anaconda-based environment setup, package version control via renv/pipenv lock files, Jupyter Lab as the IDE, interactive visualization with Plotly (Python) and ggplot2 plus Plotly/htmlwidgets (R), and portable self-contained HTML output — with results validated by crosschecking between SAS, R, and Python. Example outputs include swimmer, waterfall, and Kaplan-Meier plots with drop-downs and range sliders.',
		keywords: ['ad-hoc requests', 'interactive plots', 'Plotly', 'statistical programming', 'HTML output'],
	},

	// ── Preprints & technical reports ─────────────────────────────────────────
	{
		slug: 'gxp-agent',
		title: 'GxP-Agent: Process-DAG Topology for Reliable Clinical Trial Programming with LLM Agents',
		authors: [AUTHOR],
		venue: 'arXiv',
		type: 'preprint',
		date: '2026',
		url: 'https://arxiv.org/abs/2608.16890',
		abstract:
			'LLM agents fail in regulated programming work when their execution is unstructured. GxP-Agent organizes clinical trial programming as a process DAG — typed nodes for data ingestion, derivation, validation, metadata application, and export — so that agent behavior is constrained, replayable, and auditable. The topology yields measurably higher task reliability than free-form agent loops and produces the evidence trails GxP review requires.',
		keywords: ['LLM agents', 'process DAG', 'GxP', 'clinical trial programming', 'reliability', 'CDISC-Bench', 'pharmaverse'],
	},
	{
		slug: 'legacy-modernization-framework',
		title: 'A Non-Destructive Methodological Framework for Modernizing Legacy Clinical Reporting Systems for AI-Driven Pharmacoinformatics: A SAS Case Study',
		authors: [AUTHOR],
		venue: 'arXiv',
		type: 'preprint',
		date: '2026-05-13',
		doi: '10.48550/arXiv.2605.13905',
		url: 'https://arxiv.org/abs/2605.13905',
		note: 'DBLP-indexed',
		abstract:
			'Legacy SAS macro libraries resist AI integration because they emit opaque RTF with no machine-readable layer, yet source-level change triggers re-validation. This preprint presents a non-destructive framework — a bridge map, typed Intermediate Representation, and orchestrator that wrap the legacy library unchanged — applied to a 558-component industrial SAS library. Coexistence mode delivers AI-ready JSON output on day one; optional consolidation achieved a 92% SAS code reduction. Parity validation reached at least 80% cell-level parity on 11 of 14 reports from an internal Phase III study and 100% parity (4,764 cells) on the public CDISCPilot01 benchmark, and LLM experiments demonstrated IR-based table summarization, anomaly detection, and configuration generation.',
		keywords: ['legacy modernization', 'clinical reporting', 'SAS', 'intermediate representation', 'pharmacoinformatics', 'parity validation', 'AI readiness'],
	},
	{
		slug: 'clinagent-five-layer',
		title: 'ClinAgent: A Five-Layer Architecture for Autonomous Clinical Trial Statistical Programming',
		authors: [AUTHOR],
		venue: 'medRxiv',
		type: 'preprint',
		date: '2026-01-16',
		doi: '10.64898/2026.01.09.26343542',
		url: 'https://www.medrxiv.org/content/10.64898/2026.01.09.26343542v1',
		note: 'preprint of the journal publication',
		abstract:
			'This preprint presents the five-layer ClinAgent architecture — A2UI rendering, skill router, thick skills, thin MCP tools, and compliance infrastructure — under a "Thin MCP, Thick Skills" design that augments any MCP-compatible AI coding agent (Augment Code, Claude Code, Cline, Cursor) with clinical programming capabilities rather than acting as an autonomous agent itself. Skills are independently testable, and the infrastructure layer provides audit logging and data masking for GxP compliance. Nine skills (SK-001–SK-009) were validated on a production Phase 2 cardiovascular study (11 ADaM domains, 93,239 synthetic observations): log analysis achieved 100% precision (1 error, 7 warnings over 10 logs), all 56 ADSL variables were matched, and specification generation reached 72.1% derivation accuracy overall and above 96% on simple domains.',
		keywords: ['ClinAgent', 'Model Context Protocol', 'agent architecture', 'CDISC', 'ADaM', 'statistical programming'],
	},
	{
		slug: 'automation-scoping-review',
		title: 'Evidence Behind the Automation of Clinical Trial Statistical Programming: A Scoping Review of Technology Adoption, Validation Frameworks, and AI/ML Integration (2020–2025)',
		authors: [AUTHOR, 'Jason Zhang', 'Tingting Tian'],
		venue: 'medRxiv',
		type: 'preprint',
		date: '2025-12-29',
		doi: '10.64898/2025.12.24.25342988',
		url: 'https://www.medrxiv.org/content/10.64898/2025.12.24.25342988v1',
		note: 'cited by a Cytel author at PHUSE US Connect 2026',
		abstract:
			'This scoping review (reported per PRISMA-ScR) maps the 2020–2025 evidence base on automating clinical trial statistical programming — from macro-based tooling to LLM-driven approaches — characterizing study types, claimed efficiency gains, evaluation rigor, and open gaps. From 1,247 records, 262 studies were included; reported gains include 15–25% development-time reduction for pharmaverse TLF tools, 30–50% effort reduction for risk-based validation with CI/CD, and 75–85% SDTM conversion-time reduction for REDCap2SDTM, alongside 88–93% F1 for domain-specific LLMs on clinical NLP versus 60–85% code-generation accuracy for general models. Evidence quality is predominantly Low to Very Low: only 12 of 527 validation papers (2.3%) report quantitative outcomes, and no RCTs comparing validation approaches exist, defining the critical research priorities for the field.',
		keywords: ['scoping review', 'TLF automation', 'validation', 'statistical programming', 'clinical trials', 'automation', 'LLM'],
	},
];

export const byType = (type: PublicationType) => publications.filter(p => p.type === type);

export const getPublication = (slug: string) => publications.find(p => p.slug === slug);

/** ISO date for meta tags: "YYYY-MM-DD" stays, bare "YYYY" becomes "YYYY". */
export const citationDate = (p: Publication) => p.date;
