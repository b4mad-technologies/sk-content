import { describe, expect, it } from "vitest";
import {
	ABILITY_CHECKS_RULE_PK,
	typicalDifficultyClasses,
} from "../../chapters/playing-the-game/ability-checks-units";
import {
	ABILITY_SCORES_RULE_PK,
	abilityScoreBands,
} from "../../chapters/playing-the-game/ability-units";
import {
	buildCreatureTypeUnits,
	MONSTER_TAG,
	PLAYER_CHARACTER_TAG,
} from "../../chapters/playing-the-game/creature-type-units";
import {
	ADVANCEMENT_TRAINER_TAG,
	abilityScoreTagDescription,
	buildTagValueDefinitionUnits,
	buildTravelPaceTagUnits,
	DIFFICULTY_CLASS_TAG,
	DM_NPC_ALDWIN_TAG,
	DM_NPC_CREATION_TAG,
	DM_NPC_TALKER_TAG,
	difficultyClassTagDescription,
	ITEM_CONTAINER_TAG,
	ITEM_FOOD_TAG,
	ITEM_GEAR_TAG,
	ITEM_LIGHT_TAG,
	PARTY_HEROES_TAG,
	ROLL_BIAS_ADVANTAGE_TAG,
	ROLL_BIAS_DISADVANTAGE_TAG,
	TRAVEL_PACE_TAG_PREFIX,
} from "../../chapters/playing-the-game/tag-value-vocabulary";
import {
	TRAVEL_RULE_PK,
	travelPaceEffects,
	travelPaceTable,
} from "../../chapters/playing-the-game/travel-pace-units";
import { VOCAL_COMMUNICATION_TAG } from "../../chapters/playing-the-game/vocal-communication-identity-units";

describe("buildTagValueDefinitionUnits", () => {
	it("authors exactly forty-two general values, three Travel Paces, and fourteen sourced Creature Types", () => {
		const definitions = buildTagValueDefinitionUnits();
		expect(definitions).toHaveLength(59);
		expect(
			definitions.filter((definition) => definition.prefix === "srd").map((d) => d.tag),
		).toEqual([
			"srd.ability_score",
			DIFFICULTY_CLASS_TAG,
			"srd.skill",
			"srd.action",
			"srd.check",
			"srd.item",
			// sk-jay0.1.23.36.22.17: consumables used through `srd/consume`.
			"srd.consumable",
			"srd.tool",
			"srd.tool_proficiency",
			"srd.lock",
			"srd.armor",
			"srd.armor.heavy",
			// E2 (Equipment, `ledger/equipment.md`): the remaining 3 weight classes.
			"srd.armor.light",
			"srd.armor.medium",
			"srd.armor.shield",
			ROLL_BIAS_ADVANTAGE_TAG,
			ROLL_BIAS_DISADVANTAGE_TAG,
			"srd.creature",
			// sk-dms.39/sk-b3m: the monster/character Monster-Death split — see
			// tag-value-vocabulary.ts's own MONSTER_TAG entry doc comment.
			MONSTER_TAG,
			// The explicit PC identity the PC-only verb package hangs off via
			// `tag_capability_grant`.
			PLAYER_CHARACTER_TAG,
			VOCAL_COMMUNICATION_TAG,
			// F1 (Feats, `ledger/feats.md`): registered in tag-value-vocabulary.ts
			// (not feats/index.ts) — this bundle's bare "srd" prefix is ref-typed
			// (MF-VAL-300), so every srd.* tag needs a row in this ONE catalog.
			"srd.feat",
			"srd.feat.origin",
			// F2 (Feats, `ledger/feats.md`): the remaining 3 feat categories.
			"srd.feat.general",
			"srd.feat.fighting_style",
			"srd.feat.epic_boon",
			// O1 (Character Origins, `ledger/character-origins.md`): same reasoning,
			// registered here rather than in character-origins/index.ts.
			"srd.background",
			"srd.background.acolyte",
			"srd.background.criminal",
			"srd.background.sage",
			"srd.background.soldier",
			// sk-ntz.3 (content hygiene): renamed from the legacy colon-shaped
			// `faction:party`/`faction:monsters` (MF-VAL-296/297/298) — registered
			// here rather than in `combat-arena.ts`/`crypt-fight.ts`.
			"srd.faction.party",
			"srd.faction.monsters",
			// sk-ntz.7 (content hygiene): remaining flat/colon elven-mini tags.
			ITEM_CONTAINER_TAG,
			ITEM_GEAR_TAG,
			ITEM_FOOD_TAG,
			ITEM_LIGHT_TAG,
			DM_NPC_ALDWIN_TAG,
			DM_NPC_CREATION_TAG,
			DM_NPC_TALKER_TAG,
			PARTY_HEROES_TAG,
			// sk-0f5: registered here rather than in advancement-units.ts.
			ADVANCEMENT_TRAINER_TAG,
		]);
		expect(
			definitions.filter((definition) => definition.prefix === TRAVEL_PACE_TAG_PREFIX),
		).toEqual(buildTravelPaceTagUnits());
		const creatureDefinitions = definitions.filter(
			(definition) => definition.prefix === "srd.creature_type",
		);
		expect(creatureDefinitions).toEqual(
			buildCreatureTypeUnits().map((unit) => ({
				tag: `srd.creature_type.${unit.slug}`,
				prefix: "srd.creature_type",
				description: unit.description,
				sourcePk: unit.pk,
			})),
		);
	});

	it("embeds every source-derived Travel Pace distance and effect in its catalog tag", () => {
		const definitions = buildTravelPaceTagUnits();
		const effectsByPace = new Map(
			travelPaceEffects().map((effect) => [effect.pace, effect.effectText]),
		);
		expect(definitions.map((definition) => definition.tag)).toEqual([
			"srd.travel_pace.fast",
			"srd.travel_pace.normal",
			"srd.travel_pace.slow",
		]);
		for (const row of travelPaceTable()) {
			const definition = definitions.find((candidate) =>
				candidate.tag.endsWith(`.${row.pace.toLowerCase()}`),
			);
			expect(definition).toMatchObject({
				prefix: TRAVEL_PACE_TAG_PREFIX,
				sourcePk: TRAVEL_RULE_PK,
			});
			expect(definition?.description).toContain(`${row.feetPerMinute} feet per minute`);
			expect(definition?.description).toContain(`${row.milesPerHour} miles per hour`);
			expect(definition?.description).toContain(`${row.milesPerDay} miles per day`);
			expect(definition?.description).toContain(effectsByPace.get(row.pace));
		}
	});

	it("embeds every source-derived Ability Scores band in the shared tag metadata", () => {
		const abilityScoreDefinition = buildTagValueDefinitionUnits().find(
			(definition) => definition.tag === "srd.ability_score",
		);
		expect(abilityScoreDefinition).toEqual({
			tag: "srd.ability_score",
			prefix: "srd",
			description: abilityScoreTagDescription(),
			sourcePk: ABILITY_SCORES_RULE_PK,
		});
		for (const { minScore, maxScore, meaning } of abilityScoreBands()) {
			const score = minScore === maxScore ? `${minScore}` : `${minScore}–${maxScore}`;
			expect(abilityScoreDefinition?.description).toContain(`${score} — ${meaning}`);
		}
	});

	it("embeds every source-derived Typical Difficulty Class in shared DC metadata", () => {
		const difficultyClassDefinition = buildTagValueDefinitionUnits().find(
			(definition) => definition.tag === DIFFICULTY_CLASS_TAG,
		);
		expect(difficultyClassDefinition).toEqual({
			tag: DIFFICULTY_CLASS_TAG,
			prefix: "srd",
			description: difficultyClassTagDescription(),
			sourcePk: ABILITY_CHECKS_RULE_PK,
		});
		for (const { taskDifficulty, dc } of typicalDifficultyClasses()) {
			expect(difficultyClassDefinition?.description).toContain(`${taskDifficulty} — ${dc}`);
		}
	});
});
