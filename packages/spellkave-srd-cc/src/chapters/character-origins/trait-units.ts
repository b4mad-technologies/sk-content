// Character Origins slice O3 (`ledger/character-origins.md`'s O3 row): the
// 33 mechanically-relevant SRD species TRAITS — every `SpeciesTrait.json`
// row EXCEPT the 9 SIZE + 9 SPEED rows (O2-shipped, `species-units.ts`).
// "Identity complete, mechanics selective": all 33 ship as real
// `entity_definitions` rows; EXACTLY THREE are mechanized against substrate
// that already exists today (Resourceful, Dwarven Toughness, Keen
// Senses/Skillful) — everything else is a deferred-with-owner unit, grouped
// by root cause, never improvised.
//
// SOURCES: `cache/open5e/SpeciesTrait.json` (`readSpeciesTraits()`,
// `../../open5e/species.ts`'s own O3 extension — 33 `type: null` rows, the
// SIZE/SPEED 18 excluded); `cache/markdown/character-origins.md:97-374`
// (per-trait `_Name._` paragraphs, line-anchored below via the closed
// `TRAIT_MARKDOWN_LINE` lookup — the same "closed lookup for markdown-only
// facts" idiom `species-units.ts`'s own `SPECIES_MARKDOWN_FACTS` and
// `background-units.ts`'s own `BACKGROUND_MARKDOWN_ANCHORS` already
// established).
//
// ENTITY IDS — sister-checked, QUESTION-NEVER-COPY (`world-fixtures/srd/
// base/origin-traits.toml`, 37 rows, Foundry-sourced): every trait NAME the
// sister bundle also ships gets the SAME flat `srd/trait/<slug>` id (drop-in
// compatible: resourceful, dwarven-toughness, keen-senses, skillful, brave,
// luck, trance, stonecunning, fey-ancestry, gnomish-cunning,
// halfling-nimbleness, naturally-stealthy, adrenaline-rush,
// relentless-endurance, powerful-build, large-form, giant-ancestry,
// versatile, otherworldly-presence, breath-weapon, dwarven-resilience).
// TWO genuine divergences, both grounded in a real source-shape difference
// (never a blind copy):
//   1. Darkvision repeats across SIX species (Dragonborn/Dwarf/Elf/Gnome/
//      Orc/Tiefling) with DIFFERENT range text each time — the sister
//      bundle doesn't ship a Darkvision trait AT ALL (its Foundry sweep
//      folds senses into the Actor sheet, not a separate Item), so there is
//      no sister id to collide with. This module species-qualifies it:
//      `srd/trait/darkvision-<species>`.
//   2. Elven Lineage / Gnomish Lineage / Fiendish Legacy / Draconic
//      Ancestry: the sister bundle DECOMPOSES these into one entity per
//      sub-choice (`elven-lineage-drow`/`-high-elf`/`-wood-elf`,
//      `gnomish-lineage-forest`/`-rock`, `fiendish-legacy-abyssal`/
//      `-chthonic`/`-infernal`) because ITS Foundry source itemizes each
//      sub-choice separately. `SpeciesTrait.json` does NOT — each is ONE
//      row whose `desc` carries the embedded choice table/list as literal
//      markdown (verified below: `elf_elven-lineage`, `gnome_gnomish-
//      lineage`, `tiefling_fiendish-legacy`, `dragonborn_draconic-
//      ancestry`). Inventing a matching decomposition here would be
//      structure NOT present in this package's own source — this module
//      ships ONE entity per row instead (`srd/trait/elven-lineage`,
//      `srd/trait/gnomish-lineage`, `srd/trait/fiendish-legacy`,
//      `srd/trait/draconic-ancestry`), the sub-choices riding verbatim in
//      the description. No id collision either way (the sister's
//      decomposed ids are different strings).
//
// SPECIES LINKAGE: every trait entity carries `srd.trait` (class) +
// `srd.trait.<slug>` (own identity, NEW dotted prefix — `bundle-row.ts`) +
// a REFERENCE to the trait's owning species' ALREADY-SHIPPED O2
// `srd.species.<slug>` tag value (`species-units.ts`) — no new
// `tag_value_definitions` row for that reference, same "reuse, don't
// re-declare" posture `proof-scene/calls/identity.ts` already uses for
// cross-slice tag references.

import { readSpeciesTraits, type SpeciesTraitRecord } from "../../open5e/species";
import {
	HP_PER_LEVEL_DISPLAY_NAME,
	HP_PER_LEVEL_ID,
} from "../character-creation/advancement-units";
import { buildSkillUnits } from "../playing-the-game/skill-units";
import type { TagValueDefinitionUnit } from "../playing-the-game/tag-value-vocabulary";
import { SPECIES_TAG_PREFIX } from "./species-units";

export const BUNDLE_ID = "srd";

const EXPECTED_TRAIT_COUNT = 33;

/** The declared exact-vocabulary prefix for the 33 SRD species traits (`srd.trait.<slug>`) — MF-VAL-306 registration lives in `src/bundle-row.ts`, same posture as `srd.species`/`srd.creature_size` (`species-units.ts`'s own header). */
export const TRAIT_TAG_PREFIX = "srd.trait";
/** The class-level tag every trait entity carries alongside its own `srd.trait.<slug>` value — same umbrella-row idiom as `srd.species`/`srd.background`. */
export const TRAIT_CLASS_TAG = TRAIT_TAG_PREFIX;

const TRAIT_CATALOG_ANCHOR =
	'character-origins.md:97-374 (§ Character Species: every species\' "As a <Species>, you have these special traits" paragraph run)';

/** `SpeciesTrait.json` pk -> the line where its `_Name._` paragraph begins in `cache/markdown/character-origins.md` — a closed lookup (pks are stable, never re-derived at runtime), the same idiom `species-units.ts`'s `SPECIES_MARKDOWN_FACTS`/`background-units.ts`'s `BACKGROUND_MARKDOWN_ANCHORS` already established. Verified 2026-07-31 against the section-scoped `_Name._` search (species-header-bounded, so the six repeated "Darkvision" rows each resolve to their OWN species' line, not the first global hit). */
const TRAIT_MARKDOWN_LINE: Record<string, number> = {
	"srd-2024_dragonborn_draconic-ancestry": 105,
	"srd-2024_dragonborn_breath-weapon": 152,
	"srd-2024_dragonborn_damage-resistance": 156,
	"srd-2024_dragonborn_darkvision": 158,
	"srd-2024_dragonborn_draconic-flight": 160,
	"srd-2024_dwarf_darkvision": 170,
	"srd-2024_dwarf_dwarven-resilience": 172,
	"srd-2024_dwarf_dwarven-toughness": 174,
	"srd-2024_dwarf_stonecunning": 176,
	"srd-2024_elf_darkvision": 188,
	"srd-2024_elf_elven-lineage": 190,
	"srd-2024_elf_fey-ancestry": 229,
	"srd-2024_elf_keen-senses": 231,
	"srd-2024_elf_trance": 233,
	"srd-2024_gnome_darkvision": 243,
	"srd-2024_gnome_gnomish-cunning": 245,
	"srd-2024_gnome_gnomish-lineage": 247,
	"srd-2024_goliath_giant-ancestry": 261,
	"srd-2024_goliath_large-form": 275,
	"srd-2024_goliath_powerful-build": 277,
	"srd-2024_halfling_brave": 287,
	"srd-2024_halfling_halfling-nimbleness": 289,
	"srd-2024_halfling_luck": 291,
	"srd-2024_halfling_naturally-stealthy": 293,
	"srd-2024_human_resourceful": 303,
	"srd-2024_human_skillful": 305,
	"srd-2024_human_versatile": 307,
	"srd-2024_orc_adrenaline-rush": 317,
	"srd-2024_orc_darkvision": 321,
	"srd-2024_orc_relentless-endurance": 323,
	"srd-2024_tiefling_darkvision": 333,
	"srd-2024_tiefling_fiendish-legacy": 335,
	"srd-2024_tiefling_otherworldly-presence": 374,
};

/** `SpeciesTrait.json` pk -> the manually-slugged id suffix for traits whose plain slugified name would collide across species (Darkvision, six times). Every other trait uses the plain slug (this module's own header, entity-id section). */
const SLUG_OVERRIDES: Record<string, string> = {
	"srd-2024_dragonborn_darkvision": "darkvision-dragonborn",
	"srd-2024_dwarf_darkvision": "darkvision-dwarf",
	"srd-2024_elf_darkvision": "darkvision-elf",
	"srd-2024_gnome_darkvision": "darkvision-gnome",
	"srd-2024_orc_darkvision": "darkvision-orc",
	"srd-2024_tiefling_darkvision": "darkvision-tiefling",
};

function slugifyTraitName(name: string): string {
	const slug = name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	if (slug.length === 0) {
		throw new Error(`trait-units: trait name '${name}' slugified to an empty string.`);
	}
	return slug;
}

/**
 * Root-cause bucket for a deferred trait — grounded in
 * `ledger/character-origins.md`'s own "Substrate map" MISSING list (senses,
 * conditions beyond Incapacitated/Dead, spellcasting, generic
 * reroll/advantage-grant, damage resistances, a generic PB-uses-per-rest
 * pool pattern) plus two additional honestly-named causes this trait-level
 * pass surfaced (`other_substrate_gap` folds several distinct-but-related
 * gaps — damage-resistance mechanic, flight/size-change mechanics, rest
 * DURATION modeling, blanket non-reroll advantage grants, size-comparison
 * movement rules riding O2's knowingly-consumer-less `srd/size` — each
 * trait's own `deferredNote` names its SPECIFIC gap; `scope_cap` is not a
 * substrate gap at all, it flags Versatile's grant shape as mechanically
 * IDENTICAL to Skillful's but deliberately left unmechanized so this slice
 * ships exactly three, per its own scope contract).
 */
export type TraitRootCause =
	| "mechanized"
	| "documented_unapplied"
	| "conditions_gap"
	| "senses"
	| "pb_uses_pool"
	| "spellcasting_lineages"
	| "luck_reroll"
	| "other_substrate_gap"
	| "scope_cap";

/** One human-readable owner line per root-cause bucket — shared by the coverage renderer and this module's own trait descriptions. */
export const ROOT_CAUSE_OWNERS: Record<TraitRootCause, string> = {
	mechanized: "Mechanized this slice (O3) — see this trait's own description for the wiring.",
	documented_unapplied:
		"Capability-grant class identical in shape to Skillful (a real srd/skill/<slug> " +
		"reference) — not live-applied to the proof hero (the hero is Human, not Elf); the " +
		"grant shape is documented, not exercised.",
	conditions_gap:
		"Owner: the Conditions package (Poisoned/Charmed/Frightened/Grappled/Prone) — its own " +
		"slice, scheduled after C4/C6, per ledger/character-origins.md's Cross-chapter decisions.",
	senses:
		"Owner: a Senses substrate slice (Darkvision/Tremorsense range facts + a perception-gate " +
		"consumer) — not yet scheduled; ledger/character-origins.md's Substrate map names this gap.",
	pb_uses_pool:
		"Owner: a generic 'N charges scaled by Proficiency Bonus, recharge on a rest boundary' " +
		"pool pattern — not yet scheduled; ledger/character-origins.md's Substrate map names this gap.",
	spellcasting_lineages:
		"Owner: the Classes/spells chapter (spell identity, spellcasting-ability choice, prepared " +
		"casting) — deferred-with-owner per ledger/character-origins.md's O3 row.",
	luck_reroll:
		"Owner: designs/finding-58-post-roll-reroll-intervention.md — the SAME post-roll " +
		"intervention shape the Heroic Inspiration reroll action already proves live, generalized " +
		"to an unconditional (no-resource-cost) natural-1 reroll.",
	other_substrate_gap:
		"Owner: not yet scheduled — see this trait's own deferredNote for the specific missing " +
		"mechanic (grounded in ledger/character-origins.md's Substrate map or O2's own " +
		"knowingly-consumer-less srd/size note).",
	scope_cap:
		"Not a substrate gap: mechanically identical in shape to Skillful (a real feat-entity " +
		"reference, srd/feat/<slug>), deliberately left unmechanized to keep this slice's " +
		"mechanization count at exactly three, per its own scope contract.",
};

interface DeferredClassification {
	rootCause: TraitRootCause;
	/** One sentence naming the SPECIFIC missing mechanic this trait needs — never just the bucket name. */
	deferredNote: string;
}

/** Closed classification for the 30 traits NOT resourceful/dwarven-toughness/skillful (mechanized) — keyed by `SpeciesTrait.json` pk. Keen Senses gets its own `documented_unapplied` bucket (same capability-grant shape as Skillful, just not exercised on the Human proof hero). */
const DEFERRED_CLASSIFICATION: Record<string, DeferredClassification> = {
	"srd-2024_elf_keen-senses": {
		rootCause: "documented_unapplied",
		deferredNote:
			"Same capability-grant class as Skillful (srd/skill/insight, srd/skill/perception, or " +
			"srd/skill/survival — all three already exist); undemonstrated because the proof hero " +
			"is Human, not Elf.",
	},
	// --- conditions_gap (5): the trait's core benefit needs a MISSING condition. ---
	"srd-2024_dwarf_dwarven-resilience": {
		rootCause: "conditions_gap",
		deferredNote:
			"Advantage on saves to avoid/end the Poisoned condition — Poisoned is not modeled.",
	},
	"srd-2024_elf_fey-ancestry": {
		rootCause: "conditions_gap",
		deferredNote:
			"Sleep/exhaustion immunity tags ship (srd.immunity.magic_sleep + srd.immunity.sleep_exhaustion). " +
			"Remaining gap: Advantage on saves to avoid/end Charmed — resolution scopes do not carry " +
			"outcome-condition context (docs/substrate-verdicts/fey-ancestry-condition-save-scope.md; #110).",
	},
	"srd-2024_halfling_brave": {
		rootCause: "conditions_gap",
		deferredNote:
			"Advantage on saves to avoid/end the Frightened condition — Frightened is not modeled.",
	},
	"srd-2024_goliath_powerful-build": {
		rootCause: "conditions_gap",
		deferredNote:
			"Advantage on checks to end the Grappled condition — Grappled is not modeled (the carrying-" +
			"capacity half is also consumer-less, no carrying-capacity mechanic exists yet).",
	},
	"srd-2024_goliath_giant-ancestry": {
		rootCause: "conditions_gap",
		deferredNote:
			"5 of 6 sub-benefits are PB-uses-pool-shaped (see pb_uses_pool), but the Hill's Tumble " +
			"sub-choice additionally needs the Prone condition — Prone is not modeled; classified " +
			"here as the stricter blocker.",
	},
	// --- senses (7): range tags + darkvision capability catalog ship; perception-gate consumer still open. ---
	"srd-2024_dragonborn_darkvision": {
		rootCause: "senses",
		deferredNote:
			"Identity tags srd.sense.darkvision + srd.sense.darkvision.60 ship on the trait entity; " +
			"srd/capability/darkvision is catalogued. No perception/lighting gate consumes the range yet.",
	},
	"srd-2024_dwarf_darkvision": {
		rootCause: "senses",
		deferredNote:
			"Identity tags srd.sense.darkvision + srd.sense.darkvision.120 ship on the trait entity; " +
			"srd/capability/darkvision is catalogued. No perception/lighting gate consumes the range yet.",
	},
	"srd-2024_elf_darkvision": {
		rootCause: "senses",
		deferredNote:
			"Identity tags srd.sense.darkvision + srd.sense.darkvision.60 ship on the trait entity; " +
			"srd/capability/darkvision is catalogued. No perception/lighting gate consumes the range yet.",
	},
	"srd-2024_gnome_darkvision": {
		rootCause: "senses",
		deferredNote:
			"Identity tags srd.sense.darkvision + srd.sense.darkvision.60 ship on the trait entity; " +
			"srd/capability/darkvision is catalogued. No perception/lighting gate consumes the range yet.",
	},
	"srd-2024_orc_darkvision": {
		rootCause: "senses",
		deferredNote:
			"Identity tags srd.sense.darkvision + srd.sense.darkvision.120 ship on the trait entity; " +
			"srd/capability/darkvision is catalogued. No perception/lighting gate consumes the range yet.",
	},
	"srd-2024_tiefling_darkvision": {
		rootCause: "senses",
		deferredNote:
			"Identity tags srd.sense.darkvision + srd.sense.darkvision.60 ship on the trait entity; " +
			"srd/capability/darkvision is catalogued. No perception/lighting gate consumes the range yet.",
	},
	"srd-2024_dwarf_stonecunning": {
		rootCause: "senses",
		deferredNote:
			"60 ft Tremorsense range fact (primary blocker); the Bonus-Action activation is ALSO " +
			"pb_uses_pool-shaped once Tremorsense exists.",
	},
	// --- pb_uses_pool: Breath Weapon is MECHANIZED (see MECHANIZED_PKS); remaining pool-shaped traits below. ---
	"srd-2024_orc_adrenaline-rush": {
		rootCause: "pb_uses_pool",
		deferredNote: "PB-scaled charge pool, recharges on EITHER a Short or Long Rest boundary.",
	},
	// relentless-endurance mechanized via condition-hook-on-event (sk-609b.12.2)

	"srd-2024_goliath_large-form": {
		rootCause: "pb_uses_pool",
		deferredNote:
			"Single-charge Long-Rest-recharge resource (Large Form's own gate); the transformation " +
			"itself also needs a size-change mechanic (srd/size is knowingly consumer-less, O2) and " +
			"a generic advantage-grant.",
	},
	// --- spellcasting_lineages (4): spell identity + prepared casting + a chosen spellcasting ability. ---
	"srd-2024_elf_elven-lineage": {
		rootCause: "spellcasting_lineages",
		deferredNote:
			"Grants cantrips + prepared leveled spells (Drow/High Elf/Wood Elf) — no spellcasting substrate.",
	},
	"srd-2024_gnome_gnomish-lineage": {
		rootCause: "spellcasting_lineages",
		deferredNote:
			"Grants cantrips + a PB-uses prepared spell (Forest/Rock Gnome) — no spellcasting substrate.",
	},
	"srd-2024_tiefling_fiendish-legacy": {
		rootCause: "spellcasting_lineages",
		deferredNote:
			"Grants a damage resistance + cantrip + prepared leveled spells (Abyssal/Chthonic/" +
			"Infernal) — no spellcasting substrate; also needs damage resistances.",
	},
	"srd-2024_tiefling_otherworldly-presence": {
		rootCause: "spellcasting_lineages",
		deferredNote:
			"Grants the Thaumaturgy cantrip, sharing the Fiendish Legacy trait's chosen " +
			"spellcasting ability — no spellcasting substrate.",
	},
	// --- luck_reroll (1). ---
	"srd-2024_halfling_luck": {
		rootCause: "luck_reroll",
		deferredNote:
			"Heroic Inspiration proves spend-to-reroll (finding-58 RESOLVED), but reaction_eligibility " +
			"cannot read raw die faces — nat-1 auto-gate needs draw provenance in the reaction context " +
			"(docs/substrate-verdicts/lucky-nat1-reroll.md; #111).",
	},
	// --- other_substrate_gap (8): distinct, individually-named gaps. ---
	"srd-2024_dragonborn_draconic-ancestry": {
		rootCause: "other_substrate_gap",
		deferredNote:
			"A pure choice flag (dragon -> damage type) consumed only by Breath Weapon (pb_uses_pool) " +
			"and Damage Resistance (below) — mechanically inert until both exist.",
	},
	"srd-2024_dragonborn_damage-resistance": {
		rootCause: "other_substrate_gap",
		deferredNote:
			"No damage-resistance mechanic exists (ledger/character-origins.md's Substrate map).",
	},
	"srd-2024_dragonborn_draconic-flight": {
		rootCause: "other_substrate_gap",
		deferredNote:
			"Needs a Fly-Speed axis (the grid only models srd/speed-walk) plus the pb_uses_pool " +
			"single-charge pattern.",
	},
	"srd-2024_elf_trance": {
		rootCause: "other_substrate_gap",
		deferredNote:
			"Magic-sleep immunity tag ships (srd.immunity.magic_sleep). Remaining gap: shortens a " +
			"Long Rest to 4 hours — rest actions are completion DECLARATIONS, not simulated " +
			"durations (rest.ts's own header), so there is no elapsed-hours fact to shorten.",
	},
	"srd-2024_gnome_gnomish-cunning": {
		rootCause: "other_substrate_gap",
		deferredNote:
			"Blanket Advantage on INT/WIS/CHA saving throws — the same missing 'generic reroll/" +
			"advantage-grant' substrate as Luck, but NOT itself a reroll, so out of finding-58's " +
			"specific scope.",
	},
	"srd-2024_halfling_halfling-nimbleness": {
		rootCause: "other_substrate_gap",
		deferredNote:
			"A size-COMPARISON movement rule (moving through a larger creature's space) — O2's own " +
			"srd/size resource is explicitly knowingly-consumer-less; this is a first natural " +
			"consumer once size-aware movement exists.",
	},
	"srd-2024_halfling_naturally-stealthy": {
		rootCause: "other_substrate_gap",
		deferredNote:
			"A size-COMPARISON Hide-action variant (hiding behind a larger creature) — same O2 " +
			"srd/size consumer-less gap as Halfling Nimbleness.",
	},
	"srd-2024_human_versatile": {
		// Lane L4: elevated from scope_cap to documented_unapplied — same
		// capability-grant class as Skillful (a real srd/feat/<slug> Origin
		// feat reference). Proof hero already carries Skilled via F1; Versatile
		// is left unapplied so the hero does not double-stack Origin feats.
		rootCause: "documented_unapplied",
		deferredNote:
			"'Gain an Origin feat of your choice' — capability-grant class identical to Skillful " +
			"(any srd.feat.origin entity, e.g. srd/feat/skilled). Undemonstrated on the proof hero " +
			"(already holds Skilled via F1); creation dialogue owns the pick (lane L5).",
	},
};

export const DRAGONBORN_BREATH_WEAPON_RESOURCE_ID = `${BUNDLE_ID}/dragonborn/breath-weapon-uses`;
export const DRAGONBORN_BREATH_WEAPON_RESOURCE_LOCAL_ID = "dragonborn/breath-weapon-uses";
export const DRAGONBORN_BREATH_WEAPON_CAPABILITY_ID = `${BUNDLE_ID}/action/dragonborn/breath-weapon`;
export const DRAGONBORN_BREATH_WEAPON_CAPABILITY_LOCAL_ID = "action/dragonborn/breath-weapon";
export const DRAGONBORN_BREATH_WEAPON_NICHE_ID = `capability:${DRAGONBORN_BREATH_WEAPON_CAPABILITY_ID}`;
export const DRAGONBORN_BREATH_WEAPON_ACTION_ID = `${BUNDLE_ID}/dragonborn/breath-weapon`;
export const DRAGONBORN_BREATH_WEAPON_ACTION_LOCAL_ID = "dragonborn/breath-weapon";
export const DARKVISION_CAPABILITY_ID = `${BUNDLE_ID}/capability/darkvision`;
export const DARKVISION_CAPABILITY_LOCAL_ID = "capability/darkvision";

/** Orc Relentless Endurance — pattern condition-hook-on-event + rest-boundary-resource-refill. */
export const RELENTLESS_ENDURANCE_ANCHOR =
	"cache/markdown/character-origins.md:323 (Orc Relentless Endurance)";
export const RELENTLESS_USES_LOCAL_ID = "orc/relentless-endurance-uses";
export const RELENTLESS_USES_RESOURCE_ID = `${BUNDLE_ID}/${RELENTLESS_USES_LOCAL_ID}`;
export const RELENTLESS_READY_CONDITION_LOCAL_ID = "condition/relentless-endurance-ready";
export const RELENTLESS_READY_CONDITION_ID = `${BUNDLE_ID}/${RELENTLESS_READY_CONDITION_LOCAL_ID}`;
export const RELENTLESS_INTERCEPT_TEMPLATE_LOCAL_ID = "trait/relentless-endurance/intercept";
export const RELENTLESS_INTERCEPT_TEMPLATE_ID = `${BUNDLE_ID}/${RELENTLESS_INTERCEPT_TEMPLATE_LOCAL_ID}`;

export interface TraitUnit {
	/** `SpeciesTrait.json` pk, e.g. `srd-2024_dwarf_dwarven-toughness`. */
	sourcePk: string;
	/** Local id suffix (post `srd/trait/`) — plain slug, or the `SLUG_OVERRIDES` species-qualified form for Darkvision. */
	slug: string;
	/** `srd/trait/<slug>` — this trait's `entity_definitions` id. */
	entityId: string;
	displayName: string;
	rawDesc: string;
	/** `Species.json` pk suffix this trait belongs to, e.g. `dwarf` — the SAME slug O2's `srd.species.<slug>` tag values already use. */
	speciesSlug: string;
	/** The already-shipped O2 tag value this trait entity REFERENCES (no new `tag_value_definitions` row). */
	speciesTag: string;
	markdownAnchor: string;
	/** `"mechanized"` for the four substrate-reached traits; the deferred classification (root cause + specific note) otherwise. */
	rootCause: TraitRootCause;
	deferredNote: string | undefined;
	/** Additional tags carried on this trait entity (senses, immunities, etc.). */
	extraTags: string[];
}

const MECHANIZED_PKS = new Set([
	"srd-2024_human_resourceful",
	"srd-2024_dwarf_dwarven-toughness",
	"srd-2024_human_skillful",
	"srd-2024_dragonborn_breath-weapon",
	"srd-2024_orc_relentless-endurance",
]);

/** Build all 33 Trait units, `SpeciesTrait.json`'s own `(parent, order)` source order (already deterministic — `readSpeciesTraits()`'s own header). */
export function buildTraitUnits(): TraitUnit[] {
	const records = readSpeciesTraits();
	if (records.length !== EXPECTED_TRAIT_COUNT) {
		throw new Error(
			`trait-units: expected ${EXPECTED_TRAIT_COUNT} SpeciesTrait.json trait rows, found ` +
				`${records.length} — ledger/character-origins.md's O3 row may be stale.`,
		);
	}
	return records.map((record: SpeciesTraitRecord) => {
		const speciesSlug = record.parent.slice("srd-2024_".length);
		const line = TRAIT_MARKDOWN_LINE[record.pk];
		if (line === undefined) {
			throw new Error(`trait-units: no markdown line recorded for '${record.pk}'.`);
		}
		const slug = SLUG_OVERRIDES[record.pk] ?? slugifyTraitName(record.name);
		const rootCause: TraitRootCause = MECHANIZED_PKS.has(record.pk)
			? "mechanized"
			: (DEFERRED_CLASSIFICATION[record.pk]?.rootCause ??
				(() => {
					throw new Error(`trait-units: no deferred classification recorded for '${record.pk}'.`);
				})());
		const deferredNote = MECHANIZED_PKS.has(record.pk)
			? undefined
			: DEFERRED_CLASSIFICATION[record.pk]?.deferredNote;

		const extraTags: string[] = [];
		if (slug.startsWith("darkvision-")) {
			extraTags.push("srd.sense.darkvision");
			if (slug === "darkvision-dwarf" || slug === "darkvision-orc") {
				extraTags.push("srd.sense.darkvision.120");
			} else {
				extraTags.push("srd.sense.darkvision.60");
			}
		} else if (slug === "trance" || slug === "fey-ancestry") {
			extraTags.push("srd.immunity.magic_sleep");
			if (slug === "fey-ancestry") {
				extraTags.push("srd.immunity.sleep_exhaustion");
			}
		}

		return {
			sourcePk: record.pk,
			slug,
			entityId: `${BUNDLE_ID}/trait/${slug}`,
			displayName: record.name,
			rawDesc: record.desc,
			speciesSlug,
			speciesTag: `${SPECIES_TAG_PREFIX}.${speciesSlug}`,
			markdownAnchor: `character-origins.md:${line}`,
			rootCause,
			deferredNote,
			extraTags,
		};
	});
}

/** Compose one trait's GENERATED `entity_definitions` description: a short
 * identity line. Verbatim SRD (including sub-tables) lives on `srd.text`;
 * mechanization verdicts live in the coverage ledger. */
export function buildTraitDescription(unit: TraitUnit): string {
	return `${unit.displayName} — a ${unit.speciesSlug} species trait.`;
}

/** The 1 class row (`srd.trait`) plus 33 per-trait `srd.trait.<slug>` rows + sense & immunity vocabulary rows. */
export function buildTraitTagValueUnits(): TagValueDefinitionUnit[] {
	const values: TagValueDefinitionUnit[] = buildTraitUnits().map((unit) => ({
		tag: `${TRAIT_TAG_PREFIX}.${unit.slug}`,
		prefix: TRAIT_TAG_PREFIX,
		description: `Identifies an entity definition as the SRD '${unit.displayName}' (${unit.speciesSlug}) species trait.`,
		sourcePk: unit.sourcePk,
	}));
	const classUnit: TagValueDefinitionUnit = {
		tag: TRAIT_CLASS_TAG,
		prefix: "srd",
		description: `Identifies an entity definition as one of the 33 SRD species traits (${TRAIT_CATALOG_ANCHOR}).`,
		sourcePk: TRAIT_CATALOG_ANCHOR,
	};
	const extraDefinitions: TagValueDefinitionUnit[] = [
		{
			tag: "srd.sense",
			prefix: "srd",
			description: "Identifies a definition as a sensory category.",
			sourcePk: "cache/markdown/character-origins.md:158",
		},
		{
			tag: "srd.immunity",
			prefix: "srd",
			description: "Identifies a definition as an immunity category.",
			sourcePk: "cache/markdown/character-origins.md:233",
		},
		{
			tag: "srd.sense.darkvision",
			prefix: "srd.sense",
			description: "Identifies a creature or trait as possessing Darkvision.",
			sourcePk: "cache/markdown/character-origins.md:158",
		},
		{
			tag: "srd.sense.darkvision.60",
			prefix: "srd.sense",
			description: "60-foot range Darkvision.",
			sourcePk: "cache/markdown/character-origins.md:158",
		},
		{
			tag: "srd.sense.darkvision.120",
			prefix: "srd.sense",
			description: "120-foot range Darkvision.",
			sourcePk: "cache/markdown/character-origins.md:170",
		},
		{
			tag: "srd.immunity.magic_sleep",
			prefix: "srd.immunity",
			description: "Magic cannot put the creature to sleep, and it does not need sleep.",
			sourcePk: "cache/markdown/character-origins.md:233",
		},
		{
			tag: "srd.immunity.sleep_exhaustion",
			prefix: "srd.immunity",
			description: "Immunity to exhaustion from lack of rest or sleep effects.",
			sourcePk: "cache/markdown/character-origins.md:229",
		},
	];
	return [classUnit, ...extraDefinitions, ...values];
}

// --- Mechanized trait 1: Resourceful (Human, character-origins.md:303) -----
//
// "You gain Heroic Inspiration whenever you finish a Long Rest." Wired live
// (`playing-the-game/fragments/rest.ts`'s O3-consumer Long-Rest completion
// action): a species-gated `ModifyResource` term,
// `cond(actor.has_tag('${RESOURCEFUL_TRAIT_TAG}'), 1, 0)`, confirmed
// EXPRESSIBLE by a direct code read —
// `crates/spellkave-dsl/src/lib.rs`'s `parse_cond` (:3054) accepts a full
// `parse_let_bool` condition (:2393, the SAME bool grammar `parse_predicate`
// roots at, reachable via `parse_and`), and `Op::HasTag` (:2565) is one of
// its atoms; `parse_int_authoring`
// (`server/src/world_interaction/kernel/dsl/adapters.rs:138`) is the exact
// grammar `ModifyResource.delta_source` parses through
// (`modify_resource.rs:134`). At EVALUATION time, `execute()`'s own
// `build_actor_subject_facts` (`affordance_materialiser/reconcile/
// emit.rs:167`) populates `tags` from BOTH `entity_tag` (instance) and
// `entity_definition_tag` (definition) rows for the Actor subject
// (`entity_facts.rs`'s own `actor_tags` doc comment, `spatial_facts.rs:48-
// 50`) — exactly where a hero's own `srd.trait.resourceful` tag lives
// (`proof-scene/calls/identity.ts`, same idiom as its `srd.species.human`
// tag). `apply_resource_delta`'s clamp (`modify_resource.rs:94-105`) makes
// the grant idempotent: an actor who already holds Heroic Inspiration
// (max_value=1) just clamps back to 1 on a repeat Long Rest, never errors.
export const RESOURCEFUL_TRAIT_TAG = "srd.trait.resourceful";

// --- Mechanized trait 2: Dwarven Toughness (Dwarf, character-origins.md:174)
//
// "Your Hit Point maximum increases by 1, and it increases by 1 again
// whenever you gain a level." The per-LEVEL half interlocks with C4's
// `srd/hp_per_level` fact (`character-creation/advancement-units.ts`) — the
// honest shape, per this slice's own build instructions, is a COMPOSITION
// RULE (documented on the trait's own description) plus this OFFLINE-PINNED
// helper constant, never a live proof requiring a new claimed dwarf actor
// (finding #84's lesson: don't invent a proof actor just to exercise a
// species/class composition that has no real writer yet). A future K1
// per-class/species `srd/hp_per_level` writer composes:
// `dwarfHpPerLevel = classHpPerLevel + dwarvenToughnessHpPerLevelBonus()`.
// The trait's OTHER half — a one-time +1 to HP MAXIMUM at creation-tables — has no
// consumer at all yet (creation-tables doesn't compute a derived HP maximum from
// hp_per_level anywhere in this package); noted honestly in the trait's own
// description rather than silently dropped.
export function dwarvenToughnessHpPerLevelBonus(): number {
	return 1;
}

/** `srd/hp_per_level`'s own id/display name, re-exported for this module's own description text (never a re-typed literal). */
export const DWARVEN_TOUGHNESS_COMPOSITION_TARGET = {
	resourceId: `${BUNDLE_ID}/${HP_PER_LEVEL_ID}`,
	displayName: HP_PER_LEVEL_DISPLAY_NAME,
};

// --- Mechanized trait 3: Skillful (Human, character-origins.md:305) --------
//
// "You gain proficiency in one skill of your choice." Same "capability-grant
// class" shape F1's Skilled proof already established
// (`feats/skilled-units.ts`) — the proof hero's concrete, AUTHORIAL-CHOICE
// pick is Arcana, verified disjoint from every skill capability already
// granted to the hero (Perception, Athletics, Stealth — C5/O1; History,
// Investigation, Insight — F1 Skilled; Intimidation — O1 Soldier
// background): 7 of 18 skills taken, Arcana is one of the 11 free ones.
const SKILLFUL_PROOF_SKILL_SLUG = "arcana";

/** `srd/skill/arcana` — the Skillful proof grant's capability id, verified against the shipped skill catalog (never hand-typed — same discipline as `skilled-units.ts`'s `skilledProofSkillCapabilityIds`). */
export function skillfulProofSkillCapabilityId(): string {
	const known = buildSkillUnits().find((skill) => skill.slug === SKILLFUL_PROOF_SKILL_SLUG);
	if (known === undefined) {
		throw new Error(
			`trait-units: no '${SKILLFUL_PROOF_SKILL_SLUG}' skill in the shipped skill catalog.`,
		);
	}
	return `${BUNDLE_ID}/skill/${known.slug}`;
}
