/**
 * checklist-config.js
 *
 * This is the DETERMINISTIC source of truth for vendor certification
 * readiness. The LLM never decides what's required or whether a vendor
 * is "certified" — it only converses and reports status pulled from here.
 *
 * Edit this file to change requirements. No prompt-engineering needed.
 */

export const CERTIFICATION_REQUIREMENTS = [
  {
    id: "w9",
    label: "W-9 Form",
    description: "Completed and signed IRS Form W-9",
    required: true,
  },
  {
    id: "insurance_cert",
    label: "Certificate of Insurance",
    description: "Proof of general liability insurance, minimum coverage as specified",
    required: true,
  },
  {
    id: "business_license",
    label: "Business License",
    description: "Current, valid business license for your operating jurisdiction",
    required: true,
  },
  {
    id: "sdvob_cert",
    label: "SDVOB / HUB Certification (if applicable)",
    description: "Service-Disabled Veteran-Owned Business or Historically Underutilized Business certification",
    required: false,
  },
  {
    id: "banking_info",
    label: "Banking / ACH Information",
    description: "Voided check or bank letter for ACH payment setup",
    required: true,
  },
  // Add/edit/remove requirements here. "required: false" items are
  // flagged as "if applicable" rather than blocking.
];

/**
 * Given a map of { requirementId: true/false }, returns a structured
 * readiness report. This is pure logic — no AI involved.
 */
export function buildReadinessReport(vendorStatus) {
  const missing = [];
  const complete = [];

  for (const req of CERTIFICATION_REQUIREMENTS) {
    const isComplete = !!vendorStatus[req.id];
    if (isComplete) {
      complete.push(req);
    } else if (req.required) {
      missing.push(req);
    }
  }

  return {
    isFullyCertifiable: missing.length === 0,
    complete,
    missing,
    totalRequired: CERTIFICATION_REQUIREMENTS.filter((r) => r.required).length,
  };
}
