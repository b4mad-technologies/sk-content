// pattern: none — barrel export for spells chapter
// Chapter generator: "Spells" (SRD 5.2.1), slice P1a — IDENTITY ONLY for all
// 339 SRD spells (`spell-units.ts`'s own header carries the row-kind and tag
// design). Book order: Spells follows Equipment (SRD 5.2.1 free-rules table
// of contents: Playing the Game, Character Creation, Character Origins,
// Classes, Feats, Equipment, Spells — `../index.ts`'s registry, appended
// after the last-registered chapter).
//
// PER-ENTITY FIXTURE LAYOUT (operator directive, 2026-08-06): one file per
// spell, `base/spells/<levelBand>/<slug>.toml` (`spell-units.ts`'s own
// `LEVEL_BAND_SLUGS` — cantrips + levels 1-9 as the directory grouping, self-
// describing rather than a numbered `level-0`). Superseded the former 10
// level-BAND fragment files (a practicality answer to the same 339-row scale
// before this directive; both this file's own git history and the sister's
// own per-level split, `world-fixtures/srd/base/spells-level-<N>.toml`,
// remain the level-BAND grouping's own precedent, now expressed as a
// directory rather than a fragment boundary). Coverage/ledger declarations
// (`src/test/offline/spells-coverage.test.ts`) stay batched at the SAME 10
// bands as their `unit` slugs — this directive changes rendered FILE layout
// only, never coverage/ledger unit granularity (AGENTS.md's "reference
// tables" maxim's sibling concern still holds for that axis).
//
// TAG CATALOG (`spell-tag-values.ts`'s own header carries the MF-VAL-300
// grounding, axis-scoped — stays as ONE shared file, not per-entity): ONE
// `base/spells/tag-values.toml` fragment carries the chapter's 64-row
// `tag_value_definitions` catalog, authored via `driveUnitFragment`'s
// `onlyTagValueDefinitionTags` (same idiom `character-origins/index.ts`'s
// `buildSpeciesFragment` uses).
//
// P1b BEHAVIOR (curated subset, `spell-behaviors.ts`'s own module header
// carries the full precedent list + conservatism rule): a shared
// `base/spells/casting.toml` axis file (`spell-slots.ts`) carries the two
// `srd/spell_slot_<n>` resources P1b's leveled spells gate on; each curated
// spell's OWN behavior rows (action_definitions/consequence_definitions/
// condition_definitions) are appended into that SAME spell's own per-entity
// identity file — the feats chapter's Alert co-location is the precedent
// (`fixtures/base/feats/alert.toml` carries both Alert's entity_definitions
// AND its own gate capability_definitions in one file).
//
// RENDER/VALIDATION BATCHING (#2124, decoupling render/validation
// granularity from file granularity — operator directive 2026-08-06's own
// runtime consequence): all 339 spells' own `spellkave_define_entity_type`
// calls run through `driveEntityBatch` in fixed-size GROUPS (one throwaway
// validated workspace PER GROUP, restoring the pre-per-entity-file cost),
// each group sharing ONE copy of the tag-write call — `driveEntityBatch`
// splits the resulting combined fragment back into one file PER SPELL
// (`entity_def_id`-keyed) before this chapter ever sees it. The RENDERED
// file layout is unchanged from the per-entity directive; only the internal
// render cost is.
import type { AuthorTarget } from "@spellkave/tool-authoring";
import {
	type ChapterReaderProseResult,
	type ReaderSubjectAttachment,
	renderReaderProseForDocuments,
} from "../../compendium-metadata";
import { srdTextAttachmentWriteCall, srdTextNamespaceWriteCall } from "../../text";
import type { ChapterUnitSummary } from "../chapter-types";
import {
	type BatchEntity,
	driveEntityBatch,
	driveUnitFragment,
	type VerbCall,
} from "../verb-runner";
import { buildSpellBehaviorFragments, spellBehaviorUnitSummaries } from "./spell-behaviors";
import { buildSpellCastingAxisFragment } from "./spell-slots";
import {
	buildSpellDamageTypeTagValueUnitsForSeed,
	buildSpellTagValueUnits,
} from "./spell-tag-values";
import { BUNDLE_ID, buildSpellUnits, type SpellUnit } from "./spell-units";

export interface SpellsOutput {
	fragments: Record<string, string>;
	units: ChapterUnitSummary[];
}

const TAG_VALUES_PATH = "base/spells/tag-values.toml";
const CASTING_AXIS_PATH = "base/spells/casting.toml";

/** Fixed batch size for render/validation grouping (#2124) — comparable to the chapter's own pre-restructuring level-band sizes (16-57), well within the same safe magnitude. */
const RENDER_BATCH_SIZE = 40;

function tagValueWriteCall(includeDamageTypeSeed = false): VerbCall {
	const tagDefinitions = includeDamageTypeSeed
		? [...buildSpellTagValueUnits(), ...buildSpellDamageTypeTagValueUnitsForSeed()]
		: buildSpellTagValueUnits();
	return {
		toolName: "spellkave_write_rows",
		label: "spell-tag-vocabulary",
		params: {
			bundle: BUNDLE_ID,
			kind: "tag_value_definitions",
			rows: tagDefinitions.map(({ tag, prefix, description }) => ({
				tag,
				prefix,
				bundle_id: BUNDLE_ID,
				description,
			})),
		},
	};
}

async function buildTagValuesFragment(): Promise<{
	toml: string;
	summaries: ChapterUnitSummary[];
}> {
	const tagDefinitions = buildSpellTagValueUnits();
	const toml = await driveUnitFragment(BUNDLE_ID, tagValueWriteCall(), {
		onlyTagValueDefinitionTags: tagDefinitions.map((definition) => definition.tag),
	});
	const header = [
		"# GENERATED by src/chapters/spells/index.ts (spell-tag-values.ts) — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		`# Spells chapter, slice P1a's OWN tag_value_definitions catalog: ${tagDefinitions.length}`,
		"# rows, one per distinct value spell-units.ts's buildSpellTags can emit",
		"# across all 339 spells (level/school/casting-time/range/duration/",
		"# concentration/ritual/components) — see spell-tag-values.ts's own",
		"# module header for the MF-VAL-300 grounding.",
		"",
		"",
	].join("\n");
	const summaries: ChapterUnitSummary[] = tagDefinitions.map((definition) => ({
		kind: "tag_value_definitions",
		id: definition.tag,
		sourcePk: definition.sourcePk,
	}));
	return { toml: header + toml, summaries };
}

function spellHeader(unit: SpellUnit, behaviorPrecedent: string | undefined): string {
	const bandLabel =
		unit.levelBand === "cantrips"
			? "Cantrip (level 0)"
			: `Level ${unit.levelBand.slice("level-".length)}`;
	const behaviorLines =
		behaviorPrecedent === undefined
			? [
					"# IDENTITY ONLY (P1a) — no casting capability or slot-consumption",
					"# mechanic is wired for this spell. See spell-units.ts's own header",
					"# for the row-kind decision and spell-behaviors.ts's own header for",
					"# P1b's curated (conservative) behavior scope — this spell was not",
					"# in that curated list, or its shape did not map 1:1 onto an",
					"# already-proven form (see ledger/spells.md for the reason).",
				]
			: [
					"# IDENTITY (P1a) + BEHAVIOR (P1b, curated conservative subset).",
					`# Behavior precedent: ${behaviorPrecedent}`,
					"# See spell-behaviors.ts's own module header for the full",
					"# conservatism rule and precedent list.",
				];
	// pattern: damage-type-routing (when behavior is damage) / condition-grant-and-suppression (status spells)
	const patternLine =
		unit.slug === "shield" || unit.slug === "shield-of-faith"
			? "# pattern: condition-grant-and-suppression"
			: unit.slug === "magic-missile" || unit.slug === "scorching-ray"
				? "# pattern: damage-type-routing"
				: undefined;
	return [
		"# GENERATED by src/chapters/spells/index.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		...(patternLine !== undefined ? [patternLine] : []),
		"#",
		`# Spells chapter: ${unit.displayName} (${bandLabel}).`,
		"# entity_definitions row (srd/spell/<slug>), tagged srd.spell +",
		"# srd.spell.level.<n> + srd.spell.school.<school> +",
		"# srd.spell.casting_time.<slug> + srd.spell.range.<slug> +",
		"# srd.spell.duration.<slug>, plus srd.spell.concentration /",
		"# srd.spell.ritual / srd.spell.component.{v,s,m} when applicable.",
		...behaviorLines,
		"# Source: cache/open5e/Spell.json.",
		"",
		"",
	].join("\n");
}

function spellEntityCall(unit: SpellUnit): VerbCall {
	return {
		toolName: "spellkave_define_entity_type",
		label: `entity:spell/${unit.slug}`,
		params: {
			bundle: BUNDLE_ID,
			id: `spell/${unit.slug}`,
			display_name: unit.displayName,
			description: unit.description,
			tags: unit.tags,
		},
	};
}

/** Behavior flag (AGENTS.md chapter-registry entry): P1b ships real mechanic rows (the curated spell behaviors + the shared spell-slot casting axis), not identity-only content. */
export const HAS_BEHAVIOR = true;

export async function generateSpells(target?: AuthorTarget): Promise<SpellsOutput> {
	const units = buildSpellUnits();
	const batchEntities: BatchEntity[] = units.map((unit) => ({
		entityDefId: unit.entityId,
		call: spellEntityCall(unit),
		extraCalls: [
			srdTextAttachmentWriteCall({
				targetKind: "entity_definition",
				targetRef: unit.entityId,
				extracted: unit.verbatim,
			}),
		],
	}));

	const [tagValues, perSpellToml, castingAxis, behaviorFragments] = await Promise.all([
		buildTagValuesFragment(),
		// Seed damage-type tag_value_definitions for MF-VAL-300 on BL-57 entity
		// tags; stripped from the per-entity fragment (equipment owns the
		// committed catalog).
		driveEntityBatch(BUNDLE_ID, batchEntities, RENDER_BATCH_SIZE, undefined, [
			tagValueWriteCall(true),
			srdTextNamespaceWriteCall(),
		]),
		buildSpellCastingAxisFragment(),
		buildSpellBehaviorFragments(target),
	]);

	const fragments: Record<string, string> = {
		[TAG_VALUES_PATH]: tagValues.toml,
		[CASTING_AXIS_PATH]: castingAxis.toml,
	};
	const summaries: ChapterUnitSummary[] = [...tagValues.summaries, ...castingAxis.summaries];
	for (const unit of units) {
		const body = perSpellToml.get(unit.entityId);
		if (body === undefined) {
			throw new Error(`spells/index: driveEntityBatch produced no rows for '${unit.entityId}'.`);
		}
		const behavior = behaviorFragments.get(unit.slug);
		const combinedBody = behavior === undefined ? body : body + behavior.toml;
		fragments[`base/spells/${unit.levelBand}/${unit.slug}.toml`] =
			spellHeader(unit, behavior?.result.precedent) + combinedBody;
		summaries.push({ kind: "entity_definitions", id: unit.entityId, sourcePk: unit.sourcePk });
		if (behavior !== undefined) {
			summaries.push(...spellBehaviorUnitSummaries([behavior.result]));
		}
	}
	return { fragments, units: summaries };
}

/**
 * This chapter's own reader-prose fragment(s) — `ChapterEntry.generateReaderProse`
 * (`../index.ts`). Thin wrapper: the shared per-document render logic lives
 * in `renderReaderProseForDocuments` (`compendium-metadata.ts`).
 */
export function generateSpellsReaderProse(
	attachments: readonly ReaderSubjectAttachment[],
): Promise<ChapterReaderProseResult> {
	return renderReaderProseForDocuments(["spells"], attachments);
}
