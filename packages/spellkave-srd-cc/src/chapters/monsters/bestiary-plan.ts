// pattern: none — bestiary plan manifest structure
// Bestiary CR 0–4 attack PLAN (lane L7 / `bead sk-609b.2 (design trail)`).
// Pure classification over the open5e cache — no verb calls. Consumed by
// `starter-behaviors.ts` (baked multi-ordinals) and `monsters/index.ts`
// (natural-weapon + manufactured equipment seeds).
//
// Rules are cited from cache, never remembered:
//   - Creature set: `cache/open5e/Creature.json` where
//     Number(challenge_rating) <= 4 (218 rows).
//   - Structured attacks: `CreatureActionAttack.json` (damage_type coalesce
//     with extra_damage_type — `open5e/creature.ts` header).
//   - Desc-only gaps: action.desc "Melee Attack Roll: …" prose (Giant Rat
//     class; `giantRatBiteFallback` remains the narrow starter parser).
import {
	type CreatureActionAttackRecord,
	type CreatureActionRecord,
	type CreatureRecord,
	creatureActionAttackByParent,
	creatureActionsByParent,
	readCreatures,
} from "../../open5e/creature";
import { buildWeaponUnits } from "../equipment/weapon-units";
import { expectedProficiencyBonus } from "../playing-the-game/modifier-units";

export const CR0_4_MAX = 4;

/** open5e Creature pk prefix. */
const CREATURE_PK_PREFIX = "srd-2024_";

export type BestiaryShape =
	| "single-melee"
	| "single-ranged"
	| "multiattack"
	| "breath-aoe"
	| "spellcasting"
	| "no-attack"
	| "unparsed";

/** One resolved attack line ready for either the archetype or baked-ordinal route. */
export interface PlannedAttack {
	attackSlug: string;
	displayName: string;
	toHitMod: number;
	/** Bare dice, e.g. `1d6`, or empty when damage is a flat integer only. */
	diceExpr: string;
	damageBonus: number;
	/** Flat damage with no die (tiny CR 0 beasts: "1 Piercing damage."). */
	flatDamage: number | null;
	damageType: string;
	melee: boolean;
	/** Feet; set for ranged attacks that need `srd/attack_range_mm`. */
	rangeFeet: number | null;
	sourcePk: string;
	/** True when open5e carried a genuine second damage component we drop. */
	droppedExtraDamage: boolean;
	/** True when action.desc mentions a save/condition rider. */
	hasRider: boolean;
	/** Condition definition ids applied on hit (e.g. srd/condition/prone, srd/condition/poisoned). */
	conditionRiders: string[];
}

export type AbilityMode = "str" | "dex" | "finesse";

export interface PlannedBreathOrAoe {
	actionSlug: string;
	displayName: string;
	saveAbility: "dexterity" | "constitution" | "strength" | "wisdom" | "intelligence" | "charisma";
	saveDc: number;
	areaShape:
		| { kind: "line"; lengthFeet: number; widthFeet: number }
		| { kind: "cone"; rangeFeet: number; halfAngleDeg: number }
		| { kind: "sphere"; radiusFeet: number };
	diceExpr: string;
	damageType: string;
	halfOnSave: boolean;
	sourcePk: string;
}

export type MechanizationRoute =
	/** Shared srd/attack/melee|ranged + equipped manufactured weapon. */
	| "archetype-manufactured"
	/** Shared archetype + generated natural-weapon item. */
	| "archetype-natural"
	/** Bespoke multi-ordinal (or single baked ordinal) action verb. */
	| "baked-ordinals";

export interface MechanizedBestiaryPlan {
	kind: "mechanized";
	slug: string;
	creaturePk: string;
	shape: BestiaryShape;
	route: MechanizationRoute;
	/** Attacks composing the baked multi-ordinal action (length ≥ 1). Empty on pure archetype routes. */
	bakedAttacks: PlannedAttack[];
	/** Breath / AoE save actions belonging to this creature. */
	breaths: PlannedBreathOrAoe[];
	/** True when creature carries a Spellcasting / Innate Spellcasting action row. */
	hasSpellcasting: boolean;
	/** Single attack that drives equipment / natural-weapon seeding on archetype routes. */
	equippedAttack: PlannedAttack | null;
	/** `srd/weapon/<slug>` when route is archetype-manufactured. */
	manufacturedWeaponEntityId: string | null;
	/** Natural-weapon local slug (`<creature>-<attack>`) when route needs one. */
	naturalWeaponSlug: string | null;
	abilityMode: AbilityMode | null;
	notes: string[];
}

export interface NaBestiaryPlan {
	kind: "n/a";
	slug: string;
	creaturePk: string;
	shape: BestiaryShape;
	reason: string;
}

export type BestiaryPlan = MechanizedBestiaryPlan | NaBestiaryPlan;

function abilityModifier(score: number): number {
	return Math.floor((score - 10) / 2);
}

function slugFromCreaturePk(pk: string): string {
	if (!pk.startsWith(CREATURE_PK_PREFIX)) {
		throw new Error(`bestiary-plan: pk '${pk}' missing '${CREATURE_PK_PREFIX}' prefix.`);
	}
	return pk.slice(CREATURE_PK_PREFIX.length);
}

function attackSlugFromActionName(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function coalescedDamageType(attack: CreatureActionAttackRecord): string {
	const type = attack.damageType ?? attack.extraDamageType;
	if (type === null) {
		throw new Error(`bestiary-plan: attack '${attack.pk}' has no damage type.`);
	}
	return type.toLowerCase();
}

function hasRiderText(desc: string): boolean {
	return /saving throw|DC\s*\d+|grappled|poisoned|restrained|prone condition|the target has the/i.test(
		desc,
	);
}

function isBreathOrAoe(action: CreatureActionRecord): boolean {
	return (
		/breath|spray|cloud|aura|line\.|each creature in/i.test(action.name + " " + action.desc) &&
		/saving throw/i.test(action.desc)
	);
}

function isSpellcasting(action: CreatureActionRecord): boolean {
	return /^spellcasting$/i.test(action.name.trim()) || /innate spellcasting/i.test(action.name);
}

/** Manufactured weapon catalog keyed by lowercased display name. */
function manufacturedWeaponByName(): Map<string, string> {
	const map = new Map<string, string>();
	for (const unit of buildWeaponUnits()) {
		map.set(unit.displayName.toLowerCase(), unit.entityId);
	}
	return map;
}

/** First baked/statblock attack whose display name is a catalog weapon. */
function manufacturedWeaponIdFromAttacks(
	attacks: readonly PlannedAttack[],
	manufactured: Map<string, string>,
): { attack: PlannedAttack; entityId: string } | null {
	for (const attack of attacks) {
		const entityId = manufactured.get(attack.displayName.toLowerCase());
		if (entityId !== undefined) return { attack, entityId };
	}
	return null;
}

export function parseRiderConditions(desc: string): string[] {
	const conditions: string[] = [];
	if (/has the prone condition|falls prone|knocked prone/i.test(desc)) {
		conditions.push("srd/condition/prone");
	}
	if (/has the poisoned condition|is poisoned|poisoned for/i.test(desc)) {
		conditions.push("srd/condition/poisoned");
	}
	if (/target is grappled|has the grappled condition|is grappled/i.test(desc)) {
		conditions.push("srd/condition/grappled");
	}
	if (/has the paralyzed condition|is paralyzed/i.test(desc)) {
		conditions.push("srd/condition/paralyzed");
	}
	return conditions;
}

export function parseBreathOrAoe(action: CreatureActionRecord): PlannedBreathOrAoe | null {
	const desc = action.desc.trim();
	const saveMatch =
		/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+Saving\s+Throw:\s*DC\s*(\d+)/i.exec(
			desc,
		);
	if (!saveMatch) return null;
	const saveAbility = saveMatch[1]!.toLowerCase() as PlannedBreathOrAoe["saveAbility"];
	const saveDc = Number.parseInt(saveMatch[2]!, 10);

	let areaShape: PlannedBreathOrAoe["areaShape"] | null = null;
	const lineMatch = /(\d+)-foot(?:-long)?(?:,\s*(\d+)-foot-wide)?\s*Line/i.exec(desc);
	if (lineMatch) {
		areaShape = {
			kind: "line",
			lengthFeet: Number.parseInt(lineMatch[1]!, 10),
			widthFeet: Number.parseInt(lineMatch[2] ?? "5", 10),
		};
	}
	const coneMatch = /(\d+)-foot\s*Cone/i.exec(desc);
	if (!areaShape && coneMatch) {
		areaShape = {
			kind: "cone",
			rangeFeet: Number.parseInt(coneMatch[1]!, 10),
			halfAngleDeg: 26.5,
		};
	}
	const sphereMatch = /(\d+)-foot(?:-radius)?\s*(?:Sphere|Emanation)/i.exec(desc);
	if (!areaShape && sphereMatch) {
		areaShape = {
			kind: "sphere",
			radiusFeet: Number.parseInt(sphereMatch[1]!, 10),
		};
	}
	if (!areaShape) return null;

	const dmgMatch =
		/Failure:\s*(?:\d+\s*)?(?:\((\d+d\d+(?:\s*\+\s*\d+)?)\)|\d+)\s*(\w+)\s*damage/i.exec(desc);
	if (!dmgMatch) return null;
	const half = /Success:\s*Half damage/i.test(desc);

	return {
		actionSlug: attackSlugFromActionName(action.name),
		displayName: action.name,
		saveAbility,
		saveDc,
		areaShape,
		diceExpr: dmgMatch[1]!,
		damageType: dmgMatch[2]!.toLowerCase(),
		halfOnSave: half,
		sourcePk: action.pk,
	};
}

function plannedFromStructured(
	action: CreatureActionRecord,
	attack: CreatureActionAttackRecord,
): PlannedAttack | null {
	if (attack.toHitMod === null) return null;
	const damageBonus = attack.damageBonus ?? 0;
	const droppedExtraDamage =
		attack.extraDamageDieCount !== null ||
		(attack.extraDamageBonus !== null && attack.extraDamageBonus !== 0);
	// Thrown weapons often carry both reach and range — treat as melee when the
	// action is primarily reach-tagged without a pure ranged identity, but prefer
	// range when range is set and we are picking manufactured bows/crossbows.
	const melee = attack.range === null;
	const conditionRiders = parseRiderConditions(action.desc);
	const hasDice =
		attack.damageDieCount !== null && attack.damageDieCount > 0 && attack.damageDieType !== null;
	if (!hasDice) {
		// Flat damage rows (Octopus Tentacles: die_count 0, bonus 1).
		const flat = damageBonus > 0 ? damageBonus : null;
		if (flat === null) return null;
		return {
			attackSlug: attackSlugFromActionName(action.name),
			displayName: action.name,
			toHitMod: attack.toHitMod,
			diceExpr: "",
			damageBonus: 0,
			flatDamage: flat,
			damageType: coalescedDamageType(attack),
			melee,
			rangeFeet: attack.range,
			sourcePk: attack.pk,
			droppedExtraDamage,
			hasRider: hasRiderText(action.desc),
			conditionRiders,
		};
	}
	return {
		attackSlug: attackSlugFromActionName(action.name),
		displayName: action.name,
		toHitMod: attack.toHitMod,
		diceExpr: `${attack.damageDieCount}d${attack.damageDieType!.replace(/^D/i, "")}`,
		damageBonus,
		flatDamage: null,
		damageType: coalescedDamageType(attack),
		melee,
		rangeFeet: attack.range,
		sourcePk: attack.pk,
		droppedExtraDamage,
		hasRider: hasRiderText(action.desc),
		conditionRiders,
	};
}

/**
 * Parse a simple attack-roll sentence from action.desc when open5e dropped the
 * structured attack row (Giant Rat class) or never emitted one for tiny beasts.
 * Loud-narrow: only the common SRD 5.2 phrasing families.
 */
export function parseAttackDesc(action: CreatureActionRecord): PlannedAttack | null {
	const desc = action.desc.trim();
	const conditionRiders = parseRiderConditions(desc);
	// Optional "to hit" and parenthetical advantage notes after the modifier.
	const hitPrefix =
		"(?:Melee(?: or Ranged)?|Ranged(?: or Melee)?) Attack Roll:\\s*\\+(\\d+)(?:\\s*to hit)?\\s*(?:\\([^)]*\\))?,?";
	// Dice form: "Melee Attack Roll: +5, reach 5 ft. 7 (1d8 + 3) Piercing damage…"
	const diceMelee = new RegExp(
		`${hitPrefix}\\s*reach\\s*(\\d+)\\s*(?:ft\\.|feet)(?:\\s*or\\s*range\\s*\\d+/\\d+\\s*(?:ft\\.|feet))?\\.?\\s*(?:\\d+\\s*)?\\((\\d+)d(\\d+)(?:\\s*\\+\\s*(\\d+))?\\)\\s*(\\w+)\\s*damage`,
		"i",
	).exec(desc);
	if (diceMelee) {
		const [, toHit, , diceCount, dieSides, bonus, damageType] = diceMelee;
		return {
			attackSlug: attackSlugFromActionName(action.name),
			displayName: action.name,
			toHitMod: Number.parseInt(toHit ?? "0", 10),
			diceExpr: `${diceCount}d${dieSides}`,
			damageBonus: Number.parseInt(bonus ?? "0", 10),
			flatDamage: null,
			damageType: (damageType ?? "bludgeoning").toLowerCase(),
			melee: true,
			rangeFeet: null,
			sourcePk: action.pk,
			droppedExtraDamage: /\bplus\b/i.test(desc),
			hasRider: hasRiderText(desc),
			conditionRiders,
		};
	}
	// Flat form: "Melee Attack Roll: +2, reach 5 ft. 1 Piercing damage."
	// Also "+4 to hit, reach 5 ft. 1 Piercing damage." (Bat).
	const flatMelee = new RegExp(
		`${hitPrefix}\\s*reach\\s*(\\d+)\\s*(?:ft\\.|feet)\\.?\\s*(\\d+)\\s*(\\w+)\\s*damage`,
		"i",
	).exec(desc);
	if (flatMelee) {
		const [, toHit, , flat, damageType] = flatMelee;
		return {
			attackSlug: attackSlugFromActionName(action.name),
			displayName: action.name,
			toHitMod: Number.parseInt(toHit ?? "0", 10),
			diceExpr: "",
			damageBonus: 0,
			flatDamage: Number.parseInt(flat ?? "0", 10),
			damageType: (damageType ?? "bludgeoning").toLowerCase(),
			melee: true,
			rangeFeet: null,
			sourcePk: action.pk,
			droppedExtraDamage: /\bplus\b/i.test(desc),
			hasRider: hasRiderText(desc),
			conditionRiders,
		};
	}
	const diceRanged = new RegExp(
		`${hitPrefix}\\s*range\\s*(\\d+)/(\\d+)\\s*(?:ft\\.|feet)\\.?\\s*(?:\\d+\\s*)?\\((\\d+)d(\\d+)(?:\\s*\\+\\s*(\\d+))?\\)\\s*(\\w+)\\s*damage`,
		"i",
	).exec(desc);
	if (diceRanged) {
		const [, toHit, range, , diceCount, dieSides, bonus, damageType] = diceRanged;
		return {
			attackSlug: attackSlugFromActionName(action.name),
			displayName: action.name,
			toHitMod: Number.parseInt(toHit ?? "0", 10),
			diceExpr: `${diceCount}d${dieSides}`,
			damageBonus: Number.parseInt(bonus ?? "0", 10),
			flatDamage: null,
			damageType: (damageType ?? "bludgeoning").toLowerCase(),
			melee: false,
			rangeFeet: Number.parseInt(range ?? "0", 10),
			sourcePk: action.pk,
			droppedExtraDamage: /\bplus\b/i.test(desc),
			hasRider: hasRiderText(desc),
			conditionRiders,
		};
	}
	return null;
}

function deriveAbilityMode(creature: CreatureRecord, attack: PlannedAttack): AbilityMode | null {
	if (attack.flatDamage !== null) return null;
	const str = abilityModifier(creature.strength);
	const dex = abilityModifier(creature.dexterity);
	const pb = expectedProficiencyBonus(Number(creature.challengeRating));
	const fin = Math.max(str, dex);
	const strOk = str + pb === attack.toHitMod && str === attack.damageBonus;
	const dexOk = dex + pb === attack.toHitMod && dex === attack.damageBonus;
	const finOk = fin + pb === attack.toHitMod && fin === attack.damageBonus;
	if (attack.melee) {
		if (strOk && (!dexOk || str === dex)) return "str";
		if (finOk && !strOk) return "finesse";
		if (dexOk && !strOk) return "finesse";
		if (strOk) return "str";
		return null;
	}
	// Ranged natural: non-finesse ranged reads DEX.
	if (dexOk) return "dex";
	if (finOk) return "finesse";
	return null;
}

function findActionByAttackName(
	actions: readonly CreatureActionRecord[],
	name: string,
): CreatureActionRecord | undefined {
	const needle = name.trim().toLowerCase();
	return actions.find((action) => action.name.trim().toLowerCase() === needle);
}

function resolveNamedAttack(
	actions: readonly CreatureActionRecord[],
	name: string,
): PlannedAttack | null {
	const action = findActionByAttackName(actions, name);
	if (action === undefined) return null;
	const structured = creatureActionAttackByParent(action.pk);
	if (structured !== undefined) return plannedFromStructured(action, structured);
	return parseAttackDesc(action);
}

/**
 * Parse Multiattack.desc into an ordered list of attack names (with repetition).
 * Returns null when the prose is not one of the supported families.
 */
export function parseMultiattackNames(desc: string): string[] | null {
	const d = desc.trim();
	// Order matters: try "A or B" / "using A or B" BEFORE the plain "two X attacks"
	// family, otherwise "two Javelin or Morningstar attacks" collapses wrongly.
	let m =
		/makes two attacks,? using ([A-Za-z][A-Za-z '/-]*?) (?:and|or) ([A-Za-z][A-Za-z '/-]*?) in any combination/i.exec(
			d,
		);
	if (m?.[1] && m[2]) return [m[1], m[1]]; // simplified: two of the first
	m =
		/makes three attacks,? using ([A-Za-z][A-Za-z '/-]*?) or ([A-Za-z][A-Za-z '/-]*?) in any combination/i.exec(
			d,
		);
	if (m?.[1]) return [m[1], m[1], m[1]];
	m = /makes two ([A-Za-z][A-Za-z '/-]*?) or ([A-Za-z][A-Za-z '/-]*?) attacks/i.exec(d);
	if (m?.[1] && m[2]) return [m[1], m[1]];
	m = /makes one ([A-Za-z][A-Za-z '/-]*?) attack and one ([A-Za-z][A-Za-z '/-]*?) attack/i.exec(d);
	if (m?.[1] && m[2]) return [m[1], m[2]];
	// "two Claw attacks and one Sting attack"
	m = /makes two ([A-Za-z][A-Za-z '/-]*?) attacks and one ([A-Za-z][A-Za-z '/-]*?) attack/i.exec(d);
	if (m?.[1] && m[2]) return [m[1], m[1], m[2]];
	m = /makes one ([A-Za-z][A-Za-z '/-]*?) or ([A-Za-z][A-Za-z '/-]*?) attack/i.exec(d);
	if (m?.[1]) return [m[1]];
	m = /makes one ([A-Za-z][A-Za-z '/-]*?) attack and uses /i.exec(d);
	if (m?.[1]) return [m[1]];
	m = /makes two ([A-Za-z][A-Za-z '/-]*?) attacks\.?$/i.exec(d);
	if (m?.[1]) return [m[1], m[1]];
	m = /makes three ([A-Za-z][A-Za-z '/-]*?) attacks\.?$/i.exec(d);
	if (m?.[1]) return [m[1], m[1], m[1]];
	// "two X attacks and uses Y" / "two X attacks. It can replace…" — take the two X.
	m = /makes two ([A-Za-z][A-Za-z '/-]*?) attacks\b/i.exec(d);
	if (m?.[1]) return [m[1], m[1]];
	return null;
}

function pickPrimarySingleAttack(
	weaponActions: readonly { action: CreatureActionRecord; planned: PlannedAttack }[],
	manufactured: Map<string, string>,
): { action: CreatureActionRecord; planned: PlannedAttack } {
	if (weaponActions.length === 0) {
		throw new Error("bestiary-plan: pickPrimarySingleAttack on empty list.");
	}
	// Prefer manufactured ranged (starter goblin/skeleton/bandit stability), then
	// any manufactured, then any ranged, then first.
	const scored = weaponActions.map((entry, index) => {
		const name = entry.action.name.toLowerCase();
		const isMfg = manufactured.has(name);
		const ranged = !entry.planned.melee;
		let score = 0;
		if (isMfg && ranged) score += 40;
		else if (isMfg) score += 30;
		else if (ranged) score += 10;
		score += (weaponActions.length - index) * 0.01;
		return { entry, score };
	});
	scored.sort((a, b) => b.score - a.score);
	const first = scored[0];
	if (first === undefined) {
		throw new Error("bestiary-plan: pickPrimarySingleAttack sort produced empty.");
	}
	return first.entry;
}

function planOne(creature: CreatureRecord, manufactured: Map<string, string>): BestiaryPlan {
	const slug = slugFromCreaturePk(creature.pk);
	const actions = creatureActionsByParent(creature.pk).filter(
		(action) => action.actionType === "ACTION",
	);
	const notes: string[] = [];

	if (actions.length === 0) {
		return {
			kind: "n/a",
			slug,
			creaturePk: creature.pk,
			shape: "no-attack",
			reason: "no ACTION rows in CreatureAction.json",
		};
	}

	const breathActions = actions
		.filter(isBreathOrAoe)
		.map(parseBreathOrAoe)
		.filter((b): b is PlannedBreathOrAoe => b !== null);

	const hasSpellcasting = actions.some(isSpellcasting);

	const multi = actions.find((action) => action.name.trim().toLowerCase() === "multiattack");
	if (multi !== undefined) {
		const names = parseMultiattackNames(multi.desc);
		if (names === null) {
			// Fall through: try any structured weapon attack as a single.
			const fallback = actions
				.map((action) => {
					const attack = creatureActionAttackByParent(action.pk);
					return attack === undefined
						? null
						: { action, planned: plannedFromStructured(action, attack) };
				})
				.filter(
					(entry): entry is { action: CreatureActionRecord; planned: PlannedAttack } =>
						entry !== null && entry.planned !== null,
				);
			if (fallback.length === 0) {
				return {
					kind: "n/a",
					slug,
					creaturePk: creature.pk,
					shape: "multiattack",
					reason: `Multiattack desc not in supported families: "${multi.desc}"`,
				};
			}
			notes.push(`multiattack-unparsed-fallback-single: ${multi.desc}`);
			const primary = pickPrimarySingleAttack(fallback, manufactured);
			return planArchetypeOrBaked(
				creature,
				slug,
				primary.planned,
				manufactured,
				notes,
				"single-melee",
				breathActions,
				hasSpellcasting,
			);
		}
		const baked: PlannedAttack[] = [];
		for (const name of names) {
			const planned = resolveNamedAttack(actions, name);
			if (planned === null) {
				return {
					kind: "n/a",
					slug,
					creaturePk: creature.pk,
					shape: "multiattack",
					reason: `Multiattack names ${JSON.stringify(names)} — could not resolve '${name}'`,
				};
			}
			if (planned.droppedExtraDamage) {
				notes.push(`dropped-extra-damage-on-${planned.attackSlug}`);
			}
			if (planned.hasRider && (!planned.conditionRiders || planned.conditionRiders.length === 0)) {
				notes.push(`rider-unencoded-on-${planned.attackSlug}`);
			}
			baked.push(planned);
		}
		const manufacturedSeed = manufacturedWeaponIdFromAttacks(baked, manufactured);
		return {
			kind: "mechanized",
			slug,
			creaturePk: creature.pk,
			shape: "multiattack",
			route: "baked-ordinals",
			bakedAttacks: baked,
			breaths: breathActions,
			hasSpellcasting,
			equippedAttack: manufacturedSeed?.attack ?? null,
			manufacturedWeaponEntityId: manufacturedSeed?.entityId ?? null,
			naturalWeaponSlug: null,
			abilityMode: null,
			notes,
		};
	}

	// Breath-only or spellcasting-only creatures with no weapon attack.
	const weaponish = actions
		.map((action) => {
			const attack = creatureActionAttackByParent(action.pk);
			if (attack !== undefined) {
				const planned = plannedFromStructured(action, attack);
				return planned === null ? null : { action, planned };
			}
			const fromDesc = parseAttackDesc(action);
			return fromDesc === null ? null : { action, planned: fromDesc };
		})
		.filter(
			(entry): entry is { action: CreatureActionRecord; planned: PlannedAttack } => entry !== null,
		);

	if (weaponish.length === 0) {
		if (breathActions.length > 0) {
			return {
				kind: "mechanized",
				slug,
				creaturePk: creature.pk,
				shape: "breath-aoe",
				route: "baked-ordinals",
				bakedAttacks: [],
				breaths: breathActions,
				hasSpellcasting,
				equippedAttack: null,
				manufacturedWeaponEntityId: null,
				naturalWeaponSlug: null,
				abilityMode: null,
				notes,
			};
		}
		if (hasSpellcasting) {
			return {
				kind: "mechanized",
				slug,
				creaturePk: creature.pk,
				shape: "spellcasting",
				route: "baked-ordinals",
				bakedAttacks: [],
				breaths: breathActions,
				hasSpellcasting: true,
				equippedAttack: null,
				manufacturedWeaponEntityId: null,
				naturalWeaponSlug: null,
				abilityMode: null,
				notes,
			};
		}
		return {
			kind: "n/a",
			slug,
			creaturePk: creature.pk,
			shape: "unparsed",
			reason: `no structured or desc-parseable weapon attack among: ${actions.map((a) => a.name).join(", ")}`,
		};
	}

	const primary = pickPrimarySingleAttack(weaponish, manufactured);
	const shape: BestiaryShape = primary.planned.melee ? "single-melee" : "single-ranged";
	if (primary.planned.droppedExtraDamage) {
		notes.push(`dropped-extra-damage-on-${primary.planned.attackSlug}`);
	}
	if (
		primary.planned.hasRider &&
		(!primary.planned.conditionRiders || primary.planned.conditionRiders.length === 0)
	) {
		notes.push(`rider-unencoded-on-${primary.planned.attackSlug}`);
	}
	return planArchetypeOrBaked(
		creature,
		slug,
		primary.planned,
		manufactured,
		notes,
		shape,
		breathActions,
		hasSpellcasting,
	);
}

function planArchetypeOrBaked(
	creature: CreatureRecord,
	slug: string,
	planned: PlannedAttack,
	manufactured: Map<string, string>,
	notes: string[],
	shape: BestiaryShape,
	breaths: PlannedBreathOrAoe[] = [],
	hasSpellcasting: boolean = false,
): MechanizedBestiaryPlan {
	const mfgId = manufactured.get(planned.displayName.toLowerCase());
	if (mfgId !== undefined) {
		return {
			kind: "mechanized",
			slug,
			creaturePk: creature.pk,
			shape,
			route: "archetype-manufactured",
			bakedAttacks: [],
			breaths,
			hasSpellcasting,
			equippedAttack: planned,
			manufacturedWeaponEntityId: mfgId,
			naturalWeaponSlug: null,
			abilityMode: planned.melee ? "str" : "dex",
			notes,
		};
	}

	const mode = deriveAbilityMode(creature, planned);
	if (mode !== null && planned.flatDamage === null && planned.diceExpr !== "") {
		return {
			kind: "mechanized",
			slug,
			creaturePk: creature.pk,
			shape,
			route: "archetype-natural",
			bakedAttacks: [],
			breaths,
			hasSpellcasting,
			equippedAttack: planned,
			manufacturedWeaponEntityId: null,
			naturalWeaponSlug: `${slug}-${planned.attackSlug}`,
			abilityMode: mode,
			notes,
		};
	}

	// Baked single ordinal — flat damage or ability-math mismatch.
	notes.push(mode === null ? "ability-math-mismatch-baked" : "flat-damage-baked");
	return {
		kind: "mechanized",
		slug,
		creaturePk: creature.pk,
		shape,
		route: "baked-ordinals",
		bakedAttacks: [planned],
		breaths,
		hasSpellcasting,
		equippedAttack: null,
		manufacturedWeaponEntityId: null,
		naturalWeaponSlug: null,
		abilityMode: null,
		notes,
	};
}

/** Main-hand equipment seed for any CR — does not emit baked ordinals. */
export interface CreatureEquipmentSeed {
	slug: string;
	manufacturedWeaponEntityId: string | null;
	naturalWeaponSlug: string | null;
	equippedAttack: PlannedAttack;
	abilityMode: AbilityMode | null;
	/** Set when the stat block's damage bonus is no ability modifier of this
	 * creature (Specter Life Drain "2d6", Strength 1): the item then carries
	 * the block's own bonus instead of an ability read. */
	literalDamageBonus: number | null;
}

/** Fallback for an attack whose to-hit and damage bonus match no single
 * ability. The to-hit ability is the one whose modifier plus proficiency
 * equals the stat block's to-hit, when one does (the attack archetype reads
 * max(STR, DEX) for a Finesse item); otherwise the reach default. The damage
 * bonus is the block's literal whenever that ability would not reproduce it. */
function fallbackAbilityMode(
	creature: CreatureRecord,
	attack: PlannedAttack,
): { mode: AbilityMode; literalDamageBonus: number | null } {
	const str = abilityModifier(creature.strength);
	const dex = abilityModifier(creature.dexterity);
	const pb = expectedProficiencyBonus(Number(creature.challengeRating));
	const reachDefault: AbilityMode = attack.melee ? "str" : "dex";
	const reachMod = attack.melee ? str : dex;
	const mode: AbilityMode =
		reachMod + pb !== attack.toHitMod && Math.max(str, dex) + pb === attack.toHitMod
			? "finesse"
			: reachDefault;
	const modeMod = mode === "finesse" ? Math.max(str, dex) : reachMod;
	return { mode, literalDamageBonus: modeMod === attack.damageBonus ? null : attack.damageBonus };
}

function collectWeaponishActions(
	creaturePk: string,
): { action: CreatureActionRecord; planned: PlannedAttack }[] {
	const actions = creatureActionsByParent(creaturePk).filter(
		(action) => action.actionType === "ACTION",
	);
	return actions
		.map((action) => {
			const attack = creatureActionAttackByParent(action.pk);
			if (attack !== undefined) {
				const planned = plannedFromStructured(action, attack);
				return planned === null ? null : { action, planned };
			}
			const fromDesc = parseAttackDesc(action);
			return fromDesc === null ? null : { action, planned: fromDesc };
		})
		.filter(
			(entry): entry is { action: CreatureActionRecord; planned: PlannedAttack } => entry !== null,
		);
}

function equipmentSeedOne(
	creature: CreatureRecord,
	manufactured: Map<string, string>,
): CreatureEquipmentSeed | null {
	const slug = slugFromCreaturePk(creature.pk);
	const weaponish = collectWeaponishActions(creature.pk);
	if (weaponish.length === 0) return null;
	const primary = pickPrimarySingleAttack(weaponish, manufactured);
	const mfgId = manufactured.get(primary.planned.displayName.toLowerCase());
	if (mfgId !== undefined) {
		return {
			slug,
			manufacturedWeaponEntityId: mfgId,
			naturalWeaponSlug: null,
			equippedAttack: primary.planned,
			abilityMode: primary.planned.melee ? "str" : "dex",
			literalDamageBonus: null,
		};
	}
	if (primary.planned.flatDamage !== null || primary.planned.diceExpr === "") return null;
	const derived = deriveAbilityMode(creature, primary.planned);
	const fallback = derived === null ? fallbackAbilityMode(creature, primary.planned) : null;
	return {
		slug,
		manufacturedWeaponEntityId: null,
		naturalWeaponSlug: `${slug}-${primary.planned.attackSlug}`,
		equippedAttack: primary.planned,
		abilityMode: derived ?? fallback?.mode ?? null,
		literalDamageBonus: fallback?.literalDamageBonus ?? null,
	};
}

/** Archetype equipment for every creature that has a parseable weapon attack. */
export function buildEquipmentSeeds(): CreatureEquipmentSeed[] {
	const manufactured = manufacturedWeaponByName();
	const seeds: CreatureEquipmentSeed[] = [];
	for (const creature of readCreatures()) {
		const seed = equipmentSeedOne(creature, manufactured);
		if (seed !== null) seeds.push(seed);
	}
	return seeds.sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Every CR 0–4 creature plan, stable slug order. */
export function buildBestiaryPlans(): BestiaryPlan[] {
	const manufactured = manufacturedWeaponByName();
	const creatures = readCreatures().filter(
		(creature) => Number(creature.challengeRating) <= CR0_4_MAX,
	);
	return creatures
		.map((creature) => planOne(creature, manufactured))
		.sort((a, b) => a.slug.localeCompare(b.slug));
}

export function cr04CreatureCount(): number {
	return readCreatures().filter((creature) => Number(creature.challengeRating) <= CR0_4_MAX).length;
}

/** Starter slugs that must keep their pre-L7 routes (byte-stability contract). */
export const STARTER_SLUGS = [
	"goblin-warrior",
	"wolf",
	"skeleton",
	"giant-rat",
	"zombie",
	"bandit",
	"black-bear",
	"brown-bear",
] as const;

export type StarterSlug = (typeof STARTER_SLUGS)[number];
