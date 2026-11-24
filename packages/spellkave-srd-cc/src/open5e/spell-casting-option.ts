// Typed reader for `cache/open5e/SpellCastingOption.json` — per-slot-level
// overrides (damage dice, target counts) for higher-level casting.
// Consumer: spells/spell-behaviors.ts upcast fan-out (L12d / sk-609b.12.4).
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_OPEN5E_DIR } from "./paths";

interface RawOptionRow {
	fields: {
		concentration: boolean | null;
		damage_roll: string | null;
		desc: string | null;
		duration: string | null;
		parent: string;
		range: number | null;
		shape_size: number | null;
		target_count: number | null;
		type: string;
	};
	model: string;
	pk: number;
}

export interface SpellCastingOption {
	/** Parent spell pk, e.g. `srd-2024_cure-wounds`. */
	parentPk: string;
	/** Slot level this override applies when the spell is cast in a slot of this level. */
	slotLevel: number;
	/** Damage/heal dice override when present (e.g. `4d8`). */
	damageRoll: string | null;
	/** Target/instance count override when present (e.g. Magic Missile darts). */
	targetCount: number | null;
}

function slotLevelFromType(type: string): number | undefined {
	const match = /^slot_level_(\d+)$/.exec(type);
	if (match === null) return undefined;
	return Number.parseInt(match[1]!, 10);
}

function assertShape(row: unknown, index: number): asserts row is RawOptionRow {
	const candidate = row as Partial<RawOptionRow> | null;
	if (
		candidate === null ||
		typeof candidate !== "object" ||
		typeof candidate.pk !== "number" ||
		typeof candidate.model !== "string" ||
		typeof candidate.fields !== "object" ||
		candidate.fields === null ||
		typeof candidate.fields.parent !== "string" ||
		typeof candidate.fields.type !== "string"
	) {
		throw new Error(
			`spell-casting-option: malformed record at index ${index} in SpellCastingOption.json — ` +
				`got ${JSON.stringify(row)}.`,
		);
	}
}

let cached: readonly SpellCastingOption[] | undefined;

export function readSpellCastingOptions(): readonly SpellCastingOption[] {
	if (cached !== undefined) return cached;
	const raw = JSON.parse(
		readFileSync(path.join(CACHE_OPEN5E_DIR, "SpellCastingOption.json"), "utf8"),
	) as unknown[];
	const out: SpellCastingOption[] = [];
	raw.forEach((row, index) => {
		assertShape(row, index);
		const slotLevel = slotLevelFromType(row.fields.type);
		if (slotLevel === undefined) return;
		out.push({
			parentPk: row.fields.parent,
			slotLevel,
			damageRoll: row.fields.damage_roll,
			targetCount: row.fields.target_count,
		});
	});
	cached = out;
	return out;
}

/** Overrides for one parent spell, keyed by slot level. */
export function castingOptionsBySlot(parentPk: string): Map<number, SpellCastingOption> {
	const map = new Map<number, SpellCastingOption>();
	for (const option of readSpellCastingOptions()) {
		if (option.parentPk === parentPk) map.set(option.slotLevel, option);
	}
	return map;
}
