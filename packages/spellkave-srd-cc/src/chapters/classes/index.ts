// pattern: none — barrel export for classes chapter
// Chapter generator: "Classes" (SRD 5.2.1) — see `ledger/classes.md` for the
// full chapter work-plan checklist and slice plan.
//
// PER-CLASS FIXTURE LAYOUT (operator directive, 2026-08-06 — repo-wide "no
// generic collection files, filename says what's inside" norm; team-lead
// ruling 2026-08-06 on this chapter specifically: the per-entity directive
// is NOT scoped to the five catalog axes, it covers Classes too). ONE file
// per class, `base/classes/<slug>.toml`, carrying that class' own
// `entity_definitions` row, its ONE subclass' own row, and every
// `ClassFeature.json` row either owns (class-own + subclass-own feature
// identities together) — Fighter's own file additionally carries Second
// Wind mechanized LIVE. Two small shared fragments sit alongside: `srd/
// hit-die` (`hit-die.toml`, the one resource every class' own row
// references) and the full `srd.class`/`srd.subclass`/`srd.class_feature`
// tag catalog (`tag-vocabulary.toml`, the shared vocabulary every class
// file's own tags resolve against) — neither is a "collection of entities"
// the way the old `classes.toml`/`fighter.toml`/`remaining-classes.toml`
// aggregates were; each is ONE cohesive, self-describing thing, the same
// role `monsters/index.ts`'s own `tag-values.toml` plays for that chapter.
//
// RENDER/VALIDATION BATCHING (#2124 pattern, `driveEntityBatch`): the 352
// feature-identity entities (Fighter's 19 + Champion's 6 + the 11 remaining
// classes' own 327) validate in fixed-size GROUPS — the SAME mechanism
// `monsters/index.ts`'s own `RENDER_BATCH_SIZE` note describes — then get
// regrouped by class slug (`classSlugForEntityId` below) into their own
// class file, rather than split one-file-per-feature (327+ tiny files would
// violate the SAME "no generic collection" spirit in the other direction —
// a class' own features are cohesive, self-describing as ONE file per
// class). The 24 class+subclass entities (cheap, never needed batching)
// render via one throwaway `driveUnitScene`, then split the SAME way
// (`splitEntityRows`, exported by `verb-runner.ts` for exactly this reuse).
//
// CONTENT PROVENANCE (unchanged from the prior K1/K2/K3 slices, only the
// FILE assembly changed here):
//   K1: 12 base-class + 12 subclass identities, `srd/hit-die` (NEW resource)
//   + `srd/hp_per_level` (THE C4 INTERLOCK) seeded on every base class.
//   Subclasses carry NEITHER seed (die-inheritance quirk guard). Capability
//   authoring for save/weapon/armor-training proficiencies stays explicitly
//   DEFERRED — identity-text only, see `deferredCapabilityUnit` below.
//   K2 (Fighter vertical, real content in `./fighter-units.ts`): 19 Fighter
//   + 6 Champion feature identities, Second Wind mechanized LIVE (resource +
//   capability + action) — its own dedicated scene (never the SAME
//   workspace as the batched feature entities: Second Wind's brand-new
//   capability/resource ids can't be referenced by an
//   `entity_definition_initial_capability` grant on the ALREADY-SHIPPED
//   `srd/class/fighter` row within one `generate` pass — `chapters/
//   index.ts`'s own `target` is always the PREVIOUSLY COMMITTED fixtures,
//   never this run's in-progress output; proven live instead via an
//   EXPLICIT grant on the shared proof-scene hero,
//   `playing-the-game/proof-scene/calls/identity.ts`).
//   K3 (real content in `./remaining-classes-units.ts`): the 11 remaining
//   classes' own 327 feature identities, IDENTITY ONLY, no live
//   mechanization attempted; spellcasting (55 SPELL_SLOTS rows) explicitly
//   DEFERRED-WITH-OWNER pending the Spells chapter's own spell-behavior
//   work (P1b).
import type { AuthorTarget } from "@spellkave/tool-authoring";
import {
	type ChapterReaderProseResult,
	type ReaderSubjectAttachment,
	renderReaderProseForDocuments,
} from "../../compendium-metadata";
import { readClassFeatureFlavor, readResourceFlavor } from "../../flavor/read";
import {
	driveDefineWithSrdText,
	markdownHeadingBlock,
	srdTextAttachmentWriteCall,
	srdTextNamespaceWriteCall,
} from "../../text";
import { canonicalClassFeatureText } from "../../text/class-feature-canonical";
import type { ChapterUnitSummary } from "../chapter-types";
import { HP_PER_LEVEL_ID } from "../character-creation/advancement-units";
import { cappedHealingExpr } from "../playing-the-game/healing-units";
import {
	type BatchEntity,
	driveEntityBatch,
	driveUnitFragment,
	driveUnitScene,
	splitEntityRows,
	type VerbCall,
} from "../verb-runner";
import {
	advancementMetadataGapsByClass,
	buildAdvancementMetadataFragment,
} from "./advancement-metadata-units";
import { buildCasterFeaturesFragment } from "./caster-features-units";
import {
	buildClassDescription,
	buildClassTagValueUnits,
	buildClassUnits,
	buildSubclassDescription,
	buildSubclassTagValueUnits,
	buildSubclassUnits,
	CLASS_CLASS_TAG,
	CLASS_TAG_PREFIX,
	type ClassUnit,
	HIT_DIE_DISPLAY_NAME,
	HIT_DIE_INITIAL,
	HIT_DIE_MAX,
	HIT_DIE_MIN,
	HIT_DIE_RECOVERY_RULE,
	HIT_DIE_RESOURCE_ID,
	HIT_DIE_RESOURCE_LOCAL_ID,
	SUBCLASS_CLASS_TAG,
	SUBCLASS_TAG_PREFIX,
	type SubclassUnit,
} from "./classes-units";
import {
	ACTION_SURGE_ACTION_ID,
	ACTION_SURGE_ACTION_LOCAL_ID,
	ACTION_SURGE_CAPABILITY_ID,
	ACTION_SURGE_CAPABILITY_LOCAL_ID,
	ACTION_SURGE_NICHE_ID,
	ACTION_SURGE_PRIMARY_CHANNEL_ID,
	ACTION_SURGE_RECOVERY_RULE,
	ACTION_SURGE_USES_DISPLAY_NAME,
	ACTION_SURGE_USES_INITIAL,
	ACTION_SURGE_USES_LOCAL_ID,
	ACTION_SURGE_USES_MAX,
	ACTION_SURGE_USES_MIN,
	ACTION_SURGE_USES_RESOURCE_ID,
	actionSurgeGatePredicateSource,
	buildChampionFeatureUnits,
	buildFeatureTagValueUnits,
	buildFighterFeatureUnits,
	CLASS_FEATURE_TAG_PREFIX,
	deferredFeatureGroups,
	type FeatureIdentityUnit,
	FIGHTER_CLASS_TAG,
	SECOND_WIND_ACTION_ID,
	SECOND_WIND_ACTION_LOCAL_ID,
	SECOND_WIND_CAPABILITY_ID,
	SECOND_WIND_CAPABILITY_LOCAL_ID,
	SECOND_WIND_CHANNEL_ID,
	SECOND_WIND_HEAL_RESOURCE_ID,
	SECOND_WIND_NICHE_ID,
	SECOND_WIND_RECOVERY_RULE,
	SECOND_WIND_USES_DISPLAY_NAME,
	SECOND_WIND_USES_INITIAL,
	SECOND_WIND_USES_LOCAL_ID,
	SECOND_WIND_USES_MAX,
	SECOND_WIND_USES_MIN,
	SECOND_WIND_USES_RESOURCE_ID,
	secondWindGatePredicateSource,
	secondWindHealDeltaSource,
	TACTICAL_MIND_DESIGN_DOC_ANCHOR,
} from "./fighter-units";
import {
	buildBarbarianMartialFragment,
	buildMonkMartialFragment,
	buildRogueMartialFragment,
} from "./martial-fragments";
import {
	buildBarbarianSlice2Fragment,
	buildFighterSlice2Fragment,
	buildMonkSlice2Fragment,
	buildRogueSlice2Fragment,
} from "./martial-slice2-fragments";
import {
	buildRemainingClassFeatureGroups,
	buildRemainingFeatureTagValueUnits,
	type RemainingFeatureUnit,
} from "./remaining-classes-units";
import { buildSpellcastingSubstrateFragment } from "./spellcasting-substrate-units";

export const BUNDLE_ID = "srd";

const STRUCTURAL_FRAMING_ANCHOR =
	"classes.md (§ Classes — no 'Parts of a Class' intro section, unlike Character Origins/Feats; the " +
	"chapter opens straight into the first class. Structural framing IS the section-shape uniformity " +
	'itself: 12 classes, IDENTICAL shape — Core Traits table -> "Becoming a X" -> Class Features table -> ' +
	"per-feature sections -> optional Spell List -> exactly ONE subclass, ledger/classes.md's own Sources note)";
const LATER_SLICES_ANCHOR =
	"classes.md:4579-4896 (Fighter :4579, the K2 exemplar — 19 Fighter + 6 Champion feature identities, " +
	"Second Wind live, Action Surge a substrate FINDING) and the 11 remaining classes (K3, all 327 " +
	"remaining ClassFeature.json rows — 275 class-own + 52 subclass-own — shipped as identity, NO live " +
	"mechanization attempted, remaining-classes-units.ts's own module header names the breadth-first " +
	"posture); spellcasting substrate through L4 lives in spellcasting-substrate-units.ts " +
	"(docs/spellcasting-substrate.md) — slot grants, profiles, class→magic bridges.";
const SAVE_WEAPON_ARMOR_ANCHOR =
	"Core Traits table rows 3/5/6 (Saving Throw Proficiencies / Weapon Proficiencies / Armor Training), " +
	"per class — capability authoring (the roll-context-gated proficiency idiom, sister-precedented as " +
	"identity-tier-only/honestly-unwired) is explicitly OUT OF SCOPE this slice, per this chapter's own " +
	"K1 build instructions; every class' own description carries the SRD text as identity metadata.";
const FIGHTER_ANCHOR = "classes.md:4579-4896 (§ Fighter + § Fighter Subclass: Champion)";
const SECOND_WIND_ANCHOR = "classes.md:4794-4798 (§ Fighter > Level 1: Second Wind)";
const TACTICAL_MIND_ANCHOR = "classes.md:4814-4816 (§ Fighter > Level 2: Tactical Mind)";
const ACTION_SURGE_ANCHOR = "classes.md:4808-4813 (§ Fighter > Level 2: Action Surge)";
const HIT_DIE_PATH = "base/classes/hit-die.toml";
const TAG_VOCABULARY_PATH = "base/classes/tag-vocabulary.toml";
const ADVANCEMENT_METADATA_PATH = "base/classes/advancement-metadata.toml";
const SPELLCASTING_SUBSTRATE_PATH = "base/classes/spellcasting-substrate.toml";
const CASTER_FEATURES_PATH = "base/classes/caster-features.toml";
const FIGHTER_SLUG = "fighter";

/** Fixed batch size for the 352-feature render/validation grouping (#2124) — same order of magnitude as `monsters/index.ts`'s own `RENDER_BATCH_SIZE`. */
const FEATURE_BATCH_SIZE = 110;

export interface ClassesOutput {
	fragments: Record<string, string>;
	units: ChapterUnitSummary[];
}

function tagRow(unit: {
	tag: string;
	prefix: string;
	description: string;
}): Record<string, unknown> {
	return {
		tag: unit.tag,
		prefix: unit.prefix,
		bundle_id: BUNDLE_ID,
		description: unit.description,
	};
}

/** The FULL shared tag catalog this chapter owns: `srd.class`/`srd.class.<slug>` (13) + `srd.subclass`/`srd.subclass.<slug>` (13) + `srd.class_feature`/`srd.class_feature.<slug>` (K2's 26 + K3's 200 = 226) — 252 rows total. Every class file's own entities resolve their tags against this ONE list, re-seeded into every throwaway workspace below (same idiom every prior slice used per-fragment, just unified here since files no longer align 1:1 with K1/K2/K3's own slice boundaries). */
function allTagValueUnits() {
	return [
		...buildClassTagValueUnits(),
		...buildSubclassTagValueUnits(),
		...buildFeatureTagValueUnits(),
		...buildRemainingFeatureTagValueUnits(),
	];
}

function fullTagSeedCall(): VerbCall {
	return {
		toolName: "spellkave_write_rows",
		label: "classes-tag-vocabulary-seed",
		params: {
			bundle: BUNDLE_ID,
			kind: "tag_value_definitions",
			rows: allTagValueUnits().map(tagRow),
		},
	};
}

/** Shared `tag-vocabulary.toml`: the full 252-row catalog, ONE `driveUnitFragment` call. */
async function buildTagVocabularyFragment(): Promise<{
	toml: string;
	units: ChapterUnitSummary[];
}> {
	const allTags = allTagValueUnits();
	const toml = await driveUnitFragment(BUNDLE_ID, fullTagSeedCall(), {
		onlyTagValueDefinitionTags: allTags.map((definition) => definition.tag),
	});
	const units: ChapterUnitSummary[] = allTags.map((definition) => ({
		kind: "tag_value_definitions",
		id: definition.tag,
		sourcePk: definition.sourcePk,
	}));
	return { toml, units };
}

/** Shared `hit-die.toml`: the one `srd/hit-die` resource every class' own row references — no dependencies, no target needed. */
async function buildHitDieFragment(): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	const toml = await driveDefineWithSrdText(
		BUNDLE_ID,
		{
			toolName: "spellkave_define_resource",
			label: `resource:${HIT_DIE_RESOURCE_LOCAL_ID}`,
			params: {
				id: HIT_DIE_RESOURCE_LOCAL_ID,
				display_name: HIT_DIE_DISPLAY_NAME,
				min_value: HIT_DIE_MIN,
				max_value: HIT_DIE_MAX,
				initial_value: HIT_DIE_INITIAL,
				recovery_rule: HIT_DIE_RECOVERY_RULE,
				description: readResourceFlavor("hit-die").body,
				tags: [],
			},
		},
		{
			targetKind: "resource_definition",
			targetRef: HIT_DIE_RESOURCE_ID,
			extracted: markdownHeadingBlock("playing-the-game.md", "Hit Points"),
		},
	);
	return { toml, units: [{ kind: "resource_definitions", id: HIT_DIE_RESOURCE_ID, sourcePk: "" }] };
}

/**
 * The 12 base-class + 12 subclass `entity_definitions` rows, ONE per-entity
 * fragment each (keyed by `entityId`) — cheap enough (24 entities) that no
 * batching is needed, but `splitEntityRows` (the SAME #2124 splitter
 * `driveEntityBatch` uses internally) still regroups the ONE scene's
 * combined output back to per-entity text, so this function's own caller
 * can slot each class/subclass into its own file. `omitRowKinds:
 * ["resource_definitions"]` strips the in-scene `srd/hit-die` DEFINE call
 * from the returned text (needed in-scene only so each class' own
 * `initial_states` reference validates) — `buildHitDieFragment` above
 * authors the real standalone `hit-die.toml` separately.
 *
 * EXPORTED: a caller that only needs this K1 content (e.g. `classes.test.ts`'s
 * own `entity_definition_initial_state` assertions) calls this directly
 * rather than the full `generateClasses()` — avoids paying the much larger
 * K2+K3 feature-batch cost, and avoids a long synchronous block inside a
 * single vitest test (`pipeline.test.ts`'s own header names why that risks
 * starving vitest's worker RPC heartbeat, the #2123 finding).
 */
export async function buildClassAndSubclassEntityFragments(
	target?: AuthorTarget,
): Promise<{ fragmentsByEntityId: Map<string, string>; units: ChapterUnitSummary[] }> {
	const classTags = buildClassTagValueUnits();
	const subclassTags = buildSubclassTagValueUnits();
	const tagSeedCall: VerbCall = {
		toolName: "spellkave_write_rows",
		label: "class-tag-vocabulary-seed",
		params: {
			bundle: BUNDLE_ID,
			kind: "tag_value_definitions",
			rows: [...classTags, ...subclassTags].map(tagRow),
		},
	};

	const classes = buildClassUnits();
	const subclasses = buildSubclassUnits();
	const hpPerLevelStateId = `${BUNDLE_ID}/${HP_PER_LEVEL_ID}`;
	const entityScene: VerbCall[] = [
		tagSeedCall,
		srdTextNamespaceWriteCall(),
		{
			toolName: "spellkave_define_resource",
			label: `resource:${HIT_DIE_RESOURCE_LOCAL_ID}`,
			params: {
				id: HIT_DIE_RESOURCE_LOCAL_ID,
				display_name: HIT_DIE_DISPLAY_NAME,
				min_value: HIT_DIE_MIN,
				max_value: HIT_DIE_MAX,
				initial_value: HIT_DIE_INITIAL,
				recovery_rule: HIT_DIE_RECOVERY_RULE,
				description:
					"In-scene seed only, stripped from this fragment's own output — see hit-die.toml.",
				tags: [],
			},
		},
		...classes.map((unit) => ({
			toolName: "spellkave_define_entity_type",
			label: `entity:class/${unit.slug}`,
			params: {
				bundle: BUNDLE_ID,
				id: `class/${unit.slug}`,
				display_name: unit.displayName,
				description: buildClassDescription(unit),
				tags: [CLASS_CLASS_TAG, `${CLASS_TAG_PREFIX}.${unit.slug}`],
				initial_states: [
					{ state: HIT_DIE_RESOURCE_ID, value_int: unit.hitDieSize },
					{ state: hpPerLevelStateId, value_int: unit.hpPerLevel },
				],
			},
		})),
		...subclasses.map((unit) => ({
			toolName: "spellkave_define_entity_type",
			label: `entity:subclass/${unit.slug}`,
			params: {
				bundle: BUNDLE_ID,
				id: `subclass/${unit.slug}`,
				display_name: unit.displayName,
				description: buildSubclassDescription(unit),
				tags: [SUBCLASS_CLASS_TAG, `${SUBCLASS_TAG_PREFIX}.${unit.slug}`, unit.parentClassTag],
			},
		})),
		...classes.map((unit) =>
			srdTextAttachmentWriteCall({
				targetKind: "entity_definition",
				targetRef: unit.entityId,
				extracted: markdownHeadingBlock("classes.md", unit.displayName),
			}),
		),
		...subclasses.map((unit) =>
			srdTextAttachmentWriteCall({
				targetKind: "entity_definition",
				targetRef: unit.entityId,
				extracted: markdownHeadingBlock(
					"classes.md",
					`${unit.parentDisplayName} Subclass: ${unit.displayName}`,
				),
			}),
		),
	];
	const combined = await driveUnitScene(BUNDLE_ID, entityScene, target, {
		omitRowKinds: ["resource_definitions"],
	});
	const entityIds = [...classes.map((c) => c.entityId), ...subclasses.map((s) => s.entityId)];
	const fragmentsByEntityId = splitEntityRows(combined, entityIds);

	const units: ChapterUnitSummary[] = [
		...classes.map((unit) => ({
			kind: "entity_definitions",
			id: unit.entityId,
			sourcePk: unit.sourcePk,
		})),
		...subclasses.map((unit) => ({
			kind: "entity_definitions",
			id: unit.entityId,
			sourcePk: unit.sourcePk,
		})),
	];
	return { fragmentsByEntityId, units };
}

function featureEntityCall(unit: FeatureIdentityUnit | RemainingFeatureUnit): VerbCall {
	return {
		toolName: "spellkave_define_entity_type",
		label: `entity:${unit.entityId}`,
		params: {
			bundle: BUNDLE_ID,
			id: unit.entityId.slice(`${BUNDLE_ID}/`.length),
			display_name: unit.displayName,
			description: readClassFeatureFlavor(unit.entityId).body,
			tags: unit.tags,
		},
	};
}

/**
 * All 352 feature-identity entities (Fighter's 19 + Champion's 6 + the 11
 * remaining classes' own 327), validated in fixed-size batches
 * (`FEATURE_BATCH_SIZE`, the #2124 pattern) and returned per-entity
 * (`entityId` keyed) — this function's own caller regroups by class slug
 * into each class' own file.
 */
async function buildFeatureEntityFragments(
	target?: AuthorTarget,
): Promise<{ fragmentsByEntityId: Map<string, string>; units: ChapterUnitSummary[] }> {
	const fighterFeatures = buildFighterFeatureUnits();
	const championFeatures = buildChampionFeatureUnits();
	const remainingGroups = buildRemainingClassFeatureGroups();
	const contextualFeatures: ReadonlyArray<{
		unit: FeatureIdentityUnit | RemainingFeatureUnit;
		className: string;
		parentPk: string;
		subclassName?: string;
	}> = [
		...fighterFeatures.map((unit) => ({
			unit,
			className: "Fighter",
			parentPk: "srd-2024_fighter",
		})),
		...championFeatures.map((unit) => ({
			unit,
			className: "Fighter",
			parentPk: "srd-2024_champion",
			subclassName: "Champion",
		})),
		...remainingGroups.flatMap((group) => [
			...group.classFeatures.map((unit) => ({
				unit,
				className: group.classDisplayName,
				parentPk: group.classSourcePk,
			})),
			...group.subclassFeatures.map((unit) => ({
				unit,
				className: group.classDisplayName,
				parentPk: group.subclassSourcePk,
				subclassName: group.subclassDisplayName,
			})),
		]),
	];
	const batchEntities: BatchEntity[] = contextualFeatures.map(
		({ unit, className, parentPk, subclassName }) => ({
			entityDefId: unit.entityId,
			call: featureEntityCall(unit),
			extraCalls: [
				srdTextAttachmentWriteCall({
					targetKind: "entity_definition",
					targetRef: unit.entityId,
					extracted: canonicalClassFeatureText({
						sourcePk: unit.sourcePk,
						parentPk,
						featureSlug: unit.slug,
						className,
						...(subclassName ? { subclassName } : {}),
					}),
				}),
			],
		}),
	);
	const fragmentsByEntityId = await driveEntityBatch(
		BUNDLE_ID,
		batchEntities,
		FEATURE_BATCH_SIZE,
		target,
		[fullTagSeedCall(), srdTextNamespaceWriteCall()],
	);
	const units: ChapterUnitSummary[] = contextualFeatures.map(({ unit }) => ({
		kind: "entity_definitions",
		id: unit.entityId,
		sourcePk: unit.sourcePk,
	}));
	return { fragmentsByEntityId, units };
}

/**
 * Second Wind mechanized LIVE (`srd/fighter/second-wind-uses` resource +
 * `srd/class-feature/fighter/second-wind` capability + `srd/fighter/
 * second-wind` Bonus-Action self-heal) — its OWN throwaway `driveUnitScene`
 * (never the same workspace as the batched feature entities above: the
 * action's `required_capability` must resolve the capability defined
 * earlier in the SAME scene). Appended directly to Fighter's own class
 * file text by this module's own assembly step below.
 */
async function buildSecondWindFragment(
	target?: AuthorTarget,
): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	const secondWindConsequence: VerbCall = {
		toolName: "spellkave_define_action_verb",
		label: `action:${SECOND_WIND_ACTION_LOCAL_ID}`,
		params: {
			bundle: BUNDLE_ID,
			id: SECOND_WIND_ACTION_LOCAL_ID,
			required_capability: SECOND_WIND_CAPABILITY_ID,
			niche_id: SECOND_WIND_NICHE_ID,
			display_name: "Use Second Wind",
			description:
				'SRD: "As a Bonus Action, you can use it to regain Hit Points equal to 1d10 plus your ' +
				`Fighter level." (${SECOND_WIND_ANCHOR}) Gate: a use remaining ` +
				"(srd/fighter/second-wind-uses >= 1). Consequence: spend one use, then heal 1d10 + the " +
				"acting creature's own srd/level. Recovery (1 on Short Rest, all on Long Rest) is NOT " +
				"mechanized this slice — see fighter-units.ts's own Second Wind header (finding candidate).",
			self_eligible: true,
			self_only: true,
			spends_channel: SECOND_WIND_CHANNEL_ID,
			cost_time_ms: 0,
			predicate_source: secondWindGatePredicateSource(),
			consequence: {
				description: "Spend one Second Wind use, then heal 1d10 + the acting creature's own level.",
				frame_writes: [
					{
						ModifyResource: {
							actor: "Actor",
							resource: SECOND_WIND_USES_RESOURCE_ID,
							delta_source: "-1",
						},
					},
					{
						ModifyResource: {
							actor: "Actor",
							resource: SECOND_WIND_HEAL_RESOURCE_ID,
							delta_source: cappedHealingExpr(secondWindHealDeltaSource(), "actor"),
						},
					},
				],
			},
		},
	};

	const scene: VerbCall[] = [
		fullTagSeedCall(),
		// sk-0m4.69 / 2026-08-20: class features are carrier-bound. Without this
		// row the synthetic `capability:*` niche fails closed to place-provided
		// (running-an-authored-act.md) and Second Wind is silently unselectable
		// anywhere a spatial_niche_attachment was never authored — including the
		// crypt. Same shape as fragments/dodge.ts / rest.ts.
		{
			toolName: "spellkave_write_rows",
			label: "niche:second-wind",
			params: {
				bundle: BUNDLE_ID,
				kind: "niche_definitions",
				rows: [
					{
						niche_id: SECOND_WIND_NICHE_ID,
						bundle_id: BUNDLE_ID,
						display_name: "Use Second Wind (self)",
						description:
							"sk-0m4.69 (operator ruling 2026-08-20): Fighter class features are actor-carried " +
							"— the acting creature's own Second Wind capability carries this niche everywhere, " +
							"no spatial_niche_attachment required. Reverses the silent place-provided fallback " +
							"that left this verb dead outside an authored node.",
						predicate_source: "",
						provider: "actor",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_resource",
			label: `resource:${SECOND_WIND_USES_LOCAL_ID}`,
			params: {
				id: SECOND_WIND_USES_LOCAL_ID,
				display_name: SECOND_WIND_USES_DISPLAY_NAME,
				min_value: SECOND_WIND_USES_MIN,
				max_value: SECOND_WIND_USES_MAX,
				initial_value: SECOND_WIND_USES_INITIAL,
				recovery_rule: SECOND_WIND_RECOVERY_RULE,
				description: readResourceFlavor("fighter-second-wind-uses").body,
				tags: [],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: `capability:${SECOND_WIND_CAPABILITY_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: SECOND_WIND_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Use Second Wind",
				description:
					"Fighter class feature — draw on a reserve of stamina to regain Hit Points as a Bonus " +
					`Action. SRD: ${SECOND_WIND_ANCHOR}. Sister precedent: world-fixtures/srd/base/` +
					"second-wind.toml's own capability_id, re-authored through this package's own verb path.",
				tags: [
					"srd.action",
					CLASS_FEATURE_TAG_PREFIX,
					`${CLASS_FEATURE_TAG_PREFIX}.second-wind`,
					FIGHTER_CLASS_TAG,
				],
			},
		},
		secondWindConsequence,
	];
	const toml = await driveUnitScene(BUNDLE_ID, scene, target);
	const units: ChapterUnitSummary[] = [
		{ kind: "niche_definitions", id: SECOND_WIND_NICHE_ID, sourcePk: "" },
		{
			kind: "resource_definitions",
			id: SECOND_WIND_USES_RESOURCE_ID,
			sourcePk: SECOND_WIND_ANCHOR,
		},
		{ kind: "capability_definitions", id: SECOND_WIND_CAPABILITY_ID, sourcePk: SECOND_WIND_ANCHOR },
		{ kind: "action_definitions", id: SECOND_WIND_ACTION_ID, sourcePk: SECOND_WIND_ANCHOR },
		{ kind: "consequence_templates", id: `${SECOND_WIND_ACTION_ID}/success`, sourcePk: "" },
		{ kind: "outcome_templates", id: `${SECOND_WIND_ACTION_ID}/outcome`, sourcePk: "" },
		{ kind: "affordance_templates", id: `${SECOND_WIND_ACTION_ID}/affordance`, sourcePk: "" },
	];
	return { toml, units };
}

/**
 * D10 rework (Level-Up DM Arc, `ledger/designs/level-up-dm-arc-plan.md`):
 * Action Surge mechanized LIVE here (`srd/fighter/action-surge-uses`
 * resource + `srd/class-feature/fighter/action-surge` capability +
 * `srd/fighter/action-surge` action) — the SAME shape Second Wind's own
 * `buildSecondWindFragment` proves, own throwaway `driveUnitScene` for the
 * SAME reason (its brand-new resource/capability ids can't be referenced by
 * an already-shipped row within the SAME `generate` pass). `initial_value =
 * 0` (not the level-2 starting value) is the D10 CRITICAL requirement — see
 * `fighter-units.ts`'s own Action Surge section header for the full
 * seed-and-apply reasoning.
 *
 * L12a (sk-609b.12.1): the extra Primary-channel action is a real
 * `ModifyChannel` grant on the Primary channel (default +1 full pool),
 * after spending the charge.
 *
 * pattern: extra-action-budget
 * → packages/spellkave-world-author/docs/patterns/extra-action-budget.md
 * Magic-action exclusion remains unenforced at the grant layer.
 */
// pattern: extra-action-budget
async function buildActionSurgeFragment(
	target?: AuthorTarget,
): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	// pattern: extra-action-budget
	// → packages/spellkave-world-author/docs/patterns/extra-action-budget.md
	const actionSurgeConsequence: VerbCall = {
		toolName: "spellkave_define_action_verb",
		label: `action:${ACTION_SURGE_ACTION_LOCAL_ID}`,
		params: {
			bundle: BUNDLE_ID,
			id: ACTION_SURGE_ACTION_LOCAL_ID,
			required_capability: ACTION_SURGE_CAPABILITY_ID,
			niche_id: ACTION_SURGE_NICHE_ID,
			display_name: "Use Action Surge",
			description:
				'SRD: "On your turn, you can take one additional action, except the Magic action." (' +
				`${ACTION_SURGE_ANCHOR}) Gate: a charge remaining (${ACTION_SURGE_USES_RESOURCE_ID} >= 1). ` +
				`Consequence: spend one charge, then ModifyChannel-grant one full ${ACTION_SURGE_PRIMARY_CHANNEL_ID} ` +
				"pool for the current round window (world-author action-economy.md). Unmetered — Action Surge " +
				"grants economy, it does not cost a channel. Magic-action exclusion is not yet filtered at " +
				"the grant layer.",
			self_eligible: true,
			self_only: true,
			cost_time_ms: 0,
			predicate_source: actionSurgeGatePredicateSource(),
			consequence: {
				description:
					"Spend one Action Surge charge and grant one additional Primary-channel action this turn.",
				frame_writes: [
					{
						ModifyResource: {
							actor: "Actor",
							resource: ACTION_SURGE_USES_RESOURCE_ID,
							delta_source: "-1",
						},
					},
					{
						ModifyChannel: {
							actor: "Actor",
							channel: ACTION_SURGE_PRIMARY_CHANNEL_ID,
						},
					},
				],
			},
		},
	};

	const scene: VerbCall[] = [
		fullTagSeedCall(),
		// sk-0m4.69 / 2026-08-20: same carrier-bound ruling as Second Wind.
		// Reverses actor-carried-verbs D2(c) (2026-08-13), which left Action Surge
		// place-attached at Aldwin's common room — blind run 10 needed it in the crypt.
		{
			toolName: "spellkave_write_rows",
			label: "niche:action-surge",
			params: {
				bundle: BUNDLE_ID,
				kind: "niche_definitions",
				rows: [
					{
						niche_id: ACTION_SURGE_NICHE_ID,
						bundle_id: BUNDLE_ID,
						display_name: "Use Action Surge (self)",
						description:
							"sk-0m4.69 (operator ruling 2026-08-20, reversal of D2(c) 2026-08-13): Action " +
							"Surge is actor-carried — the acting creature's own capability carries this niche " +
							"everywhere. The earlier room-scoping premise (only exercised at Aldwin's level-up) " +
							"was falsified: a fighter needs the feature wherever they stand.",
						predicate_source: "",
						provider: "actor",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_resource",
			label: `resource:${ACTION_SURGE_USES_LOCAL_ID}`,
			params: {
				id: ACTION_SURGE_USES_LOCAL_ID,
				display_name: ACTION_SURGE_USES_DISPLAY_NAME,
				min_value: ACTION_SURGE_USES_MIN,
				max_value: ACTION_SURGE_USES_MAX,
				initial_value: ACTION_SURGE_USES_INITIAL,
				recovery_rule: ACTION_SURGE_RECOVERY_RULE,
				description: readResourceFlavor("fighter-action-surge-uses").body,
				tags: [],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: `capability:${ACTION_SURGE_CAPABILITY_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: ACTION_SURGE_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Use Action Surge",
				description:
					"Fighter class feature — push beyond your normal limits for one additional action. SRD: " +
					ACTION_SURGE_ANCHOR +
					`. LIVE: spends one Action Surge charge and ModifyChannel-grants one full ` +
					`${ACTION_SURGE_PRIMARY_CHANNEL_ID} pool this round (world-author action-economy.md). ` +
					"Magic-action exclusion remains unenforced at the grant layer.",
				tags: [
					"srd.action",
					CLASS_FEATURE_TAG_PREFIX,
					`${CLASS_FEATURE_TAG_PREFIX}.action-surge`,
					FIGHTER_CLASS_TAG,
				],
			},
		},
		actionSurgeConsequence,
	];
	const body = await driveUnitScene(BUNDLE_ID, scene, target);
	const patternBanner = [
		"# pattern: extra-action-budget",
		"# → packages/spellkave-world-author/docs/patterns/extra-action-budget.md",
		"",
		"",
	].join("\n");
	const units: ChapterUnitSummary[] = [
		{ kind: "niche_definitions", id: ACTION_SURGE_NICHE_ID, sourcePk: "" },
		{
			kind: "resource_definitions",
			id: ACTION_SURGE_USES_RESOURCE_ID,
			sourcePk: ACTION_SURGE_ANCHOR,
		},
		{
			kind: "capability_definitions",
			id: ACTION_SURGE_CAPABILITY_ID,
			sourcePk: ACTION_SURGE_ANCHOR,
		},
		{ kind: "action_definitions", id: ACTION_SURGE_ACTION_ID, sourcePk: ACTION_SURGE_ANCHOR },
		{ kind: "consequence_templates", id: `${ACTION_SURGE_ACTION_ID}/success`, sourcePk: "" },
		{ kind: "outcome_templates", id: `${ACTION_SURGE_ACTION_ID}/outcome`, sourcePk: "" },
		{ kind: "affordance_templates", id: `${ACTION_SURGE_ACTION_ID}/affordance`, sourcePk: "" },
	];
	return { toml: patternBanner + body, units };
}

/** `srd/class/<slug>` -> `<slug>`; `srd/subclass/<slug>` -> its parent's own slug (`subclassParent`); `srd/class-feature/<classSlug>/...` -> `<classSlug>` (always the first path segment after `class-feature/`, by construction — both `fighter-units.ts` and `remaining-classes-units.ts` build their own `entityId`s this way). Throws on any other shape — every entity this chapter authors must route to exactly one class file. */
function classSlugForEntityId(
	entityId: string,
	subclassParent: ReadonlyMap<string, string>,
): string {
	const bundlePrefix = `${BUNDLE_ID}/`;
	if (!entityId.startsWith(bundlePrefix)) {
		throw new Error(
			`classes/index: entity id '${entityId}' does not start with '${bundlePrefix}'.`,
		);
	}
	const rest = entityId.slice(bundlePrefix.length);
	const [kind, first] = rest.split("/");
	if (kind === "class" && first !== undefined) return first;
	if (kind === "class-feature" && first !== undefined) return first;
	if (kind === "subclass" && first !== undefined) {
		const parent = subclassParent.get(first);
		if (parent === undefined) {
			throw new Error(`classes/index: no parent class found for subclass slug '${first}'.`);
		}
		return parent;
	}
	throw new Error(`classes/index: cannot derive a class slug for entity id '${entityId}'.`);
}

function classFileHeader(classUnit: ClassUnit, subclassUnit: SubclassUnit): string {
	const lines = [
		"# GENERATED by src/chapters/classes/index.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		`# Classes chapter identity: ${classUnit.displayName} (srd/class/${classUnit.slug}) + its own`,
		`# subclass, ${subclassUnit.displayName} (srd/subclass/${subclassUnit.slug}), plus every`,
		`# ClassFeature.json row either owns (srd/class-feature/${classUnit.slug}/... and`,
		`# srd/class-feature/${classUnit.slug}/${subclassUnit.slug}/...).`,
	];
	// Note: composition catalog (sk-609b.12.7) — fighter Action Surge uses extra-action-budget;
	// other class files that ship ApplyStatus / multi-frame consequences cite condition-grant.
	// Monk/Rogue ALSO cite extra-action-budget (sk-0m4.123): Step of the Wind's/Cunning
	// Action's own Dash option ModifyChannel-grants the movement channel.
	if (classUnit.slug === FIGHTER_SLUG) {
		lines.push("# pattern: extra-action-budget");
	} else if (classUnit.slug === "barbarian") {
		lines.push("# pattern: condition-grant-and-suppression");
	} else if (classUnit.slug === "monk" || classUnit.slug === "rogue") {
		lines.push("# pattern: condition-grant-and-suppression", "# pattern: extra-action-budget");
	}
	if (classUnit.slug === FIGHTER_SLUG) {
		lines.push(
			"# Second Wind is mechanized LIVE here (srd/fighter/second-wind-uses",
			"# resource + srd/class-feature/fighter/second-wind capability +",
			"# srd/fighter/second-wind action) — the chapter's own K2 exemplar.",
			"# Action Surge is ALSO mechanized LIVE (D10 rework, srd/fighter/",
			"# action-surge-uses + srd/class-feature/fighter/action-surge +",
			"# srd/fighter/action-surge) — initial_value 0, charged at runtime by",
			"# the level-up DM's own apply-level-up consequence (elven-mini).",
			"# Both features' capability:* niches declare provider = actor",
			"# (sk-0m4.69 / 2026-08-20, reversing D2(c) place-scoping).",
			"# Every other feature in this file is identity only.",
		);
	} else if (
		classUnit.slug === "barbarian" ||
		classUnit.slug === "monk" ||
		classUnit.slug === "rogue"
	) {
		lines.push(
			"# Martial L1-4 features are mechanized LIVE for this class",
			"# (martial-fragments.ts): Rage/Reckless Attack (barbarian), Flurry",
			"# of Blows/Patient Defense/Step of the Wind (monk), Cunning Action/",
			"# Steady Aim (rogue). Step of the Wind's and Cunning Action's own",
			"# Dash option ModifyChannel-grants one full Movement pool",
			"# (sk-0m4.123, extra-action-budget pattern). Every OTHER feature in",
			"# this file is identity only.",
		);
	} else {
		lines.push("# Identity only — no live mechanization attempted for any feature in this file.");
	}
	lines.push(
		"# Shared vocabulary: tag-vocabulary.toml. Shared resource: hit-die.toml.",
		"# Source: cache/open5e/CharacterClass.json + ClassFeature.json.",
		"",
		"",
	);
	return lines.join("\n");
}

/** K2's Tactical Mind (identity-only) + every other real-feature deferred group — never silently dropped. Action Surge's channel grant is LIVE (L12 / sk-609b.12). */
function fighterDeferredUnits(): ChapterUnitSummary[] {
	const groups = deferredFeatureGroups().map((group, index) => ({
		kind: "deferred_with_owner",
		id: `classes/fighter/deferred/${index}-${group.slugs[0]}`,
		sourcePk: `Features: ${group.slugs.join(", ")}. Owner: ${group.owner}`,
	}));
	return [
		{
			kind: "deferred_with_owner",
			id: "classes/fighter/tactical-mind-mechanization",
			sourcePk:
				`${TACTICAL_MIND_ANCHOR} identity shipped (srd/class-feature/fighter/tactical-mind); ` +
				`mechanization deferred — ${TACTICAL_MIND_DESIGN_DOC_ANCHOR}`,
		},
		...groups,
	];
}

/** K3's deferred units: one cross-cutting spellcasting-deferral row (the 7 caster classes' own SPELL_SLOTS rows, P1b dependency) plus one per-class "identity shipped, no mechanization attempted" row — never silently dropped, proportionate to an 11-class breadth pass (unlike K2's own 11-group per-feature Fighter breakdown). */
/**
 * The CONCRETE missing consequence shape per class' own flagship limited-
 * resource feature — grounded in each class' own real `ClassFeature.json`
 * slugs (`remaining-classes-units.ts`'s own cache read), not a generic
 * "some resource exists somewhere" wave. Team-lead review (2026-08-06,
 * task #13): the earlier one-size-fits-all deferral note ("read Action
 * Surge's own finding, probably blocked the same way") didn't distinguish
 * WHICH primitive gap actually blocks each class — several need a
 * DIFFERENT missing primitive entirely (a timed status effect, a grant-to-
 * another-actor, an option-list consequence, a creature-form swap, a
 * conditional damage-roll modifier, a mid-cast action modifier, a rest-
 * triggered refill), not merely Action Surge's own channel-grant gap.
 */
const CONCRETE_MISSING_SEAM_BY_CLASS_SLUG: Readonly<Record<string, string>> = {
	barbarian:
		"Rage is LIVE for L1–4 (resource + Bonus Action ApplyStatus + while-raging +2 damage fold + " +
		"B/P/S resistance fold on incoming damage). Still open: 10-minute extend loop, " +
		"Frenzy first-hit dice, and higher Rage Damage bands (+3/+4).",
	// kept for the 7 non-martial remaining classes below — barbarian key still required
	bard:
		"Bardic Inspiration (bardic-inspiration/bardic-die/font-of-inspiration) needs a GRANT-TO-OTHER " +
		"banked bonus die: the bard spends a use on an ALLY, who then consumes it on a LATER, separate " +
		"roll — cross-actor grant plus delayed consumption, neither proven.",
	cleric:
		"Channel Divinity (channel-divinity/channel-divinity-uses/sear-undead) spends into a MENU of " +
		"different subclass-specific effects chosen at use time (option-list consequence selection) — no " +
		"proven primitive for a spend action whose effect branches on a runtime choice.",
	druid:
		"Wild Shape (wild-shape/wild-shape-uses/wild-companion/wild-resurgence) needs a CREATURE-FORM " +
		"TRANSFORMATION — swapping the acting creature's own stat block/available actions for a beast form " +
		"— structurally unlike a resource spend with a fixed effect; no proven primitive.",
	monk:
		"Monk's Focus is LIVE for L2 spends (Focus Points resource + Flurry/Patient Defense/Step of the Wind " +
		"actions; Patient Defense reuses Dodging). Still open: Flurry extra unarmed strikes, Step movement " +
		"grant, Martial Arts bonus strike, Unarmored Movement speed, Deflect Attacks reaction, Open Hand riders.",
	paladin:
		"Lay on Hands (lay-on-hands/restoring-touch) is a SHARED POOL with a VARIABLE spend amount per use " +
		"(heal any amount up to the pool's own remaining total, not a fixed die roll) — different from " +
		"Second Wind's fixed roll; this class' own Channel Divinity shares Cleric's option-list gap above.",
	ranger:
		"Favored Enemy (favored-enemy/favored-enemy-uses) grants a SPELL EFFECT (Hunter's Mark) for free " +
		"some number of times per rest — a feature-that-casts-a-spell-without-a-slot shape, unproven; most " +
		"of this class' own other features are passive bonuses, not resource-spend actions.",
	rogue:
		"Cunning Action (Dash/Disengage Bonus Actions) + Steady Aim are LIVE. Still open: Sneak Attack " +
		"conditional auto-damage (findingGap), Expertise double-PB wiring, Thieves' Cant language tag, " +
		"Hide half of Cunning Action, Thief Fast Hands / Second-Story Work.",
	sorcerer:
		"Sorcery Points (sorcery-points/font-of-magic/metamagic/metamagic-options) spend to MODIFY ANOTHER " +
		"ACTION IN FLIGHT (Metamagic alters a spell being cast) or CONVERT between two resource pools " +
		"(points <-> spell slots, sorcerous-restoration) — both unproven, neither is a channel-grant gap.",
	warlock:
		"Eldritch Invocations (eldritch-invocations/eldritch-invocation-count/-options) are mostly PASSIVE " +
		"permanent unlocks, not a per-use spend; Pact Magic slot table + short-or-long rest recovery are " +
		"authored in spellcasting-substrate-units.ts — remaining gap is invocation option consequences.",
	wizard:
		"Arcane Recovery (arcane-recovery) is a CONDITIONAL RESOURCE RESTORATION on a rest trigger (regain " +
		"spent spell slots once per long rest, up to a level total) — a refill-on-trigger shape, not a " +
		"spend-to-effect action; unproven.",
};

function remainingClassesDeferredUnits(): ChapterUnitSummary[] {
	const groups = buildRemainingClassFeatureGroups();
	return [
		...groups.map((group) => {
			const seam = CONCRETE_MISSING_SEAM_BY_CLASS_SLUG[group.classSlug];
			if (seam === undefined) {
				throw new Error(
					`classes/index: no concrete-missing-seam note for class '${group.classSlug}' — ` +
						"CONCRETE_MISSING_SEAM_BY_CLASS_SLUG's own roster may have drifted from the real 11.",
				);
			}
			return {
				kind: "deferred_with_owner",
				id: `classes/remaining/${group.classSlug}/mechanization`,
				sourcePk:
					`${group.classAnchor} — ${group.classFeatures.length} ${group.classDisplayName} + ` +
					`${group.subclassFeatures.length} ${group.subclassDisplayName} feature identities ` +
					`shipped, 0 mechanized this K3 breadth pass. ${seam} Action Surge's channel grant is LIVE ` +
					"(ModifyChannel on srd/economy_channel/primary); many of these seams need a DIFFERENT " +
					"primitive, not just a channel grant. Owner: a future per-class mechanization pass.",
			};
		}),
	];
}

/**
 * `dm-generic-advancement-metadata` M1/M4's own scan gaps
 * (`advancement-metadata-units.ts`'s `scanClassFeatureLevels`): one
 * `deferred_with_owner` unit per class with at least one real base-class-own
 * feature that neither `HEADING_ALIAS_BY_SLUG` nor naive title-casing
 * reproduces its actual `#### Level N:` heading text verbatim — reported,
 * never guessed (that module's own header names why: K3's own module header
 * already flagged this exact risk for the 11 non-Fighter classes). M4's own
 * alias map resolved 14 of M1's original 26 gaps; the 12 that remain are
 * genuinely headingless (spell-list tables, option-list sub-catalogs, a
 * column-data row) or ambiguous (a duplicate heading-text collision) — none
 * block M4's own level 1-3 grant rows (every name in the gap set reads as a
 * higher-level or non-leveled reference-table feature, e.g. "Bard Spell
 * List"), but they ARE real unresolved facts a future slice should
 * hand-verify (or, for the genuinely headingless ones, decide a different
 * resolution strategy for) before raising this module's own level ceiling
 * further.
 */
function advancementMetadataGapUnits(): ChapterUnitSummary[] {
	return [...advancementMetadataGapsByClass().entries()].map(([classSlug, gaps]) => ({
		kind: "deferred_with_owner",
		id: `classes/advancement-metadata/${classSlug}/unresolved-feature-levels`,
		sourcePk:
			`${gaps.length} real feature(s) whose slug (naively title-cased, or via ` +
			`HEADING_ALIAS_BY_SLUG) did not match a '#### Level N:' heading verbatim: ` +
			`${gaps.map((gap) => gap.featureDisplayName).join(", ")}. Owner: a future ` +
			"per-class hand-verification pass (same posture K2's own Fighter slice already proved out for " +
			"all 15 of its own real features) before this class' own advancement-grant coverage can extend " +
			"past level 3.",
	}));
}

/** K0's provenance-only unit: the chapter's structural framing (no "Parts of a Class" intro, unlike Character Origins/Feats) plus a pointer at K2/K3/spellcasting. */
function provenanceOnlyUnits(): ChapterUnitSummary[] {
	return [
		{
			kind: "provenance_only",
			id: "classes/structural-framing",
			sourcePk: STRUCTURAL_FRAMING_ANCHOR,
		},
		{ kind: "provenance_only", id: "classes/later-slices", sourcePk: LATER_SLICES_ANCHOR },
		{ kind: "provenance_only", id: "classes/fighter/section", sourcePk: FIGHTER_ANCHOR },
	];
}

/** K1's ONE explicit deferred unit: save/weapon/armor-training capability authoring (identity-text only this slice, per this chapter's own build instructions). */
function deferredCapabilityUnit(): ChapterUnitSummary {
	return {
		kind: "deferred_with_owner",
		id: "classes/save-weapon-armor-training-capabilities",
		sourcePk: `${SAVE_WEAPON_ARMOR_ANCHOR} Owner: K2+ (this package's own class-vertical pipeline).`,
	};
}

/** Behavior flag (AGENTS.md chapter-registry entry): K2 ships this chapter's FIRST real mechanic — Second Wind, a live self-heal action. */
export const HAS_BEHAVIOR = true;

export async function generateClasses(target?: AuthorTarget): Promise<ClassesOutput> {
	const [
		tagVocabulary,
		hitDie,
		classAndSubclass,
		features,
		secondWind,
		actionSurge,
		barbarianMartial,
		monkMartial,
		rogueMartial,
		barbarianSlice2,
		monkSlice2,
		rogueSlice2,
		fighterSlice2,
		advancementMetadata,
		spellcastingSubstrate,
		casterFeatures,
	] = await Promise.all([
		buildTagVocabularyFragment(),
		buildHitDieFragment(),
		buildClassAndSubclassEntityFragments(target),
		buildFeatureEntityFragments(target),
		buildSecondWindFragment(target),
		buildActionSurgeFragment(target),
		buildBarbarianMartialFragment(target),
		buildMonkMartialFragment(target),
		buildRogueMartialFragment(target),
		buildBarbarianSlice2Fragment(target),
		buildMonkSlice2Fragment(target),
		buildRogueSlice2Fragment(target),
		buildFighterSlice2Fragment(target),
		buildAdvancementMetadataFragment(),
		buildSpellcastingSubstrateFragment(),
		// L3: end of list — own unit, never collides with L2 advancement ceiling.
		buildCasterFeaturesFragment(target),
	]);

	const classes = buildClassUnits();
	const subclasses = buildSubclassUnits();
	const subclassParent = new Map(subclasses.map((unit) => [unit.slug, unit.parentSlug]));
	const subclassByParentSlug = new Map(subclasses.map((unit) => [unit.parentSlug, unit]));

	const bodiesBySlug = new Map<string, string[]>(classes.map((unit) => [unit.slug, []]));
	const pushBody = (slug: string, body: string) => {
		const bucket = bodiesBySlug.get(slug);
		if (bucket === undefined)
			throw new Error(`classes/index: no class file bucket for slug '${slug}'.`);
		bucket.push(body);
	};

	for (const entityId of classAndSubclass.fragmentsByEntityId.keys()) {
		const slug = classSlugForEntityId(entityId, subclassParent);
		const body = classAndSubclass.fragmentsByEntityId.get(entityId);
		if (body === undefined) throw new Error(`classes/index: missing fragment for '${entityId}'.`);
		pushBody(slug, body);
	}
	for (const entityId of features.fragmentsByEntityId.keys()) {
		const slug = classSlugForEntityId(entityId, subclassParent);
		const body = features.fragmentsByEntityId.get(entityId);
		if (body === undefined) throw new Error(`classes/index: missing fragment for '${entityId}'.`);
		pushBody(slug, body);
	}
	pushBody(FIGHTER_SLUG, secondWind.toml);
	pushBody(FIGHTER_SLUG, actionSurge.toml);
	pushBody("barbarian", barbarianMartial.toml);
	pushBody("barbarian", barbarianSlice2.toml);
	pushBody("monk", monkMartial.toml);
	pushBody("monk", monkSlice2.toml);
	pushBody("rogue", rogueMartial.toml);
	pushBody("rogue", rogueSlice2.toml);
	pushBody(FIGHTER_SLUG, fighterSlice2.toml);

	const fragments: Record<string, string> = {
		[HIT_DIE_PATH]: hitDie.toml,
		[TAG_VOCABULARY_PATH]: tagVocabulary.toml,
		[ADVANCEMENT_METADATA_PATH]: advancementMetadata.toml,
		[SPELLCASTING_SUBSTRATE_PATH]: spellcastingSubstrate.toml,
		[CASTER_FEATURES_PATH]: casterFeatures.toml,
	};
	for (const classUnit of classes) {
		const subclassUnit = subclassByParentSlug.get(classUnit.slug);
		if (subclassUnit === undefined) {
			throw new Error(`classes/index: no subclass found for class '${classUnit.slug}'.`);
		}
		const bodies = bodiesBySlug.get(classUnit.slug) ?? [];
		fragments[`base/classes/${classUnit.slug}.toml`] =
			classFileHeader(classUnit, subclassUnit) + bodies.join("\n");
	}

	return {
		fragments,
		units: [
			...provenanceOnlyUnits(),
			...hitDie.units,
			...tagVocabulary.units,
			...classAndSubclass.units,
			deferredCapabilityUnit(),
			...features.units,
			...secondWind.units,
			...actionSurge.units,
			...barbarianMartial.units,
			...barbarianSlice2.units,
			...monkMartial.units,
			...monkSlice2.units,
			...rogueMartial.units,
			...rogueSlice2.units,
			...fighterSlice2.units,
			...advancementMetadata.units,
			...spellcastingSubstrate.units,
			...casterFeatures.units,
			...advancementMetadataGapUnits(),
			...fighterDeferredUnits(),
			...remainingClassesDeferredUnits(),
		],
	};
}

/**
 * This chapter's own reader-prose fragment(s) — `ChapterEntry.generateReaderProse`
 * (`../index.ts`). Thin wrapper: the shared per-document render logic lives
 * in `renderReaderProseForDocuments` (`compendium-metadata.ts`).
 */
export function generateClassesReaderProse(
	attachments: readonly ReaderSubjectAttachment[],
): Promise<ChapterReaderProseResult> {
	return renderReaderProseForDocuments(["classes"], attachments);
}
