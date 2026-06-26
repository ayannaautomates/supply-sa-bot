/**
 * handoff-config.js
 *
 * Human handoff config. Real Supply SA contact info — points to the
 * Meet the Team page so vendors can pick whichever specialist they
 * want, rather than the bot routing them to a specific person.
 */

export const HANDOFF_CONFIG = {
  supportEmail: "support@supply-sa.org",

  // Vendor picks who to contact from the team page directly.
  teamPageUrl: "https://supply-sa.org/meet-the-team/",
  teamPageLabel: "Meet the Certification Team — Book a Call",

  // Phrases that trigger an immediate handoff offer regardless of
  // whether the bot thinks it can answer. Keep this list short and
  // obvious — it's a safety net, not the primary trigger.
  handoffKeywords: [
    "talk to someone",
    "speak to a person",
    "talk to a human",
    "real person",
    "this isn't working",
    "not helpful",
    "representative",
  ],
};
