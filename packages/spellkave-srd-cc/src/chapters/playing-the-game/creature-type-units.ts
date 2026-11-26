// "Creature" / "Creature Type" identity (design correction, slice 3.1:
// `ledger/designs/generic-skill-check-target-dc.md` § "Slice 3", item 1;
// ledger row: `ledger/playing-the-game.md`). SRD-sourced, not invented:
//
//   - "Creature" (`cache/markdown/rules-glossary.md:513`): "Any being in the
//     game, including a player's character, is a creature." — the UMBRELLA
//     every actor-shaped entity presents. This module's own `CREATURE_NICHE_TAG`
//     (`srd.creature`) IS that umbrella, expressed the ONLY way the server-side
//     mechanism this file documents actually consumes it (see below).
//   - "Creature Type" (`cache/markdown/rules-glossary.md:517`): "Every
//     creature ... has a TAG in the rules that identifies the type of
//     creature it is" — the SRD's OWN word is "tag", matching this package's
//     `entity_definition_tag` representation exactly, not a coincidence of
//     naming. The 14 types (`cache/open5e/CreatureTypeDescription.json`,
//     `describes` field, aberration..undead) are read from the cache below.
//
// SERVER GROUNDING (read directly, not assumed — `server/src/world_interaction/
// target_niches.rs`'s `derive_entity_target_niches_from_parts`, lines 91-120):
// an entity's presented target-niches are `entity_def_id`, its own
// `core/grounded`|`core/owned` home-state id, then EVERY `entity_definition_tag`
// row for that `entity_def_id` — pushed VERBATIM (`push_unique(&mut niches, tag)`,
// no prefix, no transform). A niche_id is therefore reachable from a plain TAG
// STRING with NO `niche_definitions` row needed at all — the OTHER path
// (`append_authored_target_niches`, same file) evaluates authored predicates,
// but `is_trivially_true_predicate` SKIPS a literal-`true` predicate outright
// (`target_niches.rs` lines 205-213), so a genuinely universal niche can only
// be expressed as a literal entity_definition_tag, never a `niche_definitions`
// row with a trivially-true predicate. `CREATURE_NICHE_TAG` below is
// authored as exactly that: a plain tag every creature-shaped entity_definition
// carries (`proof-scene.ts`'s own guard/training-dummy defs, TODAY's named
// consumers), which `derive_entity_target_niches` then surfaces as a target
// niche id with the SAME string value — consumed by
// `generic-check-units.ts`'s 24 shipped verbs (`index.ts`'s
// `buildGenericCheckAffordancesFragment`), whose `affordance_templates.niche_id`
// is now this same "creature" string instead of the per-verb
// `capability:<id>` niche the slice-2 round used.
//
// CORRECTED FINDING (live-gate failure, round 2 — see this chapter's own
// ledger row + `ledger/findings.md` finding #39, corrected): the FIRST
// round of this module claimed the ACT path (`r_manipulate`) never needed a
// `spatial_niche_attachment` for an entity target, reasoning that
// `revalidate_spatial_target_preconditions` (`r_manipulate/target.rs`
// line 516) no-ops when `target_spatial_ref` is `None`. That reasoning
// never traced how `target_spatial_ref` itself is BUILT — it is not None
// for an entity target. `r_manipulate::target::target_spatial_ref`
// (`target.rs` lines 99-114) resolves `TargetRef::Entity(id)` to
// `Some(FrameSpatialRef { kind: "place_node", id: entity_place_node_id(id) })`
// — EVERY entity target is converted to the PLACE NODE IT CURRENTLY OCCUPIES
// before `revalidate_spatial_target_preconditions` ever runs. Consequence:
// the `attachment_presence` precondition is NEVER skipped for an entity
// target — it always requires a `spatial_niche_attachment` binding the
// SELECTED niche_id to that place node, confirmed live (reproduced twice):
// removing all five per-verb attachments broke exactly the three guaranteed-
// success generic-check act-path tests, with the engine's own recorded
// rejection reading verbatim "precondition failed (element=attachment_
// presence): no spatial_niche_attachment for niche 'creature' at
// 'place_node:.../cell_a'" (`evaluation_provenance.failure_detail`, queried
// directly via `just sql`). `select_turn_aware`'s niche-agnostic entity-target
// fanout (`r_manipulate/selection/candidates.rs` lines 325-355) is real, but
// it only governs WHICH TEMPLATE gets tried — attachment_presence is a
// SEPARATE, earlier gate on the SAME manipulate call that the fanout does not
// touch or bypass. The PERCEIVE path (`affordance_materialiser/reconcile/
// candidates.rs` lines 136-145, `locality.rs`'s
// `template_has_spatial_niche_attachment`) has the analogous, independently-
// confirmed unconditional per-node gate. NET EFFECT: "zero
// spatial_niche_attachments" is unreachable for either path — but because
// all 24 generic-check verbs now share ONE niche_id (`CREATURE_NICHE_TAG`),
// exactly ONE shared attachment row (not one per verb, `proof-scene.ts`'s own
// single `spatial_niche_attachments` call) satisfies BOTH gates for every one
// of them — the real, smaller win this slice delivers over slice 2's
// per-verb attachments. Recorded, not silently patched over — see
// `ledger/findings.md` finding #39's correction.
//
// SUPERSEDED (actor-carried-verbs D2(c), canon-warden amendment, live-proof
// follow-up 2026-08-12): the "attachment always required" conclusion above
// was correct UNDER THE OLD MODEL (place-provider was the only admission
// shape Gate B/its act-side mirror ever supported), but that model itself is
// what the actor-carried-verbs change retires. `fragments/generic.ts` now
// ships a `niche_definitions` row for `CREATURE_NICHE_TAG` with
// `provider = "entity"` — the resolved provider FLAGS
// (`requires_spatial_attachment: false`), not attachment presence, now gate
// admission; the candidate's own tag (already pushed verbatim into its
// derived niche set, unchanged from the SERVER GROUNDING paragraph above) is
// the whole membership test (design D2(c), "grounded mirror of
// `owned_entity_target_niches`"). `spatial_niche_attachments` rows for this
// niche_id (proof-scene.ts's own, this module's kavemouth consumers before
// this change) are no longer load-bearing for ANY of this niche_id's
// consumers — a live-proof regression (Claim Victory going dead when the
// kavemouth adventure's own two combat attachments were retired) surfaced
// that they were STILL the only thing keeping this niche alive everywhere it
// is used, the identical "silent invulnerability" bug class the whole change
// exists to close, now closed here too.
import { readCreatureTypeDescriptions } from "../../open5e/creature-type-description";

/**
 * The umbrella niche/tag every creature-shaped entity_definition presents
 * (design § "creature umbrella niche"). A plain `entity_definition_tag` VALUE
 * (see this module's own header for why a `niche_definitions` predicate row
 * cannot express a universal niche via a trivially-true PREDICATE) — but,
 * per the SUPERSEDED note above, DOES now carry a `niche_definitions` row
 * (authored in `fragments/generic.ts`) whose job is the `provider = "entity"`
 * COLUMN, not its (still-trivial) predicate. Consumed by:
 *   - `creature-identity-units.ts` as the actor-side identity that grants the
 *     bundle's implemented universal creature attempts.
 *   - `generic-check-units.ts` / `fragments/generic.ts`'s
 *     `buildGenericCheckAffordancesFragment`
 *     (the 24 shipped verbs' own `affordance_templates.niche_id`).
 *   - `fragments/help.ts`'s Help action.
 *   - `character-creation/advancement-units.ts`'s Claim Victory action.
 *   - `proof-scene.ts` (the guard/training-dummy entity_definitions' own
 *     `tags` param — the honest creature-shaped proof targets).
 */
export const CREATURE_NICHE_TAG = "srd.creature";

/**
 * The monster/character split (sk-dms.39, sk-b3m): the SRD's Monster Death
 * rule (playing-the-game.md:1217, "a monster dies the instant it drops to 0
 * Hit Points") applies to monster-shaped combatants ONLY — a character
 * instead falls Unconscious and makes Death Saving Throws (:1229-1247, not
 * yet shipped, sk-b3m). Neither `CREATURE_NICHE_TAG` (deliberately universal
 * — covers the hero too) nor `CREATURE_TYPE_TAG_PREFIX`/`srd/xp_value` (both
 * ruled out live, sk-b3m's own grounding) can express this split, so this is
 * a genuinely NEW, narrower tag: authored on monster entity_definitions
 * only, never on a player character. Omitting the tag on a specific monster
 * is ALSO the SRD's own documented escape hatch, verbatim: "although a Game
 * Master can ignore this rule for an individual monster and treat it like a
 * character" (:1217) — an untagged monster simply falls back to the
 * (not-yet-shipped) character branch instead of dying outright.
 */
export const MONSTER_TAG = "srd.monster";

/**
 * The explicit player-character identity axis (sk-bwd).
 *
 * **What it does today.** It is the anchor of the substrate's fourth
 * circumstance→capability bridge (`server/src/tag_capability_grant.rs`):
 * `player-character-identity-units.ts` hangs the PC-only verb package off it
 * once, so a player character may Level Up, Claim Victory, and reroll
 * Heroic Inspiration. Universal attempts derive separately from
 * `srd.creature` through `creature-identity-units.ts`.
 * A monster does not carry the tag, so it is now structurally unable to hold
 * those verbs rather than merely happening not to.
 *
 * **What it deliberately does NOT do.** It does not ship the character DEATH
 * branch. Death Saving Throws (:1229-1247) remain unshipped (sk-b3m) and the
 * Monster Death guard still keys on `MONSTER_TAG` alone, exactly as before —
 * this tag is not its negation and must not be wired into that guard. The
 * SRD's own escape hatch (an untagged monster treated "like a character",
 * :1217) therefore still lands in the same unshipped branch it always did.
 *
 * Never authored on monsters or ordinary NPCs. Personhood and the SRD's
 * non-monster death branch are separate from player control; this tag means
 * exactly that the entity is a player character.
 */
export const PLAYER_CHARACTER_TAG = "srd.player_character";

/** The declared exact-vocabulary prefix for the 14 SRD Creature Types. */
export const CREATURE_TYPE_TAG_PREFIX = "srd.creature_type";

const EXPECTED_CREATURE_TYPE_COUNT = 14;

/** One creature-type identity unit — sourced flavour text, never hand-typed. */
export interface CreatureTypeUnit {
	/** Lowercase slug (`humanoid`, `construct`, …) — the tag VALUE a definition carries alongside `CREATURE_NICHE_TAG`. */
	slug: string;
	description: string;
	/** open5e pk, e.g. `srd-2024_humanoid` — carried forward as provenance. */
	pk: string;
}

/**
 * The 14 SRD creature types (`cache/open5e/CreatureTypeDescription.json`,
 * `cache/markdown/rules-glossary.md:517-540`), sorted by slug. Ships as
 * VALIDATED VOCABULARY ONLY — no `capability_definitions`/other DB row of
 * its own (cargo-cult rule, design draft: "future consumers ... find the
 * sourced classes ready instead of us minting target classes ahead of need").
 * Today's only use is validating the honest tag a proof entity_definition
 * carries (`assertCreatureTypeSlug`, below); a real future mechanical
 * consumer (type-scoped spells, ranger favored-enemy, etc.) would render
 * these as rows itself, when it exists.
 */
export function buildCreatureTypeUnits(): CreatureTypeUnit[] {
	const records = readCreatureTypeDescriptions();
	if (records.length !== EXPECTED_CREATURE_TYPE_COUNT) {
		throw new Error(
			`creature-type-units: expected ${EXPECTED_CREATURE_TYPE_COUNT} creature-type records, ` +
				`got ${records.length}.`,
		);
	}
	return records
		.map((record) => ({
			slug: record.describes,
			description: record.desc,
			pk: record.pk,
		}))
		.sort((a, b) => a.slug.localeCompare(b.slug));
}

const CREATURE_TYPE_SLUGS: ReadonlySet<string> = new Set(
	buildCreatureTypeUnits().map((unit) => unit.slug),
);

/** Throws unless `slug` is one of the 14 sourced SRD creature types — guards a proof/authoring-time honesty claim (e.g. "guard = humanoid"). */
export function assertCreatureTypeSlug(slug: string): void {
	if (!CREATURE_TYPE_SLUGS.has(slug)) {
		throw new Error(
			`creature-type-units: '${slug}' is not one of the 14 sourced SRD creature types ` +
				`[${[...CREATURE_TYPE_SLUGS].join(", ")}].`,
		);
	}
}

/** Return the declared exact tag for one sourced Creature Type. */
export function creatureTypeTag(slug: string): string {
	assertCreatureTypeSlug(slug);
	return `${CREATURE_TYPE_TAG_PREFIX}.${slug}`;
}
