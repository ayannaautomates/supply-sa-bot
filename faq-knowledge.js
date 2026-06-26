/**
 * faq-knowledge.js
 *
 * Structured FAQ content sourced from https://supply-sa.org/faq/
 * This is the bot's "Knowledge Base" tool referenced in the
 * Instructions — used to answer general certification/process
 * questions accurately instead of the model guessing from memory.
 *
 * Source of truth: re-fetch and update this file periodically if
 * the live FAQ page changes (fees, timelines, and policy details
 * are the most likely things to change over time).
 */

export const FAQ_ENTRIES = [
  {
    question: "How to view your approval letter or certificate",
    answer:
      "Log into sctrca.gob2g.com. From the left side menu, click View, then My Certifications. Under Actions, click View, scroll to the Letters & Certificates section, and select view as PDF.",
  },
  {
    question: "What happens if I missed the renewal deadline — is my certification inactive?",
    answer:
      "You have a 6 month grace period to apply and get certified again before your certification becomes completely inactive.",
  },
  {
    question: "Is the Supply SA office open to the public?",
    answer:
      "Yes. Book a call with one of our specialists through the Meet the Team page (https://supply-sa.org/meet-the-team/), and from there you can schedule an in-person meeting.",
  },
  {
    question: "How do I access the online application?",
    answer:
      "Go to https://sctrca.gob2g.com, scroll to the bottom of the page, click Apply for Certification Online, then create an account or log in with your business email.",
  },
  {
    question: "How can I submit changes to my NAICS codes or update my vendor profile?",
    answer:
      "Go to https://sctrca.gob2g.com, log in with your business email (this is always your username), confirm your business is currently certified, then submit an Expansion Application to report changes such as updated commodity, supply, or service categories.",
  },
  {
    question: "Is Texas HUB now VetHUB (Veteran Heroes United In Business)?",
    answer:
      "Yes, this is handled by the Texas Comptroller, not Supply SA — we do not certify for VetHUB. Eligibility is now limited to small businesses owned and operated by veterans with a 20% or higher service-connected disability. At least 51% of the business must be owned, managed, and operated by a qualifying service-disabled veteran, primarily located in Texas. Businesses previously certified based on race, ethnicity, or sex no longer qualify unless they demonstrate service-disabled veteran ownership.",
  },
  {
    question: "How do I report changes or submit an Expansion Form?",
    answer:
      "Apply for certification online at https://sctrca.gob2g.com, log in with your business email, confirm your business is currently certified, then submit an Expansion Application to add or update commodity, supply, or service work categories.",
  },
  {
    question: "What do I submit if a required document doesn't apply to my business?",
    answer:
      "Submit an official statement on letterhead, signed by the majority owner, describing why that item doesn't apply to your business.",
  },
  {
    question: "How do I submit additional documentation if my application is pending?",
    answer:
      "You can submit additional information through the Q&A tab in the portal, or send it to the Certification Specialist assigned to your application. General inquiries can go to support@supply-sa.org.",
  },
  {
    question: "Why do you need supporting documents along with the application?",
    answer:
      "Supporting documents verify that the firm meets eligibility requirements for the Business Enterprise Program and/or Disadvantaged Business Enterprise Program, including ownership, management, control, expertise, and independence.",
  },
  {
    question: "How long does certification take?",
    answer:
      "It varies based on when the application is considered complete. The Business Enterprise Program can take up to 60 days with a complete application; incomplete applications aren't accepted and a file may be closed after 6 months of no response. The Disadvantaged Business Enterprise Program can take up to 90 days, and any additional requested documentation will extend that timeline further.",
  },
  {
    question: "Now that I'm certified, what's next?",
    answer:
      "Book time with a procurement navigator to help plan your next steps — you can do that through the Meet the Team page (https://supply-sa.org/meet-the-team/).",
  },
  {
    question: "Why does certification take so long?",
    answer:
      "Supply SA certifies firms for numerous agencies, so volume is high, and new and renewal applications come in daily. Site visits are required for every Disadvantaged Business Enterprise applicant and conducted randomly for Business Enterprise Program applicants, which adds processing time.",
  },
  {
    question: "Is there a cost for certification?",
    answer:
      "For the Business Enterprise Program: no cost for initial certification or recertification if your firm is headquartered in Supply SA's jurisdiction and registered as a domestic entity. If headquartered outside the jurisdiction or registered as a foreign entity, the initial fee is $350 and the renewal fee (every 2 years) is $150, payable by cashier's check, business check, or money order to Supply SA. The Disadvantaged Business Enterprise Program has no associated fees.",
  },
  {
    question: "Does certification guarantee I'll be on a member's bidder list?",
    answer:
      "No — certification doesn't automatically place your firm in a government entity's database. You need to contact each member entity directly and register to do business with them.",
  },
  {
    question: "Do I need to renew my certification?",
    answer:
      "For the Business Enterprise Program (SMWVBE), yes — a renewal application plus required documents (listed on page 3 of the renewal application) is required every 2 years. For the Disadvantaged Business Enterprise Program, certification doesn't expire, but you must submit an Annual Update Affidavit with supporting documents every year; failing to do so can start the decertification process.",
  },
  {
    question: "What happens if there are changes in my company?",
    answer:
      "Supply SA must be notified within 30 days of any material changes — address, phone, email, ownership, services provided, or business structure. Failure to report changes can result in your file being closed. If your Tax ID changes, the firm must reapply as a new company.",
  },
  {
    question: "How do I determine which certification is best for my company?",
    answer:
      "Attend one of our workshops, join the bi-weekly office hours, or set up an appointment to walk through the certification options. You can also read about each certification type and its eligibility requirements on the Supply SA website.",
  },
  {
    question: "How do I add additional NAICS codes?",
    answer:
      "Request the additional codes in writing with a detailed description of the service or product, along with supporting documentation (executed contract, invoices, canceled checks, etc). A site visit may be required. Contact the office for an Expansion Request Form.",
  },
  {
    question: "Can the application be expedited?",
    answer:
      "No — applications are no longer expedited for any business. All applicants have equal access to processing time, based on submitting correct and complete information.",
  },
  {
    question: "I don't know what NAICS code to use — where can I find help?",
    answer:
      "Use the NAICS Code Search tool and search by keywords related to your services. If you still can't find the right code, contact the NAICS Census Bureau at 1-888-756-2427.",
  },
];

/**
 * Simple keyword search across FAQ questions, for matching a vendor's
 * free-text question to the most relevant FAQ entries.
 */
export function findRelevantFaqs(queryText, maxResults = 4) {
  const lower = queryText.toLowerCase();
  const words = lower.split(/\s+/).filter((w) => w.length > 3);

  const scored = FAQ_ENTRIES.map((entry) => {
    const haystack = `${entry.question} ${entry.answer}`.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (haystack.includes(w)) score += 1;
    }
    return { entry, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.entry);
}

/**
 * Builds a compact, prompt-safe context block of relevant FAQ entries
 * for a given vendor question.
 */
export function buildFaqContext(queryText) {
  const matches = findRelevantFaqs(queryText);
  if (matches.length === 0) return null;

  return matches
    .map((m) => `Q: ${m.question}\nA: ${m.answer}`)
    .join("\n\n");
}
