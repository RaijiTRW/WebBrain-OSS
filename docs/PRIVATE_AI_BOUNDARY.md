# Private AI Boundary

This OSS export intentionally excludes WebBrain's proprietary AI orchestration.

The public repository keeps the editor, document model, publication runtime,
Supabase integration, migrations, and deployment surface. The following areas
are replaced by small public stubs:

- prompt orchestration
- model/provider routing
- private design scoring and evaluation
- provider-cost heuristics
- WebBrain commercial pricing, credits, margins, and internal unit economics
- abuse-sensitive safety logic
- attachment/vision analysis

Production deployments can connect an internal AI service through
`lib/webbrain-ai/orchestrator.ts` or keep using WebBrain's private package.
Pricing files in the OSS export use demo placeholders. Replace them with
your own private commercial model before production.
