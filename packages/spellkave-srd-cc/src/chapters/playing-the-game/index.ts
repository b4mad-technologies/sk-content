// Chapter generator: Playing the Game (SRD 5.2.1). Fragment builders live
// beside their generated review units under ./fragments/.
import type { AuthorTarget } from "@spellkave/tool-authoring";
import {
	type ChapterReaderProseResult,
	type ReaderSubjectAttachment,
	renderReaderProseForDocuments,
} from "../../compendium-metadata";
import type { ChapterUnitSummary } from "../chapter-types";
import { buildActionEconomyFragment } from "./fragments/action-economy";
import { buildActionsFragment } from "./fragments/actions";
import { buildArmorClassFragment } from "./fragments/armor-class";
import { buildAttacksFragment } from "./fragments/attacks";
import { buildBaselineCommunicationFragment } from "./fragments/communication";
import { buildConditionsFragment } from "./fragments/conditions";
import { buildConsumeFragment } from "./fragments/consume";
import { buildCoverConditionsFragment } from "./fragments/cover";
import { buildCreatureIdentityFragment } from "./fragments/creature-identity";
import { buildD20ReaderFragment } from "./fragments/d20-reader";
import { buildDashFragment } from "./fragments/dash";
import { buildDeathSavesFragment } from "./fragments/death-saves";
import { buildDodgeFragment } from "./fragments/dodge";
import { buildDropProneFragment } from "./fragments/drop-prone";
import { buildEquipmentProficienciesFragment } from "./fragments/equipment-proficiencies";
import {
	buildGenericCheckAffordancesFragment,
	buildGenericCheckDcFragment,
} from "./fragments/generic";
import { buildGridFragment } from "./fragments/grid";
import { buildHelpFragment } from "./fragments/help";
import { buildHeroicInspirationFragment } from "./fragments/heroic-inspiration";
import {
	buildAbilitiesFragment,
	buildHpFragment,
	buildLevelFragment,
	buildSkillsFragment,
	buildTempHpFragment,
} from "./fragments/identity";
import { buildMacrosFragment } from "./fragments/macros";
import { buildPerceptionConditionsFragment } from "./fragments/perception-conditions";
import { buildPickupFragment } from "./fragments/pickup";
import { buildPlayerCharacterIdentityFragment } from "./fragments/player-character-identity";
import { buildRestFragment } from "./fragments/rest";
import { buildBaselineSensingFragment } from "./fragments/sensing";
import { buildSneakAttackFragment } from "./fragments/sneak-attack";
import { buildSpeechFragment } from "./fragments/speech";
import { buildStandUpFragment } from "./fragments/stand-up";
import { buildTagValueVocabularyFragment } from "./fragments/tag-vocabulary";
import { buildWeaponMasteryRidersFragment } from "./fragments/weapon-mastery-riders";
import { buildGlossaryConditionsFragment } from "./glossary-conditions";

export {
	BASELINE_SENSING_NICHE_ID,
	BUNDLE_ID,
	SENSE_LOOK_AFFORDANCE_ID,
	SENSE_LOOK_OUTCOME_ID,
	SENSE_LOOK_SAME_SUBSTRATE_AFFORDANCE_ID,
} from "./constants";
export {
	BASELINE_COMMUNICATE_AFFORDANCE_ID,
	BASELINE_COMMUNICATE_CAPABILITY_ID,
	BASELINE_COMMUNICATE_NICHE_ID,
	BASELINE_COMMUNICATE_OUTCOME_ID,
	BASELINE_COMMUNICATE_SPEECH_ACT_ID,
} from "./fragments/communication";

export interface PlayingTheGameOutput {
	abilitiesToml: string;
	d20TestsToml: string;
	skillsToml: string;
	levelToml: string;
	actionEconomyToml: string;
	armorClassToml: string;
	heroicInspirationToml: string;
	macrosToml: string;
	actionsToml: string;
	attacksToml: string;
	weaponMasteryRidersToml: string;
	sneakAttackToml: string;
	conditionsToml: string;
	glossaryConditionsToml: string;
	deathSavesToml: string;
	gridToml: string;
	dodgeToml: string;
	dashToml: string;
	perceptionConditionsToml: string;
	pickupToml: string;
	consumeToml: string;
	dropProneToml: string;
	standUpToml: string;
	helpToml: string;
	restToml: string;
	hpToml: string;
	tempHpToml: string;
	genericCheckDcToml: string;
	genericCheckAffordancesToml: string;
	coverConditionsToml: string;
	baselineSensingToml: string;
	communicationToml: string;
	speechToml: string;
	tagValuesToml: string;
	playerCharacterIdentityToml: string;
	creatureIdentityToml: string;
	equipmentProficienciesToml: string;
	units: ChapterUnitSummary[];
}

export const HAS_BEHAVIOR = true;

export async function generatePlayingTheGame(target?: AuthorTarget): Promise<PlayingTheGameOutput> {
	// `conditions` runs BEFORE `attacks` in this list purely for readability
	// (attacks.ts's melee/ranged rows invoke the shared lethal-to-0-HP graph
	// conditions.ts authors, by id string only — no runtime ordering
	// dependency: each fragment builds against its OWN isolated throwaway
	// workspace, see verb-runner.ts's own header).
	const [
		abilities,
		d20Tests,
		skills,
		level,
		actionEconomy,
		armorClass,
		heroicInspiration,
		macros,
		actions,
		conditions,
		deathSaves,
		grid,
		attacks,
		weaponMasteryRiders,
		sneakAttack,
		dodge,
		dash,
		perceptionConditions,
		pickup,
		consume,
		dropProne,
		standUp,
		help,
		rest,
		hp,
		tempHp,
		genericCheckDc,
		tagValues,
		playerCharacterIdentity,
		creatureIdentity,
		equipmentProficiencies,
	] = await Promise.all([
		buildAbilitiesFragment(),
		buildD20ReaderFragment(),
		buildSkillsFragment(),
		buildLevelFragment(),
		buildActionEconomyFragment(),
		buildArmorClassFragment(),
		buildHeroicInspirationFragment(),
		buildMacrosFragment(),
		buildActionsFragment(target),
		buildConditionsFragment(target),
		buildDeathSavesFragment(target),
		buildGridFragment(target),
		// Attack rows are wholly generator-owned. Build them in a fresh workspace:
		// rendering against a prior target preserves stale write-only rows.
		buildAttacksFragment(),
		buildWeaponMasteryRidersFragment(),
		buildSneakAttackFragment(),
		buildDodgeFragment(target),
		buildDashFragment(target),
		buildPerceptionConditionsFragment(target),
		buildPickupFragment(target),
		buildConsumeFragment(target),
		buildDropProneFragment(target),
		buildStandUpFragment(target),
		buildHelpFragment(target),
		buildRestFragment(target),
		buildHpFragment(),
		buildTempHpFragment(),
		buildGenericCheckDcFragment(),
		buildTagValueVocabularyFragment(),
		buildPlayerCharacterIdentityFragment(),
		buildCreatureIdentityFragment(),
		buildEquipmentProficienciesFragment(),
	]);
	// Sequential, not `Promise.all`-batched with the rest: `driveUnitScene`
	// authors its rows against ONE shared throwaway workspace across many
	// calls (unlike every other fragment above, one call per throwaway
	// workspace) — no correctness requirement forces sequencing here, but
	// keeping this fragment's own async work isolated makes its (larger,
	// cross-referencing) call sequence easy to reason about in isolation.
	const genericCheckAffordances = await buildGenericCheckAffordancesFragment();
	const coverConditions = await buildCoverConditionsFragment();
	const baselineSensing = await buildBaselineSensingFragment();
	const communication = await buildBaselineCommunicationFragment();
	const speech = await buildSpeechFragment();
	const glossaryConditions = await buildGlossaryConditionsFragment(target);
	return {
		abilitiesToml: abilities.toml,
		d20TestsToml: d20Tests.toml,
		skillsToml: skills.toml,
		levelToml: level.toml,
		actionEconomyToml: actionEconomy.toml,
		armorClassToml: armorClass.toml,
		heroicInspirationToml: heroicInspiration.toml,
		macrosToml: macros.toml,
		actionsToml: actions.toml,
		conditionsToml: conditions.toml,
		glossaryConditionsToml: glossaryConditions.toml,
		deathSavesToml: deathSaves.toml,
		gridToml: grid.toml,
		attacksToml: attacks.toml,
		weaponMasteryRidersToml: weaponMasteryRiders.toml,
		sneakAttackToml: sneakAttack.toml,
		dodgeToml: dodge.toml,
		dashToml: dash.toml,
		perceptionConditionsToml: perceptionConditions.toml,
		pickupToml: pickup.toml,
		consumeToml: consume.toml,
		dropProneToml: dropProne.toml,
		standUpToml: standUp.toml,
		helpToml: help.toml,
		restToml: rest.toml,
		hpToml: hp.toml,
		tempHpToml: tempHp.toml,
		genericCheckDcToml: genericCheckDc.toml,
		genericCheckAffordancesToml: genericCheckAffordances.toml,
		coverConditionsToml: coverConditions.toml,
		baselineSensingToml: baselineSensing.toml,
		communicationToml: communication.toml,
		speechToml: speech.toml,
		tagValuesToml: tagValues.toml,
		playerCharacterIdentityToml: playerCharacterIdentity.toml,
		creatureIdentityToml: creatureIdentity.toml,
		equipmentProficienciesToml: equipmentProficiencies.toml,
		units: [
			...abilities.units,
			...skills.units,
			...level.units,
			...actionEconomy.units,
			...armorClass.units,
			...heroicInspiration.units,
			...macros.units,
			...actions.units,
			...conditions.units,
			...deathSaves.units,
			...grid.units,
			...attacks.units,
			...weaponMasteryRiders.units,
			...sneakAttack.units,
			...dodge.units,
			...dash.units,
			...perceptionConditions.units,
			...pickup.units,
			...consume.units,
			...dropProne.units,
			...standUp.units,
			...help.units,
			...rest.units,
			...hp.units,
			...tempHp.units,
			...genericCheckDc.units,
			...genericCheckAffordances.units,
			...coverConditions.units,
			...baselineSensing.units,
			...communication.units,
			...speech.units,
			...glossaryConditions.units,
			...tagValues.units,
			...playerCharacterIdentity.units,
			...creatureIdentity.units,
			...equipmentProficiencies.units,
		],
	};
}

/**
 * This chapter's own reader-prose fragment(s) — `ChapterEntry.generateReaderProse`
 * (`../index.ts`). Thin wrapper: the shared per-document render logic lives
 * in `renderReaderProseForDocuments` (`compendium-metadata.ts`).
 */
export function generatePlayingTheGameReaderProse(
	attachments: readonly ReaderSubjectAttachment[],
): Promise<ChapterReaderProseResult> {
	return renderReaderProseForDocuments(["playing-the-game"], attachments);
}
