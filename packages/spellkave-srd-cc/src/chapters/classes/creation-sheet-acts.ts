// pattern: derived-value-mechanism
// pattern: draft-then-confirm-wizard
/** One finite initializer per class; scores and species speed are committed first.
 * Rule anchors are the existing classCreationData/pregenConfirmInstanceStates
 * readers: cache/markdown/character-creation.md (L1 HP, AC and advancement).
 */
import type { AuthoredAct } from "@spellkave/adventure-runtime/author/dm/authored-act";
import { ABILITY_KEYS } from "@spellkave/adventure-runtime/dm/creation";
import { creationSheetValues } from "@spellkave/adventure-runtime/dm/creation/confirmation-plan";
import { classCreationData } from "@spellkave/adventure-runtime/dm/data";
import { SPEED_WALK_RESOURCE_ID } from "@spellkave/adventure-runtime/srd-ids";
import type { AuthorTarget } from "@spellkave/tool-authoring";

export function creationSheetInitializationActs(target: AuthorTarget): AuthoredAct[] {
	const separate = new Set([...ABILITY_KEYS.map((key) => `srd/${key}`), SPEED_WALK_RESOURCE_ID]);
	const modifier = (ability: string) =>
		`macro('srd/ability_modifier', target.stat('srd/${ability}'))`;
	return classCreationData().map((cls) => {
		const expressions = new Map(
			[...creationSheetValues(cls.slug, "human", cls.standardArray, { target })]
				.filter(([state]) => !separate.has(state))
				.map(([state, value]) => [state, String(value)]),
		);
		expressions.set("srd/hp", `${cls.level1HpBase} + ${modifier("con")}`);
		expressions.set(
			"srd/ac",
			`10 + ${modifier("dex")}${cls.unarmoredDefenseExtraAbility === null ? "" : ` + ${modifier(cls.unarmoredDefenseExtraAbility)}`}`,
		);
		return {
			id: `srd/dm/creation-sheet/${cls.slug}`,
			capability: "frontier.set_state",
			predicate: `target.has_tag('srd.class.${cls.slug}')`,
			writes: [...expressions].map(([resource, source]) => ({
				ModifyResource: {
					actor: "TargetActor",
					resource,
					delta_source: `(${source}) - target.stat('${resource}')`,
				},
			})),
		};
	});
}
