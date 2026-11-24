/**
 * DM Runtime Library — LEVEL-UP dialogue (ADR-0096, BL-46 —
 * `ledger/designs/dm-runtime-library-arc.md`, `ledger/designs/
 * dm-generic-advancement-metadata.md` §4a "BL-46 scope"). Stable id
 * vocabulary for Aldwin's level-2 wizard's runtime-rendered rows — mirrors
 * `../creation/ids.ts`'s own file split. No `spellkave_define_*` calls live
 * here — this module is pure string/data plumbing, consumed by `render.ts`.
 *
 * MIGRATION NOTE: every id below was previously a build-time constant in
 * `src/author/dm/aldwin.ts`'s own `dmAldwin()` (seed-time `fixtures/dm/
 * manifest.toml` rows). BL-46 moves the RENDERING of these rows to runtime
 * (Aldwin's own seat, elven-mini's `npcs/aldwin/seat.ts` config over the
 * runtime `dm/seat`, application-owned — sk-dms.3) — every id stays BYTE-IDENTICAL to its old value (the chapter 09
 * transcript and the dm-arc live tests reference these ids), only their
 * AUTHORING TIME moves. The "training"/"train" vocabulary itself was later
 * renamed to "level-up" (operator ruling, 2026-08-10 — the SRD's own term is
 * "Level Advancement"/"Gaining a Level", `cache/markdown/
 * character-creation.md:649,769`; "training" is reserved for Armor Training,
 * a different concept, `rules-glossary.md:231`) — every id below reflects
 * that rename, not the original migration.
 *
 * BUNDLE: every row this module renders lands in the SAME `dm` bundle
 * `src/author/dm/aldwin.ts`'s `dmBundleHeaderCall()` still seeds at build
 * time (bundle header only, post-BL-46) — re-imported from
 * `../../author/dm/lib/ids.ts` (the SAME tiny constant Aldwin's own
 * `generate.ts` imports) rather than re-declared, one source of truth.
 */

import { BUNDLE as DM_BUNDLE } from "../../author/dm/lib/ids.ts";
import { DM_NPC_ALDWIN_TAG } from "../../srd-ids.ts";

export { DM_BUNDLE };

/** Aldwin's persona tag (sk-ntz.7: renamed from the slash-flat
 * `dm-npc/aldwin`, registered in tag-value-vocabulary.ts). The niche
 * predicate below reads it and Aldwin's own instance (authored in
 * `elven_mini`, `src/author/elven-mini/dm-npc.ts`) TAGS with it — both
 * sides import this ONE constant rather than either re-declaring it. */
export const ALDWIN_TAG = DM_NPC_ALDWIN_TAG;

export const ALDWIN_NICHE_LOCAL_ID = "niche/aldwin";
export const ALDWIN_NICHE_ID = `${DM_BUNDLE}/${ALDWIN_NICHE_LOCAL_ID}`;

/** Any creature co-located with an Aldwin-typed entity — `apply-level-up`'s,
 * `offer-level-up`'s, and `level-up/enroll`'s shared target-eligibility
 * niche. Reads the SRD's own universal `srd.creature` umbrella tag
 * (`creature-type-units.ts`'s `CREATURE_NICHE_TAG`) — see `render.ts`'s own
 * niche-definition call. Previously read a bare `"creature"` tag (sk-ntz.3:
 * MF-VAL-297/298 content-hygiene rename): the bridging bare tag existed
 * because it was the elven-mini hero's ONLY carrier of ANY creature-shaped
 * niche membership at the time it was authored; `pregen-units.ts`'s
 * `PREGEN_FIGHTER_DEF_ID` (the hero's own catalog body,
 * `ADVENTURE_HERO_DEF_ID` in `hero.ts`) already carries `CREATURE_NICHE_TAG`
 * ("srd.creature") as an `entity_definition_tag` row, and
 * `target_niches.rs`'s `derive_entity_target_niches` unions definition-tag
 * AND instance-tag niches (BL-56/#2227) — so this predicate now reads
 * `CREATURE_NICHE_TAG` directly and the redundant bare instance tag on the
 * hero (`hero.ts`) is retired outright, not merely renamed. Constant name
 * kept verbatim (not part of the training->level-up rename — "trainee" here
 * denotes the wizard's target creature, not the mechanism). */
export const TRAINEE_PRESENT_NICHE_LOCAL_ID = "niche/trainee-present";
export const TRAINEE_PRESENT_NICHE_ID = `${DM_BUNDLE}/${TRAINEE_PRESENT_NICHE_LOCAL_ID}`;

// ── Marker/draft resources (ids renamed training->level-up, 2026-08-10;
// previously byte-identical to the retired `dm/aldwin.ts` constants) ───────
export const ALDWIN_LEVEL_UP_APPLIED_RESOURCE_LOCAL_ID = "aldwin/level-up-applied";
export const ALDWIN_LEVEL_UP_APPLIED_RESOURCE_ID = `${DM_BUNDLE}/${ALDWIN_LEVEL_UP_APPLIED_RESOURCE_LOCAL_ID}`;

export const PENDING_HP_CHOICE_RESOURCE_LOCAL_ID = "level-up/pending-hp-choice";
export const PENDING_HP_CHOICE_RESOURCE_ID = `${DM_BUNDLE}/${PENDING_HP_CHOICE_RESOURCE_LOCAL_ID}`;
export const PENDING_HP_CHOICE_NONE = 0;
export const PENDING_HP_CHOICE_STEADY = 1;
export const PENDING_HP_CHOICE_DARING = 2;

/** sk-0m4.19 — hero-carried consent latch for Aldwin's proactive offer.
 * 0 = not accepted (also the decline write), 1 = accepted. Seeded by
 * `level-up/enroll` (finding #35: initial_value does not auto-materialise). */
export const LEVEL_UP_OFFER_ACCEPTED_RESOURCE_LOCAL_ID = "level-up/offer-accepted";
export const LEVEL_UP_OFFER_ACCEPTED_RESOURCE_ID = `${DM_BUNDLE}/${LEVEL_UP_OFFER_ACCEPTED_RESOURCE_LOCAL_ID}`;
export const LEVEL_UP_OFFER_ACCEPTED_NONE = 0;
export const LEVEL_UP_OFFER_ACCEPTED_YES = 1;

// ── Action/capability local id stems (full action id `${DM_BUNDLE}/${local}`,
// full capability id `${DM_BUNDLE}/action/${local}` — `../lib/dialogue.ts`'s
// own `buildDialogueAction` pairing). Ids renamed training->level-up,
// 2026-08-10. ────────────────────────────────────────────────────────────
export const ASK_ABOUT_ADVANCEMENT_LOCAL_ID = "ask-about-advancement";
export const ASK_ABOUT_ADVANCEMENT_ACTION_ID = `${DM_BUNDLE}/${ASK_ABOUT_ADVANCEMENT_LOCAL_ID}`;
export const ASK_ABOUT_ADVANCEMENT_CAPABILITY_ID = `${DM_BUNDLE}/action/${ASK_ABOUT_ADVANCEMENT_LOCAL_ID}`;

export const STEADY_ADVANCE_LOCAL_ID = "level-up/steady-advance";
export const STEADY_ADVANCE_ACTION_ID = `${DM_BUNDLE}/${STEADY_ADVANCE_LOCAL_ID}`;
export const STEADY_ADVANCE_CAPABILITY_ID = `${DM_BUNDLE}/action/${STEADY_ADVANCE_LOCAL_ID}`;

export const DARING_ADVANCE_LOCAL_ID = "level-up/daring-advance";
export const DARING_ADVANCE_ACTION_ID = `${DM_BUNDLE}/${DARING_ADVANCE_LOCAL_ID}`;
export const DARING_ADVANCE_CAPABILITY_ID = `${DM_BUNDLE}/action/${DARING_ADVANCE_LOCAL_ID}`;

export const LEVEL_UP_CONFIRM_LOCAL_ID = "level-up/confirm";
export const LEVEL_UP_CONFIRM_ACTION_ID = `${DM_BUNDLE}/${LEVEL_UP_CONFIRM_LOCAL_ID}`;
export const LEVEL_UP_CONFIRM_CAPABILITY_ID = `${DM_BUNDLE}/action/${LEVEL_UP_CONFIRM_LOCAL_ID}`;

export const LEVEL_UP_DISCARD_LOCAL_ID = "level-up/discard";
export const LEVEL_UP_DISCARD_ACTION_ID = `${DM_BUNDLE}/${LEVEL_UP_DISCARD_LOCAL_ID}`;
export const LEVEL_UP_DISCARD_CAPABILITY_ID = `${DM_BUNDLE}/action/${LEVEL_UP_DISCARD_LOCAL_ID}`;

/** sk-0m4.19 — discrete accept/decline pair for the proactive offer.
 * Same dialogue-action shape as steady-advance / discard; never free text. */
export const ACCEPT_LEVEL_UP_OFFER_LOCAL_ID = "level-up/accept-offer";
export const ACCEPT_LEVEL_UP_OFFER_ACTION_ID = `${DM_BUNDLE}/${ACCEPT_LEVEL_UP_OFFER_LOCAL_ID}`;
export const ACCEPT_LEVEL_UP_OFFER_CAPABILITY_ID = `${DM_BUNDLE}/action/${ACCEPT_LEVEL_UP_OFFER_LOCAL_ID}`;

export const DECLINE_LEVEL_UP_OFFER_LOCAL_ID = "level-up/decline-offer";
export const DECLINE_LEVEL_UP_OFFER_ACTION_ID = `${DM_BUNDLE}/${DECLINE_LEVEL_UP_OFFER_LOCAL_ID}`;
export const DECLINE_LEVEL_UP_OFFER_CAPABILITY_ID = `${DM_BUNDLE}/action/${DECLINE_LEVEL_UP_OFFER_LOCAL_ID}`;

export const OFFER_LEVEL_UP_LOCAL_ID = "offer-level-up";
export const OFFER_LEVEL_UP_ACTION_ID = `${DM_BUNDLE}/${OFFER_LEVEL_UP_LOCAL_ID}`;
export const OFFER_LEVEL_UP_CAPABILITY_ID = `${DM_BUNDLE}/action/${OFFER_LEVEL_UP_LOCAL_ID}`;

export const APPLY_LEVEL_UP_LOCAL_ID = "apply-level-up";
export const APPLY_LEVEL_UP_ACTION_ID = `${DM_BUNDLE}/${APPLY_LEVEL_UP_LOCAL_ID}`;
export const APPLY_LEVEL_UP_CAPABILITY_ID = `${DM_BUNDLE}/action/${APPLY_LEVEL_UP_LOCAL_ID}`;

/**
 * NEW (BL-46, finding #35 class — mirrors `../creation/ids.ts`'s own
 * `ENROLL_ACTION_ID` 1:1): with the wizard's marker resources now DEFINED at
 * runtime instead of seeded on Aldwin's/the hero's own entity types, neither
 * Aldwin's `level-up-applied` latch nor the hero's `pending-hp-choice` draft
 * auto-materialises an `object_state` row until its OWNER's first write.
 * `level-up/enroll` is that first write: a MANIPULATE-class, DM-actor
 * (Aldwin) -> trainee-target (hero) mechanical seed-and-apply, ungated
 * (must fire against a completely unseeded trainee — reading either resource
 * in a gate would hit the exact fail-closed trap this action exists to
 * close), fired ONCE per trainee by Aldwin's own seat before any wizard
 * content is offered. See `render.ts`'s own `enrollActionCalls` doc comment.
 */
export const LEVEL_UP_ENROLL_LOCAL_ID = "level-up/enroll";
export const LEVEL_UP_ENROLL_ACTION_ID = `${DM_BUNDLE}/${LEVEL_UP_ENROLL_LOCAL_ID}`;
export const LEVEL_UP_ENROLL_CAPABILITY_ID = `${DM_BUNDLE}/action/${LEVEL_UP_ENROLL_LOCAL_ID}`;
