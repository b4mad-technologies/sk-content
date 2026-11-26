import { existsSync, readFileSync } from "node:fs";
import {
	type AuthorToolContext,
	type AuthorWorkspace,
	queryToolDef,
} from "@spellkave/tool-authoring";
import { createLocalAuthorTarget } from "@spellkave/tool-node/authoring";
import { bindTool } from "@spellkave/tool-runtime";
import { describe, expect, it } from "vitest";
import { BUNDLE_ROW } from "../../../bundle-row";
import { buildAlignmentTagValueUnits } from "../../../chapters/character-creation/alignment-units";
import { buildCreationTablesTagValueUnits } from "../../../chapters/character-creation/creation-tables-units";
import { buildLanguageTagValueUnits } from "../../../chapters/character-creation/language-units";
import {
	buildCreatureSizeTagValueUnits,
	buildSpeciesTagValueUnits,
} from "../../../chapters/character-origins/species-units";
import { buildTraitTagValueUnits } from "../../../chapters/character-origins/trait-units";
import {
	buildClassTagValueUnits,
	buildSubclassTagValueUnits,
} from "../../../chapters/classes/classes-units";
import { dmGrantCatalog } from "../../../chapters/classes/dm-act-catalog";
import { buildFeatureTagValueUnits } from "../../../chapters/classes/fighter-units";
import { buildRemainingFeatureTagValueUnits } from "../../../chapters/classes/remaining-classes-units";
import { choiceToolTagUnits } from "../../../chapters/equipment/choice-tools.ts";
import { buildWeaponTagValueUnits } from "../../../chapters/equipment/weapon-tag-values";
import { samplePoisonTagUnits } from "../../../chapters/gameplay-toolbox/sample-poisons";
import { buildMagicItemTagValueUnits } from "../../../chapters/magic-items/magic-item-tag-values";
import { buildCreatureTagValueUnits } from "../../../chapters/monsters/creature-tag-values";
import { BUNDLE_ID } from "../../../chapters/playing-the-game";
import { typicalDifficultyClasses } from "../../../chapters/playing-the-game/ability-checks-units";
import { abilityScoreBands } from "../../../chapters/playing-the-game/ability-units";
import {
	PROOF_BUNDLE_ID,
	PROOF_DUMMY_CREATURE_TYPE_TAG,
	PROOF_GUARD_CREATURE_TYPE_TAG,
} from "../../../chapters/playing-the-game/proof-scene";
import { generateProofScene } from "../../../chapters/playing-the-game/proof-scene-generator";
import {
	buildTagValueDefinitionUnits,
	DIFFICULTY_CLASS_TAG,
	type TagValueDefinitionUnit,
	TRAVEL_PACE_TAG_PREFIX,
} from "../../../chapters/playing-the-game/tag-value-vocabulary";
import {
	travelPaceEffects,
	travelPaceTable,
} from "../../../chapters/playing-the-game/travel-pace-units";
import { buildSpellTagValueUnits } from "../../../chapters/spells/spell-tag-values";
import { flavorAbsPath } from "../../../flavor/completeness";
import { TAGS_KEEP_BUILDER_DESCRIPTION } from "../../../flavor/overlay";
import { parseFlavorMarkdown } from "../../../flavor/read";
import { FIXTURES_DIR } from "../../../pipeline";
import {
	buildTools,
	type QueryDetailResult,
	type QueryListResult,
	query,
	splitTagCompositeId,
} from "./harness";

function overlayTagDescription(tag: string, description: string): string {
	if (TAGS_KEEP_BUILDER_DESCRIPTION.has(tag)) return description;
	const path = flavorAbsPath({ kind: "tag_value_definitions", id: tag });
	if (path === null || !existsSync(path)) return description;
	return parseFlavorMarkdown(readFileSync(path, "utf8"), path).body;
}

interface TagPrefixDeclaration {
	prefix: string;
	target_kind: string;
	natural_key_field: string;
}

const TAG_ROW_KINDS = [
	"resource_definition_tag",
	"capability_definition_tag",
	"entity_definition_tag",
	"modifier_template_tag",
] as const;

function longestPrefix(tag: string): TagPrefixDeclaration {
	const prefixes = BUNDLE_ROW.tag_prefixes as TagPrefixDeclaration[];
	const match = prefixes
		.filter((prefix) => tag.startsWith(`${prefix.prefix}.`))
		.sort((left, right) => right.prefix.length - left.prefix.length)[0];
	if (match === undefined) throw new Error(`no declared tag prefix matches '${tag}'`);
	return match;
}

function readOnlyWorkspace(toml: string): AuthorWorkspace {
	return {
		readToml: () => toml,
		writeToml: () => {
			throw new Error("tag-vocabulary test: proof workspace is read-only.");
		},
	};
}

async function queryProofTagList(toml: string): Promise<QueryListResult> {
	const context: AuthorToolContext = {
		workspace: readOnlyWorkspace(toml),
		target: createLocalAuthorTarget(FIXTURES_DIR),
	};
	const tool = bindTool(queryToolDef, { context, capabilities: {} });
	const result = await tool.execute("tag-vocabulary-proof-test", {
		kind: "entity_definition_tag",
		bundle: PROOF_BUNDLE_ID,
	});
	if (result.details.shape !== "list") {
		throw new Error(`tag-vocabulary test: expected list, got ${result.details.shape}.`);
	}
	return result.details;
}

// Timeout raised (O2 landing, 2026-07-31): same "wasm validation scales
// with bundle size" pattern as pipeline.test.ts — ~2s alone, tripped 5s
// once under parallel-worker contention.
describe("rendered SRD tag vocabulary", { timeout: 180_000 }, () => {
	it("resolves every emitted *_tag row through its longest declared prefix", async () => {
		const tools = buildTools();
		const tagValueList = (await query(tools, {
			kind: "tag_value_definitions",
			bundle: BUNDLE_ID,
		})) as QueryListResult;
		const actualDefinitions: Array<
			Omit<TagValueDefinitionUnit, "sourcePk"> & { bundle_id: string }
		> = [];
		for (const item of tagValueList.items) {
			const detail = (await query(tools, {
				kind: "tag_value_definitions",
				id: item.id,
			})) as QueryDetailResult;
			actualDefinitions.push(
				detail.row as unknown as Omit<TagValueDefinitionUnit, "sourcePk"> & {
					bundle_id: string;
				},
			);
		}
		// The rendered `srd` bundle's `tag_value_definitions` table is the union
		// of every chapter that authors its own vocabulary — playing-the-game's
		// closed catalog (including `srd.advancement_trainer`, sk-0f5) plus
		// character-creation's `srd.alignment*` rows (`alignment-units.ts`, C1),
		// `srd.language*` rows (`language-units.ts`, C2), `srd.character_creation*`
		// rows (`creation-tables-units.ts`, C3), character-origins' `srd.species*` +
		// `srd.creature_size*` rows (`species-units.ts`, O2) + `srd.trait*` rows
		// (`trait-units.ts`, O3), classes' `srd.class*` + `srd.subclass*`
		// rows (`classes-units.ts`, K1) + `srd.class_feature*` rows (K2's
		// `fighter-units.ts` + K3's `remaining-classes-units.ts`, deduped against
		// each other), Spells' own `srd.spell*` rows
		// (`spell-tag-values.ts`, P1a), Monsters' own `srd.size*`/`srd.cr*`
		// rows (`creature-tag-values.ts`, P2b), and Equipment E3's own
		// `srd.weapon*` rows (`weapon-tag-values.ts`) — the sibling chapter
		// fragments sharing the verb-runner's `onlyTagValueDefinitionTags`
		// mechanism. A chapter that later ships more vocabulary of its own
		// extends this same union, not a fork of it.
		const expectedDefinitions = [
			...buildTagValueDefinitionUnits(),
			...dmGrantCatalog(createLocalAuthorTarget(FIXTURES_DIR)).tags.map((tag) => ({
				...tag,
				sourcePk: "",
			})),
			...buildAlignmentTagValueUnits(),
			...buildLanguageTagValueUnits(),
			...buildCreationTablesTagValueUnits(),
			...buildSpeciesTagValueUnits(),
			...buildCreatureSizeTagValueUnits(),
			...buildTraitTagValueUnits(),
			...buildClassTagValueUnits(),
			...buildSubclassTagValueUnits(),
			...buildFeatureTagValueUnits(),
			...buildRemainingFeatureTagValueUnits(),
			...buildSpellTagValueUnits(),
			...buildCreatureTagValueUnits(),
			...buildWeaponTagValueUnits(),
			...choiceToolTagUnits(),
			// sk-609b.13 Magic Items vocabulary (+ srd.loot_table).
			...buildMagicItemTagValueUnits(),
			...samplePoisonTagUnits(),
			{
				tag: "srd.loot_table",
				prefix: "srd",
				description: "Identifies a roll_tables row as an SRD loot/treasure draw table.",
				sourcePk: "",
			},
		]
			.map(({ sourcePk: _sourcePk, ...definition }) => ({
				bundle_id: BUNDLE_ID,
				...definition,
				description: overlayTagDescription(definition.tag, definition.description),
			}))
			.sort((left, right) => left.tag.localeCompare(right.tag));
		expect(actualDefinitions).toEqual(expectedDefinitions);

		const resources = (await query(tools, {
			kind: "resource_definitions",
			bundle: BUNDLE_ID,
		})) as QueryListResult;
		const resourceIds = resources.items.map((item) => item.id);
		const emittedTags: string[] = [];
		for (const kind of TAG_ROW_KINDS) {
			const list = (await query(tools, { kind, bundle: BUNDLE_ID })) as QueryListResult;
			emittedTags.push(...list.items.map((item) => splitTagCompositeId(item.id).tag));
		}
		expect(emittedTags.length).toBeGreaterThan(0);

		for (const tag of emittedTags) {
			const prefix = longestPrefix(tag);
			if (prefix.target_kind === "tag_value_definitions") {
				expect(actualDefinitions.map((definition) => definition.tag)).toContain(tag);
				continue;
			}
			expect(prefix).toMatchObject({
				prefix: "srd.ability",
				target_kind: "resource_definitions",
				natural_key_field: "resource_definition_id",
			});
			const suffix = tag.slice(`${prefix.prefix}.`.length);
			expect(
				resourceIds.filter(
					(id) => id === tag || id === suffix || id.slice(id.lastIndexOf("/") + 1) === suffix,
				),
			).toHaveLength(1);
		}
	});

	it("exposes all seven Ability Scores meaning bands through srd.ability_score metadata", async () => {
		const detail = (await query(buildTools(), {
			kind: "tag_value_definitions",
			id: "srd.ability_score",
		})) as QueryDetailResult;
		const description = (detail.row as { description: string }).description;
		for (const { minScore, maxScore, meaning } of abilityScoreBands()) {
			const score = minScore === maxScore ? `${minScore}` : `${minScore}–${maxScore}`;
			expect(description).toContain(`${score} — ${meaning}`);
		}
	});

	it("exposes all six Typical Difficulty Classes through shared DC metadata", async () => {
		const detail = (await query(buildTools(), {
			kind: "tag_value_definitions",
			id: DIFFICULTY_CLASS_TAG,
		})) as QueryDetailResult;
		const description = (detail.row as { description: string }).description;
		for (const { taskDifficulty, dc } of typicalDifficultyClasses()) {
			expect(description).toContain(`${taskDifficulty} — ${dc}`);
		}
	});

	it("exposes all three Travel Pace rows and effects through catalog metadata", async () => {
		const effectsByPace = new Map(
			travelPaceEffects().map((effect) => [effect.pace, effect.effectText]),
		);
		for (const row of travelPaceTable()) {
			const detail = (await query(buildTools(), {
				kind: "tag_value_definitions",
				id: `${TRAVEL_PACE_TAG_PREFIX}.${row.pace.toLowerCase()}`,
			})) as QueryDetailResult;
			const description = (detail.row as { description: string }).description;
			expect(description).toContain(`${row.feetPerMinute} feet per minute`);
			expect(description).toContain(`${row.milesPerHour} miles per hour`);
			expect(description).toContain(`${row.milesPerDay} miles per day`);
			expect(description).toContain(effectsByPace.get(row.pace));
		}
	});

	it("resolves generated proof-scene entity tags through the same declared vocabulary", async () => {
		const proofToml = await generateProofScene(createLocalAuthorTarget(FIXTURES_DIR));
		const proofTags = (await queryProofTagList(proofToml)).items.map(
			(item) => splitTagCompositeId(item.id).tag,
		);
		expect(proofTags).toEqual(
			expect.arrayContaining([
				"srd.creature",
				PROOF_DUMMY_CREATURE_TYPE_TAG,
				PROOF_GUARD_CREATURE_TYPE_TAG,
				// C3 (`ledger/character-creation.md`'s "Standing pattern" addendum):
				// the hero, guard, and both goblin warriors are now tagged with the
				// C1/C2 identity vocabulary — see `proof-scene/calls/identity.ts`,
				// `calls/combat.ts`, and `calls/combat-arena.ts`.
				"srd.alignment.lawful-good",
				"srd.language.common",
				"srd.language.elvish",
				"srd.alignment.chaotic-neutral",
				"srd.language.goblin",
				// O2 (Character Origins Species): the identity hero's Human
				// species tags (`proof-scene/calls/identity.ts`'s own O2 header).
				"srd.species.human",
				"srd.creature_size.medium",
				// O3 (Character Origins Traits): the hero's Resourceful trait tag
				// (a FIXED Human trait, `proof-scene/calls/identity.ts`'s own O3
				// header) — the Long Rest completion action's species gate reads it.
				"srd.trait.resourceful",
				// K1 (Classes): the hero's Fighter exemplar tag (vocabulary only,
				// `proof-scene/calls/identity.ts`'s own K1 header).
				"srd.class.fighter",
				// E3 (Equipment): the combat arena's explicitly equipped test
				// weapon exercises the same identity/range vocabulary as product
				// weapons.
				"srd.weapon",
				"srd.weapon.range.melee",
				"srd.weapon.range.ranged",
			]),
		);

		// C3: entity tags now also draw from character-creation's own
		// `srd.alignment*`/`srd.language*` vocabulary, not only
		// playing-the-game's `buildTagValueDefinitionUnits()`. O2: also
		// character-origins' own `srd.species*`/`srd.creature_size*` vocabulary.
		// O3: also character-origins' own `srd.trait*` vocabulary. K1: also
		// classes' own `srd.class*` vocabulary. E3: also Equipment's own
		// `srd.weapon*` vocabulary.
		const definitions = [
			...buildTagValueDefinitionUnits(),
			...buildAlignmentTagValueUnits(),
			...buildLanguageTagValueUnits(),
			...buildSpeciesTagValueUnits(),
			...buildCreatureSizeTagValueUnits(),
			...buildTraitTagValueUnits(),
			...buildClassTagValueUnits(),
			...buildWeaponTagValueUnits(),
		].map((definition) => definition.tag);
		for (const tag of proofTags) {
			const prefix = longestPrefix(tag);
			expect(prefix.target_kind).toBe("tag_value_definitions");
			expect(definitions).toContain(tag);
		}
	});
});
