# Salman Chowdhury — Software, AI and Data Portfolio

A lightweight GitHub Pages portfolio for graduate and junior software, testing, data, automation and application-support opportunities. It presents six public projects with source, test and result links.

**Live site:** https://salman-chowdhury.github.io/portfolio/

## Featured work

- AI FAQ Chatbot — RAG and browser tests, with clearly scoped offline evaluation.
- Council Request Workflow — typed workflow rules, regression tests and recovery.
- Web to Sheets — Python integration, delivery retries and troubleshooting.
- Asset Insights — SQL reporting and source-to-output reconciliation.
- Job-Shop Scheduling Lab — scheduling constraints and operational trade-offs.
- Time-Series Forecasting — chronological evaluation and baseline comparison.

Power Apps evidence and the SaaS workspace prototype remain supporting links. Private-project summaries and the unmerged LLM evaluation toolkit are not headline projects.

## Local preview and validation

```bash
python -m http.server 8000
node scripts/check-site.mjs
```

Open `http://localhost:8000`. The site uses static HTML/CSS and JavaScript filters, with no tracking or contact form. GitHub Actions checks assets and evidence links before deploying to Pages.

The screenshots in `screenshots/` record the earlier July 2026 layout. They are retained as historical evidence and are not presented as the current homepage.

[Architecture and validation history](docs/case-study.md)
