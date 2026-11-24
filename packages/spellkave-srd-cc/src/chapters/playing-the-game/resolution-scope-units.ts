// Open authored scopes used to route conditions on the rolling actor without
// teaching the kernel 5e vocabulary. `action_definitions.resolution_scope`
// and `modifier_templates.applies_to` meet on these ids; the server compares
// opaque strings only (finding #56).

import { BUNDLE_ID } from "./constants";

export const ABILITY_CHECK_RESOLUTION_SCOPE_ID = `${BUNDLE_ID}/ability_check`;
export const DEX_SAVE_RESOLUTION_SCOPE_ID = `${BUNDLE_ID}/dex_save`;
export const ATTACK_ROLL_RESOLUTION_SCOPE_ID = `${BUNDLE_ID}/attack_roll`;

export function resolutionScopeModifierTargetRow(scopeId: string): Record<string, unknown> {
	return {
		target_id: scopeId,
		shape: "Numeric",
		display_name: `Actor-side resolution scope: ${scopeId}`,
		bundle_id: BUNDLE_ID,
	};
}
