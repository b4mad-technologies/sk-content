/**
 * // pattern: role-driven-brain
 *
 * Combat-role assignment for CR 0–4 creatures (lane L11 / sk-609b.11).
 *
 * Emits `srd.creature.role.<role>` on each creature definition. Selection is
 * generator-owned: storyline slug overrides (`elven-mini-storyline.md` §6)
 * first, else heuristics from the bestiary plan's attack shape + creature
 * type/size. Never hand-edit fixtures.
 *
 * Binding: `@spellkave/adventure-runtime/npc-kinds` `combatRoleTag` / `parseCombatRoleTag`.
 */
import {
	COMBAT_ROLE_TAG_PREFIX,
	COMBAT_ROLES,
	type CombatRole,
	combatRoleTag,
} from "@spellkave/adventure-runtime/npc-kinds";

import type { CreatureRecord } from "../../open5e/creature";
import {
	type BestiaryPlan,
	buildBestiaryPlans,
	type MechanizedBestiaryPlan,
} from "./bestiary-plan";

/** Storyline §6 slug overrides — cited roles for named encounter stock. */
const STORYLINE_ROLE_BY_SLUG: Readonly<Record<string, CombatRole>> = {
	// skirmisher pack
	wolf: "skirmisher",
	worg: "skirmisher",
	"giant-rat": "skirmisher",
	"goblin-minion": "skirmisher",
	// archer / ranged stock
	"goblin-warrior": "archer",
	"hobgoblin-warrior": "archer",
	bandit: "archer",
	// brute
	"ogre-zombie": "brute",
	owlbear: "brute",
	bugbear: "brute",
	"black-bear": "brute",
	"brown-bear": "brute",
	// undead-tide
	skeleton: "undead-tide",
	zombie: "undead-tide",
	// lurker
	"giant-spider": "lurker",
	shadow: "lurker",
	stirge: "lurker",
	// leaders / caster-bosses (named story stock when present in CR 0–4)
	"cult-fanatic": "leader",
	"goblin-boss": "leader",
	"hobgoblin-captain": "leader",
	mage: "caster-boss",
	"priest-acolyte": "caster-boss",
};

let cachedPlans: Map<string, BestiaryPlan> | null = null;

function planBySlug(): Map<string, BestiaryPlan> {
	if (cachedPlans === null) {
		cachedPlans = new Map(buildBestiaryPlans().map((plan) => [plan.slug, plan]));
	}
	return cachedPlans;
}

/**
 * Heuristic when no storyline override exists. Reasons are action-shape /
 * type / size — never display-name vibes.
 */
export function inferCombatRole(
	slug: string,
	record: CreatureRecord,
	plan: BestiaryPlan | undefined,
): CombatRole {
	const override = STORYLINE_ROLE_BY_SLUG[slug];
	if (override !== undefined) return override;

	const type = record.type.toLowerCase();
	if (type === "undead") return "undead-tide";

	if (plan?.kind === "mechanized") {
		const mech = plan as MechanizedBestiaryPlan;
		if (mech.shape === "spellcasting") return "caster-boss";
		if (mech.shape === "single-ranged") return "archer";
		if (mech.shape === "multiattack") {
			const size = record.size.toLowerCase();
			if (size === "large" || size === "huge" || size === "gargantuan") return "brute";
			return "skirmisher";
		}
		if (mech.shape === "single-melee") {
			const size = record.size.toLowerCase();
			if (size === "large" || size === "huge" || size === "gargantuan") return "brute";
			// Small/medium solitary melee predators default to skirmisher pack AI.
			return "skirmisher";
		}
	}

	// n/a or unparsed — documentary default; brains still selectable by tag.
	return "skirmisher";
}

/** Role tag for one creature slug + record. */
export function combatRoleForCreature(slug: string, record: CreatureRecord): CombatRole {
	const plan = planBySlug().get(slug);
	return inferCombatRole(slug, record, plan);
}

/** Tag string `srd.creature.role.<role>` for a creature. */
export function creatureRoleTag(slug: string, record: CreatureRecord): string {
	return combatRoleTag(combatRoleForCreature(slug, record));
}

/** tag_value_definitions rows for the role family (class + storyline + healer). */
export function buildCreatureRoleTagValueUnits(): Array<{
	tag: string;
	prefix: string;
	description: string;
	sourcePk: string;
}> {
	const classRow = {
		tag: COMBAT_ROLE_TAG_PREFIX,
		prefix: "srd",
		description:
			"Identifies a creature entity definition's combat-role brain " +
			"(`@spellkave/adventure-runtime/npc-kinds` combat-role presets; elven-mini-storyline.md §6). " +
			"Documentary + seat-factory selection; no DSL predicate reads this family today.",
		sourcePk: "",
	};
	const values = COMBAT_ROLES.map((role) => ({
		tag: combatRoleTag(role),
		prefix: COMBAT_ROLE_TAG_PREFIX,
		description: `Selects the content-free '${role}' combat-role brain for this creature definition.`,
		sourcePk: "",
	}));
	return [classRow, ...values];
}

/** Stable map slug → role for offline assertions (regenerates plan once). */
export function buildCreatureRoleIndex(
	records: readonly { slug: string; record: CreatureRecord }[],
): Map<string, CombatRole> {
	const plans = planBySlug();
	const out = new Map<string, CombatRole>();
	for (const { slug, record } of records) {
		out.set(slug, inferCombatRole(slug, record, plans.get(slug)));
	}
	return out;
}

/** Exported for tests / diagnostics. */
export function roleAssignmentNotes(slug: string, record: CreatureRecord): string {
	const role = combatRoleForCreature(slug, record);
	return `${slug} → ${role} (CR ${record.challengeRating}, type ${record.type}, size ${record.size})`;
}
