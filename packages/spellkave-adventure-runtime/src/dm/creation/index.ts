/**
 * // pattern: none — barrel export for DM creation module
 *
 * `src/dm/creation/` — the DM Runtime Library's CREATION dialogue (ADR-0096
 * "Runtime-Rendered DM Content from a Typed Component Library"; slice plan
 * `ledger/designs/dm-runtime-library-arc.md`, this is S4). Interactive
 * character creation of a level-1 hero (SRD `cache/markdown/
 * character-creation.md` steps 1-5: class, species, background, point-buy
 * ability scores, name), built entirely on `../lib/` (S2) + `../data` (S3)
 * + this package's origin catalogs (`origins.ts` reads
 * `chapters/character-origins/{species,background}-units.ts`):
 *
 *  - `ids.ts` — stable id vocabulary (bundle, niche/tag, resource/action ids).
 *  - `draft-state.ts` — the draft belief + the audible-pick parser/reducer.
 *  - `render.ts` — the step renderer (`CreationDraftState -> VerbCall[]`).
 *  - `completeness.ts` — confirm-time author writes (tags, party, kit, name).
 *  - `origins.ts` — cached 9-species / 4-background option lists.
 *  - Candidate identity is authored by its fixture host: `srd.creature`
 *    supplies universal attempts and `srd.player_character` supplies PC-only
 *    attempts. No unsourced skill-proficiency baseline exists. The class-
 *    feature grant itself is sourced live from `../data`'s
 *    `grantableAdvancementCapabilities` inside `seat-steps.ts` — no
 *    per-class table lives in this directory anymore.
 *  - `lines.ts` — authored, overridable speech lines.
 *  - The speech tree and its walker ran in the deleted TypeScript host; the Rust
 *    DM engine runs creation now (`crates/spellkave-npc-host/src/dm/`).
 *  - `parse-scores.ts` / `parse-name.ts` / `parse-description.ts` — pure,
 *    world-blind parsers (ADR-0096 D-7 parse-to-propose).
 *  - `claim-watch.ts` — creation DUTY vocabulary: the walk-rule and claim-rearm
 *    decisions.
 *  - `induction.ts` — the induct-candidate capability + affordance authoring.
 *  - `candidate.ts` — the candidate's fail-closed seed floor.
 *  - `companion.ts` — companion creation + level bump through completeness.
 *
 * SCOPE: all twelve SRD base classes, nine species and four backgrounds;
 * structured skills, advancement choices, caster picks and starting kits.
 * Name, scores and optional appearance/backstory propose values for adoption.
 * The publisher prepares vocabulary; the Rust DM performs finite authored
 * acts through the DM presence. The class identity/advancement plan runs when
 * selected; confirmation completes origin, sheet, training and equipment.
 * The adventure blueprint supplies Party membership and sight. No per-play
 * manifest writes or re-parenting to a pregen definition occur.
 */

export * from "./act-plan.ts";
export * from "./candidate";
export * from "./catalog";
export * from "./claim-watch";
export * from "./companion";
export * from "./completeness";
export * from "./confirmation-plan.ts";
export * from "./draft-state";
export * from "./equipment-plan.ts";
export * from "./ids";
export * from "./induction";
export * from "./lines";
export * from "./origins";
export * from "./parse-description";
export * from "./parse-name";
export * from "./parse-scores";
export * from "./prompt-offer";
export * from "./seed";
export * from "./steps";
