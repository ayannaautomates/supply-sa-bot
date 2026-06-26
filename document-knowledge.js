/**
 * document-knowledge.js
 *
 * Reference knowledge for the chatbot to explain WHY a document is
 * required and WHAT it needs to contain, sourced from Supply SA's
 * real certification document validation rules.
 *
 * IMPORTANT — scope boundary:
 * This is reference/explanatory knowledge only. The bot uses this to
 * answer vendor questions like "why do you need my SSN card?" or
 * "what counts as a valid lease agreement?". It does NOT perform
 * document review, extraction, or validation — that's a separate,
 * staff-facing system (not built here). This module never receives
 * or stores any vendor-submitted document content or personal data.
 *
 * SECURITY NOTE: Several document types here involve sensitive PII
 * (SSN cards, birth certificates, citizenship/ethnicity proof,
 * disability documentation, DD-214s). The system prompt built from
 * this data explicitly instructs the model to explain requirements
 * in general terms only, and never to ask for, accept, repeat back,
 * or process actual sensitive values (SSNs, ID numbers, dates of
 * birth, etc.) even if a vendor pastes them into chat.
 */

import rawRules from "./validation-rules-data.json" with { type: "json" };
import { DOCUMENT_GROUPS } from "./readiness-flow-config.js";

export const VALIDATION_RULES = rawRules;

// Generic words that appear across many unrelated document items and
// shouldn't count as a meaningful match on their own (e.g. "letter"
// appears in both "Bank Letter" and "EIN Letter"). Shared by both the
// validation-rules matcher and the SOP-guidance matcher below.
const GENERIC_TERMS = new Set([
  "letter", "document", "documents", "form", "forms", "card", "cards",
  "copy", "statement", "statements", "proof", "certificate",
  "certificates", "agreement", "license", "application", "have", "need",
  "your", "what", "that", "this", "those", "these", "with", "from",
]);

// Short but meaningful domain terms that would otherwise be filtered
// out by the length > 3 rule (EIN, K-1, DBA, DD-214, etc).
const SHORT_DISTINCTIVE_TERMS = new Set(["ein", "k-1", "k1", "dba", "dd-214", "dd214", "pnw"]);

// Word-boundary tokenizer — NOT substring matching. Using substring
// `.includes()` previously caused false positives like "office"
// matching inside "officers". Splits on non-alphanumeric (keeping
// hyphens, so "dd-214" and "k-1" survive as single tokens).
function tokenize(text) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((w) => w.length > 3 || SHORT_DISTINCTIVE_TERMS.has(w));
}

// Friendly display names for document type codes, used so the bot
// doesn't talk to vendors in ALL_CAPS_SNAKE_CASE.
export const DOCUMENT_TYPE_LABELS = {
  AFFIDAVIT: "Affidavit",
  FINANCIAL_STATEMENT: "Personal Net Worth (PNW) Statement",
  KEY_PERSON_RESUME: "Key Person Resume",
  BUSINESS_TAX_RETURNS: "Business Tax Returns",
  SCHEDULE_K1: "Schedule K-1",
  FORM_1125E: "Form 1125-E",
  BIRTH_CERTIFICATE: "Birth Certificate",
  CURRENT_PASSPORT: "Current U.S. Passport",
  PASSPORT: "Passport",
  CERTIFICATE_OF_NATURALIZATION: "Certificate of Naturalization",
  PERMANENT_RESIDENT_CARD: "Permanent Resident Card",
  PERSONAL_TAX_RETURN_1040: "Personal Tax Return (Form 1040)",
  CERTIFICATE_OF_FORMATION: "Certificate of Formation",
  ARTICLES_OF_INCORPORATION: "Articles of Incorporation",
  INITIAL_CONTRIBUTION_PROOF: "Proof of Initial Contribution",
  FEDERAL_EIN: "Federal EIN Documentation",
  LEASE_AGREEMENT: "Lease Agreement",
  BANK_SIGNATURE_CARD: "Bank Signature Card / Authorization",
  OPERATING_AGREEMENT: "Operating Agreement",
  STOCK_CERTIFICATE: "Stock Certificate",
  STOCK_TRANSFER_LEDGER: "Stock Transfer Ledger",
  INVOICE: "Invoice",
  CONTRACT: "Contract",
  BUSINESS_LICENSE: "Business License",
  INSURANCE: "Insurance Certificate / Policy",
  TWC_QUARTERLY_REPORT: "TWC Quarterly Report",
  DBA_DOCUMENT: "DBA Document",
  ASSUMED_NAME_CERTIFICATE: "Assumed Name Certificate",
  FRANCHISE_AGREEMENT: "Franchise Agreement",
  PROFESSIONAL_LICENSE: "Professional License",
  DISABILITY_VERIFICATION: "Disability Verification",
  DISABILITY_DOCUMENTATION: "Disability Documentation",
  DD214_MILITARY_DISCHARGE: "DD-214 (Military Discharge)",
  MILITARY_DOCUMENTATION: "Military Documentation",
  PROOF_OF_CITIZENSHIP: "Proof of Citizenship",
  PROOF_OF_ETHNICITY: "Proof of Ethnicity",
  STATE_ID: "State ID",
  DRIVERS_LICENSE: "Driver's License",
  SSN_CARD: "Social Security Card",
  TRIBAL_CARD: "Tribal Card",
  RELIGIOUS_RECORD: "Religious Record",
  OTHER_CITIZENSHIP_PROOF: "Other Citizenship Proof",
  TAX_RETURN: "Tax Return",
  PERSONAL_TAX_RETURN: "Personal Tax Return",
  BANK_STATEMENT: "Bank Statement",
  PARTNERSHIP_AGREEMENT: "Partnership Agreement",
};

// Document types that involve sensitive personal data. The system
// prompt uses this to add extra caution language for these specific
// types (no requesting/echoing actual values).
export const SENSITIVE_DOCUMENT_TYPES = new Set([
  "BIRTH_CERTIFICATE",
  "CURRENT_PASSPORT",
  "PASSPORT",
  "CERTIFICATE_OF_NATURALIZATION",
  "PERMANENT_RESIDENT_CARD",
  "PERSONAL_TAX_RETURN_1040",
  "PERSONAL_TAX_RETURN",
  "FINANCIAL_STATEMENT",
  "DISABILITY_VERIFICATION",
  "DISABILITY_DOCUMENTATION",
  "PROOF_OF_CITIZENSHIP",
  "PROOF_OF_ETHNICITY",
  "STATE_ID",
  "DRIVERS_LICENSE",
  "SSN_CARD",
  "TRIBAL_CARD",
  "DD214_MILITARY_DISCHARGE",
  "MILITARY_DOCUMENTATION",
]);

function friendlyLabel(docType) {
  return DOCUMENT_TYPE_LABELS[docType] || docType;
}

/**
 * Returns all rules for a given document type code.
 */
export function getRulesForDocument(docTypeCode) {
  return VALIDATION_RULES.filter((r) => r.documentType === docTypeCode);
}

/**
 * Simple keyword search across document type labels + rule fields,
 * for matching a vendor's free-text question to relevant rules.
 * e.g. "why do you need my w9" -> won't match directly (W9 isn't in
 * this workbook's docs), but "why do you need my lease" will match
 * LEASE_AGREEMENT rules.
 */
export function findRelevantRules(queryText, maxResults = 6) {
  const lower = queryText.toLowerCase();
  const scored = [];

  for (const [code, label] of Object.entries(DOCUMENT_TYPE_LABELS)) {
    const labelLower = label.toLowerCase();
    const codeWords = code.toLowerCase().split("_").join(" ");
    if (lower.includes(labelLower) || labelLower.includes(lower) || lower.includes(codeWords)) {
      scored.push(code);
    }
  }

  // Fallback: word-overlap match against rule fields/instructions.
  // Uses word-boundary tokenize (not substring includes) to avoid
  // false positives like "office" matching inside "officers".
  if (scored.length === 0) {
    const words = tokenize(queryText);
    const docTypeScores = {};
    for (const rule of VALIDATION_RULES) {
      const haystackWords = new Set(tokenize(`${rule.field} ${rule.instruction}`));
      const overlap = words.filter((w) => !GENERIC_TERMS.has(w) && haystackWords.has(w)).length;
      if (overlap >= 2) {
        docTypeScores[rule.documentType] = (docTypeScores[rule.documentType] || 0) + overlap;
      }
    }
    const ranked = Object.entries(docTypeScores).sort((a, b) => b[1] - a[1]);
    for (const [docType] of ranked) {
      scored.push(docType);
    }
  }

  const matchedTypes = scored.slice(0, 3);
  const rules = matchedTypes.flatMap((code) => getRulesForDocument(code));
  return rules.slice(0, maxResults);
}

/**
 * Builds a compact, prompt-safe summary block of relevant rules for
 * a given vendor question. Used inside the chat system prompt.
 */
export function buildKnowledgeContext(queryText) {
  const rules = findRelevantRules(queryText);
  if (rules.length === 0) return null;

  const byDoc = {};
  for (const rule of rules) {
    if (!byDoc[rule.documentType]) byDoc[rule.documentType] = [];
    byDoc[rule.documentType].push(rule);
  }

  let block = "";
  for (const [docType, rules] of Object.entries(byDoc)) {
    const isSensitive = SENSITIVE_DOCUMENT_TYPES.has(docType);
    block += `\n${friendlyLabel(docType)}${isSensitive ? " (sensitive document — explain requirement only, do not request or repeat actual values)" : ""}:\n`;
    for (const r of rules) {
      block += `  - ${r.field}: ${r.instruction}\n`;
    }
  }
  return block.trim();
}

/**
 * Searches the real specialist guidance notes from the Certification
 * Navigation Process SOP (via readiness-flow-config.js DOCUMENT_GROUPS)
 * for items matching the vendor's question. This is the actual "why
 * this document is needed" knowledge — separate from the validation
 * rules above, which only describe what fields must be present.
 *
 * Without this, the model has no grounded answer for "what is X for"
 * questions and may fill the gap by inventing a plausible-sounding but
 * false explanation. Always check this alongside findRelevantRules.
 */
// Targeted synonym terms for concepts that live inside guidance TEXT
// rather than in a document label/title — e.g. "citizen" or "permanent
// resident" don't appear in the label "Birth Certificate or Passport",
// but the guidance explains citizenship/residency eligibility. Mapped
// narrowly (not a blanket full-text search) to avoid reintroducing
// noisy false positives across long guidance paragraphs.
const GUIDANCE_SYNONYM_TRIGGERS = [
  {
    terms: ["citizen", "citizenship", "naturalized", "naturalization", "permanent resident", "green card", "resident card", "non-resident", "noncitizen"],
    groupId: "identity",
    itemLabel: "Birth Certificate or Passport (either one)",
  },
];

export function findRelevantGuidance(queryText, maxResults = 4) {
  const lower = queryText.toLowerCase();
  const queryWords = tokenize(queryText);
  const scored = [];

  for (const group of DOCUMENT_GROUPS) {
    for (const item of group.items) {
      const labelLower = item.label.toLowerCase();
      const haystackWords = new Set(tokenize(`${group.title} ${item.label}`));

      let score = 0;
      if (lower.includes(labelLower)) {
        score += 10; // exact label phrase match — strongest signal
      }

      // Word-boundary match only (exact token equality), not substring —
      // substring matching previously let "office" match inside
      // "officers", causing false positives.
      const matchingWords = queryWords.filter((w) => haystackWords.has(w));
      const distinctiveMatches = matchingWords.filter((w) => !GENERIC_TERMS.has(w));
      score += matchingWords.length;

      // Targeted synonym trigger — e.g. "citizen"/"permanent resident"
      // should surface the birth certificate/passport guidance even
      // though those words aren't in the item's label.
      const synonymHit = GUIDANCE_SYNONYM_TRIGGERS.some(
        (trigger) =>
          trigger.groupId === group.id &&
          trigger.itemLabel === item.label &&
          trigger.terms.some((term) => lower.includes(term))
      );
      if (synonymHit) score += 10;

      // A match counts if: exact phrase hit, OR a synonym trigger hit,
      // OR at least one distinctive (non-generic) word overlaps, OR
      // 2+ words overlap even if generic.
      const isMeaningfulMatch = score >= 10 || distinctiveMatches.length >= 1 || matchingWords.length >= 2;

      if (isMeaningfulMatch) {
        scored.push({ score, groupTitle: group.title, label: item.label, guidance: item.guidance });
      }
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/**
 * Builds a compact, prompt-safe context block of relevant SOP guidance
 * for a given vendor question — the real "why/what this is for"
 * explanation, sourced from actual Supply SA specialist process notes.
 */
export function buildGuidanceContext(queryText) {
  const matches = findRelevantGuidance(queryText);
  if (matches.length === 0) return null;

  return matches
    .map((m) => `${m.label} (${m.groupTitle}): ${m.guidance}`)
    .join("\n\n");
}
