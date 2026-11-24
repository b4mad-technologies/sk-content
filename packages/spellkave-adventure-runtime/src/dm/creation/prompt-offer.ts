import {
	creationPresentationText,
	CREATION_PRESENTATION_VOCABULARY as vocabulary,
} from "./presentation-vocabulary";
/** Pure creation-menu presentation; the authored act captures it in one frame. */

import { dialogMenuAct } from "../dialog/prompt-offer.ts";
import type { ActStep } from "../lib/act-port.ts";
import { type CreationSpeechLines, DEFAULT_CREATION_SPEECH_LINES } from "./lines.ts";
import type { CreationOffer } from "./steps.ts";

type CreationOfferPresentation = Pick<
	CreationOffer,
	"kind" | "labels" | "key" | "picksRemaining" | "definitionRefs"
>;

/** The captured question retains every description. Long descriptions use
 * numbered answer labels in the same slot order, within the dispatch wire's
 * Unicode character bound; the brain still decodes the original ordered picks. */
export function creationMenuAnswerLabels(menu: Pick<CreationOffer, "labels">): string[] {
	return menu.labels.some((label) => [...label].length > 120)
		? menu.labels.map((_label, index) =>
				creationPresentationText(vocabulary.templates.answer_option, { index: index + 1 }),
			)
		: [...menu.labels];
}

export function creationMenuQuestion(
	menu: CreationOfferPresentation,
	lines: CreationSpeechLines = DEFAULT_CREATION_SPEECH_LINES,
): string {
	const question = lines.slotMenuOffer(menu.kind, menu.labels);
	return menu.picksRemaining === undefined
		? question
		: question +
				creationPresentationText(
					menu.picksRemaining === 1
						? vocabulary.templates.remaining_one
						: vocabulary.templates.remaining_many,
					{ remaining: menu.picksRemaining },
				);
}

export function creationPromptAct(targetId: string, menu: CreationOfferPresentation): ActStep {
	return dialogMenuAct(
		targetId,
		creationMenuQuestion(menu),
		creationMenuAnswerLabels(menu),
		menu.definitionRefs,
	);
}
