# WebBrain OSS

> The open editor and runtime behind **WebBrain** — an AI-assisted website builder that helps small businesses get a real, working website without writing a line of code.

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

## What is this?

WebBrain is a production website builder: you describe the site you need, answer a short brief, and get a working site — real forms, a database behind them, and one-click publishing. This repository is the **open core** of that product: the visual editor, the structured page document model, the generated-site runtime, and the publication pipeline.

We open-sourced these parts because they are useful on their own. At the heart of WebBrain is a simple idea: every page is a **validated, structured document** that an AI (or a human) can safely write into — and a runtime that turns that document into a fast, publishable site that can't be broken by malformed generated content.

## Highlights

- **Visual editor** — selectable sections and blocks, responsive preview, a structure panel, and admin-only code editing surfaces.
- **Structured document model** — pages are validated JSON documents with deterministic repair utilities, designed for safe AI generation.
- **Generated-site runtime** — renders documents into fast public pages with working forms, buttons, and navigation.
- **Publication pipeline** — publish flows, routing, and subdomain serving for generated sites.
- **Supabase integration** — auth, connected customer projects, form submissions, and database migrations included.
- **Real deployment shape** — production notes for an actual VPS + nginx setup, not a toy example.

## Quickstart

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Fill in `.env.local` using the comments in `.env.example`. Never commit `.env`, `.env.local`, private keys, API keys, OAuth secrets, or production database URLs.

## What's *not* here (and why)

WebBrain's AI layer — prompts, model routing, quality scoring, cost controls, and abuse guards — is intentionally private. Publishing it verbatim would mostly help people clone the paid service and weaken its abuse protections, not help contributors.

Instead, the files in `lib/webbrain-ai/**` are small, documented **stubs that mark the integration boundary**: plug your own AI service in there, or run the editor and runtime without AI entirely. Pricing files contain demo metadata only — real commercial numbers stay private.

Details: `docs/PRIVATE_AI_BOUNDARY.md`.

## Project layout

```text
app/          Next.js app shell, public pages, API routes
components/   Editor UI, blocks, preview, admin surfaces
lib/          Document model, validation, stores, publication logic
lib/webbrain-ai/  Public AI facade (stubs — bring your own AI)
supabase/     Schema and migrations
scripts/      Maintenance and deployment helpers
docs/         Architecture and boundary docs
```

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

For editor/runtime changes, also run Playwright browser checks against the local app and verify that generated pages render, scroll, publish, and keep forms working.

## Supabase setup

Apply the schema and migrations from `supabase/` to your project. For production, use a dedicated Supabase project and OAuth app with HTTPS callback URLs.

```text
production:  https://your-domain.com/api/supabase/oauth/callback
local dev:   http://localhost:3000/api/supabase/oauth/callback
```

## Deploying to production

The production shape is a Node/Next.js app behind nginx on a VPS:

```bash
npm install
npm run build
npm run start
```

Recommendations: run behind nginx with HTTPS, keep environment variables out of git, set `WEBBRAIN_APP_ORIGIN` and `WEBBRAIN_PUBLIC_ORIGIN` to the real HTTPS origin, use a dedicated Supabase OAuth app, use wildcard DNS/SSL if published sites live on subdomains, and restart the service only after `npm run build` succeeds.

## Contributing

Issues and pull requests are welcome — especially around the editor, document model, runtime, and publication flows. If something in the docs or setup is unclear, that's a bug too: please open an issue.

## License

Apache License 2.0 — see `LICENSE`.
