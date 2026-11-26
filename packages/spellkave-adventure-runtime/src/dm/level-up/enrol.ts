// pattern: proactive-level-up
/**
 * Level-up trainee enrolment (generic). Moved-by-copy from the kavemouth
 * Aldwin seat's `enrollLevelUpCandidateThroughPlayerTool`: a direct,
 * server-authoritative PLAYER-tool attempt (ADR-0140). It has no outcome-graph
 * resolution, so success is the receipt's reducer outcome `accepted`.
 */

import type { RunEmitter } from "@spellkave/agent-observability";
import type { DriverToken } from "@spellkave/sdk";
import { type createPlayerFacingToolMap, invoke } from "@spellkave/session/player-tools";
import { LEVEL_UP_ENROLL_ACTION_ID } from "./ids";

export interface EnrollLevelUpTraineeConfig {
	/** The giver's `manipulate` player tool. */
	manipulate: ReturnType<typeof createPlayerFacingToolMap>["manipulate"];
	heroTargetRef: string;
	emitter: RunEmitter;
	/** Narrow test seam for deterministic timing tests. */
	override?: (driverToken?: DriverToken) => Promise<boolean>;
	driverToken?: DriverToken;
}

export async function enrollLevelUpTrainee(config: EnrollLevelUpTraineeConfig): Promise<boolean> {
	if (config.override !== undefined) return config.override(config.driverToken);
	const details = await invoke(
		config.manipulate,
		{
			target_id: config.heroTargetRef,
			action_id: LEVEL_UP_ENROLL_ACTION_ID,
			args_json: "{}",
		},
		config.emitter,
	);
	// This administrative action has no outcome-graph resolution. Its
	// authoritative success is the PLAYER receipt's reducer outcome
	// (`ActorManipulateResult.status === "success"` is rendered as
	// `receipt.outcome === "accepted"`).
	return (details as { receipt?: { outcome?: unknown } }).receipt?.outcome === "accepted";
}
