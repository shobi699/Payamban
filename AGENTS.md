<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# OpenReply Agent Instructions & Operational Rules

All agents working on this project must strictly comply with the comprehensive rules, skills, and architectural directives defined in:
- **[agent.md](file:///e:/AI/dayrect/agent.md)** (Supreme Operational Manual, Code Guidelines, and Skills Matrix)
- **[PLAN.md](file:///e:/AI/dayrect/PLAN.md)** (Architecture Audit, Persian RTL Localization, Instagram Integration, and 4-Phase Roadmap)

### Key Priorities:
1. **Zero-Placeholder Policy:** Complete, production-grade code only (no `// ...`, `// TODO`, or skeletal files).
2. **Strict RTL & Persian Localization:** All interfaces, typography (Vazirmatn), logical CSS properties, numbers, and dates must be localized.
3. **Spec-Driven Development:** Feature development must follow the SpecKit methodology (`.agents/skills/speckit-*`).
4. **Security & Resilience:** Secure token encryption with AES-256-GCM, auto-renewal in worker, non-blocking webhook ingestion, and strict rate-limiting.
