// Actions identity list (playing-the-game.md § Actions: the 12 named
// actions — Attack, Dash, Disengage, Dodge, Help, Hide, Influence, Magic,
// Ready, Search, Study, Utilize). Ledger row: `ledger/playing-the-game.md`
// "Actions table + intro". Sourced ENTIRELY from the cached chapter
// markdown's own "Actions" table (`../../markdown/playing-the-game.ts`'s
// `readActionsTable`) — no open5e pk exists for this section at all
// (confirmed by directly listing `OPEN5E_SRD_2024_DIR`, ledger observation
// 3's STEP-2 follow-up: none of the 30 CC-BY-4.0 files is action-shaped).
//
// ID SHAPE, grounded in the sister rather than invented: `world-fixtures/
// srd/base/mounts.toml` already authors action-shaped capabilities as
// `capability_definitions` rows with ids `srd/action/mount` /
// `srd/action/dismount` (the Mount/Dismount actions, a different chapter's
// content, same shape) — `srd/action/<slug>` is real precedent, not a guess.
// This unit follows it: `action/<slug>` (bundle-prefixed to `srd/action/
// <slug>` by the verb layer, same convention `skill-units.ts` uses for
// `skill/<slug>`).
//
// SHAPE DECISION (identity list, not a mechanic unit): every existing
// identity-list precedent in this chapter (abilities: `resource_definitions`,
// skills: `capability_definitions`) is a CATALOG entry, independent of
// whether any actor holds a grant for it. The 12 named actions are not
// resources (no bounded pool), so all remain catalog identities. Granting is
// narrower: `creature-identity-units.ts` grants only Attack, Dodge, and Help,
// the three actions for which this package currently ships a real verb path.
// The other nine identities stay ungranted until their mechanics exist.
//
// MECHANIC-DECISION TABLE (per-action, honest — not forced): see
// `ACTION_MECHANIC_DECISIONS` below and `ledger/playing-the-game.md`'s
// "Actions table + intro" row for the full narrative. Summary:
//   - Attack:    the first concrete, equipment-independent variant now ships
//                here: Unarmed Strike (Damage), composed from
//                `attack-roll-units.ts` + `unarmed-strike-units.ts`; weapons
//                remain Equipment-owned variants.
//   - Dodge:      shipped through actor/target roll-bias routing.
//   - Help:       shipped as an explicit partial approximation: ability-check
//                 Advantage until the helped creature's next turn starts.
//   - Hide, Influence, Search, Study: the SRD text for THIS chapter gives NO
//     numeric DC for any of these checks — probed directly (grepped the full
//     cached markdown for "hide"/"hiding"/"stealth"; the only DC-bearing
//     tables in this chapter are the Ability Checks / Saving Throw Examples
//     tables, neither of which names Hide specifically) — the DC is
//     GM-adjudicated per this chapter's own text ("The Game Master decides
//     when circumstances are appropriate for hiding", § Hiding). This
//     CORRECTS an operator-brief assumption ("Hide = skillCheckExpr(stealth)
//     vs DC 15 is a strong candidate — real numbers in the source"): no such
//     number exists in this chapter's source. The mechanic these four
//     actions dispatch to is the ALREADY-SHIPPED `skillCheckExpr`/
//     `d20TestExpr` idiom, applied with a per-affordance DC chosen by
//     whichever concrete scene authors a real hiding/searching spot — same
//     precedent as the "Ability Checks (social)" ledger row's own verdict
//     ("the actual mechanic is just the D20 Tests > Ability Checks unit
//     applied via the Influence action"). Nothing new to author at the
//     chapter level.
//   - Dash:       shipped (sk-0m4.123): spend the Primary action, then
//                 ModifyChannel-grant one full srd/economy_channel/movement
//                 pool for the turn (`fragments/dash.ts`, extra-action-budget
//                 pattern) — the movement/Speed unit this row used to defer
//                 to now exists.
//   - Disengage, Magic, Ready, Utilize: each names a mechanic owned by a
//     DIFFERENT, not-yet-generated chapter/unit (Combat's Opportunity
//     Attacks, spellcasting, a dynamic player-declared trigger, and
//     Interacting with Objects respectively) — identity only, deferred with
//     a named reason, not silently dropped.
import { readActionsTable } from "../../markdown/playing-the-game";

const EXPECTED_ACTION_COUNT = 12;

/** One action identity unit, ready to render as a `capability_definitions` row. */
export interface ActionUnit {
	slug: string;
	displayName: string;
	/** The table's own one-line summary — the row's `description` value. */
	description: string;
}

function slugifyActionName(name: string): string {
	const slug = name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	if (slug.length === 0) {
		throw new Error(`actions-units: action name '${name}' slugified to an empty string.`);
	}
	return slug;
}

/** Build all 12 action identity units, sorted by slug for deterministic output. */
export function buildActionUnits(): ActionUnit[] {
	const rows = readActionsTable();
	if (rows.length !== EXPECTED_ACTION_COUNT) {
		throw new Error(
			`actions-units: expected ${EXPECTED_ACTION_COUNT} Actions rows, got ${rows.length}.`,
		);
	}
	const seenSlugs = new Set<string>();
	const units = rows.map((row) => {
		const slug = slugifyActionName(row.actionName);
		if (seenSlugs.has(slug)) {
			throw new Error(
				`actions-units: duplicate action slug '${slug}' in the parsed Actions table.`,
			);
		}
		seenSlugs.add(slug);
		if (row.summary.trim().length === 0) {
			throw new Error(`actions-units: action '${row.actionName}' has an empty summary.`);
		}
		return {
			slug,
			displayName: `Action: ${row.actionName}`,
			description: row.summary,
		};
	});
	return units.sort((a, b) => a.slug.localeCompare(b.slug));
}

/** One action's honest mechanic-decision verdict — see module header. */
export type ActionMechanicStatus =
	| "mechanic-shipped"
	| "mechanic-partial"
	| "mechanic-elsewhere"
	| "blocked-finding-23"
	| "no-dc-in-source"
	| "deferred-other-chapter";

export interface ActionMechanicDecision {
	status: ActionMechanicStatus;
	note: string;
}

/**
 * The per-action mechanic decision, keyed by slug — recorded honestly rather
 * than forced, per the module header's own narrative. Every one of the 12
 * actions from `buildActionUnits()` must have exactly one entry here (pinned
 * by `actions-units.test.ts`).
 */
export const ACTION_MECHANIC_DECISIONS: Record<string, ActionMechanicDecision> = {
	attack: {
		status: "mechanic-shipped",
		note: "First playable variant shipped here: srd/attack/unarmed-strike/damage composes attackRollExpr, 5-foot creature targeting, and real target HP damage; Equipment later contributes weapon variants.",
	},
	dash: {
		status: "mechanic-shipped",
		note: "Extra movement equal to Speed ships as fragments/dash.ts: spend the Primary action, then ModifyChannel-grant one full srd/economy_channel/movement pool for the turn (sk-0m4.123's own movement-budget channel, extra-action-budget pattern).",
	},
	disengage: {
		status: "deferred-other-chapter",
		note: "Exempts the actor's movement from Opportunity Attacks — owned by Combat's Opportunity Attack mechanic (already substrate-demoed in world-fixtures/srd/base/action-economy-demo.toml Shape 4/5), out of this bucket's scope per the team-lead brief.",
	},
	dodge: {
		status: "mechanic-shipped",
		note: "Both halves ship through finding #56's actor/target bias routing: attacks against the dodger have Disadvantage, while only actions authored with the srd/dex_save resolution scope gain actor-side Advantage; both expire at the dodger's next turn_start.",
	},
	help: {
		status: "mechanic-partial",
		note: "Assist an Ability Check ships as an actor-scoped srd/ability_check Advantage condition on the ally. The first slice honestly approximates next-check/chosen-proficiency consumption as expiry at the helped creature's next turn_start; Help Attack and first aid remain separate follow-ups.",
	},
	hide: {
		status: "no-dc-in-source",
		note: '"Make a Dexterity (Stealth) check" — this chapter\'s own text gives NO numeric DC ("The Game Master decides when circumstances are appropriate for hiding", § Hiding); corrects an operator-brief assumption of DC 15, which does not appear anywhere in the cached source. The mechanic is the already-shipped skillCheckExpr idiom, applied with a per-affordance DC by whichever scene authors a concrete hiding spot.',
	},
	influence: {
		status: "no-dc-in-source",
		note: "Charisma/Wisdom check to alter attitude — no DC in this chapter's text (Social Interaction's own Ability Checks row already says the same: dispatches to the D20 Tests > Ability Checks unit via a per-affordance DC).",
	},
	magic: {
		status: "deferred-other-chapter",
		note: "Cast a spell / use a magic item / use a magical feature — pointer to the (unwritten) spellcasting/Equipment chapters, not this chapter's material.",
	},
	ready: {
		status: "deferred-other-chapter",
		note: '"Prepare to take an action in response to a trigger you define" — a genuinely dynamic, player-declared-at-play-time trigger; not generator-time content (no fixed predicate to author against).',
	},
	search: {
		status: "no-dc-in-source",
		note: "Wisdom (Insight/Medicine/Perception/Survival) check — no DC in this chapter's text; same dispatch-only verdict as Hide/Influence/Study.",
	},
	study: {
		status: "no-dc-in-source",
		note: "Intelligence (Arcana/History/Investigation/Nature/Religion) check — no DC in this chapter's text; same dispatch-only verdict as Hide/Influence/Search.",
	},
	utilize: {
		status: "deferred-other-chapter",
		note: "Use a nonmagical object — owned by Exploration > Interacting with Objects (the free-interaction-per-turn / Utilize-for-extra mechanic), a different ledger row.",
	},
};
