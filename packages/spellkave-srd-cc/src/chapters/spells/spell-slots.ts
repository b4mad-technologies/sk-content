// Spells chapter, slice P1b — the shared "casting" axis: `srd/spell_slot_1`
// and `srd/spell_slot_2`, the ONLY two spell-slot levels this slice's curated
// spells need (P1b builds nothing past 2nd level — see `spell-behaviors.ts`'s
// own module header for the full curated list). Authored ONCE, in its own
// axis file (`base/spells/casting.toml`), never per-spell — matches this
// package's own resource-authoring convention for other actor-carried facts
// (`character-creation/advancement-units.ts`'s `srd/xp`/`srd/hp_per_level`,
// `classes/classes-units.ts`'s `srd/hit-die`).
//
// SLOT-COST GATE (concept read, read-only, from the sister package —
// `packages/spellkave-srd/src/author/author-spell-behavior.ts:379-396`'s own
// `cost: { pool: "srd/spell_slot_1", amount: 1 }` comment: "Adds the
// affordance gate `actor.stat('srd/spell_slot_1') >= 1`... + a trailing debit
// frame_write"). NOT copied — that file drives a `spellkave_define_behavior`
// cluster verb this package does not have; this module composes the SAME
// CONCEPT fresh, out of primitives this package already proves elsewhere:
// a plain `resource_definitions` row (this file) referenced by a plain
// `actor.stat(...) >= 1` boolean term folded into the spell's own
// `predicate_source` (`spell-behaviors.ts`), plus a trailing
// `ModifyResource` `-1` frame_write appended to the spell's own consequence
// (the SAME "additional accounting write appended after the main effect"
// idiom `weapon-attack-units.ts`'s `monsterDeathFrameWrite` and
// `fragments/rest.ts`'s Heroic-Inspiration grant both already use).
//
// SCOPE BOUNDARY (P1b vs P1c): this slice wires the GATE + DEBIT into each
// qualifying spell's own action definition only. It does NOT grant
// `srd/spell_slot_<n>` to any character identity, and does NOT prove live
// consumption end-to-end — that is task P1c (already tracked separately,
// `ledger/spells.md`'s own "live" axis stays pending until then). Recovery
// rule is `long_rest` (SRD: spell slots are regained on a Long Rest,
// `playing-the-game.md`'s own Long Rest section) — the SAME enum value
// `hp-units.ts`'s `HP_RECOVERY_RULE` already uses, not a new one. No cap on
// how many slots an actor can carry is enforced by class/level progression
// Per-class L1-4 absolute counts live as srd.spell_slot_grant metadata
// (spellcasting-substrate-units.ts / docs/spellcasting-substrate.md);
// `max_value` here is a SAFETY-BOUND CEILING (9), not a per-class derived
// number — same "ceiling, not a real per-creature maximum" posture
// `advancement-units.ts`'s own `srd/xp` `max_value` comment documents.
import { readResourceFlavor } from "../../flavor/read";
import { driveDefineWithSrdText, markdownHeadingBlock } from "../../text";
import type { ChapterUnitSummary } from "../chapter-types";
import { driveUnitFragment, type VerbCall } from "../verb-runner";
import { buildConcentrationFragment } from "./concentration";
import { BUNDLE_ID } from "./spell-units";

/** Caster-side spellcasting ability modifier (baked stat). Generic proof casters seed 3 so 8+PB(2)+3=13. */
export const SPELLCASTING_MOD_RESOURCE_CALL = {
	toolName: "spellkave_define_resource" as const,
	label: "resource:spellcasting_mod",
	params: {
		bundle: BUNDLE_ID,
		id: "spellcasting_mod",
		display_name: "Spellcasting Modifier",
		min_value: -5,
		max_value: 10,
		initial_value: 0,
		recovery_rule: "persistent",
		description: readResourceFlavor("spellcasting-mod").body,
	},
};

export const SPELL_SLOT_LEVELS = [1, 2] as const;
export type SpellSlotLevel = (typeof SPELL_SLOT_LEVELS)[number];

const SPELL_SLOT_MIN = 0;
const SPELL_SLOT_MAX = 9;
const SPELL_SLOT_INITIAL = 0;
const SPELL_SLOT_RECOVERY_RULE = "long_rest";

export function spellSlotResourceId(level: SpellSlotLevel): string {
	return `${BUNDLE_ID}/spell_slot_${level}`;
}

/** Exported: `spell-behaviors.ts` seeds this SAME call into each leveled spell's own throwaway workspace (so its `srd/spell_slot_N` gate/debit resolve, MF-VAL-217) and strips the row back out via `driveUnitScene`'s `omitRowKinds` — the resource is shipped exactly once, from `buildSpellCastingAxisFragment` below. */
export function spellSlotResourceCall(level: SpellSlotLevel): VerbCall {
	const id = `spell_slot_${level}`;
	return {
		toolName: "spellkave_define_resource",
		label: `resource:${id}`,
		params: {
			bundle: BUNDLE_ID,
			id,
			display_name: `Level ${level} Spell Slot`,
			min_value: SPELL_SLOT_MIN,
			max_value: SPELL_SLOT_MAX,
			initial_value: SPELL_SLOT_INITIAL,
			recovery_rule: SPELL_SLOT_RECOVERY_RULE,
			description: readResourceFlavor(`spell-slot-${level}`).body,
		},
	};
}

/** The gate term to fold into a leveled spell's own `predicate_source` (module header). Cantrips never call this — they cost no slot. */
export function spellSlotGateExpr(level: SpellSlotLevel): string {
	return `actor.stat('${spellSlotResourceId(level)}') >= 1`;
}

/** The trailing debit frame_write to append (LAST ordinal) to a leveled spell's own consequence `frame_writes` (module header). */
export function spellSlotDebitFrameWrite(level: SpellSlotLevel): Record<string, unknown> {
	return {
		ModifyResource: {
			actor: "Actor",
			resource: spellSlotResourceId(level),
			delta_source: "-1",
		},
	};
}

export async function buildSpellCastingAxisFragment(): Promise<{
	toml: string;
	summaries: ChapterUnitSummary[];
}> {
	const slotCalls = [
		...SPELL_SLOT_LEVELS.map((level) => spellSlotResourceCall(level)),
		SPELLCASTING_MOD_RESOURCE_CALL,
	];
	const [slotTomls, concentration] = await Promise.all([
		Promise.all(
			slotCalls.map((call, index) =>
				index === 0
					? driveDefineWithSrdText(BUNDLE_ID, call, {
							targetKind: "resource_definition",
							targetRef: spellSlotResourceId(1),
							extracted: markdownHeadingBlock("spells.md", "Spell Slots"),
						})
					: driveUnitFragment(BUNDLE_ID, call),
			),
		),
		// pattern: condition-hook-on-event — concentrating + break check
		buildConcentrationFragment(),
	]);
	const header = [
		"# GENERATED by src/chapters/spells/index.ts (spell-slots.ts) — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"# pattern: condition-hook-on-event",
		"#",
		"# Spells chapter casting axis: spell_slot_1/2, spellcasting_mod (L12d),",
		"# plus srd/condition/concentrating + concentration/check (sk-609b.12.2).",
		"# Gate/debit wiring lives per-spell — see spell-slots.ts header.",
		"",
		"",
	].join("\n");
	const summaries: ChapterUnitSummary[] = [
		...SPELL_SLOT_LEVELS.map((level) => ({
			kind: "resource_definitions" as const,
			id: spellSlotResourceId(level),
			sourcePk: "",
		})),
		{
			kind: "resource_definitions",
			id: `${BUNDLE_ID}/spellcasting_mod`,
			sourcePk: "",
		},
		...concentration.units,
	];
	return { toml: header + slotTomls.join("") + concentration.toml, summaries };
}
