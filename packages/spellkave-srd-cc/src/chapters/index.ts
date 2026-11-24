// Chapter registry, book order. `src/pipeline.ts` walks this list to render
// every registered chapter into `fixtures/`. `hasBehavior` is the explicit
// per-chapter flag AGENTS.md's "Where things go" table calls for: whether
// this chapter has moved past identity-only content into authored
// mechanic/behavior rows.
import type { AuthorTarget } from "@spellkave/tool-authoring";

import type { ChapterReaderProseResult, ReaderSubjectAttachment } from "../compendium-metadata";
import type { ChapterSlice, ChapterUnitSummary } from "./chapter-types";
import {
	HAS_BEHAVIOR as CHARACTER_CREATION_HAS_BEHAVIOR,
	generateCharacterCreation,
	generateCharacterCreationReaderProse,
} from "./character-creation";
import {
	HAS_BEHAVIOR as CHARACTER_ORIGINS_HAS_BEHAVIOR,
	generateCharacterOrigins,
	generateCharacterOriginsReaderProse,
} from "./character-origins";
import {
	HAS_BEHAVIOR as CLASSES_HAS_BEHAVIOR,
	generateClasses,
	generateClassesReaderProse,
} from "./classes";
import {
	HAS_BEHAVIOR as EQUIPMENT_HAS_BEHAVIOR,
	generateEquipment,
	generateEquipmentReaderProse,
} from "./equipment";
import {
	HAS_BEHAVIOR as FEATS_HAS_BEHAVIOR,
	generateFeats,
	generateFeatsReaderProse,
} from "./feats";
import {
	HAS_BEHAVIOR as GAMEPLAY_TOOLBOX_HAS_BEHAVIOR,
	generateGameplayToolbox,
	generateGameplayToolboxReaderProse,
} from "./gameplay-toolbox";
import {
	generateMagicItems,
	generateMagicItemsReaderProse,
	HAS_BEHAVIOR as MAGIC_ITEMS_HAS_BEHAVIOR,
} from "./magic-items";
import {
	generateMonsters,
	generateMonstersReaderProse,
	HAS_BEHAVIOR as MONSTERS_HAS_BEHAVIOR,
} from "./monsters";
import {
	generatePlayingTheGame,
	generatePlayingTheGameReaderProse,
	HAS_BEHAVIOR as PLAYING_THE_GAME_HAS_BEHAVIOR,
} from "./playing-the-game";
import { generateProofSceneFiles } from "./playing-the-game/proof-scene-generator";
import {
	generateSpells,
	generateSpellsReaderProse,
	HAS_BEHAVIOR as SPELLS_HAS_BEHAVIOR,
} from "./spells";

export interface ChapterEntry {
	slug: string;
	hasBehavior: boolean;
	/**
	 * `subUnitCount` (default 1, only `magic-items` today): how many
	 * deterministic sub-units `pipeline-shards.ts` splits this chapter's own
	 * leaf entity list into (`magic-items/1of2`, `magic-items/2of2`, …). A
	 * chapter with `subUnitCount > 1` MUST honor `slice` in `generate` (and,
	 * if it produces behavior fragments keyed off the same leaf list, thread
	 * the SAME slice into that helper — see `magic-items/index.ts`).
	 */
	subUnitCount?: number;
	generate: (
		target?: AuthorTarget,
		slice?: ChapterSlice,
	) => Promise<{
		fragments: Record<string, string>;
		units: ChapterUnitSummary[];
	}>;
	/**
	 * Optional live PROOF scenes for this chapter (relPath under
	 * `fixtures/proofs/` -> one complete root manifest plus optional
	 * headerless include fragments). Distinct from `generate`'s shipped `fragments`:
	 * proofs are NEVER `[[include]]`d by `src/pipeline.ts`'s root manifest
	 * (fixture-hygiene) — applied explicitly by whoever runs the live test
	 * that needs them. Absent for a chapter with no live proof yet. `target`
	 * (when given by the caller) resolves the scene's refs into the base
	 * identity bundle — see `proof-scene-generator.ts`.
	 */
	generateProofs?: (target?: AuthorTarget) => Promise<Record<string, string>>;
	/**
	 * This chapter's own reader-prose fragment(s) (`base/<slug>/<document>.toml`,
	 * `compendium-metadata.ts`'s `renderReaderProseForDocuments`). Every
	 * registered chapter owns exactly one reader document except `monsters`
	 * (three: `monsters`/`monsters-a-z`/`animals`); a document with no
	 * owning chapter generator (`rules-glossary`) has no entry here and renders
	 * centrally in `pipeline.ts` instead. `gameplay-toolbox` is registered and
	 * uses the same shared reader-prose helper. Called twice
	 * by `pipeline.ts`: once before the
	 * manifest is assembled (`attachments = []`) and, only when the result
	 * reports `needsAssembledAttachments`, once more after assembly with the
	 * real `srd.text` attachments a compact-collection page needs to prove
	 * its subjects — see `pipeline.ts`'s reader-prose section for why this
	 * is a genuine two-phase render, not a leftover one.
	 */
	generateReaderProse: (
		attachments: readonly ReaderSubjectAttachment[],
	) => Promise<ChapterReaderProseResult>;
}

export const CHAPTERS: readonly ChapterEntry[] = [
	{
		slug: "playing-the-game",
		hasBehavior: PLAYING_THE_GAME_HAS_BEHAVIOR,
		generate: async (target) => {
			const output = await generatePlayingTheGame(target);
			return {
				fragments: {
					"base/playing-the-game/abilities.toml": output.abilitiesToml,
					"base/playing-the-game/d20-tests.toml": output.d20TestsToml,
					"base/playing-the-game/skills.toml": output.skillsToml,
					"base/playing-the-game/level.toml": output.levelToml,
					"base/playing-the-game/action-economy.toml": output.actionEconomyToml,
					"base/playing-the-game/armor-class.toml": output.armorClassToml,
					"base/playing-the-game/heroic-inspiration.toml": output.heroicInspirationToml,
					"base/playing-the-game/macros.toml": output.macrosToml,
					"base/playing-the-game/actions.toml": output.actionsToml,
					"base/playing-the-game/conditions.toml": output.conditionsToml,
					"base/playing-the-game/glossary-conditions.toml": output.glossaryConditionsToml,
					"base/playing-the-game/death-saves.toml": output.deathSavesToml,
					"base/playing-the-game/grid.toml": output.gridToml,
					"base/playing-the-game/attacks.toml": output.attacksToml,
					"base/playing-the-game/weapon-mastery-riders.toml": output.weaponMasteryRidersToml,
					"base/playing-the-game/sneak-attack.toml": output.sneakAttackToml,
					"base/playing-the-game/dodge.toml": output.dodgeToml,
					"base/playing-the-game/dash.toml": output.dashToml,
					"base/playing-the-game/perception-conditions.toml": output.perceptionConditionsToml,
					"base/playing-the-game/pickup.toml": output.pickupToml,
					"base/playing-the-game/consume.toml": output.consumeToml,
					"base/playing-the-game/drop-prone.toml": output.dropProneToml,
					"base/playing-the-game/stand-up.toml": output.standUpToml,
					"base/playing-the-game/help.toml": output.helpToml,
					"base/playing-the-game/rest.toml": output.restToml,
					"base/playing-the-game/hp.toml": output.hpToml,
					"base/playing-the-game/temp-hp.toml": output.tempHpToml,
					"base/playing-the-game/generic-check-dc.toml": output.genericCheckDcToml,
					"base/playing-the-game/generic-check-affordances.toml":
						output.genericCheckAffordancesToml,
					"base/playing-the-game/equipment-proficiencies.toml": output.equipmentProficienciesToml,
					"base/playing-the-game/cover-conditions.toml": output.coverConditionsToml,
					"base/playing-the-game/baseline-sensing.toml": output.baselineSensingToml,
					"base/playing-the-game/communication.toml": output.communicationToml,
					"base/playing-the-game/speech.toml": output.speechToml,
					"base/playing-the-game/tag-values.toml": output.tagValuesToml,
					"base/playing-the-game/player-character-identity.toml":
						output.playerCharacterIdentityToml,
					"base/playing-the-game/creature-identity.toml": output.creatureIdentityToml,
				},
				units: output.units,
			};
		},
		generateReaderProse: generatePlayingTheGameReaderProse,
		generateProofs: generateProofSceneFiles,
	},
	{
		// Book order: Character Creation follows Playing the Game (SRD 5.2.1
		// free-rules table of contents), before Equipment
		// (`ledger/character-creation.md`). C0 scaffolded the registry entry;
		// C1 (Alignment) + C2 (Choose Languages) + C3 (Ability-Score
		// Generation) shipped the catalog fragments — see that chapter's own
		// module header.
		slug: "character-creation",
		hasBehavior: CHARACTER_CREATION_HAS_BEHAVIOR,
		generate: async (target) => {
			const output = await generateCharacterCreation(target);
			return {
				fragments: {
					"base/character-creation/alignment.toml": output.alignmentToml,
					"base/character-creation/languages.toml": output.languagesToml,
					"base/character-creation/creation-tables.toml": output.creationTablesToml,
					"base/character-creation/advancement.toml": output.advancementToml,
					"base/character-creation/pregen/fighter.toml": output.pregenToml,
					"base/character-creation/trinkets.toml": output.trinketsToml,
					"base/character-creation/catalogue-rows.toml": output.catalogueRowsToml,
				},
				units: output.units,
			};
		},
		generateReaderProse: generateCharacterCreationReaderProse,
	},
	{
		// Book order: SRD 5.2.1's free-rules ToC runs …Character Creation,
		// Character Origins, Classes, Feats, Equipment… . Character Origins
		// registers here, between Character Creation and Classes (`ledger/
		// character-origins.md`'s O0 row).
		slug: "character-origins",
		hasBehavior: CHARACTER_ORIGINS_HAS_BEHAVIOR,
		generate: async (target) => {
			const output = await generateCharacterOrigins(target);
			return {
				fragments: {
					"base/character-origins/backgrounds.toml": output.backgroundsToml,
					"base/character-origins/species.toml": output.speciesToml,
					"base/character-origins/traits.toml": output.traitsToml,
				},
				units: output.units,
			};
		},
		generateReaderProse: generateCharacterOriginsReaderProse,
	},
	{
		// Book order: Classes follows Character Origins (SRD 5.2.1 free-rules
		// ToC), before Feats — the slot both of those chapters' own registry
		// entries previously reserved (`ledger/classes.md`'s K0 row).
		slug: "classes",
		hasBehavior: CLASSES_HAS_BEHAVIOR,
		generate: async (target) => {
			const output = await generateClasses(target);
			return { fragments: output.fragments, units: output.units };
		},
		generateReaderProse: generateClassesReaderProse,
	},
	{
		// Book order: Feats follows Classes (SRD 5.2.1 free-rules table of
		// contents), before Equipment. F1 built BEFORE Character Origins O1 on
		// purpose: backgrounds reference feat entities (`ledger/
		// character-creation.md`'s 2026-07-31 operator ruling — the four
		// Origin feats ship as their own thin chapter, source ownership
		// `feats.md`, never smuggled into Character Origins).
		slug: "feats",
		hasBehavior: FEATS_HAS_BEHAVIOR,
		generate: async () => {
			const output = await generateFeats();
			return { fragments: output.fragments, units: output.units };
		},
		generateReaderProse: generateFeatsReaderProse,
	},
	{
		// Book order: Equipment follows Feats (SRD 5.2.1 free-rules table of
		// contents) — the last registered chapter in this package.
		slug: "equipment",
		hasBehavior: EQUIPMENT_HAS_BEHAVIOR,
		generate: async (target) => {
			if (target === undefined) {
				throw new Error(
					"equipment generation requires the committed bundle target so srd/ac resolves through target augmentation",
				);
			}
			const output = await generateEquipment(target);
			return { fragments: output.fragments, units: output.units };
		},
		generateReaderProse: generateEquipmentReaderProse,
	},
	{
		// Book order: Spells follows Equipment (SRD 5.2.1 free-rules table of
		// contents) — the last registered chapter in this package. Slice P1a
		// (identity only for all 339 SRD spells) — see `./spells/index.ts` and
		// `./spells/spell-units.ts` for the row-kind/tag/granularity design.
		slug: "spells",
		hasBehavior: SPELLS_HAS_BEHAVIOR,
		generate: async (target) => {
			const output = await generateSpells(target);
			return { fragments: output.fragments, units: output.units };
		},
		generateReaderProse: generateSpellsReaderProse,
	},
	{
		// Book order: Monsters follows Spells (design doc's own book-order
		// call, `ledger/designs/monsters-chapter-design.md`).
		slug: "monsters",
		hasBehavior: MONSTERS_HAS_BEHAVIOR,
		generate: async (target) => {
			if (target === undefined) {
				throw new Error(
					"monsters generation requires the committed bundle target so srd/str..srd/cha/srd/ac/" +
						"srd/hp/srd/speed-walk resolve for every creature's initial_states",
				);
			}
			const output = await generateMonsters(target);
			return { fragments: output.fragments, units: output.units };
		},
		generateReaderProse: generateMonstersReaderProse,
	},
	{
		// Magic Items (sk-609b.13 / BL-16) — identity for all MagicItem.json
		// records + expressible +N/charge/loot behaviors. Registered after
		// Monsters so equipment/spell substrates already exist for target refs.
		slug: "magic-items",
		hasBehavior: MAGIC_ITEMS_HAS_BEHAVIOR,
		// sk-jay0.7.23.28: magic-items is the single largest pipeline unit
		// (~160 s local unsliced, ~93% of that in behavior-fragment rendering
		// — see `generateMagicItems`'s own doc comment). Split in two so
		// neither pipeline-shards.ts row it lands in exceeds the other heavy
		// chapters (monsters/spells/classes, all under 120 s unsliced).
		subUnitCount: 2,
		generate: async (target, slice) => {
			const output = await generateMagicItems(target, slice);
			return { fragments: output.fragments, units: output.units };
		},
		generateReaderProse: generateMagicItemsReaderProse,
	},
	{
		// Sample poisons are catalogue rows. Reader prose stays the shared helper.
		slug: "gameplay-toolbox",
		hasBehavior: GAMEPLAY_TOOLBOX_HAS_BEHAVIOR,
		generate: async (target) => generateGameplayToolbox(target),
		generateReaderProse: generateGameplayToolboxReaderProse,
	},
];
