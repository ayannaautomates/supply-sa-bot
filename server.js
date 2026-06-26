/**
 * server.js
 *
 * Minimal Express backend for the Supply SA vendor certification bot.
 *
 * Architecture:
 * - The Certification Readiness Check is a SEPARATE, deterministic,
 *   button-driven flow (readiness-flow-config.js + the
 *   /api/readiness-flow/* endpoints below) — branching profile
 *   questions decide which document groups apply, with real
 *   specialist guidance attached to each. This flow is NOT handled by
 *   the LLM and the free-text /api/chat endpoint has no visibility
 *   into it; the chat prompt explicitly tells the model not to
 *   fabricate or guess at readiness status and to redirect the vendor
 *   to the real guided flow instead.
 * - Document knowledge (why X is required, what it must contain) =
 *   deterministic lookup from real Supply SA validation rules
 *   (document-knowledge.js) PLUS the real specialist guidance notes
 *   from readiness-flow-config.js (via buildGuidanceContext), fed into
 *   the prompt as reference context so "why is this needed" questions
 *   are grounded in real text instead of invented.
 * - FAQ knowledge base = deterministic lookup from the real Supply SA
 *   FAQ page (faq-knowledge.js), fed into the prompt as reference context
 * - Persona, tone, and behavior rules = persona-config.js
 * - Conversational responses = Claude API (Haiku by default — cheap, fast)
 *   for free-text questions only. It does NOT decide certification
 *   requirements, does NOT make eligibility determinations, and does
 *   NOT process or validate actual vendor documents — that's a
 *   separate, staff-facing system, not built here.
 * - Handoff (support email + Meet the Team page link) surfaces on
 *   keyword match, low-confidence flag, or sensitive-data detection.
 * - Greeting + quick-reply buttons (/api/greeting) and the events
 *   link-out (/api/events) support the three starting options from
 *   the Instructions: check readiness, ask a question, see events.
 *
 * Run:
 *   1. cp .env.example .env   (then add your real ANTHROPIC_API_KEY)
 *   2. npm install
 *   3. npm start
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import { HANDOFF_CONFIG, SITE_LINKS } from "./handoff-config.js";
import { buildKnowledgeContext, buildGuidanceContext } from "./document-knowledge.js";
import { buildFaqContext } from "./faq-knowledge.js";
import { PERSONA, INSTRUCTIONS, FORMATTING_RULES } from "./persona-config.js";
import {
  PROFILE_QUESTIONS,
  getApplicableGroups,
  buildGroupReadinessSummary,
  RENEWAL_GUIDANCE,
  PROCESS_NOTES,
} from "./readiness-flow-config.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Use Haiku for cost — this is conversational glue, not heavy reasoning.
// Bump to "claude-sonnet-4-6" if you find Haiku missing nuance in vendor questions.
const MODEL = "claude-haiku-4-5-20251001";

function detectHandoffRequest(message) {
  const lower = message.toLowerCase();
  return HANDOFF_CONFIG.handoffKeywords.some((kw) => lower.includes(kw));
}

function buildSystemPrompt(knowledgeContext, faqContext, guidanceContext) {
  const knowledgeBlock = knowledgeContext
    ? `\n# Relevant Document Validation Criteria\nThis describes what fields/contents a document must have to pass review — not why it's required. Use it for "what does this document need to show" questions, in plain terms, not the internal rule format.\n${knowledgeContext}\n`
    : "";

  const guidanceBlock = guidanceContext
    ? `\n# Relevant Document Purpose & Guidance (real specialist notes)\nThis is the grounded, real explanation of WHY a document is required and what it's used to verify, taken directly from Supply SA's certification specialist process notes. For any question asking why a document is needed or what it's for, you MUST base your answer only on this text — never invent or infer a purpose (e.g. do not say a document is for "getting paid" or "ACH setup" or any other reason not stated here). If a document isn't covered here and you don't have a grounded reason, say you're not certain of the specific reason and offer to connect the vendor with a specialist rather than guessing.\n${guidanceContext}\n`
    : "";

  const faqBlock = faqContext
    ? `\n# Relevant FAQ Knowledge Base Entries\nThis is the "Knowledge Base" tool — use these real Supply SA FAQ answers to ground your response. Speak naturally, don't just copy the Q&A format.\n${faqContext}\n`
    : "";

  return `${PERSONA}

${INSTRUCTIONS}

${FORMATTING_RULES}

# Important — You Are NOT Running the Readiness Check Here
The Certification Readiness Check is a separate guided, button-driven flow in this widget — it is NOT something you administer through free-text chat, and you have NO visibility into where any vendor currently stands in it (no document checklist, no missing-items list, nothing). You must never state, imply, or guess that a vendor is "missing" specific documents, nor list out a checklist as if it reflects their real status — there is no such live data available to you in this conversation. If a vendor asks about their readiness, what documents they need, or wants to start/restart that check, tell them to use the "Check certification readiness" option (or type something like "check certification readiness" / "start over") so the real guided flow can run, rather than trying to answer it yourself.
${guidanceBlock}${knowledgeBlock}${faqBlock}
# Handoff Signal
End every response with a JSON line in this exact format, on its own line, nothing else after it:
{"needsHandoff": true or false}
Set needsHandoff to true if: you don't have a confident answer, the question requires an eligibility/legal judgment, the case needs staff review (Native American certification, recently changed ownership, partnership-specific documents, unusual cases), the vendor asked to speak with a person, or the vendor shared anything that looks like sensitive personal data (SSN, ID number, account number, date of birth, etc — per the Guardrails above, do not repeat such values back).`;
}

function parseHandoffFlag(responseText) {
  const match = responseText.match(/\{"needsHandoff":\s*(true|false)\}/);
  const needsHandoff = match ? match[1] === "true" : false;
  const cleanText = responseText.replace(/\{"needsHandoff":\s*(true|false)\}/, "").trim();
  return { cleanText, needsHandoff };
}

// Safety net: strip common Markdown syntax even if the model slips up
// and uses it despite the FORMATTING_RULES instruction. Keeps the
// widget's plain-text rendering clean.
function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // **bold**
    .replace(/\*(.*?)\*/g, "$1") // *italic*
    .replace(/^#{1,6}\s+/gm, "") // # headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](url) -> text
    .trim();
}

// POST /api/chat
// body: { message: string, vendorStatus: { [requirementId]: boolean }, history: [{role, content}] }
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    const keywordHandoff = detectHandoffRequest(message);
    const knowledgeContext = buildKnowledgeContext(message);
    const guidanceContext = buildGuidanceContext(message);
    const faqContext = buildFaqContext(message);

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: buildSystemPrompt(knowledgeContext, faqContext, guidanceContext),
      messages: [...history, { role: "user", content: message }],
    });

    const rawText = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const { cleanText, needsHandoff } = parseHandoffFlag(rawText);
    const shouldHandoff = needsHandoff || keywordHandoff;

    res.json({
      reply: stripMarkdown(cleanText),
      needsHandoff: shouldHandoff,
      handoff: shouldHandoff ? HANDOFF_CONFIG : null,
    });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// GET /api/greeting - returns the starting message + the three quick-reply
// button options described in the Instructions (Starting Message section).
app.get("/api/greeting", (req, res) => {
  res.json({
    message: "👋 Welcome to Supply SA. I can help you get certified, prep your documents, and find ways to do business with us. What can I help you with?",
    options: [
      { id: "readiness", label: "Check certification readiness" },
      { id: "question", label: "Ask a question" },
      { id: "events", label: "See upcoming events" },
    ],
  });
});

// GET /api/events - events change frequently (dates pass), so rather than
// hardcoding event data here that would go stale, this points the vendor
// to the live events page. If/when a real events feed is wired up later,
// this endpoint is the place to return structured event data instead.
app.get("/api/events", (req, res) => {
  res.json({
    message: "Here's where to find our latest workshops, office hours, and partner events:",
    eventsPageUrl: SITE_LINKS.eventsPageUrl,
    eventsPageLabel: SITE_LINKS.eventsPageLabel,
  });
});

// GET /api/readiness-flow/start - returns the process note + the first
// profile question. The frontend holds flow state (answers so far,
// current index) and sends it back on each subsequent call — this
// backend stays stateless per-request, matching the rest of the app.
app.get("/api/readiness-flow/start", (req, res) => {
  res.json({
    intro: PROCESS_NOTES.beforeStarting,
    question: PROFILE_QUESTIONS[0],
    questionIndex: 0,
    totalQuestions: PROFILE_QUESTIONS.length,
  });
});

// POST /api/readiness-flow/next-question
// body: { questionIndex: number, answers: { [questionId]: value } }
// Returns the next profile question, OR signals profile is complete and
// it's time to move to document groups (with renewal short-circuit).
app.post("/api/readiness-flow/next-question", (req, res) => {
  const { questionIndex = 0, answers = {} } = req.body;

  // Renewal short-circuit: if the first answer was "renewal", skip
  // straight to the condensed renewal checklist instead of the full
  // profile + document walkthrough, per the SOP.
  if (answers.app_type === "renewal") {
    return res.json({
      done: true,
      isRenewal: true,
      renewalIntro: RENEWAL_GUIDANCE.intro,
      renewalItems: RENEWAL_GUIDANCE.items,
      renewalOutro: RENEWAL_GUIDANCE.outro,
    });
  }

  const nextIndex = questionIndex + 1;
  if (nextIndex >= PROFILE_QUESTIONS.length) {
    // Profile complete — move to document groups.
    const applicableGroups = getApplicableGroups(answers);
    return res.json({
      done: true,
      isRenewal: false,
      applicableGroups: applicableGroups.map((g) => ({
        id: g.id,
        title: g.title,
        items: g.items.map((i) => i.label),
        note: g.note || null,
      })),
      responseRequirements: PROCESS_NOTES.responseRequirements,
    });
  }

  res.json({
    done: false,
    question: PROFILE_QUESTIONS[nextIndex],
    questionIndex: nextIndex,
    totalQuestions: PROFILE_QUESTIONS.length,
  });
});

// POST /api/readiness-flow/summary
// body: { answers: {...}, groupStatus: { [groupId]: "have_all"|"not_yet" } }
// Returns the final ready/missing summary with guidance notes for
// anything marked "not yet".
app.post("/api/readiness-flow/summary", (req, res) => {
  const { answers = {}, groupStatus = {} } = req.body;
  const applicableGroups = getApplicableGroups(answers);
  const { ready, missing, isFullyReady } = buildGroupReadinessSummary(applicableGroups, groupStatus);

  res.json({
    isFullyReady,
    ready: ready.map((g) => ({ id: g.id, title: g.title })),
    missing: missing.map((g) => ({
      id: g.id,
      title: g.title,
      items: g.items.map((i) => ({ label: i.label, guidance: i.guidance })),
      note: g.note || null,
    })),
    applicationPortalUrl: SITE_LINKS.applicationPortalUrl,
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Supply SA vendor bot backend running on port ${PORT}`);
});
