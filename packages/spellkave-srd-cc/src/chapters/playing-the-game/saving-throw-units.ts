// Saving Throws (playing-the-game.md § D20 Tests > Saving Throws): mostly
// definitional per the ledger's own note — "DC for saves is largely
// determined by the *effect* causing them (spells, monster abilities)". This
// unit authors two things: (a) the Saving Throw Examples provenance table
// (which ability resists which kind of threat), and (b) the save-shaped
// consequence idiom — a save that succeeds HALVES an effect (the sister's
// `srd/attack/spell_save` shape, `world-fixtures/srd/base/attack-spell.toml`:
// `cond(d20 >= DC, half, full)`) — as a reusable builder, since the "half on
// success" pattern recurs across every save-for-half spell/breath weapon a
// later chapter will author. Ledger row: "Saving Throws"
// (`ledger/playing-the-game.md`).
//
// WHAT THIS UNIT AUTHORS VS DEFERS: the save CHECK itself (roll + ability
// modifier + optional proficiency bonus >= DC) is not a new idiom — it is
// `d20-units.ts`'s `d20TestExpr`, applied with the DC supplied by whichever
// effect causes the save (a spell, a monster action, a hazard), per the
// section's own text. This unit does NOT own or author any DC — that stays
// with the effect-owning chapter, exactly like the core procedure's own DC
// parameter. What genuinely belongs here is the save-HALVES consequence
// SHAPE, because it composes a d20TestExpr-shaped save check with a damage
// expression in one idiom, and every future save-for-half effect should
// compose it rather than retype the `cond(...)` wrapper (AGENTS.md "one
// authoring engine" / finding #18's own centralization posture).
//
// SOURCE: `cache/open5e/Rule.json`, pk `srd-2024_d20-tests_saving-throw` —
// the Saving Throw Examples table parses cleanly as a plain markdown pipe
// table (same shape as the Ability Check Examples table, ability-checks-units.ts).
import { ruleByPk } from "../../open5e/rule";

export const SAVING_THROW_RULE_PK = "srd-2024_d20-tests_saving-throw";

/** One row of the Saving Throw Examples table (§ D20 Tests > Saving Throws). */
export interface SavingThrowExample {
	ability: string;
	makeASaveTo: string;
}

/**
 * Parse the Saving Throw Examples table (Ability | Make a Save To …). Throws
 * loudly on any shape surprise — same posture as every other table parser in
 * this chapter.
 */
export function parseSavingThrowExamples(desc: string): SavingThrowExample[] {
	const lines = desc.split("\n").map((line) => line.trim());
	const headerIndex = lines.findIndex((line) => /^\|Ability\|Make a Save To/.test(line));
	if (headerIndex === -1) {
		throw new Error(
			`saving-throw-units: Saving Throw Examples header not found in rule '${SAVING_THROW_RULE_PK}'.`,
		);
	}
	const separatorLine = lines[headerIndex + 1];
	if (separatorLine === undefined || !/^\|-+\|-+\|$/.test(separatorLine)) {
		throw new Error("saving-throw-units: no '|---|---|' separator after the Examples header.");
	}
	const rows: SavingThrowExample[] = [];
	for (let index = headerIndex + 2; index < lines.length; index += 1) {
		const line = lines[index];
		if (line === undefined || !/^\|[^|]+\|[^|]+\|$/.test(line)) {
			break;
		}
		const [ability, makeASaveTo] = line
			.slice(1, -1)
			.split("|")
			.map((cell) => cell.trim());
		if (ability === undefined || makeASaveTo === undefined) {
			throw new Error(`saving-throw-units: malformed Examples row '${line}'.`);
		}
		rows.push({ ability, makeASaveTo });
	}
	if (rows.length === 0) {
		throw new Error("saving-throw-units: no Saving Throw Examples rows parsed.");
	}
	return rows;
}

/** The parsed Saving Throw Examples table, read from the committed cache. */
export function savingThrowExamples(): SavingThrowExample[] {
	return parseSavingThrowExamples(ruleByPk(SAVING_THROW_RULE_PK).desc);
}

/**
 * Build the save-halves consequence expression:
 * `cond(<saveCheckExpr>, (<damageExpr>) / 2, <damageExpr>)`
 * — success (the save check, typically a `d20TestExpr` from d20-units.ts)
 * halves `damageExpr`; failure applies it in full. Pinned to the sister's own
 * shape (`attack-spell.toml`'s `srd/attack/spell_save/hit` frame_write:
 * `cond(d20 >= 13, 0 - (roll_table(...) / 2), 0 - roll_table(...))`) MINUS
 * the sign-negation and the roll_table wrapper — those are the CALLER's own
 * concern (a `ModifyResource` frame_write negates for damage; a non-damage
 * save-for-half effect might not), so this builder returns the bare
 * conditional value, composed further by whoever writes the frame_write.
 */
export function saveHalvesExpr(saveCheckExpr: string, damageExpr: string): string {
	return `cond(${saveCheckExpr}, (${damageExpr}) / 2, ${damageExpr})`;
}

// SAVING THROW PROFICIENCIES (playing-the-game.md § Proficiency > Saving
// Throw Proficiencies, ledger row "Saving Throw Proficiencies"): "Proficiency
// in a saving throw lets a character add their Proficiency Bonus to saves
// that use a particular ability... Each class gives proficiency in at least
// two saving throws" — DEFINITIONAL, per the ledger's own framing: WHICH
// saves a creature is proficient in comes from class data, out of this
// chapter's scope (the exact same "definitional, ties to class data" posture
// the ledger already uses for this row).
//
// PATTERN-LEVEL DELIVERABLE ONLY, DELIBERATELY NO NEW FUNCTION: the
// proficient-save shape is STRUCTURALLY IDENTICAL to `skill-proficiency-
// units.ts`'s `skillCheckExpr` — both are `d20TestExpr` with
// `proficiencyCapabilityId` set (`d20-units.ts`'s `D20TestOptions` field),
// the only difference being WHICH capability id a caller passes (a
// `srd/skill/<slug>` identity capability for a skill check, a save-
// proficiency capability of a shape this chapter does not itself define for
// a save). Since the two shapes share one idiom byte-for-byte, adding a
// second, differently-named wrapper function here would be exactly the kind
// of retyped-not-composed duplication this chapter's own "ONE idiom source"
// philosophy forbids (modifier-units.ts's module header, finding
// #18) — `d20TestExpr({ scoreExpr, proficiencyLevelExpr, proficiencyCapabilityId, dc })`
// IS the deliverable for a proficient save, exactly as it is for a
// proficient skill check; this comment is the pattern's documented home.
// No fixture content is forced: this chapter authors no class-derived
// save-proficiency capability ids (out of scope, per this row's own text),
// so there is nothing concrete to compose the pattern against yet.
