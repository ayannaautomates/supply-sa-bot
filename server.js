/**
 * server.js
 *
 * Minimal Express backend for the Supply SA vendor certification bot.
 *
 * Architecture:
 * - Checklist state and readiness logic = deterministic code (checklist-config.js)
 * - Document knowledge (why X is required, what it must contain) =
 *   deterministic lookup from real Supply SA validation rules
 *   (document-knowledge.js), fed into the prompt as reference context
 * - Conversational responses = Claude API (Haiku by default — cheap, fast)
 * - The LLM is told the current readiness report + relevant document
 *   knowledge as context and asked to explain it conversationally.
 *   It does NOT decide what's required and does NOT process or
 *   validate actual vendor documents — that's a separate, staff-facing
 *   system, not built here.
 * - Handoff (support email + Meet the Team page link) surfaces on
 *   keyword match, low-confidence flag, or sensitive-data detection.
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
import { CERTIFICATION_REQUIREMENTS, buildReadinessReport } from "./checklist-config.js";
import { HANDOFF_CONFIG } from "./handoff-config.js";
import { buildKnowledgeContext } from "./document-knowledge.js";

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

function buildSystemPrompt(readinessReport, knowledgeContext) {
  const missingList = readinessReport.missing
    .map((r) => `- ${r.label}: ${r.description}`)
    .join("\n");
  const completeList = readinessReport.complete
    .map((r) => `- ${r.label}`)
    .join("\n");

  const knowledgeBlock = knowledgeContext
    ? `\nRELEVANT DOCUMENT REQUIREMENTS (use this to explain WHY a document is needed or what it must contain — these are the real Supply SA certification rules):\n${knowledgeContext}\n`
    : "";

  return `You are a helpful assistant for Supply SA vendor certification.

Your ONLY job is to explain the vendor's certification readiness status below,
in plain conversational language, and answer general questions about what
each document is and why it's needed. You do NOT decide what's required —
that list is fixed and given to you below. Never invent requirements that
aren't listed. Never tell a vendor they are certified if items are missing.
${knowledgeBlock}
CURRENT VENDOR STATUS:
Complete:
${completeList || "(none yet)"}

Missing (required):
${missingList || "(none — all required items complete)"}

Fully certifiable: ${readinessReport.isFullyCertifiable ? "YES" : "NO"}

RULES:
- If asked "am I certified" or similar, answer based ONLY on the data above.
- If a vendor asks something you're not confident about (legal interpretation,
  exceptions to policy, anything outside this checklist), say so plainly and
  recommend they talk to a certification specialist. Do not guess.
- Use the document requirements above (if provided) to explain WHY a document
  matters and WHAT it generally needs to show. Speak in plain terms, not the
  internal rule format.
- CRITICAL — sensitive personal information: Several required documents
  contain sensitive personal data (SSN, birth certificate, citizenship/
  immigration status, ethnicity, disability status, military discharge
  details, financial account numbers, etc.). You may explain in GENERAL
  TERMS why a document is required and what category of information it
  shows. You must NEVER ask a vendor to type, paste, or share an actual
  SSN, ID number, account number, date of birth, or similar sensitive value
  in this chat. If a vendor pastes something that looks like sensitive
  personal data, do not repeat it back, do not confirm or comment on its
  validity, and tell them not to share that here — documents should be
  submitted through the official secure certification portal instead.
- Keep responses short and clear — vendors are often checking this on mobile.
- End your response with a JSON line in this exact format (on its own line,
  nothing else after it):
  {"needsHandoff": true or false}
  Set needsHandoff to true if you expressed uncertainty, the question is
  outside the checklist/document scope above, or the vendor shared anything
  that looks like sensitive personal data.`;
}

function parseHandoffFlag(responseText) {
  const match = responseText.match(/\{"needsHandoff":\s*(true|false)\}/);
  const needsHandoff = match ? match[1] === "true" : false;
  const cleanText = responseText.replace(/\{"needsHandoff":\s*(true|false)\}/, "").trim();
  return { cleanText, needsHandoff };
}

// POST /api/chat
// body: { message: string, vendorStatus: { [requirementId]: boolean }, history: [{role, content}] }
app.post("/api/chat", async (req, res) => {
  try {
    const { message, vendorStatus = {}, history = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    const readinessReport = buildReadinessReport(vendorStatus);
    const keywordHandoff = detectHandoffRequest(message);
    const knowledgeContext = buildKnowledgeContext(message);

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: buildSystemPrompt(readinessReport, knowledgeContext),
      messages: [...history, { role: "user", content: message }],
    });

    const rawText = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const { cleanText, needsHandoff } = parseHandoffFlag(rawText);
    const shouldHandoff = needsHandoff || keywordHandoff;

    res.json({
      reply: cleanText,
      needsHandoff: shouldHandoff,
      readinessReport,
      handoff: shouldHandoff ? HANDOFF_CONFIG : null,
    });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// GET /api/checklist - returns the static requirement list for rendering the form
app.get("/api/checklist", (req, res) => {
  res.json({ requirements: CERTIFICATION_REQUIREMENTS });
});

// GET /api/readiness-report?<requirementId>=true&...
// Standalone endpoint to generate a readiness report without the chat,
// useful for the "document checker" output you described separately.
app.post("/api/readiness-report", (req, res) => {
  const { vendorStatus = {} } = req.body;
  res.json(buildReadinessReport(vendorStatus));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Supply SA vendor bot backend running on port ${PORT}`);
});
