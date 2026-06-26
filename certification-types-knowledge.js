/**
 * certification-types-knowledge.js
 *
 * Reference knowledge distinguishing the full universe of business
 * certifications from the ones Supply SA actually administers.
 *
 * Source: Certification Comparison Chart Extended (uploaded reference)
 * + supply-sa.org/faq (VetHUB note) + general knowledge of federal SBA
 * programs and TxDOT's DBE program for the knowledge-only entries.
 *
 * SUPPLY_SA_CERTIFICATIONS — these are selectable in the readiness
 * flow's cert_types question (readiness-flow-config.js) because
 * Supply SA/SCTRCA directly certifies these.
 *
 * OTHER_CERTIFICATIONS — Supply SA does NOT certify these. They're
 * administered by other agencies (federal SBA, TxDOT, Texas
 * Comptroller, airport authorities). This module exists so the bot
 * can correctly explain the DIFFERENCE and redirect appropriately
 * when a vendor asks about one of these, instead of guessing or
 * implying Supply SA handles it.
 */

export const SUPPLY_SA_CERTIFICATIONS = [
  {
    code: "SBE",
    fullName: "Small Business Enterprise",
    whoQualifies: "Meets small business size standards",
    bestUse: "Local contracting access",
  },
  {
    code: "ESBE",
    fullName: "Emerging Small Business Enterprise",
    whoQualifies: "Smaller / early-stage businesses",
    bestUse: "Entry-level opportunities",
  },
  {
    code: "MBE",
    fullName: "Minority Business Enterprise",
    whoQualifies: "51% minority-owned",
    bestUse: "Supplier diversity programs",
  },
  {
    code: "WBE",
    fullName: "Women Business Enterprise",
    whoQualifies: "51% woman-owned",
    bestUse: "Supplier diversity programs",
  },
  {
    code: "VBE",
    fullName: "Veteran Business Enterprise",
    whoQualifies: "51% veteran-owned",
    bestUse: "Veteran set-asides",
  },
  {
    code: "DIBE",
    fullName: "Disabled Individual Business Enterprise",
    whoQualifies: "Disabled ownership",
    bestUse: "Niche contracting opportunities",
  },
  {
    code: "NABE",
    fullName: "Native American Business Enterprise",
    whoQualifies: "Native American ownership",
    bestUse: "Targeted diversity opportunities",
  },
  {
    code: "AABE",
    fullName: "African American Business Enterprise",
    whoQualifies: "African American ownership",
    bestUse: "Targeted diversity opportunities",
  },
  {
    code: "ABE",
    fullName: "Asian American Business Enterprise",
    whoQualifies: "Asian ownership",
    bestUse: "Targeted diversity opportunities",
  },
  {
    code: "HABE",
    fullName: "Hispanic American Business Enterprise",
    whoQualifies: "Hispanic ownership",
    bestUse: "Targeted diversity opportunities",
  },
];

export const OTHER_CERTIFICATIONS = [
  {
    code: "DBE",
    fullName: "Disadvantaged Business Enterprise",
    whoQualifies: "Social and economic disadvantage",
    bestUse: "Transportation contracts",
    administeredBy: "TxDOT (Texas Department of Transportation)",
    note: "Not certified by Supply SA. This is a federally-mandated program administered through TxDOT for transportation-related contracts.",
  },
  {
    code: "ACDBE",
    fullName: "Airport Concessionaire DBE",
    whoQualifies: "Disadvantaged ownership + airport concessions",
    bestUse: "Airport contracts",
    administeredBy: "Airport authorities (federally mandated)",
    note: "Not certified by Supply SA. Specific to airport concession contracts.",
  },
  {
    code: "WOSB",
    fullName: "Women-Owned Small Business",
    whoQualifies: "Federal certification standards",
    bestUse: "Federal contracts",
    administeredBy: "U.S. Small Business Administration (SBA)",
    note: "Not certified by Supply SA. This is a federal certification for competing on federal contracts — different from Supply SA's WBE.",
  },
  {
    code: "EDWOSB",
    fullName: "Economically Disadvantaged WOSB",
    whoQualifies: "Income/net worth limits",
    bestUse: "Federal set-asides",
    administeredBy: "U.S. Small Business Administration (SBA)",
    note: "Not certified by Supply SA. Federal certification.",
  },
  {
    code: "VOSB",
    fullName: "Veteran-Owned Small Business",
    whoQualifies: "Veteran-owned",
    bestUse: "Federal contracting",
    administeredBy: "U.S. Small Business Administration (SBA)",
    note: "Not certified by Supply SA. Federal certification — different from Supply SA's VBE.",
  },
  {
    code: "SDVOSB",
    fullName: "Service-Disabled Veteran-Owned Small Business",
    whoQualifies: "Service-disabled veteran",
    bestUse: "Federal set-asides",
    administeredBy: "U.S. Small Business Administration (SBA)",
    note: "Not certified by Supply SA. Federal certification.",
  },
  {
    code: "8(a)",
    fullName: "SBA 8(a) Program",
    whoQualifies: "Disadvantaged businesses",
    bestUse: "Sole-source federal contracts",
    administeredBy: "U.S. Small Business Administration (SBA)",
    note: "Not certified by Supply SA. Federal program.",
  },
  {
    code: "VetHUB",
    fullName: "Veteran Heroes United In Business",
    whoQualifies:
      "Service-disabled veteran-owned business — at least 51% owned and operated by a service-disabled veteran with a service-connected disability rating of 20% or greater",
    bestUse: "Texas state contracts and subcontracts",
    administeredBy: "Texas Comptroller of Public Accounts",
    note: "Not certified by Supply SA — this replaced the old Texas HUB program for veteran-owned businesses. Eligibility is limited to service-disabled veteran ownership; businesses previously certified for HUB based on race, ethnicity, or sex no longer qualify under VetHUB unless they also have qualifying service-disabled veteran ownership.",
  },
];

function findCertByCode(code, list) {
  const upper = code.toUpperCase();
  return list.find((c) => c.code.toUpperCase() === upper);
}

// Word-boundary check — NOT substring includes(). Using .includes()
// previously caused "ABE" to falsely match inside "HABE". \b doesn't
// work cleanly with parentheses like "8(a)", so codes with special
// characters get an exact-token check instead of a regex boundary.
function containsCode(text, code) {
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (/^[A-Z0-9]+$/.test(code)) {
    // Simple alphanumeric code — safe to use a real word boundary.
    return new RegExp(`\\b${escaped}\\b`).test(text);
  }
  // Code has special characters (e.g. "8(a)") — check as a token
  // surrounded by whitespace/punctuation rather than a regex boundary.
  const tokens = text.split(/\s+/);
  return tokens.some((t) => t.replace(/[.,!?]+$/, "") === code);
}

/**
 * Searches both lists for certification codes/names mentioned in a
 * vendor's question, returning matches with a flag for whether Supply
 * SA certifies it. Used to ground "what is X" and "do you do X"
 * questions instead of letting the model guess.
 */
export function findRelevantCertifications(queryText, maxResults = 4) {
  const upper = queryText.toUpperCase();
  const matches = [];

  for (const cert of SUPPLY_SA_CERTIFICATIONS) {
    if (containsCode(upper, cert.code.toUpperCase()) || upper.includes(cert.fullName.toUpperCase())) {
      matches.push({ ...cert, certifiedBySupplySA: true });
    }
  }
  for (const cert of OTHER_CERTIFICATIONS) {
    if (containsCode(upper, cert.code.toUpperCase()) || upper.includes(cert.fullName.toUpperCase())) {
      matches.push({ ...cert, certifiedBySupplySA: false });
    }
  }

  return matches.slice(0, maxResults);
}

/**
 * Builds a compact, prompt-safe context block for the chat system
 * prompt when a vendor's question references specific certification
 * types.
 */
export function buildCertificationContext(queryText) {
  const matches = findRelevantCertifications(queryText);
  if (matches.length === 0) return null;

  return matches
    .map((c) => {
      if (c.certifiedBySupplySA) {
        return `${c.code} (${c.fullName}) — Supply SA DOES certify this. Who qualifies: ${c.whoQualifies}. Best use: ${c.bestUse}.`;
      }
      return `${c.code} (${c.fullName}) — Supply SA does NOT certify this; it's administered by ${c.administeredBy}. Who qualifies: ${c.whoQualifies}. Best use: ${c.bestUse}. ${c.note}`;
    })
    .join("\n\n");
}
