# Supply SA Vendor Certification Bot

A lightweight, low-cost replacement for the Voiceflow chatbot. No platform
fee — you only pay for Claude API tokens (fractions of a cent per
conversation at this scale).

## How it works

- **Guided readiness check** (`readiness-flow-config.js`) — a branching, deterministic flow ported from the earlier Voiceflow build and enriched with real specialist guidance from the Certification Navigation Process SOP. It asks profile questions (new vs. renewal, certification types, entity type, industry, jurisdiction, etc.), then shows only the document groups that actually apply — grouped into ~7-11 screens instead of one screen per document — and ends with a tailored ready/missing summary including the specific guidance a specialist would give for each missing item. Renewals short-circuit into a structured 6-item renewal checklist instead of the full walkthrough, per the SOP. None of this branching logic touches the LLM — it's all plain code, so the bot can't improvise document requirements. **The free-text `/api/chat` endpoint has no visibility into this flow's state** — the system prompt explicitly tells the model not to fabricate or guess readiness status, and to redirect vendors to the real guided flow instead.
- **`checklist-config.js` is currently unused** — it was an early placeholder (5 generic items) from before the real guided readiness flow existed. It's not imported anywhere and can be safely deleted; it's left in the repo only as historical reference.
- **Document knowledge is deterministic too** (`document-knowledge.js` +
  `validation-rules-data.json`) — built from Supply SA's real
  certification document validation rules (93 rules across 46 document
  types). When a vendor asks "why do you need my lease agreement?" or
  "what counts as a valid Schedule K-1?", the bot pulls the real rule
  text into its context instead of guessing.
- **FAQ knowledge base** (`faq-knowledge.js`) — built from the real Supply SA FAQ page (https://supply-sa.org/faq/), 21 entries covering fees, timelines, renewal rules, NAICS codes, and more. Surfaced as grounding context when a vendor's question matches.
- **Persona, tone, and behavior rules** (`persona-config.js`) — the bot's voice, goals, and guardrails (no eligibility determinations, no accepting sensitive data in chat, staff handoff triggers) as a standalone editable file. Also enforces plain-text output (no Markdown) since the widget renders plain text.
- **Claude (Haiku 4.5)** handles the conversational layer for free-text questions: explaining
  status, answering general questions, explaining document requirements
  in plain language.
- **Greeting + 3 quick-reply buttons** (`/api/greeting`) — "Check certification readiness," "Ask a question," and "See upcoming events," matching the Instructions' Starting Message spec. Each button routes to its own flow.
- **Events** (`/api/events`) — rather than hardcoding event dates (which go stale fast), this links out live to https://supply-sa.org/events/.
- **Handoff** (Supply SA support email + link to the Meet the Team page)
  surfaces automatically when:
  - the vendor uses a "talk to a human" type phrase, OR
  - the model flags low confidence (question outside checklist/knowledge
    scope), OR
  - the vendor shares anything that looks like sensitive personal data
    (SSN, ID number, etc. — see security note below), OR
  - the vendor taps the always-visible "Need to talk to a human?" link
- The handoff card links to https://supply-sa.org/meet-the-team/ so the
  vendor can pick whichever specialist they want — no need to maintain
  individual links here if staff changes.

## Security note — sensitive document types

The validation rules cover several document types containing sensitive
personal information: SSN cards, birth certificates, citizenship/
ethnicity proof, disability documentation, military discharge records
(DD-214), financial statements, and ID documents. The bot is explicitly
instructed to:
- Explain *why* these documents are required and *what category* of
  information they show, in general terms only
- Never ask a vendor to type or paste an actual SSN, ID number, date of
  birth, or similar value into the chat
- Never repeat back or validate any such value if a vendor pastes one
  anyway — instead redirect them to the official secure certification
  portal and offer the human handoff

This chatbot does not receive, store, or process actual vendor documents.
Document review/validation against these rules is a separate, staff-facing
system — not built here.

## Setup

```bash
cd supply-sa-bot
npm install
cp .env.example .env
# edit .env and add your real ANTHROPIC_API_KEY
npm start
```

Then open `http://localhost:3001` in a browser.

## Before going live — check the placeholders

Edit `handoff-config.js` if anything changes:
- `supportEmail` → currently set to support@supply-sa.org
- `teamPageUrl` / `teamPageLabel` → currently points to
  https://supply-sa.org/meet-the-team/

To update the actual readiness check content, edit `readiness-flow-config.js`:
- `PROFILE_QUESTIONS` → the branching questions asked at the start
- `DOCUMENT_GROUPS` → which documents apply to which vendor profile, and the real guidance shown for each
- `RENEWAL_GUIDANCE` → the renewal-specific document checklist

## Cost estimate

At Haiku 4.5 rates ($1/$5 per million tokens), a typical vendor
conversation (a few exchanges) costs well under a cent. Even at high
volume (hundreds of conversations/month) you're looking at a few dollars
total — no monthly platform fee.

## Deploying

This is a standard Express app — deploy to Vercel, Render, Railway, or
any Node host. Set `ANTHROPIC_API_KEY` as an environment variable on
whichever platform you choose (never commit your real key to git).

## Extending toward a document-checker workflow (future, separate build)

The `/api/readiness-report` endpoint already returns a structured
complete/missing report from a vendorStatus object. The 93 validation
rules in `validation-rules-data.json` are also structured for a future
document-upload compliance checker (staff-facing, secure environment) —
that's a separate project from this chatbot, but the data is ready to be
reused as the rules engine when you're ready to build it.
