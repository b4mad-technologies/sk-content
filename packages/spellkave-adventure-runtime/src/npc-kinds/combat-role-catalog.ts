/**
 * The combat-role catalog an adventure seals into its ordinary NPC kind
 * documents (`compileNpcKindDocuments`, `catalog.roles`,
 * `catalog.role_vocabulary`, `catalog.combat.reactions`). The Rust NPC host
 * reads these values from the documents; nothing here decides anything.
 *
 * Data and three pure tag helpers, no imports: this module is the input of a
 * sealed artifact, so it must stay loadable without any runtime package. Key order is part of the
 * sealed bytes; do not reorder fields.
 */

export const COMBAT_ROLES = [
	"skirmisher",
	"archer",
	"brute",
	"leader",
	"lurker",
	"undead-tide",
	"caster-boss",
	"healer",
] as const;

export type CombatRole = (typeof COMBAT_ROLES)[number];

export type CombatTargetPolicy =
	| "nearest"
	| "most-wounded"
	| "nearest-spellcaster"
	| "sticky-first";

export interface CombatRoleParams {
	role: CombatRole;
	targetPolicy: CombatTargetPolicy;
	/** Prefer staying at least this many cells from the primary foe (Chebyshev). */
	minRangeCells: number;
	/** Flee when hp/maxHp < fraction; `null` = never flee. */
	fleeHpFraction: number | null;
	/** Hold until a foe is within this many cells; `null` = never hold. */
	holdUntilCells: number | null;
	stayBehindMinions: boolean;
	neverSwitchTarget: boolean;
	preferRanged: boolean;
	/** Spend the signature action once per turn before other attacks. */
	signatureFirst: boolean;
	/** Heal an ally whose hp/maxHp is below this fraction; `null` = never. */
	healAllyBelowFraction: number | null;
}

/** Tag family the SRD generator emits as `srd.creature.role.<role>`. */
export const COMBAT_ROLE_TAG_PREFIX = "srd.creature.role";

/** The tag a creature definition carries for `role`. */
export function combatRoleTag(role: CombatRole): string {
	return `${COMBAT_ROLE_TAG_PREFIX}.${role}`;
}

export function isCombatRole(value: string): value is CombatRole {
	return (COMBAT_ROLES as readonly string[]).includes(value);
}

/** First well-formed combat-role tag in `tags`, or `null`. */
export function parseCombatRoleTag(tags: readonly string[]): CombatRole | null {
	const prefix = `${COMBAT_ROLE_TAG_PREFIX}.`;
	for (const tag of tags) {
		if (!tag.startsWith(prefix)) continue;
		const slug = tag.slice(prefix.length);
		if (isCombatRole(slug)) return slug;
	}
	return null;
}

export const COMBAT_ROLE_COMPOSITE_SUFFIX = "/multiattack";
export const COMBAT_ROLE_SPELLCASTER_FLAG = "spellcaster";
export const COMBAT_ROLE_FLANKING_ROLE = "skirmisher";
export const COMBAT_ROLE_DEFAULT_MELEE_REACH = 1;
export const COMBAT_ROLE_FLANK_BONUS = 0.5;
export const COMBAT_ROLE_ADJACENCY_CELLS = 1;
export const COMBAT_ROLE_DEFAULT_MOVE_BUDGET = 3;

const NO_HEAL = { healAllyBelowFraction: null as number | null };

const PRESETS: Record<CombatRole, Omit<CombatRoleParams, "role">> = {
	skirmisher: {
		targetPolicy: "most-wounded",
		minRangeCells: 0,
		fleeHpFraction: 0.25,
		holdUntilCells: null,
		stayBehindMinions: false,
		neverSwitchTarget: false,
		preferRanged: false,
		signatureFirst: false,
		...NO_HEAL,
	},
	archer: {
		targetPolicy: "nearest-spellcaster",
		minRangeCells: 3,
		fleeHpFraction: null,
		holdUntilCells: null,
		stayBehindMinions: false,
		neverSwitchTarget: false,
		preferRanged: true,
		signatureFirst: false,
		...NO_HEAL,
	},
	brute: {
		targetPolicy: "nearest",
		minRangeCells: 0,
		fleeHpFraction: null,
		holdUntilCells: null,
		stayBehindMinions: false,
		neverSwitchTarget: false,
		preferRanged: false,
		signatureFirst: false,
		...NO_HEAL,
	},
	leader: {
		targetPolicy: "nearest",
		minRangeCells: 0,
		fleeHpFraction: null,
		holdUntilCells: null,
		stayBehindMinions: true,
		neverSwitchTarget: false,
		preferRanged: false,
		signatureFirst: false,
		...NO_HEAL,
	},
	lurker: {
		targetPolicy: "nearest",
		minRangeCells: 0,
		fleeHpFraction: null,
		holdUntilCells: 2,
		stayBehindMinions: false,
		neverSwitchTarget: false,
		preferRanged: false,
		signatureFirst: false,
		...NO_HEAL,
	},
	"undead-tide": {
		targetPolicy: "sticky-first",
		minRangeCells: 0,
		fleeHpFraction: null,
		holdUntilCells: null,
		stayBehindMinions: false,
		neverSwitchTarget: true,
		preferRanged: false,
		signatureFirst: false,
		...NO_HEAL,
	},
	"caster-boss": {
		targetPolicy: "nearest",
		minRangeCells: 0,
		fleeHpFraction: null,
		holdUntilCells: null,
		stayBehindMinions: true,
		neverSwitchTarget: false,
		preferRanged: false,
		signatureFirst: true,
		...NO_HEAL,
	},
	/** Party support: heal the lowest ally below half HP, else attack nearest. */
	healer: {
		targetPolicy: "nearest",
		minRangeCells: 0,
		fleeHpFraction: null,
		holdUntilCells: null,
		stayBehindMinions: true,
		neverSwitchTarget: false,
		preferRanged: false,
		signatureFirst: false,
		healAllyBelowFraction: 0.5,
	},
};

/** A fresh copy of one role's parameters, `role` first. */
export function combatRoleParams(role: CombatRole): CombatRoleParams {
	return { role, ...PRESETS[role] };
}

/** Self-protective reactions that skip the faction gate (authored Shield). */
export const SRD_SUPPORTIVE_REACTION_ACTION_IDS: readonly string[] = [
	"core/shield",
	"srd/spell/shield",
	"srd/spell/shield/cast",
];

/** Authored opportunity-attack reactions. */
export const SRD_HARMFUL_REACTION_ACTION_IDS: readonly string[] = [
	"srd/attack/opportunity-attack",
	"core/opportunity_attack",
];

export const SRD_ATTACK_INFIX = "/attack/";
export const SRD_ATTACK_SUFFIX = "/attack";

/** A fresh copy of the SRD reaction vocabulary, in sealed key order. */
export function srdReactionVocabulary() {
	return {
		harmfulActionIds: [...SRD_HARMFUL_REACTION_ACTION_IDS],
		supportiveActionIds: [...SRD_SUPPORTIVE_REACTION_ACTION_IDS],
		attackInfix: SRD_ATTACK_INFIX,
		attackSuffix: SRD_ATTACK_SUFFIX,
	};
}
