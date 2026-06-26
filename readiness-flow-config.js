/**
 * readiness-flow-config.js
 *
 * The "Check certification readiness" guided workflow — ported from the
 * earlier Voiceflow build (grouped checklist screens, ~5-7 taps instead
 * of 30-40) and enriched with real specialist guidance from the
 * Certification Navigation Process SOP.
 *
 * This is entirely DETERMINISTIC. The vendor's answers to PROFILE_QUESTIONS
 * decide which DOCUMENT_GROUPS apply (via each group's `appliesTo`
 * function) — the LLM is never asked to decide what's required. The LLM's
 * only job is to read out the group prompts, collect the tap responses,
 * and narrate the final ready/missing summary the deterministic logic
 * produces.
 *
 * Source: SCTRCA SWMVBE Certification Checklist (03.26_v2) + SOP:
 * Certification Navigation Process (SCTRCA / Supply SA).
 */

// ---------------------------------------------------------------------
// STEP 1 — Profile questions. Asked in order; each answer sets a flag
// used to decide which document groups apply in Step 2.
// ---------------------------------------------------------------------
export const PROFILE_QUESTIONS = [
  {
    id: "app_type",
    prompt: "Are you applying for the first time, or renewing an existing certification?",
    type: "single_select",
    options: [
      { value: "new", label: "First-time application" },
      { value: "renewal", label: "Renewal" },
    ],
  },
  {
    id: "cert_types",
    prompt:
      "Which certification(s) are you seeking? You can hold multiple certifications on one application — select all that apply.",
    type: "multi_select",
    options: [
      { value: "SBE", label: "Small Business Enterprise (SBE)" },
      { value: "ESBE", label: "Emerging Small Business Enterprise (ESBE)" },
      { value: "MBE", label: "Minority Business Enterprise (MBE)" },
      { value: "WBE", label: "Women Business Enterprise (WBE)" },
      { value: "VBE", label: "Veteran Business Enterprise (VBE)" },
      { value: "DIBE", label: "Disabled Individual Business Enterprise (DIBE)" },
      { value: "NABE", label: "Native American Business Enterprise (NABE)" },
      { value: "AABE", label: "African American Business Enterprise (AABE)" },
      { value: "ABE", label: "Asian American Business Enterprise (ABE)" },
      { value: "HABE", label: "Hispanic American Business Enterprise (HABE)" },
    ],
    note:
      "Sometimes agencies give extra points for certification set-asides, so it's worth pursuing every certification you qualify for on this one application.",
  },
  {
    id: "entity",
    prompt: "What is your business's legal structure?",
    type: "single_select",
    options: [
      { value: "sole_prop", label: "Sole Proprietor" },
      { value: "partnership", label: "Partnership" },
      { value: "corp", label: "Corporation" },
      { value: "llc", label: "LLC" },
    ],
  },
  {
    id: "industry",
    prompt: "What best describes your primary work?",
    type: "single_select",
    options: [
      { value: "construction", label: "Construction" },
      { value: "manufacturer_wholesaler", label: "Manufacturer / Wholesaler / Reseller" },
      { value: "other", label: "Other (consulting, services, etc.)" },
    ],
  },
  {
    id: "in_jurisdiction",
    prompt: "Is your business headquartered within the local 15-county Supply SA jurisdiction?",
    type: "single_select",
    options: [
      { value: "yes", label: "Yes, local" },
      { value: "no", label: "No, outside the jurisdiction" },
    ],
    note:
      "Local headquarters means free certification. Outside the jurisdiction means a $350 certification fee applies.",
  },
  {
    id: "ownership_split",
    prompt: "Is your business 51% or more owned by a single qualifying owner, or is ownership split (for example, between spouses)?",
    type: "single_select",
    options: [
      { value: "single_majority", label: "One owner, 51%+" },
      { value: "joint", label: "Joint/split ownership" },
    ],
  },
  {
    id: "has_other_businesses",
    prompt: "Do you or the qualifying owner have ownership in any other businesses?",
    type: "single_select",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    id: "is_franchise",
    prompt: "Is your business a franchise?",
    type: "single_select",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    id: "has_dba",
    prompt: "Are you doing business under a name other than your own (a DBA / Assumed Name)?",
    type: "single_select",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    id: "needs_trade_license",
    prompt:
      "Does your work require a state license or certificate (e.g. CDL, P.E./Professional Engineer, Architect, Electrician, Plumbing, Law, Food Service)?",
    type: "single_select",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No, or not applicable (e.g. consulting)" },
    ],
  },
  {
    id: "business_age",
    prompt: "How long has your business been operating?",
    type: "single_select",
    options: [
      { value: "lt_5yr", label: "Less than 5 years" },
      { value: "gte_5yr", label: "5 years or more" },
    ],
  },
];

// ---------------------------------------------------------------------
// STEP 2 — Document groups. Each group is shown as ONE screen with a
// "Have all / Not yet" tap, not one screen per document. `appliesTo`
// receives the collected profile answers object and returns true/false.
// `guidance` is the specialist note from the SOP, surfaced when a vendor
// marks the group "Not yet" or asks a follow-up question about it.
// ---------------------------------------------------------------------
export const DOCUMENT_GROUPS = [
  {
    id: "core_forms",
    title: "Core Forms & Financials",
    appliesTo: () => true, // universal
    items: [
      {
        label: "Affidavit",
        guidance:
          "Downloaded and filled out. You can e-sign it, or print it, sign it, and scan it back in. All statements must be signed and dated by the applicant.",
      },
      {
        label: "Personal Net Worth (PNW) Statement",
        guidance:
          "Use Supply SA's own PNW form through the portal — they'll email it or it'll be in the portal. It's fine to put 0 on sections that don't apply. The important number is staying under $2.047 million; if you're over that threshold, you're ineligible. For joint ownership (e.g. marriage), fill out the form and split the value down the middle. Primary residence and retirement accounts are not included — there are instructions at the start of the form. If one person owns 51% or more, only that person's PNW is needed.",
      },
    ],
  },
  {
    id: "tax_returns",
    title: "Tax Returns",
    appliesTo: () => true,
    items: [
      {
        label: "Business & Personal Tax Returns (last 5 years)",
        guidance:
          "Upload whichever years you have. If you don't have all 5, upload a statement explaining why (e.g. \"I have only been in business 2 years\"). If you're brand new with none, upload a statement saying you're a new business. You can redact your Social Security number if you're not comfortable sharing it, but you must show at least the last 4 digits. If you didn't file taxes for a given year, you'll need a statement from the IRS confirming that.",
      },
      {
        label: "Schedule K-1 / Schedule E explanation (if applicable)",
        guidance:
          "If there's an entry on Schedule E, expect Supply SA to ask about it — have a short written explanation ready, and have your Schedule K-1 on hand if you hold stock in another entity.",
      },
    ],
  },
  {
    id: "other_business_tax_returns",
    title: "Other Business Affiliations",
    appliesTo: (a) => a.has_other_businesses === "yes",
    items: [
      {
        label: "Tax returns for any other businesses you own (last 5 years)",
        guidance:
          "If you or the qualifying owner have ownership in any other business, that business's tax returns for the last 5 years are required too.",
      },
    ],
  },
  {
    id: "key_personnel",
    title: "Key Personnel Resumes",
    appliesTo: () => true,
    items: [
      {
        label: "Resume(s) for officers/key personnel listed on the application",
        guidance:
          "Anyone listed at the start of the application (e.g. a CFO or marketing lead) needs to submit a resume. Make sure it includes the business name, date, and their title, with bullet-pointed descriptions covering relevant experience and dates of employment. If that person also works another job, list hours dedicated to the business clearly, and make sure the hours don't conflict with their outside employment. The business being certified must appear on the resume, and there can be no conflicting employment timelines.",
      },
    ],
  },
  {
    id: "identity",
    title: "Identity & Ownership Documents",
    appliesTo: () => true,
    items: [
      {
        label: "Birth Certificate or Passport (either one)",
        guidance:
          "Just one or the other is needed, not both. This document is also how citizenship/residency eligibility is established. A non-U.S. resident is not eligible to apply for certification — but if you're a naturalized U.S. citizen, your Certificate of Naturalization works in place of a birth certificate, and if you're a lawful permanent resident, your Permanent Resident Card (Green Card) works as well. Either of those means you can still apply.",
      },
      {
        label: "Driver's License or State ID",
        guidance: "Self-explanatory — current, unexpired, name matches the application.",
      },
      {
        label: "DBA / Assumed Name Certificate",
        guidance: "Only needed for sole proprietors doing business under a different name. If you have a DBA, upload that document.",
      },
      {
        label: "Licenses or Certificates to perform work (if required by state law)",
        guidance:
          "Required if your work needs a state-required professional or trade license or certificate — for example a CDL, P.E. (Professional Engineer), Architect, Electrician, Plumbing, Law, or Food Service license/certificate. If you're a consulting-type business with no state licensing requirement, this typically doesn't apply.",
      },
      {
        label: "Federal EIN Letter",
        guidance: "Upload your EIN confirmation letter.",
      },
    ],
  },
  {
    id: "veteran_disability_native",
    title: "Veteran, Disability, or Native American Documentation",
    appliesTo: (a) =>
      a.cert_types?.includes("VBE") ||
      a.cert_types?.includes("DIBE") ||
      a.cert_types?.includes("NABE"),
    items: [
      {
        label: "DD-214 (if applying as Veteran/VBE)",
        guidance: "Required if you're a veteran applying for VBE.",
      },
      {
        label: "Disability Verification (if applying as DIBE)",
        guidance: "Only needed if you are disabled and applying under the Disabled Individual Business Enterprise category.",
      },
      {
        label: "Tribal documentation (if Native American Business Enterprise / NABE)",
        guidance: "Only applies if the qualifying owner is an enrolled Native American tribal member applying under NABE.",
      },
    ],
  },
  {
    id: "place_of_business",
    title: "Place of Business",
    appliesTo: () => true,
    items: [
      {
        label: "Lease, Mortgage, or Property Deed",
        guidance:
          "Self-explanatory. If the address is your home and the business operates from your house, use your lease or mortgage statement. If the house is paid off, a tax appraisal or the deed works instead.",
      },
    ],
  },
  {
    id: "banking",
    title: "Banking Documentation",
    appliesTo: () => true,
    items: [
      {
        label: "Bank Letter / Signature Card",
        guidance:
          "You need a letter from the bank, on their letterhead, stating you have a business account. It should list the financial institution's name, the business name, the EIN, and the account members. The 51% owner needs to sign it somewhere on the document.",
      },
      {
        label: "Proof of Initial Capital Contribution",
        guidance:
          "If your business is over 5 years old, a simple letter can cover this. If under 5 years, show proof of the money you spent opening the LLC or business account — a bank statement showing the initial deposit, or an LLC formation receipt, is the easiest option. The date on that document needs to match when the business was first started. If your operating agreement lists a capital contribution number, it needs to match your documented proof — or you can remove that section from the operating agreement instead.",
      },
    ],
  },
  {
    id: "corp_docs",
    title: "Corporation Documents",
    appliesTo: (a) => a.entity === "corp",
    items: [
      {
        label: "Certificate of Formation / Articles of Incorporation",
        guidance:
          "Make sure it has a stamp in the top right corner marked 'for office use' or is signed by a state official. If it isn't stamped, you'll need to log into the Texas Secretary of State website and pull the official version for a $15 fee. A document with a filing number is also accepted even without a stamp.",
      },
      {
        label: "Bylaws",
        guidance: "Self-explanatory — your corporation's governing bylaws.",
      },
      {
        label: "Corporate Minutes",
        guidance:
          "Upload your minutes. If you don't have any on file, you can type them up retroactively, or use ChatGPT to help draft them.",
      },
      {
        label: "Stock Certificates",
        guidance:
          "If applicable. If you don't have formal stock certificates, you can upload a statement explaining that, or a simple spreadsheet listing ownership, shares, and dates.",
      },
      {
        label: "Stock Transfer Ledger",
        guidance: "If applicable; otherwise upload a statement saying not applicable.",
      },
    ],
  },
  {
    id: "llc_docs",
    title: "LLC Documents",
    appliesTo: (a) => a.entity === "llc",
    items: [
      {
        label: "Certificate of Formation",
        guidance:
          "Make sure it has a stamp in the top right corner, or is signed electronically or manually by a state official.",
      },
      {
        label: "Operating Agreement",
        guidance: "Self-explanatory — the LLC's operating agreement.",
      },
      {
        label: "LLC Minutes",
        guidance: "Upload your minutes if you have them; if not, type them up or use ChatGPT to help draft them.",
      },
    ],
  },
  {
    id: "construction_docs",
    title: "Construction Industry Documents",
    appliesTo: (a) => a.industry === "construction",
    items: [
      {
        label: "Equipment List (top 10) with VIN + proof of purchase",
        guidance: "List your top 10 pieces of equipment with VIN numbers and proof of purchase.",
      },
      {
        label: "3 Contracts/Invoices with proof of payment",
        guidance:
          "If you're less established and don't have any yet, upload a signed and dated statement saying \"I do not currently have any, but I am working on it.\"",
      },
    ],
    note: "Important: if subcontracting accounts for 80% or more of your work, that likely results in denial.",
  },
  {
    id: "manufacturer_docs",
    title: "Manufacturer / Wholesaler Documents",
    appliesTo: (a) => a.industry === "manufacturer_wholesaler",
    items: [
      {
        label: "Equipment List (top 10) with VIN + proof of purchase",
        guidance: "Same as construction — list your top 10 pieces of equipment with VIN and proof of purchase.",
      },
      {
        label: "Warehouse, authorization, and product list",
        guidance: "Provide documentation of your warehouse, manufacturer authorization, and product list.",
      },
      {
        label: "3 Contracts/Invoices with proof of payment",
        guidance:
          "If you're less established, upload a signed and dated statement saying you don't currently have any but are working on it.",
      },
    ],
    note: "Do NOT upload TWC (Texas Workforce Commission) reports if you don't have them available.",
  },
  {
    id: "franchise_docs",
    title: "Franchise Documentation",
    appliesTo: (a) => a.is_franchise === "yes",
    items: [
      {
        label: "Franchise Agreement",
        guidance:
          "Required if your business is a franchise — Supply SA reviews this to verify ownership/control and check for restrictions on the firm's independence.",
      },
    ],
  },
  {
    id: "outside_jurisdiction_fee",
    title: "Certification Fee",
    appliesTo: (a) => a.in_jurisdiction === "no",
    items: [
      {
        label: "$350 Certification Fee",
        guidance:
          "Since your headquarters is outside Supply SA's local 15-county jurisdiction, a $350 fee applies. Pay by mailing a check, or online once the appropriate application has been submitted.",
      },
    ],
  },
  {
    id: "current_contracts",
    title: "Current Contracts",
    appliesTo: () => true,
    items: [
      {
        label: "Current contracts with proof of payment (if any)",
        guidance:
          "If you have active contracts, upload them with proof of payment. If you don't have any currently, upload a statement saying so.",
      },
    ],
    note: "Note: you can't subcontract out more than 30% of a contract.",
  },
];

// ---------------------------------------------------------------------
// RENEWAL — short-circuit. Renewals skip the full profile/document flow
// per the SOP and just get a condensed reminder.
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// RENEWAL — short-circuit. Renewals skip the full profile/document flow
// per the SOP and just get a condensed reminder + the specific renewal
// document checklist.
// ---------------------------------------------------------------------
export const RENEWAL_GUIDANCE = {
  intro:
    "For a renewal, you don't need to go through the full document walkthrough again — here's the specific renewal checklist instead.",
  items: [
    {
      label: "Affidavit of Eligibility",
      guidance: "Download this through the portal.",
    },
    {
      label: "Personal Net Worth Statement",
      guidance: "Download this through the portal.",
    },
    {
      label: "Business Federal Income Tax Returns (most recent 2 years)",
      guidance:
        "Complete returns including all schedules and attachments. If you don't have business tax returns, submit a statement instead.",
    },
    {
      label: "Personal Federal Income Tax Returns (most recent 2 years)",
      guidance: "Complete returns including all schedules and attachments.",
    },
    {
      label: "Federal tax returns for affiliations (if applicable)",
      guidance:
        "If any other business listed on your Schedule E filed a 1120, 1120-S, or 1065 form, include that business's federal tax returns with related schedules for the past 2 years.",
    },
    {
      label: "Licenses or Certificates to perform work (if applicable)",
      guidance:
        "Required if your work needs a professional or trade license — for example a CDL, P.E. (Professional Engineer), Architect, Electrician, Plumbing, Law, or Food Service license/certificate.",
    },
  ],
  outro:
    "Business Enterprise Program (SMWVBE) renewals happen every 2 years. Disadvantaged Business Enterprise (DBE) certification doesn't expire, but you need to submit an Annual Update Affidavit with supporting documents every year — missing that can start the decertification process. Your renewal window opens within 6 months of your expiration date.",
};

// ---------------------------------------------------------------------
// PORTAL / PROCESS NOTES — surfaced once, early in the flow, per the SOP.
// ---------------------------------------------------------------------
export const PROCESS_NOTES = {
  beforeStarting:
    "A quick heads-up before we go through this: don't create your application in the portal until your documents are actually ready. The portal automatically deletes incomplete applications after 90 days, and if everything is accurate and complete going in, the whole process can take less than 30 days. All communication happens through the portal, and delays in responding can result in denial — so it's worth getting everything lined up first.",
  responseRequirements:
    "Once your application is in review, you'll have 2 weeks to respond to each Q&A request. Only respond once you have everything requested — you only get 3 chances. If you fail to submit requested documents after 3 attempts, an Intent to Deny is issued, and you have 15 days from that point before a final denial. If denied, you have to wait 3 months before reapplying.",
};

/**
 * Given the collected profile answers, returns the list of document
 * groups that apply to this vendor.
 */
export function getApplicableGroups(profileAnswers) {
  return DOCUMENT_GROUPS.filter((group) => group.appliesTo(profileAnswers));
}

/**
 * Given applicable groups and a map of { groupId: "have_all" | "not_yet" | "have_some" },
 * builds the ready/missing summary.
 */
export function buildGroupReadinessSummary(applicableGroups, groupStatus) {
  const ready = [];
  const missing = [];

  for (const group of applicableGroups) {
    const status = groupStatus[group.id];
    if (status === "have_all") {
      ready.push(group);
    } else {
      missing.push(group);
    }
  }

  return {
    ready,
    missing,
    isFullyReady: missing.length === 0,
  };
}
