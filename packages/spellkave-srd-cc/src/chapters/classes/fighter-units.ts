// pattern: identity-tag-capability-grant
// Classes chapter slice K2 (`ledger/classes.md`): the Fighter vertical — all
// 19 Fighter + 6 Champion feature IDENTITIES, plus Second Wind AND (D10
// rework, Level-Up DM Arc) Action Surge mechanized LIVE (the SAME shape,
// re-authored through this package's own verb path) and Tactical Mind's
// feasibility record. Every other non-mechanized real feature is identity +
// a named deferred group (K3+/substrate-finding), never silently dropped.
//
// SOURCES: `cache/markdown/classes.md:4579-4896` (Fighter + Champion, fully
// read in K0's inventory) + `cache/open5e/ClassFeature.json` (Fighter's 19
// pk-prefix rows, `../../open5e/class-feature.ts`'s
// `readClassFeaturesByPkPrefix`) + `ClassFeatureItem.json` (recurrence/column
// markers — Second Wind uses column, Weapon Mastery count column).
//
// FEATURE COUNT (19 Fighter + 6 Champion, `ledger/classes.md`'s own count):
// ALL `ClassFeature.json` rows under Fighter's own pk prefix, not just the 15
// "real" prose features — the 19 also includes `core-traits`
// (`CORE_TRAITS_TABLE`, already identity-authored by K1's own class
// description, re-decomposed here as ITS OWN feature-identity row per the
// ledger's "All 19 ... feature identities" instruction), `proficiency-bonus`
// (`PROFICIENCY_BONUS`), and the two `CLASS_TABLE_DATA` column rows
// (`second-wind-uses`, `weapon-mastery-count`). Champion's 6 are ALL real
// prose features (no table-data rows under the subclass).
//
// IDS: `srd/class-feature/fighter/<slug>` for Fighter's own 19 (the sister's
// `srd/class-feature/fighter/second-wind` capability id, generalized — this
// module's own header), `srd/class-feature/fighter/champion/<slug>` for
// Champion's 6 (the JSON's own three-segment pk shape,
// `srd-2024_fighter_champion_<slug>`, carried into the id path).
//
// TAG PREFIX REGISTRATION (binding session finding (i), mirrors K1's
// `srd.class`/`srd.subclass` header note): `srd.class_feature` is a NEW
// dotted prefix — registered in `../../bundle-row.ts`'s `tag_prefixes` (MF-
// VAL-306) and driven through THIS module's own `driveUnitFragment`
// (`onlyTagValueDefinitionTags`), same two-workspace split K1 established.
// Every feature carries the umbrella `srd.class_feature` tag, its own
// `srd.class_feature.<slug>` value tag, and `srd.class.fighter` (K1's
// existing linkage tag, reused verbatim — same "reuse the parent's own
// O-slice tag" idiom `character-origins/trait-units.ts` established).
// Champion's 6 ALSO carry `srd.subclass.champion` (K1's existing subclass
// tag).
//
// STUDIED ATTACKS TYPO GUARD (`ledger/classes.md`'s pinned data quirk):
// `ClassFeature.json`'s own `name` field for `srd-2024_fighter_studied-attacks`
// is misspelled "Studdied Attacks". This module NEVER reads a real feature's
// `name` field for its display name — every real feature's display name is
// derived by title-casing its OWN pk slug (`slugToTitleCase` below), which
// happens to reproduce every one of the 15 real Fighter features' + 6
// Champion features' ACTUAL markdown heading text exactly (verified per-slug,
// offline test pins it) — `studied-attacks` -> "Studied Attacks", correctly
// spelled, bypassing the JSON typo by construction rather than special-casing
// it.
//
// WEAPON MASTERY COUNT DUPLICATE (`ledger/classes.md`'s pinned data quirk):
// `srd-2024_fighter_weapon-mastery-count` carries a DUPLICATE level-1
// `ClassFeatureItem.json` row (two rows, `level: 1`, both `column_value:
// "3"`, under a transposed pk). This module's own description text for that
// ONE feature identity flags the duplicate explicitly (tolerate, never
// silently dedupe or silently trust one arbitrary row) rather than reading
// the item rows into any authored VALUE (the ceiling used for Second Wind
// below comes from `second-wind-uses`'s OWN items, which carry no such
// duplicate).

import {
	featureHeadingAnchor,
	featuresTableAnchor,
	readCoreTraitsTable,
} from "../../markdown/classes";
import { readClassFeatureItems, readClassFeaturesByPkPrefix } from "../../open5e/class-feature";
import { BONUS_CHANNEL_ID, PRIMARY_CHANNEL_ID } from "../playing-the-game/action-economy-units";
import { damageRollExpr } from "../playing-the-game/damage-units";
import { HP_ID } from "../playing-the-game/hp-units";
import { LEVEL_ID } from "../playing-the-game/level-units";
import type { TagValueDefinitionUnit } from "../playing-the-game/tag-value-vocabulary";
import { CLASS_TAG_PREFIX, SUBCLASS_TAG_PREFIX } from "./classes-units";

export const BUNDLE_ID = "srd";

const FIGHTER_CLASS_NAME = "Fighter";
const FIGHTER_PK_PREFIX = "srd-2024_fighter";
const CHAMPION_PK_PREFIX = "srd-2024_fighter_champion";

/** The declared exact-vocabulary prefix for class-feature identities (`srd.class_feature`, `srd.class_feature.<slug>`) — MF-VAL-306 registration, this module's own header. */
export const CLASS_FEATURE_TAG_PREFIX = "srd.class_feature";
export const FIGHTER_CLASS_TAG = `${CLASS_TAG_PREFIX}.fighter`;
export const CHAMPION_SUBCLASS_TAG = `${SUBCLASS_TAG_PREFIX}.champion`;

const FIGHTER_MARKDOWN_ANCHOR = "classes.md:4579-4896 (§ Fighter + § Fighter Subclass: Champion)";

/** Title-case a hyphenated pk slug: `"ability-score-improvement"` -> `"Ability Score Improvement"`. */
function slugToTitleCase(slug: string): string {
	return slug
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

export interface FeatureIdentityUnit {
	/** open5e pk, e.g. `srd-2024_fighter_second-wind`. */
	sourcePk: string;
	/** `<slug>` for Fighter's own rows, e.g. `second-wind`; also `<slug>` for Champion's own rows (the `champion/` id segment is added by the caller). */
	slug: string;
	displayName: string;
	/** `srd/class-feature/fighter/<slug>` (Fighter) or `srd/class-feature/fighter/champion/<slug>` (Champion). */
	entityId: string;
	description: string;
	/** `classes.md:<anchor>` — a `#### Level N:` heading for a real feature, the Core Traits table for `core-traits`, or the Features table for `PROFICIENCY_BONUS`/`CLASS_TABLE_DATA` rows. */
	anchor: string;
	tags: readonly string[];
}

function pkSlug(pk: string, pkPrefix: string): string {
	return pk.slice(pkPrefix.length + 1);
}

/**
 * Build one feature's description text: real prose features cite
 * `ClassFeature.json`'s own `desc` (SRD text, byte-for-byte); the four
 * structural/table-data rows (`core-traits`/`proficiency-bonus`/
 * `second-wind-uses`/`weapon-mastery-count`) get a hand-composed pointer
 * instead of the raw `"[Column data]"` placeholder the cache carries,
 * PLUS — only for `weapon-mastery-count` — the duplicate-level-1-item guard
 * note (this module's own header).
 */
function buildFeatureDescription(
	record: { desc: string; featureType: string | undefined },
	displayName: string,
	className: string,
): string {
	void record;
	// Identity card. Full SRD rules live on srd.text.
	return `${displayName} — a ${className} class feature.`;
}

/** Build one class' full set of feature-identity units (Fighter's own 19, or Champion's own 6), given the JSON pk prefix + id-path segment + class name for anchor lookups. */
function buildFeatureIdentityUnits(
	pkPrefix: string,
	idPathSegment: string,
	sourceClassName: string,
	extraTags: readonly string[],
): FeatureIdentityUnit[] {
	// Fighter's own pk prefix (`srd-2024_fighter`) is a STRING PREFIX of
	// Champion's own longer pk prefix (`srd-2024_fighter_champion`) —
	// `readClassFeaturesByPkPrefix` matches by prefix alone, so reading
	// Fighter's own rows must explicitly exclude Champion's (else Champion's
	// 6 rows leak into Fighter's own 19, double-counting them under the
	// WRONG class name/anchor). Champion's own read needs no such exclusion
	// (nothing has a longer prefix than `srd-2024_fighter_champion`).
	const records = readClassFeaturesByPkPrefix(pkPrefix).filter(
		(record) => pkPrefix !== FIGHTER_PK_PREFIX || !record.pk.startsWith(`${CHAMPION_PK_PREFIX}_`),
	);
	return records.map((record) => {
		const slug = pkSlug(record.pk, pkPrefix);
		const displayName = slugToTitleCase(slug);
		const anchor =
			record.featureType === undefined
				? featureHeadingAnchor(FIGHTER_CLASS_NAME, displayName)
				: record.featureType === "CORE_TRAITS_TABLE"
					? readCoreTraitsTable(FIGHTER_CLASS_NAME).anchor
					: featuresTableAnchor(FIGHTER_CLASS_NAME);
		return {
			sourcePk: record.pk,
			slug,
			displayName,
			entityId: `${BUNDLE_ID}/class-feature/${idPathSegment}/${slug}`,
			description: buildFeatureDescription(record, displayName, sourceClassName),
			anchor,
			tags: [
				CLASS_FEATURE_TAG_PREFIX,
				`${CLASS_FEATURE_TAG_PREFIX}.${slug}`,
				FIGHTER_CLASS_TAG,
				...extraTags,
			],
		};
	});
}

/** Fighter's own 19 feature identities (`srd/class-feature/fighter/<slug>`), pk order. */
export function buildFighterFeatureUnits(): FeatureIdentityUnit[] {
	const units = buildFeatureIdentityUnits(FIGHTER_PK_PREFIX, "fighter", FIGHTER_CLASS_NAME, []);
	const EXPECTED = 19;
	if (units.length !== EXPECTED) {
		throw new Error(
			`fighter-units: expected ${EXPECTED} Fighter-own ClassFeature.json rows, found ` +
				`${units.length} — ledger/classes.md's K2 count may be stale.`,
		);
	}
	return units;
}

/** Champion's own 6 feature identities (`srd/class-feature/fighter/champion/<slug>`), pk order. */
export function buildChampionFeatureUnits(): FeatureIdentityUnit[] {
	const units = buildFeatureIdentityUnits(CHAMPION_PK_PREFIX, "fighter/champion", "Champion", [
		CHAMPION_SUBCLASS_TAG,
	]);
	const EXPECTED = 6;
	if (units.length !== EXPECTED) {
		throw new Error(
			`fighter-units: expected ${EXPECTED} Champion ClassFeature.json rows, found ` +
				`${units.length} — ledger/classes.md's K2 count may be stale.`,
		);
	}
	return units;
}

/** The umbrella `srd.class_feature` row plus one `srd.class_feature.<slug>` row per feature (19 + 6 = 25) — 26 total. */
export function buildFeatureTagValueUnits(): TagValueDefinitionUnit[] {
	const umbrella: TagValueDefinitionUnit = {
		tag: CLASS_FEATURE_TAG_PREFIX,
		prefix: "srd",
		description: `Identifies an entity definition as one SRD class feature (${FIGHTER_MARKDOWN_ANCHOR}, K2 exemplar).`,
		sourcePk: FIGHTER_MARKDOWN_ANCHOR,
	};
	const values = [...buildFighterFeatureUnits(), ...buildChampionFeatureUnits()].map((unit) => ({
		tag: `${CLASS_FEATURE_TAG_PREFIX}.${unit.slug}`,
		prefix: CLASS_FEATURE_TAG_PREFIX,
		description: `Identifies an entity definition as the SRD ${unit.displayName} class feature.`,
		sourcePk: unit.sourcePk,
	}));
	return [umbrella, ...values];
}

// --- Second Wind (mechanized LIVE this slice) -------------------------------

/**
 * SRD text (`classes.md:4794-4798`): "You have a limited well of physical and
 * mental stamina that you can draw on. As a Bonus Action, you can use it to
 * regain Hit Points equal to 1d10 plus your Fighter level. You can use this
 * feature twice. You regain one expended use when you finish a Short Rest,
 * and you regain all expended uses when you finish a Long Rest."
 *
 * RESOURCE (`srd/fighter/second-wind-uses`): bounds from
 * `ClassFeatureItem.json`'s own `second-wind-uses` column
 * (`fighter-units.test.ts` pins the exact per-level ladder): 2 at level 1,
 * rising to 4 at level 10+ — MAX (4) is the column's own ceiling (an HONEST
 * bound, the same "read the real ceiling, not a safety margin" posture K1's
 * `srd/hit-die` used), INITIAL (2) is the level-1 value (a Fighter starts
 * play with 2 uses).
 *
 * RECOVERY RULE — GROUNDED, NOT GUESSED (`ledger/classes.md`'s K2 build
 * instruction: "check what recovery_rule strings the server/existing
 * fixtures use, choose honestly"): a direct read of
 * `server/src/world_interaction/layer3/resource_definition.rs` confirms
 * `recovery_rule` is a bare `String` field, stored and round-tripped
 * (`manifest/mod.rs`/`commit.rs`) but consulted by NO reducer anywhere in the
 * server (grepped: no `.recovery_rule ==` match in `server/src`) — the SAME
 * finding `temp-hp-units.ts`'s own header already recorded as finding
 * finding #31 for `srd/hp`/`srd/temp_hp`. `FireBoundary` (the frame-write arm
 * `playing-the-game/fragments/rest.ts`'s Short/Long Rest completion actions
 * fire) ALSO does not read `recovery_rule` or auto-refill any resource
 * (`server/src/world_interaction/layer2/r_apply_consequence/fire_boundary.rs`
 * — it raises the named boundary and nothing else; O3's own Long Rest ->
 * Heroic Inspiration grant is a SEPARATE, explicitly-authored `ModifyResource`
 * ordinal on the SAME consequence, not something `recovery_rule` triggers
 * automatically).
 *
 * CHOSEN HONESTLY: `SECOND_WIND_RECOVERY_RULE` below is
 * `"short_rest_partial_long_rest_full"` — an ACCURATE, PRECISE description of
 * the SRD rule (partial recovery on Short Rest, full on Long Rest, distinct
 * from `srd/hp`'s own bare `"long_rest"`), stored as descriptive metadata
 * exactly like every other `recovery_rule` value in this package. IT DOES NOT
 * MECHANIZE THE RECOVERY: no authored consequence anywhere actually restores
 * `srd/fighter/second-wind-uses` on Short or Long Rest completion this slice.
 * FINDING CANDIDATE, recorded honestly rather than silently half-built: wiring
 * REAL partial/full recovery would mean adding a conditional/unconditional
 * `ModifyResource` ordinal to `playing-the-game/fragments/rest.ts`'s
 * `COMPLETE_SHORT_REST_ACTION_ID`/`COMPLETE_LONG_REST_ACTION_ID` consequences
 * (the SAME technique O3's Resourceful->Heroic Inspiration grant already
 * proves live) — a DIFFERENT chapter's fragment, out of this K2 slice's own
 * scope (Classes should not reach into Playing the Game's rest actions to
 * splice in a Fighter-specific term); a Short Rest's PARTIAL (+1, clamped)
 * recovery is trivially expressible with the existing clamp-add idiom, but a
 * Long Rest's FULL recovery to whatever the ACTOR's own current max-uses
 * ceiling is (2/3/4, level-dependent, not a flat literal) would need the
 * per-actor ceiling as a readable fact first — today only the RESOURCE's own
 * fixed `max_value` (4) exists, so a "refill to 4" delta silently over-grants
 * a level 1-9 Fighter above their own real cap unless a per-level ceiling
 * fact is authored too. Recorded here rather than shipped half-honestly.
 */
export const SECOND_WIND_USES_LOCAL_ID = "fighter/second-wind-uses";
export const SECOND_WIND_USES_RESOURCE_ID = `${BUNDLE_ID}/${SECOND_WIND_USES_LOCAL_ID}`;
export const SECOND_WIND_USES_DISPLAY_NAME = "Second Wind Uses";
export const SECOND_WIND_USES_MIN = 0;
export const SECOND_WIND_USES_MAX = 4;
export const SECOND_WIND_USES_INITIAL = 2;
export const SECOND_WIND_RECOVERY_RULE = "short_rest_partial_long_rest_full";

export const SECOND_WIND_CAPABILITY_LOCAL_ID = "class-feature/fighter/second-wind";
export const SECOND_WIND_CAPABILITY_ID = `${BUNDLE_ID}/${SECOND_WIND_CAPABILITY_LOCAL_ID}`;
export const SECOND_WIND_NICHE_ID = `capability:${SECOND_WIND_CAPABILITY_ID}`;
export const SECOND_WIND_ACTION_LOCAL_ID = "fighter/second-wind";
export const SECOND_WIND_ACTION_ID = `${BUNDLE_ID}/${SECOND_WIND_ACTION_LOCAL_ID}`;

/** `actor.stat('srd/fighter/second-wind-uses') >= 1` — has a use remaining. */
export function secondWindGatePredicateSource(): string {
	return `actor.stat('${SECOND_WIND_USES_RESOURCE_ID}') >= 1`;
}

/** `1d10 + actor.stat('srd/level')` — dice literal + stat read, both independently proven idioms (`damageRollExpr`, this chapter's own damage-units.ts). A positive HEAL magnitude, never negated (the sister's own `delta_source = "1d10"` convention). */
export function secondWindHealDeltaSource(): string {
	return damageRollExpr({
		diceExpr: "1d10",
		modifierExpr: `actor.stat('${BUNDLE_ID}/${LEVEL_ID}')`,
	});
}

/** `Second Wind`'s own ClassFeature.json row's cross-check ceiling — pins `SECOND_WIND_USES_MAX`/`SECOND_WIND_USES_INITIAL` against the REAL `ClassFeatureItem.json` column, never hand-typed alone (offline test consumes this). */
export function secondWindUsesColumn(): { level: number; uses: number }[] {
	const items = readClassFeatureItems(`${FIGHTER_PK_PREFIX}_second-wind-uses`);
	return items.map((item) => {
		if (item.columnValue === null) {
			throw new Error(
				`fighter-units: second-wind-uses item at level ${item.level} carries a null column_value.`,
			);
		}
		return { level: item.level, uses: Number.parseInt(item.columnValue, 10) };
	});
}

/** The channel Second Wind's own Bonus Action spends — `srd/economy_channel/bonus` (action-economy.toml, first Bonus-Action consumer this slice). */
export const SECOND_WIND_CHANNEL_ID = BONUS_CHANNEL_ID;
/** The resource Second Wind's own consequence heals — `srd/hp` (playing-the-game's own identity resource). */
export const SECOND_WIND_HEAL_RESOURCE_ID = `${BUNDLE_ID}/${HP_ID}`;

// --- Tactical Mind (feasibility record) -------------------------------------

/**
 * SRD text (`classes.md:4814-4816`): "When you fail an ability check, you can
 * expend a use of your Second Wind to push yourself toward success. Rather
 * than regaining Hit Points, you roll 1d10 and add the number rolled to the
 * ability check, potentially turning it into a success. If the check still
 * fails, this use of Second Wind isn't expended."
 *
 * FEASIBILITY RECORD (ONE honest attempt, per this slice's own build
 * instruction — not sunk further): this is a POST-ROLL intervention on an
 * ALREADY-RESOLVED ability check, the exact shape finding #58's post-roll
 * reroll-intervention seam was built for (`ledger/designs/finding-58-post-
 * roll-reroll-intervention.md`, RESOLVED 2026-07-30 — the `pending_
 * resolution`/reaction-window machinery `heroic-inspiration-reroll.ts` proves
 * live, `playing-the-game/fragments/heroic-inspiration.ts`'s own
 * `HEROIC_INSPIRATION_REROLL_*` shape). That seam's own shipped shape is a
 * REROLL (replace one die, use the new face outright) — finding #58's own
 * "Required generic shape" section names it explicitly: "an atomic consume-
 * and-reroll operation ... a continuation that recomputes the final branch
 * from the replacement die." Tactical Mind is a DIFFERENT operation: it does
 * NOT replace the original d20 — it ADDS a fresh 1d10 to the ALREADY-RESOLVED
 * check's total, conditionally on the ORIGINAL having failed, refunding the
 * resource spend if the boosted total STILL fails. The existing continuation
 * only ever substitutes a face at the SAME evaluation the intervention
 * attaches to (`reaction_trigger`/`reaction_eligibility` gate a re-roll of
 * ONE recorded die, `r_react`'s own typed die-selection parameter, per the
 * finding's own resolved implementation) — there is no "add a second,
 * independently-rolled die's face to the ALREADY-COMMITTED total and
 * re-evaluate the branch" primitive, and no "refund the resource spend if the
 * boosted total still fails" conditional-refund primitive either. Neither is
 * expressible by re-authoring the EXISTING seam with different authored
 * values (unlike a same-shape different-resource consumer, e.g. "a future
 * Luck feature," which finding #58's own closing paragraph explicitly invites
 * — Tactical Mind is a genuinely different OPERATION on the seam, not a new
 * policy over the same one).
 *
 * VERDICT: identity-authored this slice (the feature-identity entity_
 * definitions row from `buildFighterFeatureUnits()` above, tags `srd.
 * class_feature.tactical-mind` + `srd.class.fighter`); MECHANIZATION DEFERRED
 * — anchored to finding #58's own design doc, which itself is RESOLVED for
 * the reroll shape but does not cover this "additive post-roll boost with
 * conditional refund" shape. A follow-up substrate investigation (not a
 * re-use of the existing reroll continuation) is the honest next step,
 * recorded as its own deferred-with-owner unit below, not sunk into a second
 * attempt this slice (this slice's own build instruction: "Do NOT sink more
 * than one honest attempt into it").
 */
export const TACTICAL_MIND_DESIGN_DOC_ANCHOR =
	"ledger/designs/finding-58-post-roll-reroll-intervention.md (RESOLVED for the REROLL shape; does " +
	"NOT cover Tactical Mind's own additive-boost-with-conditional-refund shape — see fighter-units.ts's " +
	"own Tactical Mind header for the worked distinction)";

// --- Action Surge (mechanized LIVE this slice, D10 rework) ------------------

/**
 * SRD text (`classes.md:4808-4813`): "You can push yourself beyond your
 * normal limits for a moment. On your turn, you can take one additional
 * action, except the Magic action. Once you use this feature, you can't do
 * so again until you finish a Short or Long Rest. Starting at level 17, you
 * can use it twice before a rest but only once on a turn."
 *
 * D10 (Level-Up DM Arc, `ledger/designs/level-up-dm-arc-plan.md` — supersedes
 * this slice's earlier `srd_cc_patch_fighter_level_2`-bundle attempt, own
 * ADR): the SRD bundle is the rulebook — class features exist ONCE here,
 * seeded at seed time; levelling GRANTS them to the hero at runtime,
 * referenced never copied. Mechanized the SAME shape Second Wind proves
 * (resource + capability + a self-only action spending it), following the
 * SAME "read the real ceiling, not a safety margin" maxim: `max_value = 2`
 * is the feature's own real level-17 ceiling (`cache/open5e/
 * ClassFeatureItem.json` carries NO `action-surge-uses` column at all,
 * unlike Second Wind's own — grep-verified — so this bound is read from the
 * SRD prose directly, not a structured column).
 *
 * `initial_value = 0` (NOT the level-2 starting value of 1) — the CRITICAL
 * D10 requirement: a hero who has not yet reached Fighter level 2 must not
 * carry a dormant seed-time charge. The charge arrives at RUNTIME via the
 * level-up DM's own `apply-level-up` consequence chain
 * (`src/author/dm/aldwin.ts`), which does `ModifyResource += 1` on
 * the hero once the level-up is actually applied —
 * `server/src/world_interaction/layer2/r_apply_consequence/modify_resource
 * .rs:222-277`'s own seed-and-apply semantics create the absent
 * `object_state` row from THIS resource's `initial_value` (0) the first time
 * that write lands, so nothing before that point ever reads a stray charge.
 * Gate corollary (finding #35 class, `ledger/designs/level-up-scaling-recon
 * .md`): `actor.stat('srd/fighter/action-surge-uses') >= 1` fails CLOSED
 * while the row is absent, so the Action Surge affordance itself only
 * materialises once the DM's apply-level-up write has actually landed —
 * this is the intended chicken-and-egg-free design, not a bug.
 *
 * LIVE channel grant (L12 / sk-609b.12): consequence spends one charge THEN
 * `ModifyChannel`s one full Primary pool for the acting creature's current
 * round window — the Action-Surge shape documented in
 * `packages/spellkave-world-author/docs/action-economy.md` (default omitted
 * `delta_source` = +1 full `pool_ms_per_round`). `spends_channel` is
 * deliberately OMITTED (unmetered) — Action Surge grants economy, it does
 * not cost it. The SRD "except the Magic action" clause is not filtered at
 * the grant layer (no action-kind channel restriction); tracked as honesty
 * prose on the capability, not a second substrate gap.
 */
export const ACTION_SURGE_USES_LOCAL_ID = "fighter/action-surge-uses";
export const ACTION_SURGE_USES_RESOURCE_ID = `${BUNDLE_ID}/${ACTION_SURGE_USES_LOCAL_ID}`;
export const ACTION_SURGE_USES_DISPLAY_NAME = "Action Surge Uses";
export const ACTION_SURGE_USES_MIN = 0;
export const ACTION_SURGE_USES_MAX = 2;
/** D10 CRITICAL: 0, not the level-2 starting value — see this section's own header. */
export const ACTION_SURGE_USES_INITIAL = 0;
export const ACTION_SURGE_RECOVERY_RULE = "none";

export const ACTION_SURGE_CAPABILITY_LOCAL_ID = "class-feature/fighter/action-surge";
export const ACTION_SURGE_CAPABILITY_ID = `${BUNDLE_ID}/${ACTION_SURGE_CAPABILITY_LOCAL_ID}`;
export const ACTION_SURGE_NICHE_ID = `capability:${ACTION_SURGE_CAPABILITY_ID}`;
export const ACTION_SURGE_ACTION_LOCAL_ID = "fighter/action-surge";
export const ACTION_SURGE_ACTION_ID = `${BUNDLE_ID}/${ACTION_SURGE_ACTION_LOCAL_ID}`;
/** Primary channel granted by Action Surge (`srd/economy_channel/primary`). */
export const ACTION_SURGE_PRIMARY_CHANNEL_ID = PRIMARY_CHANNEL_ID;

/** `actor.stat('srd/fighter/action-surge-uses') >= 1` — a charge remaining (Second Wind's own gate shape). Fails CLOSED while the hero has never had the level-up applied (finding #35 class — see this section's own header). */
export function actionSurgeGatePredicateSource(): string {
	return `actor.stat('${ACTION_SURGE_USES_RESOURCE_ID}') >= 1`;
}

// --- Deferred groups (identity-only, real feature by real feature) ---------

export interface DeferredFeatureGroup {
	slugs: readonly string[];
	owner: string;
}

/**
 * Every real (prose) Fighter/Champion feature NOT mechanized this slice,
 * grouped by the owner who eventually mechanizes it (`ledger/classes.md`'s
 * K2 build instruction: "Extra Attack/ASI/Weapon Mastery/Fighting Style etc.:
 * identity + deferred-with-owner groups"). `core-traits`/`proficiency-bonus`/
 * `second-wind-uses`/`weapon-mastery-count` (the 4 structural/table-data
 * rows) and Second Wind/Tactical Mind/Action Surge (handled above with their
 * own dedicated records) are DELIBERATELY EXCLUDED from this list — every
 * OTHER real feature identity lands in exactly one group here, verified
 * exhaustive by the offline test (every Fighter/Champion feature slug is
 * accounted for exactly once, across the 3 named units above + these
 * groups).
 */
export function deferredFeatureGroups(): DeferredFeatureGroup[] {
	return [
		{
			slugs: ["weapon-mastery"],
			owner:
				"Equipment chapter (weapon-mastery properties — Vex/Topple/Push/Sap/Slow/etc. — are per-" +
				"weapon Item.json/WeaponProperty.json content, this package's Equipment chapter's own scope).",
		},
		{
			slugs: ["ability-score-improvement"],
			owner:
				"Feats chapter (Ability Score Improvement is itself one of the authored Feats — F1's own scope).",
		},
		{
			slugs: ["fighting-style"],
			owner:
				"Feats chapter (Fighting Style feats — Defense, Archery, etc. — are their own Feats.json " +
				"entries; F1's own 'fighting-style feats note').",
		},
		{
			slugs: ["fighter-subclass"],
			owner:
				"K1 already ships the Champion subclass identity + srd.class.fighter linkage tag; per-" +
				'level subclass-choice GATING ("gain each subclass feature of your level or lower") is ' +
				"deferred to a future subclass-progression slice (K3+ pattern-apply scope per the ledger).",
		},
		{
			slugs: ["extra-attack", "two-extra-attacks", "three-extra-attacks"],
			owner:
				"A future Attacks-per-turn mechanization slice (this package's own attack verbs today model " +
				"ONE attack per Attack action; multi-attack needs its own authored shape, not a K2-scope fix).",
		},
		{
			slugs: ["tactical-shift"],
			owner:
				"Depends on Second Wind's own consequence carrying a movement-grant term — a future slice " +
				"once movement-without-provoking-Opportunity-Attacks has its own proven idiom in this package.",
		},
		{
			slugs: ["indomitable"],
			owner:
				"A saving-throw reroll-with-bonus, structurally close to Tactical Mind's own additive-boost " +
				"shape (this module's own Tactical Mind header) — same substrate gap, same deferred fate.",
		},
		{
			slugs: ["tactical-master"],
			owner:
				"Equipment chapter (replacing a weapon's mastery property with Push/Sap/Slow needs Weapon " +
				"Mastery's own mechanization first, same owner as weapon-mastery above).",
		},
		{
			slugs: ["studied-attacks"],
			owner:
				"A future 'grant Advantage on the NEXT attack against a specific target, expiring at end of " +
				"next turn' conditional-modifier slice — no authored idiom for a per-attacker/per-target, " +
				"turn-scoped Advantage grant exists in this package yet.",
		},
		{
			slugs: ["epic-boon"],
			owner: "Feats chapter (Epic Boon feats are their own Feats.json entries, F1+ scope).",
		},
		{
			slugs: [
				"improved-critical",
				"remarkable-athlete",
				"additional-fighting-style",
				"heroic-warrior",
				"superior-critical",
				"survivor",
			],
			owner:
				"Champion subclass mechanization — deferred alongside fighter-subclass's own per-level " +
				"gating above (K3+ pattern-apply scope); Additional Fighting Style also depends on the " +
				"Feats-chapter Fighting Style owner above.",
		},
	];
}
