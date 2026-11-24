/** DM watch vocabulary that the authoring compiler still shares: the advancement
 * teleport and return plans, the companion-bond, kill-XP and encounter-participant
 * decisions, and the present-party rule. The watch loops themselves ran in the
 * retired TypeScript NPC host; the Rust host runs the DM duties. */

export * from "./advancement-teleport.ts";
export * from "./companion-bond-decision.ts";
export * from "./encounter-participants.ts";
export * from "./kill-xp-decision.ts";
export * from "./present-party.ts";
