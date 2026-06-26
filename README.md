# Supply SA Vendor Certification Bot

A lightweight, low-cost replacement for the Voiceflow chatbot. No platform
fee — you only pay for Claude API tokens (fractions of a cent per
conversation at this scale).

## How it works

- **Checklist logic is deterministic** (`checklist-config.js`) — plain
  code, not the LLM. The bot can't improvise what's required.
- **Document knowledge is deterministic too** (`document-knowledge.js` +
  `validation-rules-data.json`) — built from Supply SA's real
  certification document validation rules (93 rules across 46 document
  types). When a vendor asks "why do you need my lease agreement?" or
  "what counts as a valid Schedule K-1?", the bot pulls the real rule
  text into its context instead of guessing.
- **Claude (Haiku 4.5)** handles the conversational layer: explaining
  status, answering general questions, explaining document requirements
  in plain language.
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

Edit `checklist-config.js`:
- Update `CERTIFICATION_REQUIREMENTS` to match your actual required
  document list for the checklist tiles (this is separate from the
  93-rule knowledge base, which is reference-only).

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
