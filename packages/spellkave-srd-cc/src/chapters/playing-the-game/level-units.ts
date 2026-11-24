// DOC-IMPL: derived-values#what-feeds-it-pc-level-vs-monster-cr
// Character Level (playing-the-game.md § Proficiency): the `srd/level`
// resource the Proficiency Bonus macro (`srd/proficiency_bonus`) reads. Ledger
// row: `ledger/playing-the-game.md`
// "Proficiency intro + Proficiency Bonus table" — its own addendum ("srd/level
// arrives with its own unit") is closed by this module.
//
// PROVENANCE DECISION (source honestly, record the call): this chapter's own
// text INTRODUCES the concept without DEFINING it — § Proficiency's own lead
// paragraph (`cache/markdown/playing-the-game.md`, "## Proficiency"): "A
// character's Proficiency Bonus increases as the character gains levels
// (described in 'Character Creation')." Level as a first-class stat (how a
// character gains one, what advancement grants alongside it) is genuinely
// Character Creation's material, out of THIS chapter's scope — the same
// "definitional, ties to other chapter's data" framing the ledger already
// uses for Saving Throw Proficiencies. Shipping the row HERE anyway (rather
// than blocking on a Character Creation chapter that doesn't exist yet) is
// deliberate: `srd/proficiency_bonus`'s own consumer contract (`d20TestExpr`,
// `attackRollExpr`) already takes a `proficiencyLevelExpr` DSL subexpression,
// and every live proof of that idiom to date has read a PROOF-LOCAL `level`
// resource stand-in specifically because the real one didn't exist —
// `proof-scene.ts`'s own header: "the shipped srd/level id arrives with its
// own chapter unit later". This module is that unit; the identity row itself
// (id, display name, bounds) is fully groundable from THIS chapter's own
// table + the sister precedent below, even though the fuller advancement
// mechanic (how a character actually gains levels) stays out of scope.
//
// SISTER PRECEDENT (AGENTS.md "question, never copy" — grounded, then
// diverged where this package's own scope differs):
// `world-fixtures/srd/base/advancement.toml` already ships `srd/level`:
// `resource_definitions` row, `value_kind = "int"`, `initial_value = 1`,
// `min_value = 1`, `max_value = 20`, `recovery_rule = "persistent"`, tags
// `["core", "advancement"]`. Bounds ADOPTED verbatim — 1..20 is the real SRD
// character-level domain (distinct from `modifier-units.ts`'s OWN
// `MIN_LEVEL_OR_CR`/`MAX_LEVEL_OR_CR` = 0..30, which is the wider PROFICIENCY
// BONUS TABLE's domain, covering monster Challenge Rating too — 0 and 21..30
// are CR-only bands a player character's own `srd/level` stat never occupies,
// per this chapter's own text: "A monster's Proficiency Bonus is based on its
// Challenge Rating" — a SEPARATE derivation this chapter does not model as
// its own resource). The `"advancement"` tag is DROPPED here: this chapter's
// job is Proficiency's own reader, not the advancement mechanic the sister's
// tag signals ownership of (that mechanic — how srd/level actually
// increments — is out of THIS chapter's scope, same "identity authored,
// mechanic deferred" split the abilities/skills units already use). The
// `"core"` tag is also dropped, matching this package's existing divergence
// from the sister's ability-score rows (`index.ts`'s own header note: no
// consumer anywhere queries a "core" tag on a resource, and this bundle ships
// `depends_on = []` so "core" would misleadingly suggest the core bundle).

import { readFileSync } from "node:fs";
import path from "node:path";
import { CACHE_MARKDOWN_DIR } from "../../markdown/paths";

export const LEVEL_ID = "level";
export const LEVEL_DISPLAY_NAME = "Character Level";
export const MIN_CHARACTER_LEVEL = 1;
export const MAX_CHARACTER_LEVEL = 20;
export const INITIAL_CHARACTER_LEVEL = 1;

const PROVENANCE_SENTENCE =
	"A character's Proficiency Bonus increases as the character gains levels " +
	'(described in "Character Creation").';

/**
 * Confirm the sourcing sentence is still present, verbatim, in the cached
 * chapter markdown's § Proficiency lead paragraph — a loud-fail guard so a
 * fork re-sync that rewords the line is caught here rather than silently
 * leaving this unit's own provenance claim un-grounded.
 */
export function assertLevelProvenanceSource(): void {
	const markdown = readFileSync(path.join(CACHE_MARKDOWN_DIR, "playing-the-game.md"), "utf8");
	if (!markdown.includes(PROVENANCE_SENTENCE)) {
		throw new Error(
			`level-units: expected § Proficiency sourcing sentence '${PROVENANCE_SENTENCE}' not found ` +
				"in cached playing-the-game.md — the section may have been reworded.",
		);
	}
}
