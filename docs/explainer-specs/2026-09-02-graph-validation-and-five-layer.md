# Explainer 场景规格（P1 门禁）— 2026-09-02

> 对标视频管线的"脚本审查关"：**规格不通过不画图**。
> 本批 2 个（旗舰表 #2、#3；#4 windowing 源文章 drip 至 2026-11-08，暂缓）。
> 英文为交付文本（页面实际字符串），中文为审查注释。
> 通用约定：SVG marker id 前缀 `arr-s<n>-`；阅读重的节拍标 `[dur]`（2200–3000ms）；
> 虚构数据一律 Study XYZ / Subjects 001–004；论文实测数字标注到 Figure/Table 编号。

---

## A. graph-constrained-validation（旗舰 #2）

- slug: `graph-constrained-validation` → `/explainers/graph-constrained-validation.html`
- 一句话资格：读完后能解释"为什么按域 scope 的规则引擎在结构上抓不住跨域 RECIST 矛盾，以及图约束 + 确定性 agent 两层如何抓住"。
- 源文章：`content/posts/graph-constrained-validation-cdisc-oncology.md`（已发布，无 draft；frontmatter 将挂 `explainer:`）
- 论文：CAVE-Onc, PLOS One 2026（`src/data/publications.ts:36-49`, slug `cave-onc`）；图/表编号已对 PLOS 官网全文核实
- 选题依据：全网无同类免费资源；论文 Fig 1/Fig 2/Table 3/Table 4 现成可溯源

### Scene 1 — The contradiction nobody flagged
- headline: `A response that cannot be true`
- 场景句：An RECIST 1.1 impossible scenario, told as four study records.
- SVG 终态：三张迷你表（TR / TU / RS，Study XYZ, Subject 001）：TR 显示 target lesion SLD -24%（PR 档），TU 显示 non-target SD、无新病灶，RS 总体疗效却记 `CR`。矛盾单元格玫瑰色高亮，底部一行 "CORE ✓ clean · Pinnacle 21 ✓ clean"。
- beats:
  1. `Meet Subject 001 in fictional Study XYZ: target lesions shrank 24% — a PR-level change.` — 溯源：post intro `md:11-15`；论文 Introduction
  2. `Non-target lesions are stable, and no new lesions appeared.` — 同上
  3. `Yet the overall response record says CR — complete response.` — 同上
  4. `Under RECIST 1.1 this combination is clinically impossible.` [dur 2400] — 论文 Introduction（RECIST Table 7 逻辑）
  5. `Both industry validators reviewed this data — and reported it clean.` [dur 2400] — post intro `md:13-15`
- legend: 灰=normal record cell；玫瑰=the impossible combination
- honest: teaching schematic — fictional Study XYZ records; scenario per RECIST 1.1 as described in the post and paper introduction
- src: post + paper DOI

### Scene 2 — Why the validators can't see it
- headline: `One domain at a time`
- 场景句：Domain-scoped rules evaluate one dataset at a time; the contradiction lives in the join.
- SVG 终态：TR/TU/RS 三表各被一个"validator lens"框住，各自打勾 PASS；表与表之间跨域虚线（TR→RS、TU→RS）标红叉 "no rule looks here"。
- beats:
  1. `A rule engine like CORE sees one domain as one table — a DataFrame.` — post §Why domain-scoped rules can't express this `md:17-21`
  2. `Every check is a filter over rows of that single table.` — 同上
  3. `TR passes its checks. TU passes. RS passes.` — 教学推论（逐域规则各自成立）
  4. `The contradiction only exists across the tables — in the join nobody evaluates.` [dur 2600] — post 同节："graph traversal, not a DataFrame filter"
  5. `This is an expressiveness boundary, not a coverage gap you can patch with more rules.` [dur 2800] — post 同节核心论断
- legend: 绿勾=domain-local rule passes；红叉=cross-domain join, unchecked
- honest: teaching schematic — validator behavior simplified; see post for the formal argument
- src: post section link

### Scene 3 — The 122-rule divide
- headline: `Two-thirds port. The dangerous third doesn't.`
- SVG 终态：122 个规则点阵（11×12 去尾），85 个灰点归入 "ports to SHACL losslessly"，31 个玫点 "cross-domain joins"、6 个玫点 "row-set uniqueness" 归入 "cannot express"；玫点区叠加小字 "the contradictions live here"。
- beats:
  1. `CDISC CORE ships 122 oncology rules.` — post `md:21`；论文 SHACL porting pipeline
  2. `85 of them — 69.7% — port to SHACL shapes with zero loss.` [dur 2200] — 同上
  3. `31 cannot be ported: they join across domains.` — 同上
  4. `6 more need row-set uniqueness a single-record shape can't state.` — 同上
  5. `The dangerous contradictions live exactly in that unportable third.` [dur 2600] — post 同节
- legend: 灰=ports losslessly (85)；玫=not portable (31 joins + 6 uniqueness)
- honest: counts measured in the paper's porting pipeline — paper, porting statistics section
- src: post + paper

### Scene 4 — XPT in, graph out
- headline: `Turn the submission into one graph`
- SVG 终态：左侧 9 个 XPT 域芯片（DM, EX, TR, TU, RS, …），箭头进入右侧知识图谱：Subject 001 节点居中，TR/TU/RS 记录为相连节点，RELREC 外键为有向边；SUPPDM 的 QNAM/QVAL 展开成 DM 节点的属性。
- beats:
  1. `Nine oncology SDTM domains leave their XPT silos.` — post §The two-layer fix `md:25-27`；论文 Fig 1
  2. `Each becomes nodes and edges in a single RDF knowledge graph.` — 同上
  3. `RELREC foreign keys survive as real edges — the joins validators couldn't see are now explicit.` [dur 2600] — 同上
  4. `SUPP-- qualifiers unfold onto their parent record as plain properties.` — 同上
  5. `Now the RECIST question is a walk across three nodes — not three separate filters.` [dur 2600] — 同上
- legend: 灰芯片=XPT domain；圆=record node；玫边=RELREC relationship
- honest: teaching schematic — graph simplified to Subject 001's records; domain count (9) per paper Fig 1
- src: post + paper Fig 1

### Scene 5 — Layer 1: SHACL shapes fire on the graph
- headline: `Shapes patrol the graph`
- SVG 终态：Scene 4 的图上叠加一个 shape"套索"圈住 TR+TU+RS 三元组模式；shape 库侧栏显示 111 = 85 ported + 8 RECIST + 18 archetype；命中处弹出一面 flag。
- beats:
  1. `Layer 1 is a library of 111 SHACL shapes.` — post `md:25-27`；论文 two-layer architecture
  2. `85 are the ported CORE rules from Scene 3.` — 同上
  3. `8 encode RECIST derivations; 18 are archetype-specific SHACL-SPARQL.` — 同上
  4. `A shape matches the pattern from Scene 1 across TR, TU and RS — and fires.` [dur 2400] — 同上
  5. `Every firing writes a trace to an append-only Merkle audit chain.` — post `md:40-42`；论文 Fig 1（21 CFR Part 11 基础）
- legend: 玫圈=a SHACL shape pattern；旗=flag + audit trace
- honest: shape library composition (111 = 85+8+18) measured — paper architecture section; schematic graph is illustrative
- src: post + paper Fig 1

### Scene 6 — Layer 3: the deterministic agent
- headline: `The rule that can't be one rule`
- SVG 终态：左右对照。左：34 层嵌套 IF 金字塔（标 "max nesting 34 · 0 testable units"）；右：扁平状态机四节点 `query TR → query RS → query TU → Table 7 lookup → compare → trace`（标 "flat 34-row dictionary · 22 testable blocks · max nesting 7"），底部 "$0.000 API cost / subject · exact replay"。
- beats:
  1. `One archetype — A19, the RECIST Table 7 matrix — defeats a single SPARQL rule.` [dur 2400] — post §Why the agent layer earns its place `md:61-65`
  2. `SHACL-SPARQL forbids lookup tables: 34 matrix rows become 34 nested IFs.` — 同上；论文 Discussion
  3. `Zero independently testable pieces — unmaintainable by construction.` — 同上
  4. `The agent layer instead runs a deterministic state machine: three typed queries, one table lookup, one comparison.` [dur 2800] — post 伪代码 `md:30-36`
  5. `Flat 34-row dictionary, 22 unit-testable blocks, maximum nesting 7 — not 34.` — 同上；论文 Discussion
  6. `No LLM call on this path: $0.000 per subject, exactly replayable for inspectors.` [dur 2600] — post `md:65`；论文 L3 cost section
- legend: 灰金字塔=SPARQL-only attempt；玫流程=deterministic agent (CaveAgent)
- honest: complexity numbers measured — paper Discussion (Table 7 maintainability); diagram simplified
- src: post + paper

### Scene 7 — The scoreboard, with the fine print
- headline: `What the evaluation showed — and what it didn't`
- SVG 终态：20 格 archetype 条（呼应论文 Fig 2）：CAVE 全玫 20/20，CORE 8/20，P21 FDA 6/20；侧栏三组数字 "cross-domain subset 0/10 vs 10/10 (p=0.002)"、"clean-data overlap: Jaccard 0.004 — augment, not replace"；底部诚实条 "held-out, frozen shapes: 3/5"。
- beats:
  1. `Twenty expert-reviewed contradiction archetypes were injected into clean data.` [dur 2200] — post §What the evaluation showed `md:44-59`；论文 Track B
  2. `CAVE caught all 20. CORE caught 8. Pinnacle 21's FDA engine caught 6.` [dur 2400] — 论文 Table 3
  3. `On the ten cross-domain RECIST archetypes: the industry engines caught zero.` — 论文 Table 3（McNemar p=0.002）
  4. `On clean data the flag sets barely overlap — Jaccard 0.004: this augments validators, it doesn't replace them.` [dur 3000] — post `md:46`；论文 Table 2
  5. `Honest fine print: with the shape library frozen, only 3 of 5 held-out archetypes were caught.` [dur 2800] — post §What I'd warn you about `md:71`；论文 Table 4
  6. `Construction validation, one agent-layer archetype, synthetic corpus — the claims are scoped accordingly.` [dur 2800] — post `md:67-75`
- legend: 玫格=detected；灰格=missed
- honest: detection counts measured — paper Table 3 / Table 4 / Fig 2; bar layout is a schematic echo of Fig 2, not the figure itself
- src: post + paper Table 3/Table 4

---

## B. five-layer-agent-architecture（旗舰 #3）

- slug: `five-layer-agent-architecture` → `/explainers/five-layer-agent-architecture.html`
- 一句话资格：读完后能解释"为什么领域逻辑要放进可测的 skill 侧 JSON 而不是更胖的 prompt，以及五层各自管什么"。
- 源文章：`content/posts/five-layer-architecture-clinical-agents.md`（已发布，无 draft）
- 论文：ClinAgent, medRxiv 预印本 2026（`publications.ts:316-328`，slug `clinagent-five-layer`；期刊版 Biology Methods and Protocols, `publications.ts:51-62`）
- **溯源已升级（P2 已核对 medRxiv 全文 v1）**：Scene 2 五层→论文 Fig 1；Scene 3 调用链→Fig 2 / Table 4；Scene 5→§5.4 STUDY-A、Table 8/9/10、Table 11（SK-005）、Table 12（分域准确率）、Table 13（TLF）；Scene 6→§6.8.3（ρ=−0.867, p=0.003）、Table 18、Fig 7、§6.8.4/Table 19（58.3%）；Scene 7→Table 15（Wilson CI）。
- 选题依据：架构图（博客 Figure 1 SVG）现成可改造；失败模式相关性（ρ=−0.867）是全网稀缺的实测论点

### Scene 1 — The gap is in the tools
- headline: `Smart agent, empty hands`
- SVG 终态：左侧 "Any MCP-compatible agent" 框（Claude Code / Cursor / Cline / Augment Code），右侧三件上锁工件：SAS7BDAT 数据集、ADaM spec Excel、SAS log（log 上贴着真假两行：`ERROR:` vs `Unable to copy SASUSER`）。
- beats:
  1. `Ask a coding agent to review a SAS log and it does fine.` — post intro `md:11`
  2. `Ask it to read a SAS7BDAT dataset — it can't open the file.` — 同上
  3. `Or parse an ADaM spec spreadsheet. Or tell a real ERROR from a harmless warning.` [dur 2600] — 同上
  4. `The gap is in the tools, not the reasoning.` [dur 2200] — post `md:11` 核心论断
  5. `ClinAgent's answer in one line: thin MCP, thick skills.` [dur 2200] — post `md:13`
- legend: 灰=agent；锁=artifact the agent can't touch directly
- honest: teaching schematic — tool gap summarized from the post's opening
- src: post

### Scene 2 — The five layers
- headline: `Five layers, each with one job`
- SVG 终态：五层栈（自顶向下：1 A2UI results rendering · 2 Skill router · 3 Skills—THICK 玫框 · 4 MCP tools—THIN 玫框 · 5 Infrastructure compliance），顶部 agent 框以双向箭头接栈顶，旁边标 "swap the agent, the stack stays"。（改造自博客 Figure 1 SVG）
- beats:
  1. `Layer 1 renders results: dashboards, log tables, RTF viewers — deterministic output for human review.` [dur 2600] — post §The five layers `md:25`；博客 Figure 1
  2. `Layer 2 routes each tool call to the right skill and validates inputs first.` — post `md:26`
  3. `Layer 3 is thick: nine skill packages, SK-001 to SK-009, each bundling prompts, examples, and rule engines.` [dur 2800] — post `md:27`
  4. `Layer 4 is thin: stateless I/O only — read a dataset, parse a spec, read a log. It never interprets.` [dur 2600] — post `md:28`
  5. `Layer 5 is compliance: audit logging, PHI masking, access control, context minimization.` [dur 2400] — post `md:29`
  6. `The agent reasons; the stack supplies domain expertise and the compliance trail. Swap the agent — the skills still work.` [dur 3000] — post `md:31`
- legend: 玫框=the design bet (thick skills / thin tools)；灰=supporting layers
- honest: teaching schematic — layer structure per the post's Figure 1
- src: post + preprint abstract

### Scene 3 — One call through the stack
- headline: `Anatomy of a single tool call`
- SVG 终态：竖向泳道追踪一次 "classify this log" 调用：router → SK-005 → MCP read log → rule_engine JSON 逐行打标（`^ERROR:` 玫 / `^WARNING:` 琥珀 / SASUSER 行灰）→ LLM 只写人类解读 → Infrastructure 记录审计条目。
- beats:
  1. `A call arrives: classify the findings in this SAS log.` — post `md:26,33-51`
  2. `The router picks skill SK-005 and checks the input first.` — post `md:26`
  3. `A thin MCP tool reads the log bytes. It does not know what an ERROR means.` [dur 2400] — post `md:28`
  4. `A deterministic rule engine tags every line: ^ERROR:, ^WARNING:, known false positives like "Unable to copy SASUSER".` [dur 3000] — post rule_engine JSON `md:42-49`
  5. `Only then does the LLM write the human-readable interpretation of what the rules already decided.` [dur 2800] — post `md:40`（determinism where it matters）
  6. `The infrastructure layer logs the whole call — timestamped inputs and outputs.` — post `md:29`
- legend: 玫=ERROR lines；琥珀=warnings；灰=known false positives
- honest: teaching schematic — regex set quoted from the post's rule_engine example
- src: post

### Scene 4 — Why thick skills beat fat prompts
- headline: `Four reasons the rules live in JSON, not in a prompt`
- SVG 终态：2×2 卡片：Testability（fixture 单测，无 LLM）/ Evolvability（改一行 warning_patterns.json）/ Transparency（资深统计程序员签字）/ Determinism（规则先行，LLM 殿后）；每张卡角落有小图标。
- beats:
  1. `Why not just write a bigger prompt? Four reasons.` — post §Why thick skills beat fat prompts `md:33-51`
  2. `Testability: rules in a skill are unit-tested with plain fixtures — no LLM in the loop.` [dur 2600] — post `md:37`
  3. `Evolvability: a new warning pattern is one line in a JSON file. No code change, no redeploy.` [dur 2600] — post `md:38`
  4. `Transparency: a senior statistical programmer can read and sign off a JSON rule file. Under GxP, reviewability is the validation story.` [dur 3000] — post `md:39`
  5. `Determinism where it matters: the rule engine classifies; the LLM only explains.` [dur 2400] — post `md:40`
  6. `Adding a capability is mostly configuration — a new skill JSON; the MCP tools carry over unchanged.` [dur 2600] — post `md:51`（SK-010 假设例）
- legend: 四卡片同色系；无数据色
- honest: teaching schematic — argument structure from the post; no measured data in this scene
- src: post

### Scene 5 — The validation bench
- headline: `Nine skills, one production study`
- SVG 终态：四张结果卡（呼应博客 Table 1）：SK-005 log 分析 "10 logs · 1 error + 7 warnings caught · 100% precision · 13,595 clean NOTEs, zero false alarms"；SK-006 "56/56 ADSL variables matched"；Spec 生成 "72.1% derivation accuracy [95% CI 67.1–76.7] · >96% on ADMH/ADEX/ADCM"；SK-007 "12/16 TLFs · 4 skipped on spec gaps"。顶部数据集条 "Phase 2 cardiovascular study · 11 ADaM domains · 93,239 synthetic observations (Faker)"。
- beats:
  1. `The validation target: artifacts of one production Phase 2 cardiovascular study.` [dur 2400] — post §What the validation showed `md:55`
  2. `Eleven ADaM domains, 93,239 observations — all synthetic, generated with Faker. No patient data.` [dur 2600] — 同上
  3. `SK-005 log analysis: every real error and warning caught in ten logs, zero false alarms across 13,595 clean NOTE lines.` [dur 3000] — post `md:59`（博客 Table 1；数字转引自预印本）
  4. `SK-006 data validation: all 56 ADSL variables matched.` — post `md:60`
  5. `Spec generation scored 72.1% derivation accuracy — above 96% on the simple domains.` [dur 2600] — post `md:61`
  6. `SK-007 generated 12 of 16 TLFs; the four skips were missing macro names in the spec — an input-quality gap, not a skill failure.` [dur 3000] — post `md:62,64`
  7. `The benchmark measures tool correctness, not LLM reasoning — deliberately.` [dur 2400] — post `md:55`
- legend: 卡片=per-skill result；无
- honest: measured results as reported in the preprint, cited via the post's Table 1; layout is schematic
- src: post + preprint

### Scene 6 — Where it breaks
- headline: `The failure mode is the point`
- SVG 终态：散点图：x=研究特有成变量占比，y=derivation accuracy；下降趋势线；标注 ADSL 54.3%（低点）与 ADBASE 0.0%（x 最大端）；右上角 "Spearman ρ = −0.867, p = 0.003"；侧栏 "115 missing variables · 58.3% study-specific derivations"。
- beats:
  1. `Accuracy collapses exactly where a study invents its own variables.` [dur 2400] — post `md:66`
  2. `ADSL: 54.3%. ADBASE, the most study-specific dataset: 0.0%.` [dur 2400] — 同上（转引自预印本）
  3. `Across domains, the correlation is Spearman ρ = −0.867 — the more study-specific the variables, the worse the generation.` [dur 3000] — 同上
  4. `Of 115 missing variables, 58.3% were study-specific derivations.` — 同上
  5. `That knowledge cannot live in a generic prompt. It belongs in thick, organization-specific skills.` [dur 3000] — 同上（论点回扣）
- legend: 点=one dataset；玫线=trend
- honest: measured statistics as reported in the preprint, cited via the post; axis positions schematic, point labels exact
- src: post + preprint

### Scene 7 — Honest limits, then the takeaway
- headline: `What this did not prove`
- SVG 终态：左侧 "Not proven" 清单卡（single study · a single real error — Wilson CI [20.7%, 100%] · productivity gain unmeasured · depends on well-formed specs）；右侧结论条 "rules → testable skill JSON · MCP tools stay thin · invest in the skill layer — the agent is interchangeable"。
- beats:
  1. `One Phase 2 study. That's the whole evidence base.` — post §Honest limitations `md:68-72`
  2. `The log benchmark rests on a single real error — the Wilson interval runs from 20.7% to 100%.` [dur 2800] — post `md:70`
  3. `End-to-end productivity was never measured; a controlled timing study is future work.` [dur 2400] — post `md:70-72`
  4. `Generation accuracy assumes well-structured input specs — the four skipped TLFs are the proof.` [dur 2600] — post `md:70-72`
  5. `Within those limits the claim stands: keep MCP tools thin and stateless, put domain knowledge in testable skills, and let the agent be replaceable.` [dur 3000] — post §Key takeaways `md:74-80`
- legend: 灰=limits；玫=takeaway
- honest: limitations quoted from the post; confidence interval per the preprint as cited there
- src: post + preprint + journal version link

---

## 审查清单（提交人自检）

- [x] 每个场景 5–10 beats（A: 5/5/5/5/5/6/6，B: 5/6/6/6/7/5/5）✓
- [x] 每场景有 headline / 旁白 / SVG 终态 / legend / honest / 逐节拍溯源
- [x] A 全部论文数字可溯源到 Figure/Table 编号（已对 PLOS 全文核实）
- [x] B 的论文数字溯源降级路径已声明（medRxiv 全文待 P2 核对，不可达则标注转引）
- [x] 教学示意与实测数据在 honest 行内区分
- [x] 虚构数据仅 Study XYZ / Subject 001
- [x] 两源文章均已发布（无 drip 等待），入口卡挂出即可见
