// Chapter generator: "Character Origins" (SRD 5.2.1), O0 (scaffold) + O1
// (the four Backgrounds) — see `ledger/character-origins.md` for the full
// chapter work-plan checklist and slice plan.
//
// O0 (scaffold): the registry entry (`../index.ts` — book order: SRD 5.2.1's
// free-rules ToC runs …Character Creation, Character Origins, Classes,
// Feats, Equipment… ; Character Origins registers between Character
// Creation and Feats, since Classes isn't registered in this package yet —
// see `../index.ts`'s own registry entry, which now carries the single
// remaining reservation comment), and provenance-only units for the chapter's
// framing prose
// (`character-origins.md:7-29`, § Parts of a Background).
//
// O1 (the four Backgrounds — THIS slice's real content): 4
// `entity_definitions` rows (`srd/background/<slug>`, `background-units.ts`),
// tagged `srd.background` + `srd.background.<slug>`, website descriptions from
// from the 5 `BackgroundBenefit.json` rows each (pks cited). DECIDED grant
// representation (operator, 2026-07-31, option (b), `ledger/
// character-origins.md`): a background NAMES the real capabilities/entities
// it grants — it does not itself apply them to any actor (that is the
// deferred in-game creation-tables flow's job). Skill grants reference the EXISTING
// 18 `srd/skill/<slug>` capabilities; tool grants reference either the
// EXISTING `srd/proficiency/tool/thieves-tools` capability (Criminal) or one
// of the two NET-NEW ones this slice ships alongside it
// (`equipment-proficiencies-units.ts`: Calligrapher's Supplies, Gaming Set
// Dice — tool IDENTITY lives in the Equipment chapter's `tools-units.ts`,
// same split as Thieves' Tools); feat grants reference the real F1
// `srd/feat/<slug>` entities.
//
// Standing pattern (vocabulary never ships unattached, `ledger/
// character-creation.md`'s addendum): the proof HERO is tagged with the
// Soldier background and receives its concrete grants — see
// `proof-scene/calls/identity.ts`'s own header for the exact rows.
import type { AuthorTarget } from "@spellkave/tool-authoring";

import {
	type ChapterReaderProseResult,
	type ReaderSubjectAttachment,
	renderReaderProseForDocuments,
} from "../../compendium-metadata";
import { readResourceFlavor } from "../../flavor/read";
import {
	open5eStringField,
	open5eStringFieldOrMarkdown,
	srdTextAttachmentWriteCall,
	srdTextNamespaceWriteCall,
} from "../../text";
import type { ChapterUnitSummary } from "../chapter-types";
import { driveUnitFragment, driveUnitScene, metadataCall, type VerbCall } from "../verb-runner";
import {
	BACKGROUND_ORIGIN_FEAT_NAMESPACE,
	backgroundOriginFeatAttachmentUpdates,
	backgroundOriginFeatNamespaceUpdate,
	buildBackgroundDescription,
	buildBackgroundUnits,
} from "./background-units";
import {
	buildCreatureSizeTagValueUnits,
	buildSpeciesDescription,
	buildSpeciesTagValueUnits,
	buildSpeciesUnits,
	SIZE_DISPLAY_NAME,
	SIZE_INITIAL,
	SIZE_MAX,
	SIZE_MIN,
	SIZE_RECOVERY_RULE,
	SIZE_RESOURCE_LOCAL_ID,
	SPECIES_CLASS_TAG,
	SPECIES_TAG_PREFIX,
} from "./species-units";
import {
	buildTraitDescription,
	buildTraitTagValueUnits,
	buildTraitUnits,
	DARKVISION_CAPABILITY_ID,
	DARKVISION_CAPABILITY_LOCAL_ID,
	DRAGONBORN_BREATH_WEAPON_ACTION_ID,
	DRAGONBORN_BREATH_WEAPON_ACTION_LOCAL_ID,
	DRAGONBORN_BREATH_WEAPON_CAPABILITY_ID,
	DRAGONBORN_BREATH_WEAPON_CAPABILITY_LOCAL_ID,
	DRAGONBORN_BREATH_WEAPON_NICHE_ID,
	DRAGONBORN_BREATH_WEAPON_RESOURCE_ID,
	DRAGONBORN_BREATH_WEAPON_RESOURCE_LOCAL_ID,
	RELENTLESS_ENDURANCE_ANCHOR,
	RELENTLESS_INTERCEPT_TEMPLATE_ID,
	RELENTLESS_INTERCEPT_TEMPLATE_LOCAL_ID,
	RELENTLESS_READY_CONDITION_ID,
	RELENTLESS_READY_CONDITION_LOCAL_ID,
	RELENTLESS_USES_LOCAL_ID,
	RELENTLESS_USES_RESOURCE_ID,
	ROOT_CAUSE_OWNERS,
	TRAIT_CLASS_TAG,
	TRAIT_TAG_PREFIX,
	type TraitUnit,
} from "./trait-units";

export const BUNDLE_ID = "srd";

const PARTS_OF_A_BACKGROUND_ANCHOR =
	"character-origins.md:7-29 (§ Parts of a Background: Ability Scores/Feat/Skill Proficiencies/" +
	'Tool Proficiency/Equipment — "A background includes the following parts")';
const LATER_SLICES_ANCHOR =
	"character-origins.md:65-374 (§ Character Species: 9 species' 51 traits — O3, unplanned in this slice per ledger/character-origins.md; O2 species identity + Size/Speed ships THIS slice, species-units.ts)";

export interface CharacterOriginsOutput {
	backgroundsToml: string;
	speciesToml: string;
	traitsToml: string;
	units: ChapterUnitSummary[];
}

/** O1's shipped identity fragment: the 4 Background `entity_definitions` rows. */
async function buildBackgroundIdentityFragment(): Promise<{
	toml: string;
	units: ChapterUnitSummary[];
}> {
	const backgrounds = buildBackgroundUnits();

	const entityCalls: VerbCall[] = [
		srdTextNamespaceWriteCall(),
		...backgrounds.map((unit) => ({
			toolName: "spellkave_define_entity_type" as const,
			label: `entity:background/${unit.slug}`,
			params: {
				bundle: BUNDLE_ID,
				id: `background/${unit.slug}`,
				display_name: unit.displayName,
				description: buildBackgroundDescription(unit),
				tags: ["srd.background", `srd.background.${unit.slug}`],
			},
		})),
		// Lane L4: structured Origin Feat grants (ADR-0073 metadata).
		metadataCall("background-origin-feat", BUNDLE_ID, [
			backgroundOriginFeatNamespaceUpdate(),
			...backgroundOriginFeatAttachmentUpdates(),
		]),
		...backgrounds.map((unit) =>
			srdTextAttachmentWriteCall({
				targetKind: "entity_definition",
				targetRef: unit.entityId,
				extracted: open5eStringFieldOrMarkdown(
					"Background.json",
					unit.sourcePk,
					"character-origins.md",
					unit.displayName,
				),
			}),
		),
	];

	const body = await driveUnitScene(BUNDLE_ID, entityCalls);
	const header = [
		"# GENERATED by src/chapters/character-origins/index.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# Character Origins chapter, O0 (scaffold) + O1 (the four Backgrounds).",
		"# See ledger/character-origins.md for the chapter work-plan and",
		"# ledger/character-creation.md's 2026-07-31 operator ruling for scope.",
		"#",
		"# Identity: 4 entity_definitions rows (srd/background/<slug>), tagged",
		"# srd.background + srd.background.<slug>, descriptions generated from",
		"# cache/open5e/Background.json + BackgroundBenefit.json (5 typed rows",
		"# per background: ability score, skill proficiency, tool proficiency,",
		"# equipment, feat — background-units.ts's own header).",
		"#",
		"# Grant representation (operator ruling, option (b)): a background",
		"# NAMES the real capabilities/entities it grants (skill/tool",
		"# proficiency capabilities, the F1 feat entity) — it does not itself",
		"# apply them to any actor; that is the deferred in-game creation-tables flow's",
		"# job. See ledger/character-origins.md for the per-benefit verdict.",
		"",
		"",
	].join("\n");
	const units: ChapterUnitSummary[] = [
		...backgrounds.map((unit) => ({
			kind: "entity_definitions" as const,
			id: unit.entityId,
			sourcePk: unit.sourcePk,
		})),
		{
			kind: "metadata_namespaces",
			id: BACKGROUND_ORIGIN_FEAT_NAMESPACE,
			sourcePk: "character-origins.md:17 (Feat grant)",
		},
		...backgrounds.map((unit) => ({
			kind: "metadata_attachments" as const,
			id: `${BACKGROUND_ORIGIN_FEAT_NAMESPACE}:${unit.entityId}`,
			sourcePk: unit.markdownAnchor,
		})),
	];
	return { toml: header + body, units };
}

/**
 * O2's shipped species fragment: the `srd.species`/`srd.creature_size`
 * catalog rows (own dotted prefixes, `species-units.ts`'s own header) driven
 * through ONE `driveUnitFragment` call (`onlyTagValueDefinitionTags` keeps
 * only these 16 new rows — same idiom `character-creation/alignment-units.ts`
 * established), concatenated with the 9 species `entity_definitions` rows
 * (+ the new `srd/size` resource) driven through a SECOND, separate
 * `driveUnitScene` call — two throwaway workspaces, one written file, same
 * split `buildBackgroundIdentityFragment` doesn't need (background reused
 * the bare `srd` catch-all, so its tags/entity rows share one workspace).
 *
 * The entity-def workspace repeats the SAME tag_value_definitions write-rows
 * call as its own FIRST call — confirmed empirically the first `run
 * generate` without it: MF-VAL-300 (FATAL since sk-8b4 / ADR-0098 D-1 for
 * these exact-value prefixes — it was a Warning when this note was written,
 * and `pipeline.test.ts` asserts ZERO diagnostics either way) fired on every
 * `srd.species.<slug>`/`srd.creature_size.
 * <category>` entity tag, because a `driveUnitScene` workspace starts fresh,
 * seeded only with the CENTRAL `tag-value-vocabulary.ts` catalog (never this
 * chapter's own new rows, authored in the SEPARATE `tagBody` workspace
 * above) — `driveUnitScene` unconditionally strips every
 * `tag_value_definitions` block from its OWN output
 * (`stripTagValueDefinitionSeedRows`, no keep-mine option like
 * `driveUnitFragment`'s `onlyTagValueDefinitionTags`), so repeating the call
 * here resolves the SAME-workspace tag references without duplicating the
 * rows in `entityBody`'s emitted TOML.
 *
 * `target` (threaded from `chapters/index.ts`, same as
 * `character-creation/index.ts`'s C4 advancement fragment): the entity defs'
 * `srd/speed-walk` seed references a row `playing-the-game`'s OWN chapter
 * generation authors, not this workspace — MF-VAL-253 needs the
 * already-committed fixtures target to resolve it (confirmed empirically:
 * the first `run generate` attempt without threading `target` through failed
 * FATAL on exactly this).
 */
async function buildSpeciesFragment(
	target?: AuthorTarget,
): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	const tagDefinitions = [...buildSpeciesTagValueUnits(), ...buildCreatureSizeTagValueUnits()];
	const tagRows = tagDefinitions.map(({ tag, prefix, description }) => ({
		tag,
		prefix,
		bundle_id: BUNDLE_ID,
		description,
	}));
	const tagValueWriteCall: VerbCall = {
		toolName: "spellkave_write_rows",
		label: "species-tag-vocabulary",
		params: {
			bundle: BUNDLE_ID,
			kind: "tag_value_definitions",
			rows: tagRows,
		},
	};
	const tagBody = await driveUnitFragment(BUNDLE_ID, tagValueWriteCall, {
		onlyTagValueDefinitionTags: tagDefinitions.map((definition) => definition.tag),
	});

	const species = buildSpeciesUnits();
	const entityScene: VerbCall[] = [
		srdTextNamespaceWriteCall(),
		tagValueWriteCall,
		{
			toolName: "spellkave_define_resource",
			label: "resource:size",
			params: {
				id: SIZE_RESOURCE_LOCAL_ID,
				display_name: SIZE_DISPLAY_NAME,
				min_value: SIZE_MIN,
				max_value: SIZE_MAX,
				initial_value: SIZE_INITIAL,
				recovery_rule: SIZE_RECOVERY_RULE,
				description: readResourceFlavor("size").body,
				tags: [],
			},
		},
		...species.map((unit) => ({
			toolName: "spellkave_define_entity_type",
			label: `entity:species/${unit.slug}`,
			params: {
				bundle: BUNDLE_ID,
				id: `species/${unit.slug}`,
				display_name: unit.displayName,
				description: buildSpeciesDescription(unit),
				tags: [
					SPECIES_CLASS_TAG,
					`${SPECIES_TAG_PREFIX}.${unit.slug}`,
					...unit.sizeCategories.map((category) => `srd.creature_size.${category.toLowerCase()}`),
				],
				initial_states: [
					{ state: "srd/size", value_int: unit.defaultSizeRank },
					{ state: "srd/speed-walk", value_int: unit.speedCells },
				],
			},
		})),
		...species.map((unit) =>
			srdTextAttachmentWriteCall({
				targetKind: "entity_definition",
				targetRef: unit.entityId,
				extracted: open5eStringFieldOrMarkdown(
					"Species.json",
					unit.sourcePk,
					"character-origins.md",
					unit.displayName,
				),
			}),
		),
	];
	const entityBody = await driveUnitScene(BUNDLE_ID, entityScene, target);

	const header = [
		"# GENERATED by src/chapters/character-origins/index.ts (species-units.ts) — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# Character Origins chapter, O2 (Species identity + Size/Speed).",
		"# See ledger/character-origins.md for the chapter work-plan.",
		"#",
		"# Identity: 9 entity_definitions rows (srd/species/<slug>), tagged",
		"# srd.species + srd.species.<slug> + srd.creature_size.<category> (both",
		"# categories for the 2 choice-size species, Human/Tiefling). Structural",
		"# facts via entity_definition_initial_state: srd/size (the rank; the",
		"# Medium default for choice-size species) and srd/speed-walk (30 ft / 6",
		"# cells everywhere except Goliath, 35 ft / 7 cells).",
		"#",
		"# srd/size (NEW resource_definitions row, this slice) and the 6",
		"# srd.creature_size.<category> tag rows (NEW, first emitter of",
		"# creature-size-units.ts's parsed table) are KNOWINGLY CONSUMER-LESS",
		"# today (operator ruling 2026-07-31) — see species-units.ts's own",
		"# module header.",
		"",
		"",
	].join("\n");
	const units: ChapterUnitSummary[] = [
		...tagDefinitions.map((definition) => ({
			kind: "tag_value_definitions",
			id: definition.tag,
			sourcePk: definition.sourcePk,
		})),
		{ kind: "resource_definitions", id: "srd/size", sourcePk: "" },
		...species.map((unit) => ({
			kind: "entity_definitions",
			id: unit.entityId,
			sourcePk: unit.sourcePk,
		})),
	];
	return { toml: header + tagBody + entityBody, units };
}

/**
 * O3's shipped trait fragment: the `srd.trait` catalog rows (a NEW dotted
 * prefix, `trait-units.ts`'s own header) driven through ONE
 * `driveUnitFragment` call, concatenated with the 33 trait `entity_definitions`
 * rows driven through a SECOND `driveUnitScene` call — same two-workspace
 * split `buildSpeciesFragment` above already established, for the same
 * reason: `driveUnitScene` unconditionally strips every
 * `tag_value_definitions` block from its own output, so the entity workspace
 * repeats BOTH this fragment's own new `srd.trait*` rows AND O2's
 * ALREADY-SHIPPED `srd.species*` rows (species-linkage tags every trait
 * entity also carries) purely to satisfy live tag-grammar validation
 * (MF-VAL-297/298/300) — neither repetition leaks into `entityBody`'s
 * emitted TOML (the unconditional strip), and the species rows are never
 * re-declared in `traits.toml` (they already exist in `species.toml`).
 */
async function buildTraitsFragment(target?: AuthorTarget): Promise<{
	toml: string;
	units: ChapterUnitSummary[];
}> {
	const traitTagDefinitions = buildTraitTagValueUnits();
	const traitTagRows = traitTagDefinitions.map(({ tag, prefix, description }) => ({
		tag,
		prefix,
		bundle_id: BUNDLE_ID,
		description,
	}));
	const traitTagWriteCall: VerbCall = {
		toolName: "spellkave_write_rows",
		label: "trait-tag-vocabulary",
		params: { bundle: BUNDLE_ID, kind: "tag_value_definitions", rows: traitTagRows },
	};
	const tagBody = await driveUnitFragment(BUNDLE_ID, traitTagWriteCall, {
		onlyTagValueDefinitionTags: traitTagDefinitions.map((definition) => definition.tag),
	});

	// O2's already-shipped species tag catalog — repeated here ONLY so this
	// workspace's own trait entities can reference `srd.species.<slug>` in
	// their `tags` list without a fresh-workspace MF-VAL-300 warning; never
	// re-emitted (see this function's own header).
	const speciesTagDefinitions = buildSpeciesTagValueUnits();
	const speciesTagWriteCall: VerbCall = {
		toolName: "spellkave_write_rows",
		label: "trait-species-linkage-tag-seed",
		params: {
			bundle: BUNDLE_ID,
			kind: "tag_value_definitions",
			rows: speciesTagDefinitions.map(({ tag, prefix, description }) => ({
				tag,
				prefix,
				bundle_id: BUNDLE_ID,
				description,
			})),
		},
	};

	const traits = buildTraitUnits();
	// pattern: actor-carried-feature-verb
	// pattern: rest-boundary-resource-refill
	// pattern: resource-spend-with-option-menu
	const entityScene: VerbCall[] = [
		srdTextNamespaceWriteCall(),
		traitTagWriteCall,
		speciesTagWriteCall,
		// Dragonborn Breath Weapon resource
		{
			toolName: "spellkave_define_resource",
			label: "resource:dragonborn/breath-weapon-uses",
			params: {
				id: DRAGONBORN_BREATH_WEAPON_RESOURCE_LOCAL_ID,
				display_name: "Dragonborn Breath Weapon Uses",
				min_value: 0,
				max_value: 6,
				initial_value: 2,
				recovery_rule: "long_rest",
				description: readResourceFlavor("dragonborn-breath-weapon-uses").body,
				tags: [],
			},
		},
		// Darkvision counter-capability
		{
			toolName: "spellkave_define_capability",
			label: "capability:darkvision",
			params: {
				bundle: BUNDLE_ID,
				id: DARKVISION_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Darkvision",
				description:
					"Sensory counter-capability allowing perception and navigation in dark passages.",
				tags: ["srd.sense", "srd.sense.darkvision"],
			},
		},
		// Dragonborn Breath Weapon capability
		{
			toolName: "spellkave_define_capability",
			label: "capability:action/dragonborn/breath-weapon",
			params: {
				bundle: BUNDLE_ID,
				id: DRAGONBORN_BREATH_WEAPON_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Breath Weapon",
				description:
					"Exhale destructive energy in a 15-foot cone or 30-foot line (Dexterity save vs DC 8+CON+PB, 1d10 damage).",
				tags: [TRAIT_CLASS_TAG, "srd.species.dragonborn"],
			},
		},
		// Dragonborn Breath Weapon niche
		{
			toolName: "spellkave_write_rows",
			label: "niche:action/dragonborn/breath-weapon",
			params: {
				bundle: BUNDLE_ID,
				kind: "niche_definitions",
				rows: [
					{
						niche_id: DRAGONBORN_BREATH_WEAPON_NICHE_ID,
						bundle_id: BUNDLE_ID,
						display_name: "Breath Weapon",
						provider: "actor",
						description: "Actor-carried feature verb niche for Dragonborn Breath Weapon.",
					},
				],
			},
		},
		// Dragonborn Breath Weapon action verb
		{
			toolName: "spellkave_define_action_verb",
			label: "action:dragonborn/breath-weapon",
			params: {
				bundle: BUNDLE_ID,
				id: DRAGONBORN_BREATH_WEAPON_ACTION_LOCAL_ID,
				required_capability: DRAGONBORN_BREATH_WEAPON_CAPABILITY_ID,
				niche_id: DRAGONBORN_BREATH_WEAPON_NICHE_ID,
				display_name: "Breath Weapon",
				description:
					"Exhale destructive energy in an area (Dexterity save, 1d10 damage), spending 1 breath weapon use.",
				spends_channel: "srd/economy_channel/primary",
				predicate_source: `actor.stat('${DRAGONBORN_BREATH_WEAPON_RESOURCE_ID}') >= 1`,
				resolution_scope: "srd/dex_save",
				consequence: {
					description: "Spend 1 breath weapon use and deal 1d10 damage to target.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: DRAGONBORN_BREATH_WEAPON_RESOURCE_ID,
								delta_source: "-1",
							},
						},
						{
							ModifyResource: {
								actor: "TargetActor",
								resource: "srd/hp",
								delta_source: "-1d10",
							},
						},
					],
				},
			},
		},
		// pattern: condition-hook-on-event
		// pattern: rest-boundary-resource-refill
		// Orc Relentless Endurance — intercept HP <= 0 before Dead cascade
		// (hooks resolve inside ModifyResource, before later ordinals).
		{
			toolName: "spellkave_define_resource",
			label: `resource:${RELENTLESS_USES_LOCAL_ID}`,
			params: {
				id: RELENTLESS_USES_LOCAL_ID,
				display_name: "Relentless Endurance Uses",
				min_value: 0,
				max_value: 1,
				initial_value: 1,
				recovery_rule: "long_rest",
				description: readResourceFlavor("orc-relentless-endurance-uses").body,
				tags: [],
			},
		},
		{
			toolName: "spellkave_define_consequence",
			label: `consequence:${RELENTLESS_INTERCEPT_TEMPLATE_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: RELENTLESS_INTERCEPT_TEMPLATE_LOCAL_ID,
				description:
					"Relentless Endurance: when uses remain, set HP to 1 and spend the charge. " +
					"Uses gate is HERE (consequence has full actor.stat facts) — not on the hook " +
					"detail_filter (hook facts are event detail + holder id + statuses only). " +
					"pattern: condition-hook-on-event",
				// Bare ModifyResource — hook bindings lack spatial refs for ForEachActorInRadius.
				// Gate uses via cond() in delta_source (full actor.stat facts in consequence).
				frame_writes: [
					{
						ModifyResource: {
							actor: "Actor",
							resource: "srd/hp",
							delta_source: `cond(actor.stat('${RELENTLESS_USES_RESOURCE_ID}') >= 1, 1 - actor.stat('srd/hp'), 0)`,
						},
					},
					{
						ModifyResource: {
							actor: "Actor",
							resource: RELENTLESS_USES_RESOURCE_ID,
							delta_source: `cond(actor.stat('${RELENTLESS_USES_RESOURCE_ID}') >= 1, -1, 0)`,
						},
					},
				],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: `condition:${RELENTLESS_READY_CONDITION_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: RELENTLESS_READY_CONDITION_LOCAL_ID,
				display_name: "Relentless Endurance Ready",
				description:
					`Relentless Endurance ready (${RELENTLESS_ENDURANCE_ANCHOR}). While active, ` +
					"dropping to 0 HP invokes the intercept (uses spent inside the consequence). " +
					"pattern: condition-hook-on-event",
				gate_predicate_source: "1 == 1",
				remove_time_policy: "srd/remove_policy/independent_lifetime",
				stacking_rule: "srd/stacking/single",
				hooks: [
					{
						event_kind: "Layer2.ResourceDelta",
						// Hook facts: event detail + core/entity_id + statuses only —
						// do NOT read resource stats here (UnknownField → fail closed).
						detail_filter_source: [
							`$event.detail.entity_id == target.stat('core/entity_id')`,
							`$event.detail.resource_id == 'srd/hp'`,
							`$event.detail.new_value <= 0`,
						].join(" && "),
						expression_source: `invoke_outcome_graph('${RELENTLESS_INTERCEPT_TEMPLATE_ID}')`,
					},
				],
			},
		},
		...traits.map((unit) => ({
			toolName: "spellkave_define_entity_type",
			label: `entity:trait/${unit.slug}`,
			params: {
				bundle: BUNDLE_ID,
				id: `trait/${unit.slug}`,
				display_name: unit.displayName,
				description: buildTraitDescription(unit),
				tags: [
					TRAIT_CLASS_TAG,
					`${TRAIT_TAG_PREFIX}.${unit.slug}`,
					unit.speciesTag,
					...unit.extraTags,
				],
			},
		})),
		...traits.map((unit) =>
			srdTextAttachmentWriteCall({
				targetKind: "entity_definition",
				targetRef: unit.entityId,
				extracted: open5eStringField("SpeciesTrait.json", unit.sourcePk),
			}),
		),
	];
	const entityBody = await driveUnitScene(BUNDLE_ID, entityScene, target);

	const header = [
		"# GENERATED by src/chapters/character-origins/index.ts (trait-units.ts) — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# pattern: actor-carried-feature-verb",
		"# pattern: rest-boundary-resource-refill",
		"# pattern: resource-spend-with-option-menu",
		"# pattern: condition-hook-on-event",
		"#",
		"# Character Origins chapter, O3 (Traits: identity complete, mechanics selective).",
		"# See ledger/character-origins.md for the chapter work-plan.",
		"#",
		"# Identity: 33 entity_definitions rows (srd/trait/<slug> — 51",
		"# SpeciesTrait.json rows minus the 18 SIZE/SPEED rows O2 already ships),",
		"# tagged srd.trait + srd.trait.<slug> + a REFERENCE to the trait's owning",
		"# species' O2 srd.species.<slug> tag value. Descriptions carry the SRD",
		"# text VERBATIM, including embedded sub-tables (Draconic Ancestors,",
		"# Elven Lineages, Fiendish Legacies) — trait-units.ts's own header.",
		"#",
		"# Mechanized (substrate reaches today): FIVE — Resourceful",
		"# (Human; wired live in playing-the-game/fragments/rest.ts's Long-Rest",
		"# completion action), Dwarven Toughness (Dwarf; a composition-rule",
		"# constant against C4's srd/hp_per_level, no live proof — finding #84),",
		"# Skillful (Human; a real srd/skill/arcana capability grant on the proof",
		"# hero), Breath Weapon (Dragonborn; actor-carried action verb, PB uses,",
		"# Long Rest refill). Keen Senses (Elf) documents the SAME capability-grant",
		"# shape as Skillful but is not live-applied (the hero is Human). Everything",
		"# else is deferred-with-owner, grouped by root cause — see",
		"# ledger/character-origins.md and trait-units.ts's DEFERRED_CLASSIFICATION.",
		"",
		"",
	].join("\n");
	const units: ChapterUnitSummary[] = [
		...traitTagDefinitions.map((definition) => ({
			kind: "tag_value_definitions",
			id: definition.tag,
			sourcePk: definition.sourcePk,
		})),
		{ kind: "resource_definitions", id: DRAGONBORN_BREATH_WEAPON_RESOURCE_ID, sourcePk: "" },
		{ kind: "capability_definitions", id: DARKVISION_CAPABILITY_ID, sourcePk: "" },
		{ kind: "capability_definitions", id: DRAGONBORN_BREATH_WEAPON_CAPABILITY_ID, sourcePk: "" },
		{ kind: "action_definitions", id: DRAGONBORN_BREATH_WEAPON_ACTION_ID, sourcePk: "" },
		{
			kind: "consequence_templates",
			id: `${DRAGONBORN_BREATH_WEAPON_ACTION_ID}/success`,
			sourcePk: "",
		},
		{
			kind: "outcome_templates",
			id: `${DRAGONBORN_BREATH_WEAPON_ACTION_ID}/outcome`,
			sourcePk: "",
		},
		{
			kind: "affordance_templates",
			id: `${DRAGONBORN_BREATH_WEAPON_ACTION_ID}/affordance`,
			sourcePk: "",
		},
		...traits.map((unit) => ({
			kind: "entity_definitions",
			id: unit.entityId,
			sourcePk: unit.sourcePk,
		})),
	];
	return { toml: header + tagBody + entityBody, units };
}

/** One verdict unit per trait — distinct from the shipped `entity_definitions` identity row above, mirroring `benefitVerdictUnits`' idiom: lets a reader tell mechanized/documented traits from deferred-with-owner ones at a glance. */
function traitVerdictUnits(): ChapterUnitSummary[] {
	return buildTraitUnits().map((unit: TraitUnit) => {
		const isShipped = unit.rootCause === "mechanized" || unit.rootCause === "documented_unapplied";
		return {
			kind: isShipped ? "idiom_only" : "provenance_only",
			id: `character-origins/trait/${unit.slug}`,
			sourcePk: `${unit.rootCause}: ${unit.deferredNote ?? ROOT_CAUSE_OWNERS[unit.rootCause]} — ${unit.markdownAnchor}`,
		};
	});
}

/**
 * O0's provenance-only units: the "Parts of a Background" framing prose and
 * a single pointer at the not-yet-planned Species/Traits slices (O2/O3).
 */
function provenanceOnlyUnits(): ChapterUnitSummary[] {
	return [
		{
			kind: "provenance_only",
			id: "character-origins/parts-of-a-background",
			sourcePk: PARTS_OF_A_BACKGROUND_ANCHOR,
		},
		{
			kind: "provenance_only",
			id: "character-origins/later-slices",
			sourcePk: LATER_SLICES_ANCHOR,
		},
	];
}

/**
 * O1's honest per-benefit verdict units — one per background's 5 benefit
 * rows, distinct from the shipped `entity_definitions` rows above: lets a
 * reader tell exactly which BackgroundBenefit row is a real GRANT (skill/
 * tool/feat, naming a real capability/entity id) vs. description-only
 * metadata (ability scores, equipment).
 */
function benefitVerdictUnits(): ChapterUnitSummary[] {
	const backgrounds = buildBackgroundUnits();
	const units: ChapterUnitSummary[] = [];
	for (const unit of backgrounds) {
		for (const benefit of unit.benefits) {
			const isGrant =
				benefit.type === "skill_proficiency" ||
				benefit.type === "tool_proficiency" ||
				benefit.type === "feat";
			units.push({
				kind: isGrant ? "idiom_only" : "provenance_only",
				id: `character-origins/background/${unit.slug}/${benefit.type}`,
				sourcePk: `${benefit.sourcePk} — ${unit.markdownAnchor}`,
			});
		}
	}
	return units;
}

/** Behavior flag (AGENTS.md chapter-registry entry): O1/O2 ship real identity rows (Backgrounds, Species) naming/seeding already-mechanized or knowingly-consumer-less resources, not themselves a new mechanic. */
export const HAS_BEHAVIOR = false;

export async function generateCharacterOrigins(
	target?: AuthorTarget,
): Promise<CharacterOriginsOutput> {
	const identity = await buildBackgroundIdentityFragment();
	const species = await buildSpeciesFragment(target);
	const traits = await buildTraitsFragment(target);
	return {
		backgroundsToml: identity.toml,
		speciesToml: species.toml,
		traitsToml: traits.toml,
		units: [
			...provenanceOnlyUnits(),
			...identity.units,
			...benefitVerdictUnits(),
			...species.units,
			...traits.units,
			...traitVerdictUnits(),
		],
	};
}

/**
 * This chapter's own reader-prose fragment(s) — `ChapterEntry.generateReaderProse`
 * (`../index.ts`). Thin wrapper: the shared per-document render logic lives
 * in `renderReaderProseForDocuments` (`compendium-metadata.ts`).
 */
export function generateCharacterOriginsReaderProse(
	attachments: readonly ReaderSubjectAttachment[],
): Promise<ChapterReaderProseResult> {
	return renderReaderProseForDocuments(["character-origins"], attachments);
}
