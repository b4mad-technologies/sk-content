import type { ChapterUnitSummary } from "../../chapter-types";
import { driveUnitScene, type VerbCall } from "../../verb-runner";
import { AC_RESOURCE_ID, acModifierTargetRow } from "../armor-class-units";
import { BUNDLE_ID } from "../constants";
import {
	COVER_HALF_DISPLAY_NAME,
	COVER_HALF_LOCAL_ID,
	COVER_HALF_MODIFIER_LOCAL_ID,
	COVER_THREE_QUARTERS_DISPLAY_NAME,
	COVER_THREE_QUARTERS_LOCAL_ID,
	COVER_THREE_QUARTERS_MODIFIER_LOCAL_ID,
	halfCoverBonus,
	REMOVE_POLICY_INDEPENDENT_LIFETIME_DISPLAY_NAME,
	REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID,
	REMOVE_POLICY_INDEPENDENT_LIFETIME_REMOVE_PREDICATE_SOURCE,
	STACKING_SINGLE_DISPLAY_NAME,
	STACKING_SINGLE_EXPIRES_AT_TICK_OUTCOME_SOURCE,
	STACKING_SINGLE_LOCAL_ID,
	STACKING_SINGLE_STACK_COUNT_OUTCOME_SOURCE,
	threeQuartersCoverBonus,
} from "../cover-units";

const COVER_CONDITIONS_ANCHOR =
	"playing-the-game.md § Combat > Cover; design: ledger/designs/" +
	"equipment-ac-target-fact.md § Grounding 4 (maxim-audit F1)";

const _GENESIS_REDIRECT_ANCHOR =
	"ledger/findings.md finding #49; server/src/world_interaction/" +
	"affordance_materialiser/subscription.rs's subscribe_perceiver (NOT ADR-0070, #1998); " +
	"canon-warden redirect on #2032 (not genesis — self-sufficiency instead)";

/**
 * F1 (maxim-audit, `ledger/designs/equipment-ac-target-fact.md`): Half /
 * Three-Quarters Cover shipped as real `condition_definitions` rows, each
 * folding its own ALWAYS-ACTIVE `modifier_templates` row (`applies_to =
 * "srd/ac"`, `delta_kind = "Plus"`, magnitude straight from `cover-units.ts`'s
 * cache-pinned `halfCoverBonus`/`threeQuartersCoverBonus` — never retyped) —
 * "parameters live in the world" (AGENTS.md's design maxims): a DM applies
 * Cover to a target via `ApplyStatus` at RUNTIME, the same mechanism the
 * proof scene's Advantage condition already proves, instead of an author
 * baking `(ac) + bonus` into a predicate at generation time.
 *
 * Seeds the `srd/ac` `modifier_target_definitions` axis for validation (finding
 * finding #38, `ledger/findings.md`): each modifier's `applies_to` must
 * resolve against that row WITHIN this call's own isolated workspace
 * (MF-VAL-225, Fatal) — a DIFFERENT chapter's (`equipment/index.ts`) own
 * workspace already authors it, but `@spellkave/tool-authoring`'s
 * target-augmentation mechanism (`VALIDATION_AUGMENT_KINDS`,
 * `authoring-verbs.ts`) does NOT cover `modifier_target_definitions` — only
 * `resource_definitions`/`entity_definitions`/`object_state_definitions`/
 * `capability_definitions` — so threading the committed `fixtures/` as a
 * target (the mechanism `generateProofs` uses for finding #36) cannot
 * resolve this ref. Safe to re-declare: `modifier_target_definitions`' own
 * natural key (`target_id`, single column) is upsert-in-place at apply time
 * (`ROW_KIND_NATURAL_KEY`) and is NOT one of the definitional kinds the
 * static validator's duplicate-id scan covers (`MF-VAL-272`/
 * `scan_duplicate_ids`, `crates/spellkave-validate/src/refs.rs` — entity/
 * action/roll_table/outcome_template/resource/condition/stacking/
 * remove_policy/object_state/equipment_slot/affordance/entity ids ARE
 * scanned; `modifier_target_definitions` is deliberately absent), so two
 * workspaces seeding the SAME `target_id` is the row kind's own supported
 * cross-fragment validation shape (mirrors how
 * `spellkave_define_condition`'s own `remove_policy`/`stacking` params are
 * documented: "upserted by their own id, never duplicated" — same posture,
 * ADR-0085). The seed uses the SAME `acModifierTargetRow` builder as the
 * canonical `armor-class.toml` fragment, then `driveUnitScene` strips it from
 * this emitted fragment so there is only one final definition. Total Cover
 * ships NO row here (see `cover-units.ts`'s own
 * module header): it is an eligibility gate, not an AC modifier, and stays
 * unbuilt.
 */
export async function buildCoverConditionsFragment(): Promise<{
	toml: string;
	units: ChapterUnitSummary[];
}> {
	const halfBonus = halfCoverBonus();
	const threeQuartersBonus = threeQuartersCoverBonus();
	const halfConditionId = `${BUNDLE_ID}/${COVER_HALF_LOCAL_ID}`;
	const halfModifierId = `${BUNDLE_ID}/${COVER_HALF_MODIFIER_LOCAL_ID}`;
	const threeQuartersConditionId = `${BUNDLE_ID}/${COVER_THREE_QUARTERS_LOCAL_ID}`;
	const threeQuartersModifierId = `${BUNDLE_ID}/${COVER_THREE_QUARTERS_MODIFIER_LOCAL_ID}`;
	// Self-sufficiency (AGENTS.md, ledger/archive/general-decisions.md's 2026-07-28 operator
	// ruling): srd-own stacking/remove-policy vocabulary, never
	// `core/stacking/single`/`core/remove_policy/independent_lifetime`
	// (`spellkave_define_condition`'s own hardcoded defaults, `authoring-
	// verbs.ts`). Authored ONCE below (half-cover's own call, `remove_policy`/
	// `stacking` object params) then REFERENCED by bare id from every other
	// condition row this package authors — upsert-safe cross-bundle vocabulary,
	// same discipline core's own `condition_remove_policy_definitions`/
	// `stacking_discipline_definitions` rows use (`cover-units.ts`'s own module
	// header names the full grounding + every consumer).
	const stackingSingleId = `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`;
	const removePolicyIndependentLifetimeId = `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`;

	const calls: VerbCall[] = [
		// Re-declaration of the Equipment chapter's own `srd/ac` axis (this
		// function's own doc comment, finding #38) — MUST precede
		// the two `spellkave_define_condition` calls below so their own
		// `applies_to` resolves within THIS workspace.
		{
			toolName: "spellkave_write_rows",
			label: "modifier-target:ac (validation seed, finding #38)",
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_target_definitions",
				rows: [acModifierTargetRow()],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: "condition:cover-half",
			params: {
				bundle: BUNDLE_ID,
				id: COVER_HALF_LOCAL_ID,
				display_name: COVER_HALF_DISPLAY_NAME,
				// Always active once landed — the DM's own targeting decision (which
				// creature grants cover, and to whom) is the gate; the condition row
				// itself carries no conditional re-evaluation (same posture as the
				// proof scene's own Advantage condition).
				gate_predicate_source: "1 == 1",
				description:
					"Half Cover (playing-the-game.md § Combat > Cover): +2 to AC and Dexterity " +
					"saving throws while a target has at least half of its body blocked by " +
					"another creature or an object. Landed on a target via ApplyStatus (a DM " +
					"call, not a generation-time literal — maxim-audit F1); modifies the " +
					`'${AC_RESOURCE_ID}' axis only — the Dexterity-saving-throw half of this ` +
					"row's own SRD text has no substrate save-modifier axis to compose against " +
					"yet, recorded honestly, not silently dropped.",
				// Self-sufficiency: authors the srd-own stacking/remove-policy
				// vocabulary rows (this function's own header note) — semantics
				// mirrored from `core/stacking/single`/`core/remove_policy/
				// independent_lifetime` (`world-fixtures/core/base/conditions.toml`,
				// read directly, `cover-units.ts`'s own doc comments pin the exact
				// lines). NOT re-declared in the three-quarters call below —
				// upserted once here, referenced by bare id there (same workspace,
				// sequential verb execution).
				remove_policy: {
					id: removePolicyIndependentLifetimeId,
					display_name: REMOVE_POLICY_INDEPENDENT_LIFETIME_DISPLAY_NAME,
					remove_predicate_source: REMOVE_POLICY_INDEPENDENT_LIFETIME_REMOVE_PREDICATE_SOURCE,
				},
				stacking: {
					id: stackingSingleId,
					display_name: STACKING_SINGLE_DISPLAY_NAME,
					stack_count_outcome_source: STACKING_SINGLE_STACK_COUNT_OUTCOME_SOURCE,
					expires_at_tick_outcome_source: STACKING_SINGLE_EXPIRES_AT_TICK_OUTCOME_SOURCE,
				},
				modifiers: [
					{
						id: COVER_HALF_MODIFIER_LOCAL_ID,
						display_name: `${COVER_HALF_DISPLAY_NAME} AC +${halfBonus}`,
						applies_to: AC_RESOURCE_ID,
						predicate_source: "",
						modifier_expression_source: `let bonus = ${halfBonus}; bonus`,
						delta_kind: "Plus",
						priority: 0,
					},
				],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: "condition:cover-three-quarters",
			params: {
				bundle: BUNDLE_ID,
				id: COVER_THREE_QUARTERS_LOCAL_ID,
				display_name: COVER_THREE_QUARTERS_DISPLAY_NAME,
				gate_predicate_source: "1 == 1",
				description:
					"Three-Quarters Cover (playing-the-game.md § Combat > Cover): +5 to AC and " +
					"Dexterity saving throws while at least three-quarters of a target's body is " +
					"blocked by an object. Landed on a target via ApplyStatus (maxim-audit F1); " +
					`modifies the '${AC_RESOURCE_ID}' axis only — same Dexterity-save scope caveat ` +
					"as Half Cover's own description.",
				// Self-sufficiency: REFERENCES the srd-own stacking/remove-policy
				// vocabulary the half-cover call above already authored (upsert-safe
				// cross-condition vocabulary, same workspace) — never re-declared,
				// never `core/*`.
				remove_time_policy: removePolicyIndependentLifetimeId,
				stacking_rule: stackingSingleId,
				modifiers: [
					{
						id: COVER_THREE_QUARTERS_MODIFIER_LOCAL_ID,
						display_name: `${COVER_THREE_QUARTERS_DISPLAY_NAME} AC +${threeQuartersBonus}`,
						applies_to: AC_RESOURCE_ID,
						predicate_source: "",
						modifier_expression_source: `let bonus = ${threeQuartersBonus}; bonus`,
						delta_kind: "Plus",
						priority: 0,
					},
				],
			},
		},
	];

	const body = await driveUnitScene(BUNDLE_ID, calls, undefined, {
		omitRowKinds: ["modifier_target_definitions"],
	});

	const units: ChapterUnitSummary[] = [
		{ kind: "stacking_discipline_definitions", id: stackingSingleId, sourcePk: "" },
		{
			kind: "condition_remove_policy_definitions",
			id: removePolicyIndependentLifetimeId,
			sourcePk: "",
		},
		{ kind: "condition_definitions", id: halfConditionId, sourcePk: "" },
		{ kind: "modifier_templates", id: halfModifierId, sourcePk: "" },
		{ kind: "condition_definitions", id: threeQuartersConditionId, sourcePk: "" },
		{ kind: "modifier_templates", id: threeQuartersModifierId, sourcePk: "" },
	];

	const header = [
		"# GENERATED by src/chapters/playing-the-game/fragments/cover.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# Cover conditions (maxim-audit F1, design: ledger/designs/",
		"# equipment-ac-target-fact.md § Grounding 4): Half/Three-Quarters Cover as",
		"# world state — condition_definitions rows, each folding an ALWAYS-ACTIVE",
		'# modifier_templates row on the "srd/ac" axis (Plus, magnitude pinned from',
		"# cover-units.ts's own parsed Cover table). Replaces the former",
		"# generation-time coverModifiedAcExpr algebra (RETIRED — see cover-units.ts's",
		"# own module header for the decision + reasoning). Total Cover ships no row",
		"# here (an eligibility gate, not an AC modifier — cover-units.ts's own",
		"# module header).",
		"#",
		"# Self-sufficiency (AGENTS.md, ledger/archive/general-decisions.md's 2026-07-28 operator",
		"# ruling): the half-cover condition ALSO authors this bundle's own",
		"# stacking_discipline_definitions/condition_remove_policy_definitions",
		"# vocabulary (srd/stacking/single, srd/remove_policy/independent_lifetime)",
		'# — never the "core" bundle\'s own equivalents. The three-quarters',
		"# condition references the SAME rows by id.",
		"",
		`# anchor: ${COVER_CONDITIONS_ANCHOR}`,
		"",
		"",
	].join("\n");
	return { toml: header + body, units };
}

/**
 * Self-sufficiency infra (finding #49, `ledger/findings.md`;
 * canon-warden REDIRECT on #2032, 2026-07-28), NOT open5e content — no
 * `# open5e:` provenance anchor below, unlike every other fragment in this
 * chapter.
 *
 * Grounding: `r_claim_actor`'s presence trigger (`subscribe_perceiver`,
 * `server/src/world_interaction/affordance_materialiser/subscription.rs`,
 * NOT ADR-0070, #1998) materialises whatever "sensing"-class affordance the
 * claimed entity's own bundle authors, into the palette
 * `spellkave_affordance_verbs` reads. The kernel-Rust side is FULLY GENERIC —
 * `subscribe_perceiver` never references any specific id; the "sensing" verb
 * CLASS itself comes from `resolve_typed_descriptor`
 * (`server/src/world_interaction/affordance_materialiser/reconcile/
 * candidates.rs:462-491`) grouping any `outcome_templates` row with a
 * non-empty `sense_query_kind` under the `sensing.` namespace, "with no
 * kernel enum" (that function's own doc comment). `core/sense/look`
 * (`world-fixtures/core/base/affordances.toml`) is REAL CONTENT authored by
 * the "core" bundle for exactly this purpose — but it is content, not
 * kernel-hard-referenced vocabulary (grep-verified: no `core/sense/look` or
 * `core/sense_query` literal appears anywhere under `server/src/`), so a
 * core-less node never gets it and this bundle's own palette was missing the
 * "sensing" verb class entirely (`spellkave_affordance_verbs` returning
 * `["manipulate"]` only). #2032 first fixed this by genesis-seeding
 * `core/sense/look` into kernel `CORE_BOOTSTRAP_MANIFEST` — REVERTED on
 * canon-warden review: ADR-0025's postscript bar for a genesis exception is
 * "vocabulary a KERNEL code path hard-references" (the SAME test #2030's
 * `frontier.apply_manifest` and #2031's `core/condition/controlled` both
 * pass — `apply_drain.rs`/`claim.rs` hardcode those ids directly), which
 * `core/sense/look` fails. The self-sufficiency ruling
 * (`ledger/archive/general-decisions.md`, 2026-07-28) says exactly how a bundle meets ITS OWN
 * palette-completeness need instead: define the vocabulary itself. Mirrors
 * `core/sense/look`'s SHAPE (one `outcome_templates` row + two
 * `affordance_templates` rows, no `action_definitions` row — this is a
 * passive/PERCEIVE-class chain `subscribe_perceiver`'s own `recompute` reads
 * directly, never dispatched through `r_manipulate`) with srd-own ids
 * throughout, including the niche (`BASELINE_SENSING_NICHE_ID`,
 * `srd/sense_query`, NOT `core/sense_query`) — `niche_id` is plain authored
 * vocabulary too (grep-verified: `crates/spellkave-validate/src/refs.rs`
 * never builds a niche reverse-index; the materialiser's own niche
 * prefetches, `affordance_materialiser/mod.rs`'s `authored_niche_defs`/
 * `attachment_index`, resolve TARGET niche membership for grounded/owned-item
 * candidates, not a gate on this self-scoped chain), so it carries no
 * kernel-meaning either and is safe to rename to an srd-own string.
 * Self-sufficiency tripwire (`src/test/offline/self-sufficiency.test.ts`)
 * stays green: nothing below contains the literal substring `core/` — no
 * exception needed, unlike a genuinely kernel-matched string would have
 * required.
 *
 * DELIBERATELY NOT SHIPPED HERE: a `spatial_niche_attachments` row for
 * `srd/sense_query` — same "SCENE decision, not an identity/mechanic one"
 * posture `buildGenericCheckAffordancesFragment`'s own doc comment already
 * established for `CREATURE_NICHE_TAG`, and empirically confirmed
 * unnecessary for THIS chain specifically: `spellkave_write_rows`'s own A2
 * attachment warning (`authoring-verbs.ts`) exists to flag affordances
 * `r_manipulate`'s ACT-path selection would never reach without one — this
 * chain has no `manipulation_action_id` at all, so that caveat does not
 * apply to it; a live-verified proof-scene run with zero attachment authored
 * for this niche still materialises the "sensing" verb class in the palette
 * (`test:live-self-seeding`, 15/15). The non-blocking A2 warning this
 * function's generation run emits is therefore EXPECTED and accepted, not a
 * gap — `spellkave_write_rows`'s own `blockOn: "fatal"` posture (never
 * "any") is exactly why it does not fail the generation run.
 */
