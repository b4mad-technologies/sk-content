/** Menu presentation travels in the authored act's directed speech trace. */
import type { ActStep } from "../lib/act-port.ts";
import { DIALOG_SLOT_COUNT } from "./ids.ts";

export const DIALOGUE_PROMPT_NAMESPACE = "dialogue.prompt";

/** One atomic consequence inscribes this question and opens its fixed response slots. */
export function dialogMenuAct(
	targetId: string,
	question: string,
	labels: readonly string[],
	definitionRefs?: readonly (string | null)[],
): ActStep {
	if (labels.length < 1 || labels.length > DIALOG_SLOT_COUNT)
		throw new Error("A dialogue menu requires 1..16 labels.");
	if (labels.some((label) => [...label].length > 120))
		throw new Error("A dialogue menu label exceeds 120 characters.");
	if (definitionRefs !== undefined && definitionRefs.length !== labels.length)
		throw new Error("Dialogue definition refs must parallel labels.");
	return {
		targetId,
		actionId: `dm/dialog/ask-menu/${labels.length}`,
		args: {
			dispatch_text: question,
			dispatch_options: [...labels],
			...(definitionRefs === undefined ? {} : { dispatch_option_refs: [...definitionRefs] }),
		},
	};
}
