/**
 * // pattern: bundle-movement-default
 *
 * Compose graph slices into one adventure tool sequence.
 * Per-graph topology: region / hamlet / inn / tomb + storyline §3 graphs —
 * this file only orders define_bundle → graphs → backdrops → links → occupancy.
 */
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import type { AuthorTarget } from "@spellkave/tool-authoring";
import { advancementLimbo } from "./advancement-limbo.ts";
import { advancementTeleport } from "./advancement-teleport.ts";
import { backdrops } from "./backdrops.ts";
import { elvenMiniBundleHeaderCall } from "./bundle-header.ts";
import { companionAgreementActions, companionAgreementDefinitions } from "./companion-agreement.ts";
import {
	companionCommandActions,
	companionCommandDefinitions,
	companionSpokenCommandActions,
} from "./companion-commands.ts";
import { companionStoneActions, companionStoneDefinitions } from "./companion-stone.ts";
import { containmentPolicies } from "./containment-policies.ts";
import { candidateOccupancy, creationLimbo } from "./creation-candidate.ts";
import { cryptFight } from "./crypt-fight.ts";
import { cursed_crypt } from "./cursed-crypt.ts";
import { deep_tomb } from "./deep-tomb.ts";
import { adventureDmActs } from "./dm-acts.ts";
import { dmNpc } from "./dm-npc.ts";
import { dmThreshold } from "./dm-threshold.ts";
import { encounters } from "./encounters.ts";
import { forest_lodge } from "./forest-lodge.ts";
import { goblin_warren } from "./goblin-warren.ts";
import { hamlet } from "./hamlet.ts";
import { hobgoblin_camp } from "./hobgoblin-camp.ts";
import { induction } from "./induction.ts";
import { initiativeSetup } from "./initiative-setup.ts";
import { inn } from "./inn.ts";
import { STEP_EDGE_BINDINGS_JSON } from "./lib/edge-bindings.ts";
import { BUNDLE, STEP_AFFORDANCE_ID } from "./lib/ids.ts";
import { links } from "./links.ts";
import { loftChestOccupancy } from "./loft-chest.ts";
import { mill } from "./mill.ts";
import { mine } from "./mine.ts";
import { occupancy } from "./occupancy.ts";
import { operatorOffstage, operatorSeat } from "./operator.ts";
import { adventurePoi } from "./poi.ts";
import { poolHazard } from "./pool-hazard.ts";
import { q1Rats } from "./q1-rats.ts";
import { q3DeliveryActions, q3DeliveryDefinitions } from "./q3-delivery.ts";
import { questMilestoneActions, questMilestoneDefinitions } from "./quest-milestones.ts";
import { questProgressActions, questProgressDefinitions } from "./quest-progress.ts";
import { questPromptDefinitions, questPromptLabels } from "./quest-prompts.ts";
import { region } from "./region.ts";
import { respawn } from "./respawn.ts";
import { river_crossing } from "./river-crossing.ts";
import { authoredRogueCompanion } from "./rogue-companion.ts";
import { shrine } from "./shrine.ts";
import { storylineNpcs } from "./storyline-npcs.ts";
import { swamp } from "./swamp.ts";
import { tomb } from "./tomb.ts";
import { tombKeyActions, tombKeyDefinitions } from "./tomb-key.ts";
import { traces } from "./traces.ts";
import { village } from "./village.ts";
import { wardenSeal } from "./warden-seal.ts";
import { well } from "./well.ts";

export { elvenMiniBundleHeaderCall } from "./bundle-header.ts";

/** Full adventure sequence for driveManifestScene. */
export function buildAdventure(target?: AuthorTarget): VerbCall[] {
	const r = region();
	const h = hamlet();
	const i = inn();
	const t = tomb();
	const v = village();
	const rc = river_crossing();
	const m = mill();
	const w = well();
	const gw = goblin_warren();
	const fl = forest_lodge();
	const hc = hobgoblin_camp();
	const s = swamp();
	const mi = mine();
	const sh = shrine();
	const cc = cursed_crypt();
	const dt = deep_tomb();

	const calls: VerbCall[] = [
		elvenMiniBundleHeaderCall(),
		...questProgressDefinitions(),
		...companionAgreementDefinitions(),
		...companionStoneDefinitions(),
		...companionCommandDefinitions(),
		...tombKeyDefinitions(),
		...q3DeliveryDefinitions(),
		...questMilestoneDefinitions(),
		// ADR-0101 (task 6.2): the ONE bundle-scoped movement default that lets
		// every graph edge (and the cross-graph links.ts portals) walk with ZERO
		// per-edge srd/affordance/step rows.
		{
			toolName: "spellkave_set_movement_default",
			label: "movement-default-step",
			params: {
				bundle: BUNDLE,
				affordance_template_id: STEP_AFFORDANCE_ID,
				bindings_json: STEP_EDGE_BINDINGS_JSON,
			},
		},
		...r.calls,
		...h.calls,
		...i.calls,
		...t.calls,
		...v.calls,
		...rc.calls,
		...m.calls,
		...w.calls,
		...gw.calls,
		...fl.calls,
		...hc.calls,
		...s.calls,
		...mi.calls,
		...sh.calls,
		...cc.calls,
		...dt.calls,
		...poolHazard(),
		...backdrops(),
		...links(),
		...occupancy(),
		// Needs INNKEEPER_ENTITY_KEY already placed above — its own
		// spellkave_stow_item calls need an already-placed actor
		// (loft-chest.ts's own ordering note).
		...loftChestOccupancy(),
		...encounters(),
		...q1Rats(),
		...storylineNpcs(),
		...traces(),
		...creationLimbo(),
		...advancementLimbo(),
		...operatorOffstage(),
		...cryptFight(),
		...dmNpc(),
		...authoredRogueCompanion(target),
		...questProgressActions(),
		// ADR-0142 D-1: `prompt_definitions.response_action_ids` names
		// `dm/dialog/choice/N`, a DEPENDENCY bundle's action — resolves via
		// `packages/spellkave-tool-authoring`'s narrowed `action_definitions`
		// reference-closure augmentation (sk-jay0.2.33.15.7).
		...questPromptDefinitions(),
		...questPromptLabels(),
		...companionAgreementActions(),
		...companionStoneActions(),
		...companionCommandActions(),
		// Second affordance per verb onto the same action rows (sk-jay0.1.23.35.3);
		// the actions above must already exist.
		...companionSpokenCommandActions(),

		// After every root graph exists (region + limbos) so extent_ref resolves.
		...operatorSeat(),
		...induction(),
		...respawn(),
		...advancementTeleport(),
		...dmThreshold(),
		...wardenSeal(),
		...tombKeyActions(),
		...q3DeliveryActions(),
		...questMilestoneActions(),
		// All initial capability/state vocabulary exists before the unplaced blueprint.
		...candidateOccupancy(target),
		...adventureDmActs(),
		...adventurePoi(),
		...containmentPolicies(),
	];
	return [...calls, ...initiativeSetup(calls)];
}
