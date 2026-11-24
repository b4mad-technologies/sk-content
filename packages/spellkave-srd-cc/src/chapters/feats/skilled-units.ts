// Skilled (`feats.md:51-57`) — F1's "fully mechanized" tier (`ledger/
// feats.md`'s slice plan). The SRD text ("proficiency in any combination of
// three skills or tools of your choice", `:55`) is a CREATION-TIME CHOICE —
// genuinely not field-decomposed in `FeatBenefit.json` (a single prose
// sentence, `ledger/feats.md`'s own pinned quirk) and not authorable as a
// concrete grant until a creation-tables seed exists (C6-style, `ledger/
// character-creation.md`'s "Deferred-with-owner: in-game character creation
// flow" addendum). This slice ships the identity + the documented grant
// SHAPE (the feat's own description, `feats-units.ts`), plus a PROOF
// application: the proof HERO is granted one CONCRETE Skilled-derived
// proficiency triple, marked below as an explicit AUTHORIAL CHOICE (same
// posture as `proof-scene/calls/combat.ts`'s own alignment/language choices
// for the hero) — never a stand-in for the real creation-time mechanism.
//
// Mirrors C3/C5's own precedent for granting the hero a skill-identity
// capability: `proof-scene/calls/identity.ts`'s `initial_capabilities` list
// (`PROOF_ATHLETICS_SKILL_CAPABILITY_ID`, C5's
// `PROOF_STEALTH_SKILL_CAPABILITY_ID`). No new capability_definitions rows —
// the three chosen skills are the SAME `srd/skill/<slug>` identity
// capabilities `skill-units.ts`/`skill-proficiency-units.ts` already ship and
// already wire into every skill check's Proficiency Bonus term
// (`skillCheckExpr`) — "proficient in a skill" already MEANS "holds this
// capability" on this substrate; Skilled needs no new mechanic, only a new
// GRANT.
import { buildSkillUnits } from "../playing-the-game/skill-units";

export const BUNDLE_ID = "srd";

/**
 * The three skills chosen for the proof hero's Skilled grant — AUTHORIAL
 * CHOICE (no SRD table picks a player's three skills for them), deliberately
 * disjoint from the hero's already-granted skill capabilities (Perception,
 * Athletics, Stealth — `proof-scene/calls/identity.ts` /
 * `proof-scene/checks.ts`) so the grant is observably NEW, not a duplicate.
 */
// "medicine" replaced "insight" (O3 lead live-gate, 2026-07-31): Insight is
// the check proofs' designated UNPROFICIENT CONTROL (its guaranteed-failure
// DC assumes NO proficiency bonus) — granting it here made that boundary
// probabilistically reachable on high d20 faces, the root cause of the
// intermittent post-F1 suite flake finding #85 recorded. The
// triple must stay disjoint from every skill a boundary proof ASSUMES
// unproficient, not merely from existing grants.
export const SKILLED_PROOF_SKILL_SLUGS = ["history", "investigation", "medicine"] as const;

/** `srd/skill/<slug>` capability ids for the chosen Skilled proof triple, verified against the shipped skill catalog (never hand-typed — same discipline as `derived-units.ts`'s `perceptionSkillCapabilityId`). */
export function skilledProofSkillCapabilityIds(): string[] {
	const bySlug = new Map(buildSkillUnits().map((skill) => [skill.slug, skill] as const));
	return SKILLED_PROOF_SKILL_SLUGS.map((slug) => {
		const skill = bySlug.get(slug);
		if (skill === undefined) {
			throw new Error(`skilled-units: no '${slug}' skill in the shipped skill catalog.`);
		}
		return `${BUNDLE_ID}/skill/${skill.slug}`;
	});
}
