/**
 * `src/dm/data/` — the DM Runtime Library's DATA layer (ADR-0096
 * "Runtime-Rendered DM Content from a Typed Component Library"; slice plan
 * `ledger/designs/dm-runtime-library-arc.md`, this is S3). Typed,
 * cache-cited Character Creation data (`classes.ts`) plus the pure,
 * deterministic LATE-BOUND-LITERAL functions (`derived.ts`) that turn it
 * into the numbers a future S4 creation-dialogue brain bakes into rendered
 * manifest rows — HP, point-buy costs, XP thresholds. No I/O beyond reading
 * this package's own committed `cache/` (via existing readers, reused, not
 * re-parsed — see each file's own header for exactly which reader backs
 * which fact); no wall clock, no unseeded RNG.
 *
 * SRD BOUNDARY (ADR-0096 D-3): this module reads and composes data, nothing
 * more — it defines no SRD-tier rule content, no manifest rows, no DSL. It
 * has no dependency on `../lib/` (S2's runtime-authoring builders).
 *
 * ONE DOCUMENTED EXCEPTION (dm-generic-advancement-metadata M2,
 * `../../../ledger/designs/dm-generic-advancement-metadata.md`):
 * `advancement.ts` depends on `@spellkave/tool-authoring`'s `AuthorTarget`
 * type — `srd.advancement_grant`/`srd.advancement_choice` rows are AUTHORED
 * metadata (ADR-0073), not a `cache/`-derived rule table, so reading them
 * needs the SAME connection-level target `src/dm/creation/seat-steps.ts`
 * already threads, not a second parse of committed cache. `classes.ts`/
 * `derived.ts` remain zero-dependency; see `advancement.ts`'s own header for
 * the full grounding.
 */
export {
	type AdvancementChoiceGroup,
	advancementChoicesForClassLevel,
	advancementGrantsForClassLevel,
	type GrantableAdvancementCapabilities,
	grantableAdvancementCapabilities,
} from "./advancement";
export {
	assertAllClassChoicesParse,
	type ClassKitChoice,
	type ClassKitOption,
	type ClassSkillChoice,
	classKitChoice,
	classSkillChoice,
	parseSkillProficienciesText,
	parseStartingEquipmentText,
} from "./class-choices";
export {
	type AbilityScoreSpread,
	type ClassCreationData,
	classCreationData,
	classCreationDataBySlug,
	standardArrayScores,
} from "./classes";
export {
	abilityModifier,
	fixedHpPerLevel,
	level1Hp,
	POINT_BUY_BUDGET,
	POINT_BUY_BUDGET_ANCHOR,
	pointCost,
	totalPointCost,
	xpThreshold,
} from "./derived";
export {
	cantripCapabilityId,
	cantripsKnownAtLevel,
	preparedSpellCapabilityId,
	preparedSpellsAtLevel,
	type SpellSlotGrant,
	spellcastingProfileForClass,
	spellEntityIdsOnClassList,
	spellListTag,
	spellSlotGrantsForClassLevel,
	spellSlugsOnClassListAtLevel,
} from "./spellcasting";
