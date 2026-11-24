import type { VerbCall } from "../../../verb-runner";
import { initiativeRollExpr, TAKES_TURN_ELIGIBILITY_PRED } from "../../order-of-combat-units";
import {
	PROOF_ACTION_ECONOMY_SCHEDULER_ID,
	PROOF_ACTION_ECONOMY_SESSION_DEF_ID,
	PROOF_BUNDLE_ID,
	PROOF_COMBATANT_ALPHA_DEF_ID,
	PROOF_COMBATANT_ALPHA_DEF_LOCAL_ID,
	PROOF_COMBATANT_ALPHA_DEX,
	PROOF_COMBATANT_ALPHA_KEY_PREFIX,
	PROOF_COMBATANT_BETA_DEF_ID,
	PROOF_COMBATANT_BETA_DEF_LOCAL_ID,
	PROOF_COMBATANT_BETA_DEX,
	PROOF_COMBATANT_BETA_KEY_PREFIX,
	PROOF_DEX_STATE_ID,
	PROOF_INITIATIVE_DETERMINISTIC_SCHEDULER_ID,
	PROOF_INITIATIVE_DETERMINISTIC_SESSION_DEF_ID,
	PROOF_INITIATIVE_IDIOM_SCHEDULER_ID,
	PROOF_INITIATIVE_IDIOM_SESSION_DEF_ID,
	PROOF_PLACE_NODE_ID,
} from "..";

export const INITIATIVE_CALLS: readonly VerbCall[] = [
	{
		toolName: "spellkave_define_entity_type",
		label: "proof-combatant-alpha-def",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: PROOF_COMBATANT_ALPHA_DEF_LOCAL_ID,
			display_name: "Initiative Proof Combatant (Alpha, low Dex)",
			description:
				"TEST-ONLY session participant for the finding #26 Initiative live proof — " +
				"spawned FIRST (the lower entity_id) but seeded with a LOW srd/dex, so a " +
				"deterministic actor.stat('srd/dex') order_roll_source ranks it LAST — " +
				"deliberately the opposite pairing of spawn-order and Dex, so the assertion " +
				"actually falsifies a shared/unpopulated-facts regression (which would fall " +
				"back to the entity_id tiebreak and rank this one first instead).",
			initial_states: [{ state: PROOF_DEX_STATE_ID, value_int: PROOF_COMBATANT_ALPHA_DEX }],
		},
	},
	{
		toolName: "spellkave_define_entity_type",
		label: "proof-combatant-beta-def",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: PROOF_COMBATANT_BETA_DEF_LOCAL_ID,
			display_name: "Initiative Proof Combatant (Beta, high Dex)",
			description:
				"TEST-ONLY session participant for the finding #26 Initiative live proof — " +
				"spawned SECOND (the higher entity_id) and seeded with a HIGH srd/dex, so a " +
				"deterministic actor.stat('srd/dex') order_roll_source must rank it FIRST on " +
				"Dex alone — a regression that fell back to `rank_initiative`'s ascending-" +
				"entity_id tiebreak would rank Alpha first instead, diverging from this.",
			initial_states: [{ state: PROOF_DEX_STATE_ID, value_int: PROOF_COMBATANT_BETA_DEX }],
		},
	},
	{
		toolName: "spellkave_place_actor",
		label: "proof-combatant-alpha-placement",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "npc",
			entity_def: PROOF_COMBATANT_ALPHA_DEF_ID,
			at: PROOF_PLACE_NODE_ID,
			key_prefix: PROOF_COMBATANT_ALPHA_KEY_PREFIX,
			description: "TEST-ONLY spawned instance for the Initiative live proof (Alpha).",
		},
	},
	{
		toolName: "spellkave_place_actor",
		label: "proof-combatant-beta-placement",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "npc",
			entity_def: PROOF_COMBATANT_BETA_DEF_ID,
			at: PROOF_PLACE_NODE_ID,
			key_prefix: PROOF_COMBATANT_BETA_KEY_PREFIX,
			description: "TEST-ONLY spawned instance for the Initiative live proof (Beta).",
		},
	},
	{
		toolName: "spellkave_write_rows",
		label: "proof-initiative-schedulers",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "turn_scheduler",
			rows: [
				{
					active: false,
					bundle_id: PROOF_BUNDLE_ID,
					id: PROOF_ACTION_ECONOMY_SCHEDULER_ID,
					order_roll_source: "",
					scheduler_kind: "round_robin",
					description:
						"TEST-ONLY two-participant scheduler for proving that Dodge budget and " +
						"owner-relative expiry follow real combat-session turn rotation.",
				},
				{
					active: false,
					bundle_id: PROOF_BUNDLE_ID,
					id: PROOF_INITIATIVE_DETERMINISTIC_SCHEDULER_ID,
					order_roll_source: `actor.stat('${PROOF_DEX_STATE_ID}')`,
					scheduler_kind: "rolled_order",
					description:
						"TEST-ONLY finding #26 live proof: no dice — order_roll_source reads ONLY " +
						"the rolling participant's own srd/dex, so the resulting ordinal order is " +
						"fully deterministic in a single run.",
				},
				{
					active: false,
					bundle_id: PROOF_BUNDLE_ID,
					id: PROOF_INITIATIVE_IDIOM_SCHEDULER_ID,
					order_roll_source: initiativeRollExpr(`actor.effective('${PROOF_DEX_STATE_ID}')`),
					scheduler_kind: "rolled_order",
					description:
						"TEST-ONLY finding #26 live proof: the REAL SRD-faithful d20 + Dex-modifier " +
						"idiom this chapter ships (order-of-combat-units.ts's initiativeRollExpr), " +
						"wired for the first time — genuinely stochastic, only success + a valid " +
						"ordinal permutation is asserted (no draw provenance to recompute exact order).",
				},
			],
		},
	},
	{
		toolName: "spellkave_write_rows",
		label: "proof-initiative-sessions",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "session_definitions",
			rows: [
				{
					auto_join_on_targeting: false,
					bundle_id: PROOF_BUNDLE_ID,
					combat_grid_blueprint_id: "",
					grid_edge_affordance_bindings_json: "{}",
					grid_edge_affordance_template_id: "",
					initial_state: "",
					legal_moves_csv: "",
					on_terminate: "",
					participants_pred: "",
					round_duration_ms: 6_000,
					session_def_id: PROOF_ACTION_ECONOMY_SESSION_DEF_ID,
					stakes_required: "",
					termination_pred: "",
					turn_eligibility_pred: TAKES_TURN_ELIGIBILITY_PRED,
					turn_rule: "Sequential",
					turn_scheduler_id: PROOF_ACTION_ECONOMY_SCHEDULER_ID,
					visibility_policy: "Public",
					winner_predicate: "",
				},
				{
					auto_join_on_targeting: false,
					bundle_id: PROOF_BUNDLE_ID,
					combat_grid_blueprint_id: "",
					grid_edge_affordance_bindings_json: "{}",
					grid_edge_affordance_template_id: "",
					initial_state: "",
					legal_moves_csv: "",
					on_terminate: "",
					participants_pred: "",
					round_duration_ms: 6_000,
					session_def_id: PROOF_INITIATIVE_DETERMINISTIC_SESSION_DEF_ID,
					stakes_required: "",
					termination_pred: "",
					turn_eligibility_pred: TAKES_TURN_ELIGIBILITY_PRED,
					turn_rule: "",
					turn_scheduler_id: PROOF_INITIATIVE_DETERMINISTIC_SCHEDULER_ID,
					visibility_policy: "Public",
					winner_predicate: "",
				},
				{
					auto_join_on_targeting: false,
					bundle_id: PROOF_BUNDLE_ID,
					combat_grid_blueprint_id: "",
					grid_edge_affordance_bindings_json: "{}",
					grid_edge_affordance_template_id: "",
					initial_state: "",
					legal_moves_csv: "",
					on_terminate: "",
					participants_pred: "",
					round_duration_ms: 6_000,
					session_def_id: PROOF_INITIATIVE_IDIOM_SESSION_DEF_ID,
					stakes_required: "",
					termination_pred: "",
					turn_eligibility_pred: TAKES_TURN_ELIGIBILITY_PRED,
					turn_rule: "",
					turn_scheduler_id: PROOF_INITIATIVE_IDIOM_SCHEDULER_ID,
					visibility_policy: "Public",
					winner_predicate: "",
				},
			],
		},
	},
];
