/** Shared level-up vocabulary authored by dmAldwin(); no instance keys or placements. */
import { DEFINE_ACTION_VERB_TOOL, DEFINE_CAPABILITY_TOOL } from "@spellkave/tool-authoring";
import {
	ACCEPT_LEVEL_UP_OFFER_LOCAL_ID,
	APPLY_LEVEL_UP_LOCAL_ID,
	ASK_ABOUT_ADVANCEMENT_LOCAL_ID,
	DARING_ADVANCE_LOCAL_ID,
	DECLINE_LEVEL_UP_OFFER_LOCAL_ID,
	DM_BUNDLE,
	LEVEL_UP_CONFIRM_LOCAL_ID,
	LEVEL_UP_DISCARD_LOCAL_ID,
	LEVEL_UP_ENROLL_LOCAL_ID,
	LEVEL_UP_OFFER_ACCEPTED_NONE,
	LEVEL_UP_OFFER_ACCEPTED_RESOURCE_ID,
	LEVEL_UP_OFFER_ACCEPTED_YES,
	OFFER_LEVEL_UP_LOCAL_ID,
	PENDING_HP_CHOICE_DARING,
	PENDING_HP_CHOICE_NONE,
	PENDING_HP_CHOICE_RESOURCE_ID,
	PENDING_HP_CHOICE_RESOURCE_LOCAL_ID,
	PENDING_HP_CHOICE_STEADY,
	STEADY_ADVANCE_LOCAL_ID,
	TRAINEE_PRESENT_NICHE_ID,
	TRAINEE_PRESENT_NICHE_LOCAL_ID,
} from "../../dm/level-up/ids";
import { offerAcceptedResourceCall } from "../../dm/level-up/offer-accepted";
import { ALDWIN_PERSONA, type DmPersona } from "../../dm/level-up/persona";
import {
	buildDialogueAction,
	buildMarkerResource,
	buildNicheDefinition,
	inscribeSpeechTraceWrite,
	modifyResourceWrite,
	removeConditionWrite,
	setToExactValueDeltaSource,
	type VerbCall,
} from "../../dm/lib";
import {
	ACTION_SURGE_USES_RESOURCE_ID,
	CREATURE_NICHE_TAG,
	HP_ID,
	HP_PER_LEVEL_ID,
	LEVEL_STATE_ID,
	levelUpGatePredicateSource,
	SPEECH_TRACE_KIND_ID,
	SRD_BUNDLE_ID,
	XP_STATE_ID,
	XP_THRESHOLD_MACRO_ID,
} from "../../srd-ids.ts";

const HP_STATE_ID = `${SRD_BUNDLE_ID}/${HP_ID}`;
const HP_PER_LEVEL_STATE_ID = `${SRD_BUNDLE_ID}/${HP_PER_LEVEL_ID}`;

/** The shared XP-threshold gate every level-up path uses (advancement-units.ts). */
function levelUpGateSource(): string {
	return levelUpGatePredicateSource();
}

/** `offer-level-up`'s own gate, read from the TARGET side — Aldwin (the
 * actor) is asking "has the CREATURE I'm looking at earned enough XP",
 * byte-identical grounding to the retired `dm/aldwin.ts` constant. */
function offerLevelUpGatePredicateSource(): string {
	return (
		`target.stat('${XP_STATE_ID}') >= macro('${XP_THRESHOLD_MACRO_ID}', target.stat('${LEVEL_STATE_ID}') + 1)` +
		` && target.stat('${LEVEL_STATE_ID}') < 20`
	);
}

function pendingHpChoiceSetTo(value: number): string {
	return setToExactValueDeltaSource(PENDING_HP_CHOICE_RESOURCE_ID, value);
}

/** `level-up/confirm`'s own HP-growth delta — byte-identical DSL grounding to
 * the retired `dm/aldwin.ts` `TRAIN_CONFIRM_HP_DELTA_SOURCE` (lazy `cond()`,
 * ADR-0045 D-3: the untaken `1d10` branch is never rolled). */
const LEVEL_UP_CONFIRM_HP_DELTA_SOURCE =
	`cond(actor.stat('${PENDING_HP_CHOICE_RESOURCE_ID}') == ${PENDING_HP_CHOICE_STEADY}, ` +
	`actor.stat('${HP_PER_LEVEL_STATE_ID}'), 1d10)`;

// Shared definitions, rendered into the DM fixture at build time.

function definitionResourceCalls(persona: DmPersona): VerbCall[] {
	const levelUpApplied = buildMarkerResource({
		bundle: DM_BUNDLE,
		localId: persona.levelUpAppliedResourceLocalId,
		displayName: `Level-Up Applied (${persona.name})`,
		description:
			`${persona.name}'s last-applied character level latch (operator Q2 / L9): seeded at 1 (every hero ` +
			"starts at character level 1, no ceremony owed for that starting level), N = ceremony " +
			`completed through hero level N. ACTOR-carried on ${persona.name}; gate is latch < hero level. ` +
			"sk-tyhy: seeded at 1 (not 0) because the apply consequence now advances this latch by " +
			"exactly 1 per apply (see `applyLevelUpCalls`'s own deltaSource comment) rather than " +
			"snapping it to the hero's current level — a 0 seed would cost the FIRST-ever ceremony an " +
			"extra phantom apply just to catch up from 0 to the hero's actual starting level of 1.",
		minValue: 0,
		maxValue: 20,
		initialValue: 1,
	}).call;

	const offerAccepted = offerAcceptedResourceCall();

	const pendingHpChoice = buildMarkerResource({
		bundle: DM_BUNDLE,
		localId: PENDING_HP_CHOICE_RESOURCE_LOCAL_ID,
		displayName: "Pending HP-Growth Choice (level-up wizard)",
		description:
			"D11 draft-then-commit wizard: 0 = no draft, 1 = steady (average HP) drafted, 2 = daring " +
			"(rolled HP) drafted. Revisable — re-choosing overwrites (set-to-exact-value idiom). " +
			"level-up/confirm resets this to 0 in the same dispatch it executes the level-up.",
		minValue: PENDING_HP_CHOICE_NONE,
		maxValue: PENDING_HP_CHOICE_DARING,
		initialValue: PENDING_HP_CHOICE_NONE,
	}).call;

	return [levelUpApplied, pendingHpChoice, offerAccepted];
}

function definitionNicheCalls(persona: DmPersona): VerbCall[] {
	const aldwinNiche = buildNicheDefinition({
		bundle: DM_BUNDLE,
		localId: persona.nicheLocalId,
		description:
			`Any ${persona.name}-tagged entity — the level-up wizard's directed target. Definition ` +
			"only — fixed spatial attachments are authored by the adventure.",
		predicateSource: `target.has_niche('${persona.tag}')`,
	}).call;

	const traineeNiche = buildNicheDefinition({
		bundle: DM_BUNDLE,
		localId: TRAINEE_PRESENT_NICHE_LOCAL_ID,
		description:
			`Any creature co-located with an ${persona.name}-typed entity — apply-level-up's, offer-level-up's, and ` +
			"level-up/enroll's shared target-eligibility niche. Definition only.",
		predicateSource: `target.has_niche('${CREATURE_NICHE_TAG}')`,
	}).call;

	return [aldwinNiche, traineeNiche];
}

function askAboutAdvancementCall(persona: DmPersona): VerbCall[] {
	return buildDialogueAction({
		bundle: DM_BUNDLE,
		actionLocalId: ASK_ABOUT_ADVANCEMENT_LOCAL_ID,
		nicheId: persona.nicheId,
		displayName: `Ask ${persona.name} About Advancement`,
		description: `Ask ${persona.name} what you need to know about growing stronger.`,
		frameWrites: [inscribeSpeechTraceWrite({ speechTraceKindId: SPEECH_TRACE_KIND_ID })],
	}).calls;
}

function steadyAdvanceCall(persona: DmPersona): VerbCall[] {
	return buildDialogueAction({
		bundle: DM_BUNDLE,
		actionLocalId: STEADY_ADVANCE_LOCAL_ID,
		nicheId: persona.nicheId,
		displayName: "Take the average Hit Points",
		description:
			"Draft the AVERAGE-HP advance to the next level: the flat srd/hp_per_level value instead of " +
			"rolling 1d10. Drafts only — level-up/confirm executes it. Revisable: firing " +
			"level-up/daring-advance afterward overwrites this draft, and vice versa. Gated on the " +
			"shared XP threshold AND a seeded srd/hp_per_level (average HP is undefined without a class; " +
			"a missing fact evaluates false, ADR-0035 D-4).",
		gatePredicateSource: `${levelUpGateSource()} && actor.stat('${HP_PER_LEVEL_STATE_ID}') >= 1`,
		frameWrites: [
			modifyResourceWrite({
				actor: "Actor",
				resourceId: PENDING_HP_CHOICE_RESOURCE_ID,
				deltaSource: pendingHpChoiceSetTo(PENDING_HP_CHOICE_STEADY),
			}),
		],
	}).calls;
}

function daringAdvanceCall(persona: DmPersona): VerbCall[] {
	return buildDialogueAction({
		bundle: DM_BUNDLE,
		actionLocalId: DARING_ADVANCE_LOCAL_ID,
		nicheId: persona.nicheId,
		displayName: "Roll for Hit Points (1d10)",
		description:
			"Draft the ROLLED-HP advance to the next level: roll 1d10 instead of the flat srd/hp_per_level " +
			"average (the roll happens AT CONFIRM time, never here). Drafts only. Revisable: firing " +
			"level-up/steady-advance afterward overwrites this draft, and vice versa. Gated ONLY on the " +
			"shared XP threshold.",
		gatePredicateSource: levelUpGateSource(),
		frameWrites: [
			modifyResourceWrite({
				actor: "Actor",
				resourceId: PENDING_HP_CHOICE_RESOURCE_ID,
				deltaSource: pendingHpChoiceSetTo(PENDING_HP_CHOICE_DARING),
			}),
		],
	}).calls;
}

function levelUpConfirmCall(persona: DmPersona): VerbCall[] {
	return buildDialogueAction({
		bundle: DM_BUNDLE,
		actionLocalId: LEVEL_UP_CONFIRM_LOCAL_ID,
		nicheId: persona.nicheId,
		displayName: `Confirm the level-up with ${persona.name}`,
		description:
			"Execute the drafted level-up choice: srd/level +1, srd/hp += hp_per_level ('Take the average " +
			"Hit Points') or 1d10 ('Roll for Hit Points (1d10)', rolled NOW), via ONE branching cond(...) " +
			"delta_source, then resets the draft and the offer-accepted latch to 0 in the SAME dispatch. " +
			"Gated on the shared XP threshold AND a non-zero draft.",
		gatePredicateSource: `${levelUpGateSource()} && actor.stat('${PENDING_HP_CHOICE_RESOURCE_ID}') != ${PENDING_HP_CHOICE_NONE}`,
		frameWrites: [
			modifyResourceWrite({ actor: "Actor", resourceId: LEVEL_STATE_ID, deltaSource: "1" }),
			modifyResourceWrite({
				actor: "Actor",
				resourceId: HP_STATE_ID,
				deltaSource: LEVEL_UP_CONFIRM_HP_DELTA_SOURCE,
			}),
			modifyResourceWrite({
				actor: "Actor",
				resourceId: PENDING_HP_CHOICE_RESOURCE_ID,
				deltaSource: pendingHpChoiceSetTo(PENDING_HP_CHOICE_NONE),
			}),
			modifyResourceWrite({
				actor: "Actor",
				resourceId: LEVEL_UP_OFFER_ACCEPTED_RESOURCE_ID,
				deltaSource: setToExactValueDeltaSource(
					LEVEL_UP_OFFER_ACCEPTED_RESOURCE_ID,
					LEVEL_UP_OFFER_ACCEPTED_NONE,
				),
			}),
		],
	}).calls;
}

function offerAcceptedSetTo(value: number): string {
	return setToExactValueDeltaSource(LEVEL_UP_OFFER_ACCEPTED_RESOURCE_ID, value);
}

/** sk-0m4.19 — discrete ACCEPT for Aldwin's proactive offer. Same
 * dialogue-action shape as steady-advance; writes the consent latch that
 * gates the into-limbo teleport. Never free-text. */
function acceptLevelUpOfferCall(persona: DmPersona): VerbCall[] {
	return buildDialogueAction({
		bundle: DM_BUNDLE,
		actionLocalId: ACCEPT_LEVEL_UP_OFFER_LOCAL_ID,
		nicheId: persona.nicheId,
		displayName: `Accept ${persona.name}'s offer`,
		description:
			`Accept ${persona.name}'s offer to step into the advancement limbo and take the level you have ` +
			`earned. Drafts the consent latch only — ${persona.name}'s own teleport sibling carries you there. ` +
			"Gated on the shared XP threshold.",
		gatePredicateSource: levelUpGateSource(),
		frameWrites: [
			modifyResourceWrite({
				actor: "Actor",
				resourceId: LEVEL_UP_OFFER_ACCEPTED_RESOURCE_ID,
				deltaSource: offerAcceptedSetTo(LEVEL_UP_OFFER_ACCEPTED_YES),
			}),
		],
	}).calls;
}

/** sk-0m4.19 — discrete DECLINE for Aldwin's proactive offer. Same
 * dialogue-action shape as discard; zeroes consent and closes the phase. */
function declineLevelUpOfferCall(persona: DmPersona): VerbCall[] {
	return buildDialogueAction({
		bundle: DM_BUNDLE,
		actionLocalId: DECLINE_LEVEL_UP_OFFER_LOCAL_ID,
		nicheId: persona.nicheId,
		displayName: `Decline ${persona.name}'s offer`,
		description:
			`Tell ${persona.name} you are not ready to take the level yet — zeroes the consent latch, ` +
			"and closes the current drafting phase. Gated on the shared XP threshold so it only appears beside the offer.",
		gatePredicateSource: levelUpGateSource(),
		frameWrites: [
			modifyResourceWrite({
				actor: "Actor",
				resourceId: LEVEL_UP_OFFER_ACCEPTED_RESOURCE_ID,
				deltaSource: offerAcceptedSetTo(LEVEL_UP_OFFER_ACCEPTED_NONE),
			}),
			removeConditionWrite({
				actor: "Actor",
				conditionDefinitionId: "dm/level-up/drafting",
			}),
		],
	}).calls;
}

function levelUpDiscardCall(persona: DmPersona): VerbCall[] {
	return buildDialogueAction({
		bundle: DM_BUNDLE,
		actionLocalId: LEVEL_UP_DISCARD_LOCAL_ID,
		nicheId: persona.nicheId,
		displayName: "Discard the drafted choice",
		description:
			`Tell ${persona.name} to forget the drafted level-up choice — zeroes the draft, nothing else. Gated on ` +
			"a non-zero draft only: nothing to discard otherwise.",
		gatePredicateSource: `actor.stat('${PENDING_HP_CHOICE_RESOURCE_ID}') != ${PENDING_HP_CHOICE_NONE}`,
		frameWrites: [
			modifyResourceWrite({
				actor: "Actor",
				resourceId: PENDING_HP_CHOICE_RESOURCE_ID,
				deltaSource: pendingHpChoiceSetTo(PENDING_HP_CHOICE_NONE),
			}),
		],
	}).calls;
}

/**
 * MANIPULATE-class (Aldwin -> hero), never `buildDialogueAction` — that
 * always adds the communication_speech_act_id upsert (mirrors
 * `../creation/render.ts`'s own `enrollActionCall` doc comment for the
 * identical shape). Advisory only: no consequence at all — the gate is
 * naturally self-clearing once level-up/confirm (or the generic level-up
 * action) raises srd/level.
 */
function offerLevelUpCalls(persona: DmPersona): VerbCall[] {
	const capabilityLocalId = `action/${OFFER_LEVEL_UP_LOCAL_ID}`;
	return [
		{
			toolName: DEFINE_CAPABILITY_TOOL,
			label: "capability:offer-level-up",
			params: {
				bundle: DM_BUNDLE,
				id: capabilityLocalId,
				actor_kind: "entity",
				display_name: "Offer a Level Up",
				description:
					`Allows ${persona.name} to see that a nearby creature has earned enough XP to level up, so his ` +
					"own seat can speak the offer.",
				tags: ["srd.action"],
			},
		},
		{
			toolName: DEFINE_ACTION_VERB_TOOL,
			label: "action:offer-level-up",
			params: {
				bundle: DM_BUNDLE,
				id: OFFER_LEVEL_UP_LOCAL_ID,
				required_capability: `${DM_BUNDLE}/${capabilityLocalId}`,
				niche_id: TRAINEE_PRESENT_NICHE_ID,
				display_name: "Offer a Level Up",
				description:
					"The level-up condition lives IN THE WORLD as authored DSL. Gate mirrors the shared " +
					`XP-threshold gate, read from ${persona.name}'s side (target.stat(...)). Advisory ONLY: no world ` +
					"writes — exists purely so a seat can observe it appearing and speak the offer.",
				self_eligible: false,
				self_only: false,
				non_steering: true,
				predicate_source: offerLevelUpGatePredicateSource(),
				cost_time_ms: 0,
				tags: [],
			},
		},
	];
}

/**
 * MANIPULATE-class (Aldwin -> hero). Marks the level-up delivered (Aldwin's
 * exactly-once latch), initializes the TRAINEE's Action Surge charge, and
 * withdraws the drafting condition in the same successful frame.
 * What changed under BL-46/ADR-0096 D-5 is WHEN the class-feature capability
 * itself (Action Surge) is granted — that now happens as a SEPARATE,
 * idempotent apply-before-latch step (`renderLevelUpClassGrant`, applied by
 * the seat immediately before this action is dispatched), never inline here.
 */
function applyLevelUpCalls(persona: DmPersona): VerbCall[] {
	const capabilityLocalId = `action/${APPLY_LEVEL_UP_LOCAL_ID}`;
	return [
		{
			toolName: DEFINE_CAPABILITY_TOOL,
			label: "capability:apply-level-up",
			params: {
				bundle: DM_BUNDLE,
				id: capabilityLocalId,
				actor_kind: "entity",
				display_name: "Apply the Level Up",
				description:
					`Allows ${persona.name} to apply the level up he promised once the trainee's srd/level exceeds ` +
					`${persona.name}'s last-applied latch (per-level re-offerability, L9).`,
				tags: ["srd.action"],
			},
		},
		{
			toolName: DEFINE_ACTION_VERB_TOOL,
			label: "action:apply-level-up",
			params: {
				bundle: DM_BUNDLE,
				id: APPLY_LEVEL_UP_LOCAL_ID,
				required_capability: `${DM_BUNDLE}/${capabilityLocalId}`,
				niche_id: TRAINEE_PRESENT_NICHE_ID,
				display_name: "Apply the Level Up",
				description:
					`Gate: trainee srd/level is strictly above ${persona.name}'s last-applied latch (monotonic level ` +
					"latch, operator Q2). ADR-0096 D-5: the seat applies class-feature grants BEFORE this " +
					"dispatch — the grant itself never lives in this consequence. Latch write advances the " +
					"marker by exactly one level (sk-tyhy) — a trainee who crossed two thresholds in one XP " +
					"grant gets two applies, one ceremony per level, the correct SRD choreography. Fighter " +
					"Action Surge charge still seeds here when that resource exists on the body (L2 fighter " +
					"path); other classes ignore a missing pool.",
				self_eligible: false,
				self_only: false,
				non_steering: true,
				predicate_source: `target.stat('${LEVEL_STATE_ID}') > actor.stat('${persona.levelUpAppliedResourceId}')`,
				cost_time_ms: 0,
				tags: [],
				consequence: {
					description:
						`Record the last-applied character level on ${persona.name}'s latch and seed Action Surge uses ` +
						"when the trainee carries that resource (fighter L2).",
					frame_writes: [
						modifyResourceWrite({
							actor: "Actor",
							resourceId: persona.levelUpAppliedResourceId,
							// sk-tyhy: was `target.stat(LEVEL_STATE_ID) - actor.stat(latch)` (a
							// set-to-exact-across-entities idiom) — the kernel rejects this every
							// time with `UnknownField { subject: Target, field_id: "srd/level" }`
							// (`server/src/world_interaction/layer3/modify_resource.rs`: inside a
							// `ModifyResource.delta_source`, `target.*` always resolves to the
							// MODIFIED entity, i.e. whichever actor THIS write's own `actor` field
							// binds — for an `actor: "Actor"` write like this one, that is Aldwin
							// himself, so `target.stat('srd/level')` has no meaning here; it is
							// never the manipulation's OTHER party). This write's own predicate
							// above (`target.stat('${LEVEL_STATE_ID}') > actor.stat(...)`) already
							// guarantees the trainee's level is strictly greater than the latch on
							// every dispatch, so a constant `+1` delta is sufficient and correct:
							// each apply advances the latch by exactly one level, one ceremony per
							// level gained (see the action's own description above).
							deltaSource: "1",
						}),
						modifyResourceWrite({
							actor: "TargetActor",
							resourceId: ACTION_SURGE_USES_RESOURCE_ID,
							deltaSource: "1",
						}),
						removeConditionWrite({
							actor: "TargetActor",
							conditionDefinitionId: "dm/level-up/drafting",
						}),
					],
				},
			},
		},
	];
}

/**
 * NEW (BL-46, finding #35 class — see `ids.ts`'s own `LEVEL_UP_ENROLL_*` doc
 * comment). MANIPULATE-class, DM-actor (Aldwin) -> trainee-target (hero),
 * hand-composed (never `buildDialogueAction`). UNGATED: must fire against a
 * completely unseeded trainee — reading either resource in a gate would hit
 * the exact fail-closed trap this action exists to close. Consequence is TWO
 * zero-delta `ModifyResource` writes — Aldwin's own latch (Actor-carried) and
 * the hero's own draft (TargetActor-carried) — whose ONLY effect is the
 * seed-and-apply row creation from each resource's own `initial_value` on
 * first write (never a real value change).
 */
function levelUpEnrollCalls(persona: DmPersona): VerbCall[] {
	const capabilityLocalId = `action/${LEVEL_UP_ENROLL_LOCAL_ID}`;
	return [
		{
			toolName: DEFINE_CAPABILITY_TOOL,
			label: "capability:level-up-enroll",
			params: {
				bundle: DM_BUNDLE,
				id: capabilityLocalId,
				actor_kind: "entity",
				display_name: "Enroll Level-Up Candidate",
				description:
					`Allows ${persona.name} to enroll a fresh trainee — a mechanical, non-dialogue seed-and-apply of ` +
					"his own level-up-applied latch and the trainee's own pending-hp-choice draft (finding " +
					"#35 class: neither resource's own initial_value auto-materialises as an object_state " +
					"row until its owner's own first write).",
				tags: ["srd.action"],
			},
		},
		{
			toolName: DEFINE_ACTION_VERB_TOOL,
			label: "action:level-up-enroll",
			params: {
				bundle: DM_BUNDLE,
				id: LEVEL_UP_ENROLL_LOCAL_ID,
				required_capability: `${DM_BUNDLE}/${capabilityLocalId}`,
				niche_id: TRAINEE_PRESENT_NICHE_ID,
				display_name: "Enroll Level-Up Candidate",
				description:
					`Zero-delta ModifyResource seed-and-apply for ${persona.name}'s own level-up-applied latch and the ` +
					"trainee's own pending-hp-choice draft, and the offer-accepted consent latch — mechanical, ungated (must fire against a " +
					"completely unseeded trainee), never a dialogue speech act.",
				self_eligible: false,
				self_only: false,
				non_steering: true,
				cost_time_ms: 0,
				tags: [],
				consequence: {
					description:
						`Seed ${persona.name}'s own level-up-applied latch and the trainee's own pending-hp-choice ` +
						"draft, and the offer-accepted consent latch at their own initial values.",
					frame_writes: [
						modifyResourceWrite({
							actor: "Actor",
							resourceId: persona.levelUpAppliedResourceId,
							deltaSource: "0",
						}),
						modifyResourceWrite({
							actor: "TargetActor",
							resourceId: PENDING_HP_CHOICE_RESOURCE_ID,
							deltaSource: "0",
						}),
						modifyResourceWrite({
							actor: "TargetActor",
							resourceId: LEVEL_UP_OFFER_ACCEPTED_RESOURCE_ID,
							deltaSource: "0",
						}),
					],
				},
			},
		},
	];
}

/** Shared authored level-up vocabulary (ADR-0154 D-1). Drafting handles use authored phase conditions. */
export function renderLevelUpOwnedHandles(persona: DmPersona = ALDWIN_PERSONA): VerbCall[] {
	return [
		...definitionNicheCalls(persona),
		...definitionResourceCalls(persona),
		...askAboutAdvancementCall(persona),
		...steadyAdvanceCall(persona),
		...daringAdvanceCall(persona),
		...levelUpConfirmCall(persona),
		...levelUpDiscardCall(persona),
		...acceptLevelUpOfferCall(persona),
		...declineLevelUpOfferCall(persona),
		...offerLevelUpCalls(persona),
		...applyLevelUpCalls(persona),
		...levelUpEnrollCalls(persona),
	];
}
