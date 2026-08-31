# 学术影响力系统运营手册(IMPACT SYSTEM)

本系统 = **站内 ASEO**(Google Scholar 收录优化)+ **OAI-PMH 渠道**(经 Zenodo/OSF 等第三方库)+ **全渠道内容分发流水线**(MoneyPrinterPlus 式平台注册表架构)。人工只在 `review/` 环节做质量审核。

## 一、系统架构

```
content/posts/*.md          src/data/publications.ts
      │                            │
      ▼                            ▼
站内 /blog/*.html            站内 /papers/*.html(每篇一页 + citation_* 标签)
      │                            │
      └───────► /rss.xml ◄─────────┘
                  │
     ┌────────────┼─────────────────────────┐
     ▼            ▼                         ▼
scripts/syndicate(API 平台)      scripts/syndicate(草稿平台)
 dev.to / hashnode / 公众号       medium / 知乎 / 掘金 / reddit / 小红书
     │                                │
     ▼                                ▼
 自动发布(canonical 回源)        review/ 人工审核 → 人工/半自动发布
```

学术侧另有一条独立通道:`scripts/zenodo-deposit.mjs` 把论文 PDF 存档到 Zenodo,自动获得 DOI,并经 Zenodo 自带的 OAI-PMH 端点被 BASE / CORE / OpenAIRE 收割(无需自建 OAI-PMH)。

## 二、日常工作流

### 发表新论文时
1. 在 `src/data/publications.ts` 追加一条记录(slug、title、authors、venue、date、doi、abstract、keywords 等)。
2. 若有 PDF 自存档,放入 `public/papers/` 并填 `pdfUrl`。
3. `npm run build` 部署 → 摘要页自动出现在 `/papers/<slug>.html`,带全套 `citation_*` 标签。
4. (可选)`node scripts/zenodo-deposit.mjs public/papers/XXX.pdf --title "..." --publish` 存档 Zenodo 拿 DOI,先把 `ZENODO_BASE_URL` 指向 sandbox 测一次。

### 发表新博客时
1. 在 `content/posts/` 写 markdown(frontmatter:title / date / description / tags / canonicalPath / paperRef;不想立刻分发就加 `draft: true`)。
2. `npm run build` 部署,文章进入 `/rss.xml`。
3. `node scripts/syndicate/run.mjs` → API 平台自动发(dev.to 存为 draft,确认后 `--publish`);其余平台草稿生成到 `review/`。
4. 人工审核 `review/` 里的草稿 → 按各平台方式发布(见下)。

## 三、各平台开通与发布方式

| 平台 | 开通步骤 | 发布方式 |
|---|---|---|
| **dev.to** | Settings → Extensions → Publishing from RSS,填 `https://jaimeyan.com/rss.xml`,勾选 "mark RSS source as canonical"(**当前生效方案**) | RSS 自动抓为草稿 → `.github/workflows/devto-publish.yml` 每周四自动发布 2 篇(队列顺序取自 RSS);`scripts/syndicate/devto.mjs` 已停用以免产生重复草稿 |
| **Hashnode** | 需 Pro($50/年)→ 拿 Personal Access Token + Publication ID | `node scripts/syndicate/hashnode.mjs <post.md> [--publish]`,canonical 走 `originalArticleURL` |
| **公众号** | 公众平台 → 开发 → 基本配置拿 AppID/AppSecret,配置 IP 白名单 | `node scripts/syndicate/wechat.mjs <post.md>` 推到草稿箱,人工在后台点群发。注意:正文图片必须走素材 API,外链图会被剥掉 |
| **Medium** | 无需开通(API 已废弃) | `review/*.medium.md` 里有 import 链接与步骤:Medium 编辑器 → Import a story → 粘贴站内 URL,Medium 自动把 canonical 指回 jaimeyan.com |
| **知乎 / 掘金** | 安装 Wechatsync 浏览器扩展并登录各平台 | 把 `review/*.zhihu.md` / `*.juejin.md` 内容经 Wechatsync 同步,**默认存草稿**,人工检查后发布。掘金/CSDN 2026 年起反爬加强,不要用高频脚本 |
| **Reddit** | 用有真实发言记录的账号 | `review/*.reddit.md` 是"回答问题+不经意提及"式草稿。人工选板块(r/bioinformatics、r/clinicalresearch、r/LLMDevs、r/statistics),全站每周 ≤1-2 帖,自推内容占比 ≤10%。r/MachineLearning 禁止自推,不碰 |
| **小红书** | 无发布 API,手动 | `review/*.xiaohongshu.md` 是 ≤300 字短文案 + 5 页轮播大纲,配图人工做,当引流渠道用 |

## 四、一次性手工清单(阶段 C,学术侧)

- [x] **注册 ORCID** → 已填入 `Layout.astro` JSON-LD `sameAs`(0009-0007-1786-7259)。剩:在 ORCID 里授权 Crossref/DataCite 自动更新,各平台个人资料挂上 iD。
- [x] **Google Search Console** 已验证(HTML 文件方式)并提交 sitemap;Bing 已从 GSC 导入。新文章用 GSC 网址检查工具请求索引加速收录。
- [ ] **验证 citation 标签**:部署后打开任一 `/papers/*.html`,查看源代码确认 `citation_title` / `citation_author` / `citation_publication_date` 三个必填标签都在(2026-08-30 已抽查通过)。Scholar 收录需数周,之后用 `site:jaimeyan.com` 在 Scholar 里检查。
- [ ] **medRxiv / arXiv 新手动提交**(无 API):新方法学论文先发 medRxiv(临床受众),CS 向发 arXiv stat.ME/stat.AP。已有 DOI 的用 `scripts/zenodo-deposit.mjs` 补 Zenodo 存档。
- [ ] **Zenodo**:注册 → Settings → Applications → 新建 token(scopes: deposit:write+deposit:actions)→ 填入 `ZENODO_TOKEN`;关联 GitHub 账号可自动存档代码仓库 release。
- [ ] **Google Scholar 个人页**:确认所有新论文被收录后手动补录漏网条目;开启自动合并更新。
- [x] **dev.to RSS 自动导入**已开(canonical 已验证全部指回主站);发布由 `.github/workflows/devto-publish.yml` 每周四自动发 2 篇。
- [ ] **Newsletter**:注册 Buttondown → 把用户名填进 `src/components/Newsletter.astro` 的 `BUTTONDOWN_USER` → 重新部署,订阅框自动出现在博客首页和每篇文章底部。

## 四点五、内容生产管线(2026-08-30 起)

| 管线 | 触发 | 命令/机制 |
|---|---|---|
| 季度综述(survey) | GitHub Actions 每季度自动开提醒 issue(1/4/7/10 月 3 日) | `npm run new-post -- --kind survey --slug <topic>-<YYYYqN>` → 按 `templates/survey-template.md` 写 4000–6000 字,References 必须逐条实际验证 |
| 论文三件套 | 新论文加入 `publications.ts` 后 | `npm run paper-kit -- <slug>` → 深度文骨架 + LinkedIn 草稿(`review/`)+ 手工清单 |
| 实测收据(note) | 新模型/工具/CDISC 更新 48 小时内 | `npm run new-post -- --kind note` → 按 `templates/note-template.md` 贴真实 prompt/输出 |
| 引流文(explainer) | 热点话题 | `npm run new-post -- --kind explainer` |
| 发布 | 每周四 15:42 UTC | devto-publish.yml 自动发 2 篇 dev.to 草稿(队列顺序取自 RSS) |

## 五、环境变量(见 `.env.example`)

`DEV_TO_API_KEY`、`HASHNODE_TOKEN`、`HASHNODE_PUBLICATION_ID`、`WECHAT_APPID`、`WECHAT_SECRET`、`ZENODO_TOKEN`、`ZENODO_BASE_URL`。GitHub Actions 用同名 Secrets;没有 token 时所有脚本自动进入 dry-run,不会误发。

## 六、纪律与红线

- 任何平台都先 dry-run / 草稿,人工过目再发 —— 这是设计,不是麻烦。
- 知乎/掘金/小红书不要用高频自动化脚本,账号被封的代价远大于省的时间。
- Reddit 永远人工发帖,记住 ~10% 自推上限。
- 所有外发内容 canonical / 原文链接都指回 jaimeyan.com,权重只往主站集中。
