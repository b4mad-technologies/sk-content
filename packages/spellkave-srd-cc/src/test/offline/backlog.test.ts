// Executable backlog ledger (operator decision, 2026-08-06): open decisions
// and backlog items from ANY session land HERE as `backlogItem*` declarations
// beside the closest stable evidence — never as a prose-only row in
// `tool-ux-decision-log.md` or a session summary. Two flavors, same
// discipline `findingGap`/`findingEvidence` already established for
// findings: `backlogItemDeclared` (pure intent, no assertion yet) and
// `backlogItemAssertable` (a real assertion that FAILS today by design, RED
// first). `ledger/backlog.md` is generated from these declarations by the
// SAME reporter (`src/test/srd-coverage/reporter.ts`) that generates
// `ledger/findings.md` — retiring or promoting an item happens by editing
// this file, never the generated ledger.
//
// Most items below have no natural closest-execution-path home (design
// rounds, story milestones) — this dedicated file IS that home, the same
// role `reference.test.ts`/`player-tool-surface.test.ts` play for several
// standalone findings grouped in one thematic offline file.
import { describe } from "vitest";

import { backlogItemDeclared } from "../srd-coverage/evidence";

const DECISION_LOG = "packages/spellkave-srd-cc/ledger/designs/tool-ux-decision-log.md";
const ADR_0093 = "specifications/adr/0093-typed-push-event-channel.md";
const ADR_0082 = "specifications/adr/0082-perception-range-read-axis-scope.md";

describe("open backlog (executable declarations)", () => {
	// BL-3 retired: ADR-0140/0141 replace generic handle dispatch with direct typed attempts.
	backlogItemDeclared({
		id: "BL-4",
		title: "T23: turn deadline + participant eviction (wedge backstop before live async NPCs)",
		expected:
			"A turn-bound session whose active seat does not respond within a configured window auto-advances, and a persistently unresponsive participant is evicted from the roster and the roster's initiative order self-heals — the same mechanism ADR-0093 names as the missing backstop for a scripted driver that never answers a reaction window.",
		context:
			"T23 finding recorded 2026-08-05, deliberately NOT built. ADR-0093 D-7 (P3, 2026-08-06) shipped turn-bound reaction windows WITHOUT a timeout, by design, deferring this backstop here. The 2026-08-06 wedge incident (chapter 7's fight loop spun for 150s and the Crypt Warden's in-memory transcript grew to 1.1GB, hardened in commit e85fc40b0 via throttle/cap/dedupe) is live evidence a scripted driver without reaction handling can hit exactly this hole; mandatory before real live async NPC seats (see BL-12 for the incident's own unresolved root cause).",
		references: [DECISION_LOG, ADR_0093],
	});

	backlogItemDeclared({
		id: "BL-5",
		title: "Decision B: bystander epistemics canon round",
		expected:
			"A canon-warden-reviewed ADR (or an ADR-0093 amendment) settles what a THIRD PARTY present in a scene may perceive of another actor's combat action — scoped and reviewed separately from Decision A's already-shipped client-visible session-lifecycle/own-HP push channel.",
		context:
			"T29 (2026-08-06): 'Decision B (bystander epistemics) as its own canon round, not blocking A.' Decision A (P1->P2->P3) fully shipped 2026-08-06; Decision B is intentionally deferred, deliberately last in this backlog.",
		references: [ADR_0093, DECISION_LOG],
	});

	backlogItemDeclared({
		id: "BL-6",
		title: "Suppress self_hit.attacker_id when the attacker is not perceivable to the victim",
		expected:
			"self_hit.attacker_id omits or masks the attacker's identity when the attacker itself would not be perceivable to the victim under ADR-0082's perception axis (e.g. invisibility, fog, out of range); today it discloses unconditionally to the row-admitted caller.",
		context:
			"ADR-0093 B2 (2026-08-06) populated attacker_id unconditionally, matching the already-shipped event_apply_consequence disclosure posture. The decision log's B2 correction note names the suppression half as a 'named backlog item (operator instruction: no issue filed)' pending the ADR-0082 D-6 program. PROMOTION NOTE: move to `backlogItemAssertable` once an invisible-attacker fixture exists to drive the negative assertion — do not widen visible_event_resource_delta's admission to build one just for this test.",
		references: [DECISION_LOG, ADR_0093, ADR_0082],
	});

	backlogItemDeclared({
		id: "BL-7",
		title: "T26 suppression half: authored advisory flag on the universal step template",
		expected:
			"An authored advisory flag on affordance_templates (or an equivalent structural discriminator) lets walkable exits stop listing the universal srd/affordance/step template in traversal_gates, without any client-side predicate evaluation or a hardcoded template-id smuggled into shared PLAYER tool runtime.",
		context:
			"T26's rename half (blocked_by/advisory_blocked_by -> traversal_gates) shipped 2026-08-06; the suppression half was explicitly STOPPED — no structural discriminator exists today, and the only workable candidate is a genuine server schema change (new affordance_templates column + manifest apply/export/commit/validate + SDK reader passthrough), which the root CLAUDE.md working agreement requires its own change-labeled issue for, never smuggled into a shared PLAYER tool runtime-only slice.",
		references: [DECISION_LOG],
	});

	backlogItemDeclared({
		id: "BL-8",
		title: "Authored turn-bound sentinel on reaction_window_ms",
		expected:
			"Content can opt a reaction into turn-bound semantics explicitly via an authored sentinel value on reaction_window_ms — the eventual path to retiring the kernel-side session/promoted-duration branch ADR-0093 P3 added.",
		context:
			"Recorded as an Axis-D follow-up (not built, no issue) in T29's 2026-08-06 P3 update. Build ONLY if the falsifier appears: an author wants a wall-clock window inside a turn-based session. Do not build speculatively ahead of that need.",
		references: [ADR_0093, DECISION_LOG],
	});

	backlogItemDeclared({
		id: "BL-10",
		title: "superviseNpcSeat has zero production consumers",
		expected:
			"At least one real NPC seat (e.g. the Crypt Warden) runs superviseNpcSeat in 'async' mode from production/story content, rather than every real seat being driven 'stepped' exclusively from test/harness code.",
		context:
			"N3a/N3b (2026-08-05) proved superviseNpcSeat live but only from test harnesses (combat-arena/npc-seat.ts, 07-fight-crypt-warden.ts), both in 'stepped' mode; no production caller exists yet.",
		references: [DECISION_LOG, "packages/spellkave-npc/src/seat/supervisor.ts"],
	});

	backlogItemDeclared({
		id: "BL-12",
		title: "2026-08-06 150s/1.1GB wedge: root cause never diagnosed, only hardened against",
		expected:
			"The trigger that put chapter 7's fight loop into a zero-delay spin (which reaction/turn condition never resolved) is diagnosed and named, not just defended against by the throttle/sink-cap/wake-dedupe hardening.",
		context:
			"Commit e85fc40b0 (2026-08-06, 'fix(npc): harden seat/harness/observability against wedged-session spin') hardens the runaway-transcript deadlock class reactively (throttle the fight loop's poll interval, cap createMemorySink at maxEvents, dedupe seat wakes) but its own message never names the specific trigger. ADR-0093 P3 names the general hazard class (a scripted driver that never answers a reaction window); T23 (BL-4) is the designed backstop, deliberately deferred.",
		references: [ADR_0093, DECISION_LOG],
	});

	backlogItemDeclared({
		id: "BL-13",
		title: "P2c: run the written-but-not-executed monster-arena live proof",
		expected:
			"SPELLKAVE_LOCAL_NODE=1 pnpm test:live-self-seeding passes " +
			"live-self-seeding/monsters/starter-arena.test.ts (each of the 8 named starter attacks " +
			"resolving against a live node) with real assertions, not just typecheck/offline-validate.",
		context:
			"Spell slot-cast half of former BL-13 (slot-cast.test.ts Magic Missile debit + Fire Bolt " +
			"resolution) PASSED live on 2026-08-22 (lane L1 / sk-609b.1). Monster starter-arena " +
			"remains written + SPELLKAVE_LOCAL_NODE-gated but not yet run this lane.",
		references: [
			"packages/spellkave-srd-cc/src/test/live-self-seeding/monsters/starter-arena.test.ts",
		],
	});

	// BL-14 (save-half AoE / Burning Hands) RETIRED by lane L6 / sk-609b.6 —
	// spell-behaviors.ts saveAoeBehavior + live burning-hands proof.
	// BL-15 (target AC buff / Shield of Faith) RETIRED by the same lane —
	// acBuffBehavior ApplyStatus on TargetActor.

	// BL-16 (Magic Items axis) RETIRED by lane L13 / sk-609b.13 — typed reader,
	// chapter generator (757 identity + +N/charge/loot behaviors), coverage rows,
	// loot-table-drop pattern, elven-mini Q4 drop seed.

	backlogItemDeclared({
		id: "BL-17",
		title: "Substrate gap: no cumulative per-turn movement budget (issue #2049)",
		expected:
			"A creature's movement across a turn is metered against its own speed using the action-" +
			"economy time base (e.g. srd/speed-walk consumed as a per-turn budget, not merely a per-step " +
			"read), closing the gap every chapter that authors movement currently works around.",
		context:
			"Real GitHub issue #2049 (OPEN), unrelated to any single chapter — recorded here as a " +
			"session-visible cross-cutting substrate gap, not a duplicate of the issue itself.",
		references: ["https://github.com/b4arena/spellkave/issues/2049"],
	});

	backlogItemDeclared({
		id: "BL-18",
		title: "Substrate gap: no per-creature Hit Point MAXIMUM concept exists (finding #30)",
		expected:
			"A creature's own current HP can be compared against ITS OWN maximum (not resource_" +
			"definitions' bundle-wide safety ceiling) — unblocking Bloodied's own live/fixture consumer " +
			"and Massive Damage's Instant Death arithmetic, both currently n/a in ledger/playing-the-" +
			"game.md for exactly this reason.",
		context:
			"Finding #30 (confirmed, ledger/archive/findings-details.md): resource_definitions.max_value " +
			"is a bundle-wide ceiling, never a per-instance cap — a Fighter's max HP might be 12, a " +
			"dragon's 200, and nothing on the substrate can express that distinction today. Already " +
			"referenced piecemeal in playing-the-game.md's own n/a rows; recorded here as a session-" +
			"visible, named substrate gap rather than only an implicit per-row footnote.",
		references: [
			"packages/spellkave-srd-cc/ledger/archive/findings-details.md",
			"packages/spellkave-srd-cc/ledger/playing-the-game.md",
		],
	});

	// BL-19 RETIRED (L12e / sk-609b.12.5): entity_definition_equip_modifier links item
	// definitions to modifier templates (finding #37); kit armor flows into AC.

	// BL-20 RETIRED (L12 / sk-609b.12): FrameWriteOp::ModifyChannel + economy_channel_grant
	// shipped in the kernel (sk-ct8.4 / finding #86); Action Surge is the LIVE consumer.

	backlogItemDeclared({
		id: "BL-21",
		title:
			"Offline-suite efficiency package (A: render-once artifact, B: two-gear scripts, C: representative sweeps)",
		expected:
			"(A) A content-hash-keyed (src/ + cache/ inputs) pretest render artifact that every render-" +
			"consuming test shares — unchanged hash skips re-rendering entirely, including pipeline-" +
			"check's own determinism double-render. (B) A test:fast script (typecheck + unit tests " +
			"against committed fixtures, no full render) for the iteration loop, alongside the existing " +
			"full gate (pipeline-check + coverage regen) kept for pre-commit/CI. (C) Full per-entity " +
			"sweep loops default to a representative subset, with SRD_FULL_SWEEP=1 opting into the full " +
			"sweep (CI/nightly) — additive config only, no test-code deletion in any of A/B/C.",
		context:
			"User-approved plan (2026-08-06 operator conversation), deferred in favor of merging ASAP " +
			"this session. Motivation: the full bundle renders/loads multiple times per suite run — " +
			"measured on this branch, generate 44s, pipeline-check 87s (twice-render + full wasm " +
			"validation), full offline suite ~265-310s single-threaded (the #2123 R3 threads-pool " +
			"mitigation trades away parallelism for heartbeat stability). A fourth option (incremental " +
			"per-axis validation) was explicitly postponed unless A+B prove insufficient. Precedent for " +
			"(A): creature-units.test.ts's own committed-fixtures assertion rewrite + pipeline-check's " +
			"already-shipped child-process JSON result.",
		references: [
			"packages/spellkave-srd-cc/src/test/offline/pipeline.test.ts",
			"packages/spellkave-srd-cc/src/pipeline-check.ts",
			"packages/spellkave-srd-cc/src/test/offline/creature-units.test.ts",
		],
	});

	backlogItemDeclared({
		id: "BL-22",
		title:
			"U1 numeric detail (roll/modifier/vs-AC/damage amount) needs a server-side dice/roll channel",
		expected:
			"A combat outcome line composed client-side can state the actual d20 roll, applied modifier, " +
			"AC compared against, and damage amount dealt — not just hit/miss and a post-strike condition " +
			"list.",
		context:
			"BL-2 (this session, 2026-08-07) shipped the COMPOSABLE half of U1/U2 with no server change: " +
			"Historical BL-2 used the retired handle-dispatch manipulate receipt to carry `target_conditions` (dead-vs-" +
			"untouched, the same `visible_target_condition` view U4 already reads) and the connected " +
			"actor's own closing `spellkave_session_status`/`spellkave_end_turn` call now carries " +
			"`session_ended` (outcome/defeated/reason, composed from the SAME condition channel plus a " +
			"roster captured while the session was active) — closing finding #97's dead-vs-untouched half. " +
			"The REMAINING half — the actual d20 roll, modifier, AC compared against, and numeric damage " +
			"dealt — has NO existing client-visible channel to compose from: `ProvenanceRow` " +
			"(packages/spellkave-sdk/src/provenance.ts) carries no dice/roll fields at all, and " +
			"`resolution.ts`'s own module header already scopes damage/target-HP as deliberately out of " +
			"its parse (mode/result/consequence only). Distinct from ADR-0082's bystander-HP program " +
			"(BL-5): this is the ACTOR's OWN action outcome, not a third party's perception of someone " +
			"else's action — the gap is a missing server-side telemetry surface, not an epistemics " +
			"decision. Needs a `change`-labeled issue (server work, canon-warden gate) before any client " +
			"composition can start.",
		references: [
			DECISION_LOG,
			"packages/spellkave-tool-player/src/resolution.ts",
			"packages/spellkave-sdk/src/provenance.ts",
		],
	});

	backlogItemDeclared({
		id: "BL-23",
		title: "Kill-time XP is awarded by Aldwin; Claim Victory is a flourish with no XP grant",
		expected:
			"A defeated creature pays its own srd/xp_value at the moment of the kill (Aldwin reads the " +
			"corpse via the NPC tool surface and grants a computed literal). srd/claim-victory remains an " +
			"optional flourish that only zeros the victim latch — it must not grant a second XP amount.",
		context:
			"Retired: the hardcoded CLAIM_VICTORY_XP_GRANT = 300 (sk-0m4.27). Cross-entity " +
			"target.stat('srd/xp_value') inside one ModifyResource remains unproven (the 2026-08-17 " +
			"feasibility spike); the award lives outside the DSL instead. Keep this item as the record " +
			"of that decision, not as an open grant-shape TODO.",
		references: [
			"packages/spellkave-srd-cc/docs/kill-time-xp.md",
			"packages/spellkave-srd-cc/src/chapters/character-creation/advancement-units.ts",
			"packages/spellkave-srd-cc/src/npcs/elven-mini/aldwin/kill-xp.ts",
		],
	});

	// BL-24 RETIRED (L12 / sk-609b.12): Action Surge consequence now ModifyChannel-grants
	// one full srd/economy_channel/primary pool after spending the charge.

	backlogItemDeclared({
		id: "BL-25",
		title:
			"Party XP split (D6): distribution across multiple players is out of scope for the current arc",
		expected:
			"When a party of more than one player-controlled hero defeats a monster, the monster's authored " +
			"XP value is distributed across the party's own killers/participants by some authored rule " +
			"(even split, killer-only, participation-weighted, ...), rather than the entire value landing on " +
			"a single actor as it does today.",
		context:
			"Level-Up DM Arc D6 (`ledger/designs/level-up-dm-arc-plan.md`): 'XP is coupled to the monster's " +
			"death; the KILLER receives them. With one player this is trivially the hero. Party distribution: " +
			"later, out of scope.' S1 shipped the single-killer shape only (srd/claim-victory's consequence " +
			"grants the full srd/xp_value to the claiming Actor) — this item records the deferred party-scale " +
			"case as its own open design question, not silently folded into a future content slice.",
		references: [
			"packages/spellkave-srd-cc/ledger/designs/level-up-dm-arc-plan.md",
			"packages/spellkave-srd-cc/src/chapters/character-creation/advancement-units.ts",
		],
	});

	backlogItemDeclared({
		id: "BL-26",
		title:
			"LLM-DM falsifier (D5): narrow Aldwin's authoring surface BEFORE any DM seat becomes LLM-driven",
		expected:
			"Before any DM seat in this package (Aldwin, or a future one built the same way) stops being a " +
			"deterministic state machine and starts using an LLM to decide what to say or whether to apply a " +
			"patch, its authoring tool surface narrows from the full player-tools-plus-author-tools subset " +
			"(D5) to either a single `apply_patch(patch_id)`-shaped tool or a real, separately canon-reviewed " +
			"DM tool subset — never inherited as the full author-tool subset by default.",
		context:
			"Level-Up DM Arc D5 + canon-warden condition 2 (`ledger/designs/level-up-dm-arc-plan.md` §3; " +
			"recorded in full, both halves, in `tool-ux-decision-log.md`'s T30 entry and " +
			"[ADR-0094](../../../../specifications/adr/0094-dm-seat-as-authoring-principal.md) Alternative " +
			"C): the operator overrode the warden's single-tool preference specifically BECAUSE Aldwin is " +
			"scripted, not LLM-driven — the injection concern a wide author-tool subset raises for an " +
			"LLM-driven agent does not apply to a fixed state machine that only ever calls tool names its " +
			"own code names. This item is the standing falsifier condition: it stays open (by design, not by " +
			"neglect) as long as every DM seat in this package remains scripted, and becomes actionable the " +
			"moment any DM seat's brain gains LLM-driven decision-making.",
		references: [
			"packages/spellkave-srd-cc/ledger/designs/level-up-dm-arc-plan.md",
			DECISION_LOG,
			"specifications/adr/0094-dm-seat-as-authoring-principal.md",
		],
	});

	backlogItemDeclared({
		id: "BL-28",
		title:
			"D11's drafting commentary beat is unreachable: no train/* consequence leaves a trace for Aldwin to observe",
		expected:
			"Aldwin's own seat can observe WHICH draft the hero is currently holding (steady vs. daring vs. " +
			"none) through some tool-visible channel, so his brain's 'DRAFTING' beat can comment on the " +
			"hero's actual in-progress choice instead of degrading to silent waiting.",
		context:
			"S4b GROUND FIRST finding (2026-08-07, `src/npcs/elven-mini/aldwin/" +
			"brain.ts`'s own module header): a live probe fired train/steady-advance against a freshly " +
			"seeded node and read Aldwin's own spellkave_scene/spellkave_traces afterward — ZERO trace rows " +
			"at Aldwin's node. Root cause (traced through server/src/manifest/commit.rs and " +
			"server/src/world_interaction/layer2/r_apply_consequence/inscribe.rs): a trace is inscribed " +
			"only when an action's own authored consequence contains an explicit Inscribe frame write, and " +
			"none of dm/aldwin.ts's train/steady-advance/train/daring-advance/train/discard/train/confirm " +
			"consequences author one (all four are ModifyResource-only). D11's own design brief calls for a " +
			"DRAFTING commentary beat; the shipped brain instead WAITS silently through drafting (the " +
			"honest choice — inventing commentary on a choice Aldwin cannot observe would be fabricating " +
			"awareness he does not have) and re-grounds its acknowledgement on the one thing he CAN " +
			"honestly observe (apply-training's own affordance appearing, i.e. the hero reaching level 2), " +
			"never on which draft was chosen.",
		references: [
			"packages/spellkave-adventure-runtime/src/dm/level-up/ceremony-brain.ts",
			"packages/spellkave-srd-cc/src/author/dm/aldwin.ts",
			"packages/spellkave-srd-cc/ledger/designs/level-up-dm-arc-plan.md",
		],
	});

	backlogItemDeclared({
		id: "BL-29",
		title:
			"Manifest-apply provenance (S6, ADR-0007 D-7): record the applying sender's identity — tracked as GitHub issue #2128",
		expected:
			"ManifestApplyDigest (and/or PendingManifestApply) carries the applying actor identity, the " +
			"manifest doctor-check family verifies it, and a JSONL line completes the ADR-0002 triplet — so " +
			"a DM-seat apply (Aldwin) is distinguishable post-hoc from a genesis seed or any other " +
			"frontier.apply_manifest holder. Server change, own PR (demo gate applies).",
		context:
			"Canon-warden condition 4 of the Level-Up DM Arc review (`ledger/designs/level-up-dm-arc-plan.md` " +
			"§3.4) — the one condition ADR-0094 explicitly leaves OPEN (its D-5). The arc must not be " +
			"considered DONE until this lands or the operator re-waives it. Operator process ruling " +
			"2026-08-07: open items live HERE in the backlog; the pre-existing GitHub issue " +
			"https://github.com/b4arena/spellkave/issues/2128 stays open as the cross-repo pointer and " +
			"carries the full grounded evidence (ManifestApplyDigest server/src/manifest/mod.rs:146-152, " +
			"PendingManifestApply apply_drain.rs:45-75, authority-gate identity computed then discarded) " +
			"plus the smallest-shape proposal — retire this item and close that issue together.",
		references: [
			"https://github.com/b4arena/spellkave/issues/2128",
			"specifications/adr/0094-dm-seat-as-authoring-principal.md",
			"specifications/adr/0007-dm-role-and-trust-elevation.md",
			"packages/spellkave-srd-cc/ledger/designs/level-up-dm-arc-plan.md",
		],
	});

	backlogItemDeclared({
		id: "BL-30",
		title:
			"reaction_window_session_lifecycle live test has never run — no SQL literal syntax for sum-type INSERT — tracked as GitHub issue #2129",
		expected:
			"The client live test proving a444122c1's Tier-2 session-resolver fix actually executes in the " +
			"kernel-live CI run-set again — most plausibly by opening a REAL session through an authored " +
			"session_definition fixture (the session_one_leaf.rs lineage) instead of raw-SQL-seeding a " +
			"session row, since SpacetimeDB SQL accepts no literal constructor for the sum-type " +
			"originating_target column (four syntax variants probed live 2026-08-07, all rejected).",
		context:
			"Found during the Level-Up DM Arc's CI stabilization: the test was committed without [[test]] " +
			"registration, never ran anywhere; registering it (f649635eb) exposed on first execution that " +
			"its seeding approach cannot work. Now registered but out of the run-set, classified " +
			"`//! spellkave-ci: pending-port: #2129` per the check-client-test-targets registry gate's discipline " +
			"(e5afcedad). Operator process ruling 2026-08-07: tracked HERE; the GitHub issue " +
			"https://github.com/b4arena/spellkave/issues/2129 stays open as the pointer — retire this item, " +
			"flip the marker, and close that issue together.",
		references: [
			"https://github.com/b4arena/spellkave/issues/2129",
			"client/tests/reaction_window_session_lifecycle.rs",
			"packages/spellkave-gates/src/gates/check-client-test-targets.ts",
		],
	});

	backlogItemDeclared({
		id: "BL-31",
		title:
			"parse_node_id's first-segment graph-id assumption: sweep remaining callers + reconcile the node_id_well_formed validator contract",
		expected:
			"The two remaining parse_node_id call sites (server/src/world_interaction/layer2/r_sense.rs, " +
			"server/src/spatial/place_graph_clone.rs) are audited for the same truncation class the #2127 " +
			"fix removed from the affordance candidate scan (a hierarchical place_graph_id like " +
			"'<bundle>/<topic>' silently truncated at the first '/'), and the " +
			"node_id_well_formed validator (server/src/spatial/validation/checks.rs:563) either actually " +
			"gates this convention or has its contract updated — today it documents nested-graph node ids " +
			"as FATALLY malformed while the live elven-mini content (hamlet/inn/tomb graphs) uses exactly " +
			"that convention and seeds fine, so the check's contract and reality have drifted apart.",
		context:
			"Surfaced by the #2127 root-cause (fix branch fix/affordance-candidates-nested-graph-2127): " +
			"the perceive-path candidate scan derived the origin's graph id via parse_node_id's naive " +
			"split_once('/') — correct only for single-segment graph ids (tactical-grid cells) — while the " +
			"act path (r_manipulate::target::reachability_node) reads place_graph_id off the row and never " +
			"had the bug (perceive != act class, #669/#597). The fix touched only the one broken caller; " +
			"whether the other two callers share the latent class, and whether the validator should " +
			"enforce or embrace hierarchical graph ids, is a policy call deliberately NOT smuggled into " +
			"the bug fix. Operator process ruling 2026-08-07: tracked here in the backlog, no new GitHub " +
			"issue. SWEEP UPDATE 2026-08-08 (crypt-fight deadlock diagnosis): r_manipulate/ grep-verified " +
			"CLEAN (zero parse_node_id or bare node-id-equality sites of this class remain there); one " +
			"ADJACENT same-class site found — collect_spatial_inputs' " +
			"target_node_environment_state_value_inputs matched place_node_id by direct equality, ignoring " +
			"the grid->anchor target_node_scope its sibling loop already computed (spatial_facts.rs). " +
			"Fixed on the SEPARATE server branch fix/dispatch-niche-resolution-session-grid (open PR " +
			"#2132) — NOT yet on this branch until that PR merges. The two callers named above " +
			"(r_sense.rs, place_graph_clone.rs) and the validator-contract reconciliation remain open.",
		references: [
			"https://github.com/b4arena/spellkave/issues/2127",
			"server/src/spatial/place_node.rs",
			"server/src/spatial/validation/checks.rs",
			"server/src/world_interaction/affordance_materialiser/reconcile/candidates.rs",
		],
	});

	backlogItemDeclared({
		id: "BL-32",
		title:
			"Telepathy-style directed speech (addressee-only perception) has no canon mechanism — Hidden " +
			"visibility blocks admission for EVERYONE including the addressee",
		expected:
			"An authored telepathy-shaped speech action can deliver an entity-anchored trace that ONLY " +
			"the addressee can perceive, via an explicitly decided admission mechanism.",
		context:
			"canon-warden finding 2026-08-08: `trace_admissible_to_observer` " +
			"(`server/src/observer_knowledge.rs`, ADR-0040 D-2) is an exhaustive match with no " +
			"addressee/recipient concept — Hidden → not admitted by co-location for anyone, full stop; " +
			"ADR-0040 D-3 Alternative B (an addressee-keyed admission arm) was explicitly REJECTED " +
			'(0040:205-212, "kills free overhearing... smuggles a directed-message concept into a ' +
			'content-neutral spoor table"). Shipping telepathy requires a fresh operator decision to ' +
			'un-reject Alternative B (new Amends: ADR-0040 ADR, adversarially gated) — never as "just a ' +
			'parameter" on the closed match (that would be a silent K-5 event). Operator decision ' +
			"2026-08-08: parked to backlog, own design round.",
		references: [
			"specifications/adr/0040-remembered-perceived-traces.md",
			"server/src/observer_knowledge.rs",
		],
	});

	backlogItemDeclared({
		id: "BL-33",
		title:
			"Shout-radius speech beyond the speaker's own node needs ForEachActorInRadius node_ball " +
			"radius > 0 — an explicit Err today (ADR-0042 Known Gap G-2)",
		expected:
			"An authored speech action with a node_ball extent radius > 0 fans out inscribed traces to " +
			"actors at neighboring nodes (BFS gather), driven by its own fixture.",
		context:
			"`select_actor_ids` returns an explicit Err for any node_ball radius > 0 " +
			"(`server/src/world_interaction/layer2/r_apply_consequence/for_each_actor_in_radius.rs:99-109`), " +
			"a named Known Gap G-2 in Active ADR-0042; filling it is non-K-5 by ADR-0042's own precedent " +
			"(same arm, no new dispatch variant) but needs its own driving fixture. Metric shapes " +
			"(sphere/cone/line/cube via area_shape::point_in_shape) already work today and are NOT this " +
			"gap. Operator decision 2026-08-08: backlog; near-term speech content uses same-node " +
			"(radius 0) + metric shapes only. NOTE: whisper smaller-than-a-room is ALSO not expressible " +
			'on Tier-2 (node-granular positions, ADR-0042 D-4 Negative) — whisper floors at "this node ' +
			"only\" until Tier-3 tactical positions (ADR-0046); that boundary is part of this item's " +
			"context, not a separate item. 2026-08-17 (sk-0m4.33): BYPASSED, not closed — " +
			"`srd/speak-to-room` now authors `core/area/sphere` with a hall-scale `radius_m` instead of " +
			"waiting on topological node_ball radius > 0. The Err and ADR-0042 G-2 remain.",
		references: [
			"specifications/adr/0042-for-each-actor-in-radius-apply-path.md",
			"server/src/world_interaction/layer2/r_apply_consequence/for_each_actor_in_radius.rs",
		],
	});

	backlogItemDeclared({
		id: "BL-34",
		title:
			"Sound is not cut off by walls — ADR-0070's occlusion term is scoped to validate_reachability " +
			"only, ForEachActorInRadius/area_shape selection carries no occlusion",
		expected:
			"An authored speech (or AoE) extent can opt into wall-occluded selection so a hearer behind " +
			"a `blocked` edge is excluded from the fan-out.",
		context:
			"canon-warden reading 2026-08-08: `area_shape::point_in_shape` " +
			"(`server/src/spatial/area_shape.rs:29-72`) has no occlusion term; ADR-0070's occlusion " +
			"(`server/src/world_interaction/layer2/r_manipulate/target.rs`, D-1/D-2) is scoped " +
			"exclusively to validate_reachability (targeting + affordance materialiser). Extending it " +
			"to AoE selection is likely non-K-5 by ADR-0070 D-3's own precedent (reads only the generic " +
			"blocked edge binding) but is real additional work needing its own fixture — never folded " +
			"silently into a speech-content PR. Operator decision 2026-08-08: backlog.",
		references: [
			"specifications/adr/0070-wall-occlusion-in-metric-reachability.md",
			"server/src/spatial/area_shape.rs",
			"server/src/world_interaction/layer2/r_manipulate/target.rs",
		],
	});

	backlogItemDeclared({
		id: "BL-35",
		title:
			"ForEachActorInRadius metric shapes compare radius_m against raw pos_* grid units, " +
			"not metres_per_unit — the same number is metres on the validate_reachability path",
		expected:
			"An authored core/area/sphere (or cone/line/cube) radius_m/extent is interpreted in the " +
			"same metre frame as affordance_template.range_m: both multiply by " +
			"place_graph_definition.metres_per_unit, so a hall-scale shout and a 50 m telepathy " +
			"range mean the same distance on the same graph.",
		context:
			"canon-warden finding 2026-08-17 (sk-0m4.33): `area_shape::point_in_shape` " +
			"(`server/src/spatial/area_shape.rs`) treats `radius_m`/`extent_m` as the same unit as " +
			"`place_node.pos_*`. `for_each_actor_in_radius.rs` feeds those raw coordinates into " +
			"`Point2` with no `metres_per_unit` scale. `validate_reachability` " +
			"(`r_manipulate/target.rs`) is genuinely metric: it multiplies the same pos_* delta by " +
			"`place_graph_definition.metres_per_unit`. On elven-mini inn (metres_per_unit 1.524) a " +
			"`radius_m` of 10 is ~10 grid units for a shout and ~10 metres for telepathy/attack " +
			"range. `srd/speak-to-room`'s hall-scale 10 is authored in the raw-unit frame (BL-35); " +
			"do not treat that literal as interchangeable with a `range_m` column. Also recorded " +
			"here, not a separate item: `srd/communicate/telepathy` inherits ADR-0070 wall " +
			"occlusion via the shared `validate_reachability` path; a magical wall-bypass is out " +
			"of scope and is not yet its own backlog row.",
		references: [
			"server/src/spatial/area_shape.rs",
			"server/src/world_interaction/layer2/r_apply_consequence/for_each_actor_in_radius.rs",
			"server/src/world_interaction/layer2/r_manipulate/target.rs",
			"specifications/adr/0070-wall-occlusion-in-metric-reachability.md",
		],
	});

	backlogItemDeclared({
		id: "BL-37",
		title:
			"combat-arena test 9 (N3a NPC-seat goblin fight) is FLAKY live — 130s timeout in three " +
			"consecutive runs then green in the fourth (2026-08-08), needs its own diagnosis round",
		expected:
			"combat-arena.test.ts test 9 (an NPC seat drives the goblin's turns through PLAYER tools " +
			"to the terminal opponent-down state) passes DETERMINISTICALLY in the full " +
			"live-self-seeding suite AND in isolation on a freshly wiped/seeded node.",
		context:
			"Found 2026-08-08 during the srd/speech slice's live gate (lead re-run): test 9 hit its " +
			"own 130s timeout in THREE consecutive fresh wipe/publish/seed runs (two full-suite, one " +
			"isolated), then passed in a fourth full-suite run — flaky, not deterministically red — " +
			"while the other 9 tests in the same file stayed green throughout. The failure " +
			"predates and is independent of the speech slice (red in every run including the first, " +
			"before any speech fixture/attachment change landed in the worktree; the arena combatants " +
			"never hold the speak capability and the speech niche attachments are on proof-scene " +
			"cells, not session-grid nodes). The test was born 2026-08-05 (d60efbd83, N3a) and has no " +
			"recorded full-suite green since — live-self-seeding does not run in per-PR CI, so any " +
			"regression in between landed silently. Suspect #1 is the T12 per-target-rev regression " +
			"class: the SAME class broke shared/perception-walk.ts (envelope rev passed where the " +
			"item's own rev is required — fixed in the speech slice commit); a seat copying envelope " +
			"revs would stall exactly like this. A server-log trace ('r_react: unknown pending_id') " +
			"during the failing window is the other recorded lead. Diagnose in its own round; do not " +
			"fold a fix into an unrelated content slice.",
		references: [
			"packages/spellkave-srd-cc/src/test/live-self-seeding/mechanics/combat-arena.test.ts",
			"packages/spellkave-srd-cc/src/test/shared/perception-walk.ts",
			"packages/spellkave-npc/src",
		],
	});

	backlogItemDeclared({
		id: "BL-38",
		title:
			"reachability-failure provenance hides the selected template — selected_template_ids and " +
			"draws hardcoded empty on the out_of_range branch",
		expected:
			"An r_manipulate dispatch rejected by validate_reachability records WHICH affordance_template " +
			"was selected (and its range_m) in evaluation_provenance, so an out_of_range failure is " +
			"attributable to the winning template instead of reading as 'nothing selected'.",
		context:
			"Crypt-fight deadlock diagnosis 2026-08-08: the reachability-failure branch in " +
			"r_manipulate/mod.rs (~:405-421) calls record_manipulation_failure with hardcoded empty " +
			"selected_template_ids/draws regardless of sel.affordance_template_id — this masked the " +
			"real root cause (a range-0 duplicate template winning the template_id tie-break) for a " +
			"full diagnosis round, making every failing dispatch look template-less. Small server " +
			"observability fix, ADR-0002 spirit (a failure must carry its selection evidence); " +
			"not folded into an unrelated slice.",
		references: [
			"server/src/world_interaction/layer2/r_manipulate/mod.rs",
			"server/src/world_interaction/layer2/r_manipulate/target.rs",
		],
	});

	backlogItemDeclared({
		id: "BL-39",
		title:
			"No validation diagnostic for duplicate same-niche/same-outcome affordance templates — " +
			"the template_id tie-break silently picks one",
		expected:
			"sk validate (or the manifest apply validator) surfaces an ambiguity diagnostic when two " +
			"affordance_template rows share the same niche_id AND outcome_template_id (and thus compete " +
			"for the same dispatches with the deterministic template_id tie-break deciding silently), " +
			"per ADR-0021 D-2's own postscript: 'a genuine overlap is surfaced at validation time'.",
		context:
			"Crypt-fight deadlock diagnosis 2026-08-08: a leftover range-0 touch-range duplicate of " +
			"srd/attack/melee/affordance (same niche srd/niche/strikeable, same outcome) won " +
			"select_turn_aware's template_id ascending tie-break after the elven_mini bundle rename " +
			"re-ordered the ids — deadlocking combat at adjacent cells. ADR-0021's postscript promises " +
			"validation-time surfacing for genuine overlaps; no MF-VAL diagnostic exists for this shape " +
			"today (the duplicate rode through validate clean twice). The duplicate itself is deleted " +
			"(combatants.ts, 2026-08-08); this item tracks the missing guard that would have caught it.",
		references: [
			"server/src/world_interaction/layer2/r_manipulate/selection/candidates.rs",
			"packages/spellkave-srd-cc/src/author/elven-mini/combatants.ts",
		],
	});

	backlogItemDeclared({
		id: "BL-41",
		title:
			"Library-computed values have no world-side invariant check — a doctor/runtime analysis " +
			"for rule-bound sums (deliberately soft, per operator ruling)",
		expected:
			"A doctor-style or runtime analysis can verify rule-bound invariants over DM-library-" +
			"rendered values on a live world — e.g. a creature's ability scores staying within the " +
			"point-buy budget's reachable range, or level/HP arithmetic matching the SRD tables — " +
			"flagging drift that apply-time manifest validation cannot see (it validates row shape, " +
			"never cross-row rule arithmetic).",
		context:
			"ADR-0096 G-2 (operator ruling, 2026-08-08): with derived-stat and budget arithmetic " +
			"computed in the DM component library as late-bound literals (instead of macro-valued " +
			"deltas, finding #81), the world no longer enforces those invariants server-side — a " +
			"buggy library could render a stat sum exceeding rule bounds and the apply would land " +
			"clean. Accepted deliberately: the recorded playthrough is the arc's true test and the " +
			"operator explicitly deferred hardening ('würde ich jetzt noch nicht so hart angehen'). " +
			"This item records the deferred check as intent — a candidate future `just doctor` " +
			"extension in ADR-0002's spirit — not as a prerequisite of the arc.",
		references: [
			"specifications/adr/0096-runtime-rendered-dm-content.md",
			"specifications/adr/0002-agent-observability-contract.md",
			"packages/spellkave-srd-cc/ledger/designs/dm-runtime-library-arc.md",
		],
	});

	backlogItemDeclared({
		id: "BL-45",
		title:
			"Ability-score method 'Random Generation' (4d6 drop lowest) is not offered by the creation " +
			"dialogue — parked by operator ruling",
		expected:
			"The creation dialogue offers the SRD's third score-generation method — roll 4d6, record " +
			"the total of the highest three, six times (character-creation.md 'Random Generation') — " +
			"with the rolls happening somewhere honest (server-side authored dice, or an explicitly " +
			"decided alternative), alongside the shipped point-buy and standard-array paths.",
		context:
			"Creation-Dialogue-v2 design round (operator, 2026-08-09): parked deliberately. Two real " +
			"blockers, neither worth solving speculatively: (1) 'drop the lowest of four dice' has no " +
			"clean DSL expression (the dice grammar rolls-and-sums; no order-statistic term exists — " +
			"same finding class as the scaling recon's 'modify an existing action' rows), and (2) " +
			"program-side randomness would break ADR-0096 D-2's determinism gate (seedless double-" +
			"record byte-identity is what makes the recorded playthrough an acceptance artifact). " +
			"Build only when a real consumer wants rolled scores AND one of the two blockers has a " +
			"decided, honest answer.",
		references: [
			"packages/spellkave-srd-cc/cache/markdown/character-creation.md",
			"specifications/adr/0096-runtime-rendered-dm-content.md",
			"packages/spellkave-srd-cc/ledger/designs/level-up-scaling-recon.md",
		],
	});

	backlogItemDeclared({
		id: "BL-47",
		title:
			"renderAll(): fan the chapter walk out across processes (pipeline-check is the CI long pole)",
		expected:
			"`pipeline.ts`'s chapter walk renders across OS processes (or worker threads) instead of one sequential `for … await`, reassembling fragments in CHAPTERS index order — cutting `renderAll()` from 82.7s to 39.2s and `pipeline-check` (which renders TWICE for its determinism proof) from ~173s to ~88s, i.e. this package's CI step from ~240s to ~115s. Stretch goal on the same mechanism: fan out at BATCH granularity inside the heaviest chapter, since chapter-level fan-out is floor-bounded by `classes` alone (see the ceiling arithmetic in the context below).",
		context:
			"Measured 2026-08-12 while cutting this suite's wall clock 387s -> 173s (that half shipped: `package.json`'s `test:srd-coverage` dropped `--no-file-parallelism`/`singleThread` for `--maxWorkers=4`, plus longest-processing-time-first enqueue in `scripts/ci/run-ci-js.sh`). 173s is now the FLOOR, and it is one `beforeAll`: `pipeline.test.ts` spawns `pipeline-check`, measured at 171s of the 173s — every other one of the 108 test files finishes in milliseconds. Inside it: `renderAll()` twice at 82.3s/81.7s, of which the sequential chapter walk is 73.9s (classes 26.0s, monsters 24.3s, spells 7.4s, equipment 6.8s, playing-the-game 5.3s, rest <4s). The final full-bundle wasm validation over all 3.7MB costs 204ms — the 82s is ALL per-verb incremental revalidation (`@spellkave/tool-authoring`'s `authoring-verbs.ts` commitOrReport re-renders and revalidates the accumulated workspace on every call), which is the verb-driven authoring contract, not a defect. Batch-size tuning is already exhausted: RENDER_BATCH_SIZE measured 6->40.8s, 12->30.6s, 34->24.8s (committed), 68->27.5s, 340->34.0s — a U-curve with its minimum on the committed value, so #2124 got it right. FEASIBILITY IS PROVEN, NOT ESTIMATED: a throwaway 9-process prototype (8 chapters + the UI surface, reassembled by CHAPTERS index, proofs left sequential behind the barrier) measured `renderAll()` 82.7s -> 39.2s (2.11x) with output BYTE-IDENTICAL to the sequential path across manifest.toml, files, uiFiles, referenceFiles and proofFiles — compared on key ORDER as well as content, since key order is what feeds includePaths. Per-worker: classes 29.5s, monsters 27.9s, spells 10.8s, equipment 10.2s, playing-the-game 8.2s, character-origins 5.7s, character-creation 2.5s, feats 0.8s, ui 0.35s. CEILING ARITHMETIC: 39.2s = 29.5s (classes, the critical path) + 9.7s of irreducible sequential tail (renderManifestRoot + renderFixtureReference + proofs + worker startup), so chapter-level fan-out cannot beat `max(chapter) + ~10s` no matter the core count — two chapters (classes + monsters) carry 57s of the 96s total chapter CPU. Batch-granularity fan-out would put the ideal near 96s/16 cores + 10s ~= 16s per renderAll(), which is what makes the stretch goal worth naming but clearly second. DEPENDENCY MAP (why this is safe): chapters are already render-order-independent BY CONSTRUCTION — `committedFixturesTarget()` hands every chapter the ALREADY-COMMITTED fixtures/, never this run's in-memory output (that function's own doc comment states it deliberately), so a chapter structurally cannot observe a predecessor's fresh render; the real cross-chapter references (e.g. character-origins' srd/speed-walk -> a playing-the-game row, MF-VAL-253) resolve through that committed target. The 8 cross-chapter edges (including the playing-the-game <-> equipment cycle) are shared unit-builders and tag constants — code, not data flow. `generateUi()` takes no arguments and joins the fan-out. The memo caches in `open5e/class-feature.ts` are consumed by `classes/` only, so no cross-worker duplication. TWO barriers must survive: `renderManifestRoot` needs includePaths in CHAPTERS INDEX order (include order is manifest bytes — reassemble by index, never by completion order, the same hazard the coverage reporter avoids by sorting), and the proofs stage needs the FULL rendered bundle on disk first (~8s, stays sequential behind the fan-out). NOT attempted here: the shipped change is config-only, this one restructures the render path and wants its own review.",
		references: [
			"packages/spellkave-srd-cc/src/pipeline.ts",
			"packages/spellkave-srd-cc/src/pipeline-check.ts",
			"packages/spellkave-srd-cc/src/chapters/index.ts",
			"packages/spellkave-srd-cc/src/chapters/verb-runner.ts",
			"packages/spellkave-srd-cc/src/test/offline/pipeline.test.ts",
			"packages/spellkave-tool-authoring/src/authoring-verbs.ts",
			"scripts/ci/run-ci-js.sh",
		],
	});

	backlogItemDeclared({
		id: "BL-48",
		title:
			"fixtures/spatial PNGs are gated by nothing and churn on cross-machine regen — adopt the elven-mini provenance sidecar",
		expected:
			"`src/author/author-spatial-map-proofs.ts` gains the elven-mini treatment: a provenance sidecar recording sha256(SVG source + raster width) per binary, written even under TEXT_ONLY, plus a write-time churn guard. That gives its PNGs a CONTENT gate on CI (the sidecar is text, so it is byte-compared) and stops a regen on a different machine from rewriting every committed PNG when nothing changed.",
		context:
			"sk-dms.42's TEXT_ONLY escape (`SRD_CC_AUTHOR_CHECK_TEXT_ONLY=1`) made both authors CI-SAFE by neither writing nor comparing binaries on a runner — correct, and it is why the derived gate is green. But CI-safe is not the same as gated: under TEXT_ONLY nothing checks what those PNGs contain, and a stale one can sit in git indefinitely. Rasterization is genuinely host-dependent (`spatial-graph/render-svg.ts` asks for `font-family:Inter,system-ui,Arial`, which resvg resolves against the HOST's fonts, and @resvg/resvg-js is a platform-native module), so byte comparison can never be the answer — hashing the deterministic SOURCE can. elven-mini does this now (`fixtures/elven-mini/renders/provenance.json`); author-spatial-map-proofs.ts writes binaries the same way and has not had the pass. `author:dm:check` needs the same look (confirm whether that generator writes binaries at all).",
		references: [
			"packages/spellkave-srd-cc/package.json",
			"packages/spellkave-srd-cc/src/author/author-spatial-map-proofs.ts",
			"packages/spellkave-srd-cc/src/author/dm/generate.ts",
			"packages/spellkave-srd-cc/src/author/elven-mini/renders.ts",
			"packages/spellkave-srd-cc/src/author/elven-mini/generate.ts",
			"packages/spellkave-world-map/src/svg/render-svg.ts",
		],
	});

	// ── L3 caster features (sk-609b.4) partial encodings ─────────────────
	const CASTER_FEATURES_DESIGN = "packages/spellkave-srd-cc/bead sk-609b.4 (design trail)";
	const CASTER_FEATURES_DOC = "packages/spellkave-srd-cc/docs/caster-features-l1-4.md";

	// BL-61 partial RETIRED L12c for banked-die + spend action; remainder is post-roll auto-spend
	// (docs/substrate-verdicts/bardic-inspiration-post-roll-die.md). Cutting Words same family.
	backlogItemDeclared({
		id: "BL-61",
		title: "Bardic Inspiration post-roll auto-spend + Cutting Words reaction",
		expected:
			"On a failed D20 Test the banked die is spent automatically (add d6) without a separate " +
			"player act; Cutting Words subtracts the die as a Reaction on a success.",
		context:
			"L12c ships banked condition + srd/bard/spend-bardic-inspiration-die (manual spend). " +
			"True post-roll auto-add needs a resolution-failure event fact " +
			"(docs/substrate-verdicts/bardic-inspiration-post-roll-die.md).",
		references: [
			CASTER_FEATURES_DESIGN,
			CASTER_FEATURES_DOC,
			"cache/markdown/classes.md:852-862",
			"packages/spellkave-srd-cc/docs/substrate-verdicts/bardic-inspiration-post-roll-die.md",
		],
	});

	// BL-62 RETIRED L12c — Jack of All Trades half-PB wired into d20-units proficiencyTerm.
	// BL-63 RETIRED L12c — CD option menu (Divine Spark damage, Turn Undead, Preserve Life).
	// BL-64 RETIRED L12c — Disciple of Life +3 on Cure Wounds via has_capability rider.

	backlogItemDeclared({
		id: "BL-65",
		title: "Wild Shape creature-form transform",
		expected:
			"Spending a Wild Shape use swaps the acting creature's stat block/actions for a known " +
			"Beast form for hours = half Druid level.",
		context:
			"L12c: uses + Wild Companion LIVE. Form swap has no FrameWriteOp body-swap; " +
			"blueprint-instance-override is spawn-time only " +
			"(docs/substrate-verdicts/wild-shape-form-swap.md).",
		references: [
			CASTER_FEATURES_DESIGN,
			"packages/spellkave-srd-cc/docs/substrate-verdicts/wild-shape-form-swap.md",
		],
	});

	// BL-66 RETIRED L12c — Wild Companion Spawn effect_ref + wild-shape use debit.
	// BL-67 RETIRED L12c — Lay On Hands 1/5/10 discrete menu (resource-spend-with-option-menu).
	// BL-68 RETIRED L12c — Divine Smite Bonus Action slot debit + 2d8 radiant.
	// BL-69 RETIRED L12c — Font of Magic slot↔SP conversions + Careful Spell SP arm marker.
	//     Full Metamagic cast-time spell rewrite shares BL-71 cast-rider substrate.

	// BL-70 RETIRED L12b / sk-609b.12.2 — Arcane Recovery + Magical Cunning verbs + rest refills authored.
	// Evidence lives in caster-features / rest fixtures (see martial/rest coverage).

	backlogItemDeclared({
		id: "BL-78",
		title: "srd.text table-only catalog rows (weapons, armor, class-table columns)",
		expected:
			"Table-only SRD entries keep a rendered table row as srd.text (plus a cache/ pointer) until a prose desc exists in the CC sources; the completeness lint still requires the attachment.",
		context:
			"Weapon.json and Armor.json have no desc field; some ClassFeature.json rows carry [Column data] and the numbers live in ClassFeatureItem.json. The generator renders those rows as text rather than inventing prose.",
		references: ["packages/spellkave-srd-cc/docs/srd-text.md"],
	});

	backlogItemDeclared({
		id: "BL-79",
		title: "srd.text on metadata target kinds the origin/main validator does not yet accept",
		expected:
			"Once metadata attachments may target capability, condition, action, and tag-value rows, those SRD identities receive the same public srd.text payload as entity and resource definitions.",
		context:
			"Today's known target kinds are entity, entity_definition, item_definition, place_*, resource_definition, and affordance_template. Skills, alignments, conditions, and most playing-the-game verbs therefore cannot carry srd.text yet.",
		references: ["packages/spellkave-srd-cc/docs/srd-text.md"],
	});

	backlogItemDeclared({
		id: "BL-71",
		title: "Evoker Sculpt Spells / Metamagic Careful cast-time ally exclusion",
		expected:
			"When casting an Evocation (or Careful-armed) spell that affects other creatures, " +
			"chosen allies automatically succeed saves and take no damage.",
		context:
			"L12c: Careful Spell SP-arm marker LIVE; true per-cast ally exclusion needs a " +
			"cast-time target filter " +
			"(docs/substrate-verdicts/sculpt-spells-cast-rider.md).",
		references: [
			CASTER_FEATURES_DESIGN,
			"packages/spellkave-srd-cc/docs/substrate-verdicts/sculpt-spells-cast-rider.md",
		],
	});
	// BL-57 (spell damage-type routing) RETIRED by lane L6 / sk-609b.6 —
	// every damaging behaviour uses routeDamage / defenseLadder; entities
	// carry srd.damage_type.<type> from the behaviour catalog.

	backlogItemDeclared({
		id: "sk-jay0.1.23.36.22.4-container-disclosure",
		title: "Container disclosure ignores authored open/closed/locked state",
		expected:
			"A closed or locked chest hides its loose contents from srd/pickup disclosure and refuses " +
			"the pickup attempt; opening/unlocking the chest — an AUTHORED scenario gate, not a kernel " +
			"open/closed/locked enum — reveals and admits them again.",
		context:
			"sk-jay0.1.23.36.22.4 canon verdict: `entity_containment` carries no open/closed/locked " +
			"state at all — a grounded, non-body container's loose contents are unconditionally " +
			"disclosed as core/contained targets today (server/src/world_interaction/affordance_" +
			"materialiser/observed_targets.rs). Closing a container is scenario content (a condition, a " +
			"gate predicate, a DM-authored fact), not a kernel primitive to add speculatively.",
		references: [
			"packages/spellkave-srd-cc/src/chapters/playing-the-game/fragments/pickup.ts",
			"server/src/world_interaction/affordance_materialiser/observed_targets.rs",
		],
	});

	backlogItemDeclared({
		id: "BL-80",
		title: "Service.json rows are services, not items",
		expected:
			"Twenty-nine Service.json rows are srd/service identities with cost_cp. srd-2024_stabling-per-day stays srd/item/stabling-per-day. Inn-stay and meal lifestyle cells are those service pks, not new items.",
		context:
			"sk-jay0.3.19.4. Declared pks: srd-2024_lifestyle-aristocratic, srd-2024_lifestyle-comfortable, srd-2024_lifestyle-modest, srd-2024_lifestyle-poor, srd-2024_lifestyle-squalid, srd-2024_lifestyle-wealthy, srd-2024_lifestyle-wretched, srd-2024_lodging-aristocratic, srd-2024_lodging-comfortable, srd-2024_lodging-modest, srd-2024_lodging-poor, srd-2024_lodging-squalid, srd-2024_lodging-wealthy, srd-2024_meal-aristocratic, srd-2024_meal-comfortable, srd-2024_meal-modest, srd-2024_meal-poor, srd-2024_meal-squalid, srd-2024_meal-wealthy, srd-2024_messenger, srd-2024_skilled-hireling, srd-2024_spellcasting-cantrip, srd-2024_spellcasting-level-1, srd-2024_spellcasting-level-2, srd-2024_spellcasting-level-3, srd-2024_spellcasting-level-4-5, srd-2024_spellcasting-level-6-8, srd-2024_spellcasting-level-9, srd-2024_untrained-hireling. Ale (mug), Bread (loaf), Cheese (wedge), Wine (bottle) Common, and Wine (bottle) Fine are goods, compiled from the table, not services.",
		references: ["packages/spellkave-srd-cc/docs/equipment-catalogue.md"],
	});

	// BL-81 retired: srd-2024_spell-scroll and srd-2024_ioun-stone are compiled
	// as srd/magic_item identities by markdown-gap.ts.

	backlogItemDeclared({
		id: "BL-82",
		title: "Oil dousing, Alchemist's Fire burning and object targets stay unmodelled",
		expected:
			"A thrown Oil flask covers a creature that fails its Dexterity save; that creature takes an extra 5 Fire damage the next time it takes Fire damage within 1 minute. A creature hit by Alchemist's Fire starts burning: 1d4 Fire damage at the start of each of its turns until it spends an action to put the fire out. Acid and Alchemist's Fire can also be thrown at an object.",
		context:
			"sk-jay0.3.19.6 slice 1 shipped the throw verbs for Acid, Alchemist's Fire (the 1d4 Fire hit) and Holy Water (src/chapters/equipment/thrown-consumables.ts), offered at srd.creature targets only. " +
			"Oil, route ruled out: a covered-in-oil condition hook on Layer2.ResourceDelta filtering the Text fact $event.detail.template_id against the fire-dealing consequence templates (patterns/condition-hook-on-event.md). template_id names a consequence template, not a damage type: the shared Melee/Ranged Attack templates route every damage type through one template by the wielded item's damage-type tag, so a fire weapon hit is indistinguishable from a slashing one, and the list of fire templates is an open set the hook would have to enumerate and keep in sync. The detail's other facts (resource_id, entity_id, delta, new_value) name no type either, so no Oil verb ships. " +
			"Burning, route ruled out: the caster-attributed pulse (ADR-0054 caster-attributed autonomy jobs, ADR-0055 anchored lingering hazard zones; spells' lingering_damage_zone shape, patterns/lingering-hazard-zone.md). The pulse fans ForEachActorInRadius over a place anchor: it would not follow the burning creature when it moves, would burn every co-located creature, fires per round rather than at the holder's turn start, and has no authored end for 'spend an action and go prone'. Layer2.TurnStart condition hooks do not expose whose turn started (condition-hook-on-event.md), so a holder-bound pulse is not expressible either. " +
			"Object targets: the resolution reads target.effective('srd/dex') and the hit writes srd/hp; objects carry neither. " +
			"Run before-filing-a-kernel-gap.md before filing any of these as a kernel gap.",
		references: [
			"packages/spellkave-srd-cc/docs/equipment-catalogue.md",
			"packages/spellkave-world-author/docs/patterns/condition-hook-on-event.md",
			"packages/spellkave-world-author/docs/patterns/lingering-hazard-zone.md",
			"specifications/adr/0054-caster-attributed-autonomy-jobs.md",
			"specifications/adr/0055-anchored-lingering-hazard-zones.md",
		],
	});

	backlogItemDeclared({
		id: "BL-83",
		title: "Hunting Trap, a doused Oil space and the hazards' entry trigger stay unmodelled",
		expected:
			"A set Hunting Trap springs once on the creature that steps on its plate: DC 13 Dexterity save or 1d4 Piercing damage and Speed 0, then the creature stays chained until a DC 13 Strength (Athletics) check frees it, each failure dealing 1 Piercing damage. Oil poured on a space burns once lit, dealing 5 Fire damage to a creature that enters or ends its turn there, once per turn, for 2 rounds. Caltrops and Ball Bearings affect a creature that ENTERS their area, once per turn, and stay until recovered.",
		context:
			"sk-jay0.3.19.6 slice 2 shipped srd/item/caltrops/spread and srd/item/ball-bearings/spill on lingering-hazard-zone (src/chapters/equipment/area-hazards.ts): a self-only Utilize verb spends the item, spares every creature already on the user's node until its own next turn start (srd/condition/hazard/<slug>/present), and schedules a subject-bound pulse there; each round for 10 rounds every srd.creature on the node that is not spared rolls d20 + Dexterity modifier (no save proficiency) against the DC or takes the effect (1 Piercing + Speed 0 until its next turn start; Prone) plus srd/condition/hazard/<slug>/struck until its next turn start. The shared Monster Death and PC Unconscious carriers follow in the pulse, so a creature brought to 0 HP by it is Dead or Unconscious. " +
			"Differences kept: the pulse hits a creature STANDING on the node at a round, once per turn, not one that ENTERS. Outside a combat session every world tick is a turn start and due turn-start expiries fire before autonomy jobs in the same tick, so a creature that stays on the node (the user included) is hit from the first pulse on; inside a session the spared creatures wait for their own next turn. The pulse ends after 10 rounds (ADR-0054 D-4 requires a bound) and the public marker after 11 ticks; the item is not recoverable. " +
			"Entry trigger, route ruled out: the node-entry action binding (spatial_niche_attachment.on_entry_action_id, dispatched from r_move) is resolved at manifest apply only, and no frame write creates one, so a hazard set down in play cannot use it; filed as gap candidate sk-jay0.2.44. " +
			"Hunting Trap, not shipped: the pulse cannot express 'springs once on the first creature, then stays shut on it' (one pulse would hit every occupant at the next tick; several would bite again each round), and the chain and escape check are BL-87's binding gap. " +
			"Oil space, not shipped: the burning phase would fit a 2-round pulse, but ignition ('if lit') has no authored trigger; lighting it by fire damage needs the same damage-type-aware hook BL-82 names for dousing a creature. " +
			"Speed 0 (srd/condition/speed-zero, FlatSet 0 on srd/speed-walk) is applied live; its movement refusal rests on finding #90's reducer path and is not re-proven by a move attempt here. " +
			"Run before-filing-a-kernel-gap.md before filing any of these as a kernel gap.",
		references: [
			"packages/spellkave-srd-cc/docs/equipment-catalogue.md",
			"packages/spellkave-world-author/docs/patterns/lingering-hazard-zone.md",
			"packages/spellkave-world-author/docs/lingering-hazard-zones.md",
			"specifications/adr/0054-caster-attributed-autonomy-jobs.md",
			"specifications/adr/0055-anchored-lingering-hazard-zones.md",
			"sk-jay0.2.44",
		],
	});

	backlogItemDeclared({
		id: "BL-84",
		title: "Timed consumables stay catalogue-only",
		expected:
			"Antitoxin, perfume, and basic poison apply a timed condition or poison rider when used.",
		context:
			"sk-jay0.3.19. Pattern candidates: consumable-inventory-consume and condition-hook-on-event.",
		references: ["packages/spellkave-srd-cc/docs/equipment-catalogue.md"],
	});

	backlogItemDeclared({
		id: "BL-85",
		title: "Healer's kit charges stay catalogue-only",
		expected: "A healer's kit has ten uses and can stabilize a creature at 0 hit points.",
		context:
			"sk-jay0.3.19. Pattern candidate: resource-spend-with-option-menu. srd/condition/stable exists. No charges authored here.",
		references: ["packages/spellkave-srd-cc/docs/equipment-catalogue.md"],
	});

	backlogItemDeclared({
		id: "BL-86",
		title: "Check-bonus gear stays catalogue-only",
		expected:
			"Book, map, crowbar, costume, magnifying glass, portable ram, pole, and military saddle can grant a check bonus or advantage while used.",
		context:
			"sk-jay0.3.19. Pattern candidate: equip-gated-modifier. The bonus still needs a scoped check fact, not a generic always-on modifier.",
		references: ["packages/spellkave-srd-cc/docs/equipment-catalogue.md"],
	});

	backlogItemDeclared({
		id: "BL-87",
		title: "Binding gear stays catalogue-only",
		expected: "Manacles, chain, rope, and net can restrain a creature that fails an escape check.",
		context:
			"sk-jay0.3.19. Needs a Restrained condition if canon does not already treat it as plain content.",
		references: ["packages/spellkave-srd-cc/docs/equipment-catalogue.md"],
	});

	backlogItemDeclared({
		id: "BL-88",
		title: "Light sources have no light-level mechanic",
		expected:
			"Torch, candle, lamp, bullseye lantern, and hooded lantern emit a light radius. The srd.item.light tag is identity only.",
		context:
			"sk-jay0.3.19. No light-level substrate is consumed by these rows. Canon-warden before calling it a kernel gap.",
		references: ["packages/spellkave-srd-cc/docs/equipment-catalogue.md"],
	});

	backlogItemDeclared({
		id: "BL-89",
		title: "Movement and terrain gear stays catalogue-only",
		expected:
			"Grappling hook, climber's kit, ladder, block and tackle, iron spikes, lock, shovel, and spyglass do not yet change climb, fall, or lock state.",
		context:
			"sk-jay0.3.19. Lock disclosure is already ledgered as sk-jay0.1.23.36.22.4-container-disclosure. Climb and fall remain substrate candidates.",
		references: ["packages/spellkave-srd-cc/docs/equipment-catalogue.md"],
	});

	backlogItemDeclared({
		id: "BL-90",
		title: "Tool Utilize and Craft are not item-bound actions",
		expected:
			"Each tool's Utilize DC and Craft list is an item-bound action, or an explicit declaration that the generic check path covers it.",
		context:
			"sk-jay0.3.19. Tool proficiency capabilities exist. This pass compiles the missing tool identities only.",
		references: ["packages/spellkave-srd-cc/docs/equipment-catalogue.md"],
	});

	backlogItemDeclared({
		id: "BL-91",
		title: "Weapon properties other than finesse and reach have no consumer",
		expected:
			"Ammunition, heavy, light, loading, thrown, two-handed, and versatile tags change an attack or a damage die, or name the missing substrate.",
		context:
			"sk-jay0.3.19. Only srd.weapon.property.finesse and .reach have has_tag consumers. Not authored here.",
		references: ["packages/spellkave-srd-cc/docs/equipment-catalogue.md"],
	});

	backlogItemDeclared({
		id: "BL-92",
		title: "Weapon masteries Push, Cleave, and Nick are not ledgered as live",
		expected:
			"Push, Cleave, and Nick either have a consumer or a substrate bead. Topple's missing Constitution save is the same family.",
		context:
			"sk-jay0.3.19. Verdict: packages/spellkave-srd-cc/docs/substrate-verdicts/weapon-mastery-on-hit-riders.md. Sap, Slow, Topple, Graze, and Vex are live.",
		references: [
			"packages/spellkave-srd-cc/docs/substrate-verdicts/weapon-mastery-on-hit-riders.md",
		],
	});

	backlogItemDeclared({
		id: "BL-93",
		title: "Armor stealth, Strength, training, and don/doff are not consumed",
		expected:
			"srd/armor_stealth_disadvantage and srd/armor_str_required are read by a predicate or modifier, and armor training plus don/doff time are either modelled or still declared.",
		context:
			"sk-jay0.3.19. The facts are seeded. No predicate reads them. Don/doff is equipment.md:592-603.",
		references: ["packages/spellkave-srd-cc/docs/equipment-catalogue.md"],
	});

	backlogItemDeclared({
		id: "BL-95",
		title: "Non-expressible SRD potions stay identity-only",
		expected:
			"Each MagicItem.json potion outside the expressible set stays identity-only until its named substrate exists.",
		context:
			"sk-jay0.3.19.5. These reasons live here, not in a generator map. oil-of-etherealness: Etherealness 7th-level planar travel is unmechanized in this slice. oil-of-sharpness: Temporary weapon coating and +3 bonus are unmechanized in this slice. oil-of-slipperiness: Freedom of Movement / Grease surface creation is unmechanized in this slice. philter-of-love: Charmed condition requires third-party charmer tracking, unmechanized in DSL. potion-of-animal-friendship: Animal Friendship spell behavior is identity-only / beast charm unmechanized. potion-of-clairvoyance: Clairvoyance invisible sensor substrate is unmechanized in this slice. potion-of-diminution: Enlarge/Reduce size change and damage reduction are unmechanized in this slice. potion-of-flying: Fly speed / hover 3D movement mode is unmechanized in this slice. potion-of-gaseous-form: Gaseous Form fly speed and damage resistance package are unmechanized in this slice. potion-of-growth: Enlarge/Reduce size change and damage increase are unmechanized in this slice. potion-of-invisibility: Invisible condition end-on-attack/cast trigger is unmechanized in this slice. potion-of-mind-reading: Detect Thoughts sensor surface is unmechanized in this slice. potion-of-poison: Con save trap resolution and ingested poison delivery are unmechanized in this slice.",
		references: ["packages/spellkave-srd-cc/docs/magic-items-and-loot.md"],
	});

	backlogItemDeclared({
		id: "BL-96",
		title: "Attunement is capped at three magic items",
		expected:
			"A creature can be attuned to no more than three magic items at once, or that limit is still declared.",
		context:
			"sk-jay0.3.19.5. magic-items.md attunement rules. Catalogue rows may tag attunement required or none. No three-item limit is authored.",
		references: ["packages/spellkave-srd-cc/docs/magic-items-and-loot.md"],
	});

	backlogItemDeclared({
		id: "BL-97",
		title: "Magic-item effects by category are not a behaviour family",
		expected:
			"Armor, weapon, potion, ring, rod, staff, wand, wondrous-item, and scroll category effects are either modelled or still declared.",
		context:
			"sk-jay0.3.19.5. Category tags exist on identity rows. No new category-wide effect behaviour was authored in this catalogue pass.",
		references: ["packages/spellkave-srd-cc/docs/magic-items-and-loot.md"],
	});

	backlogItemDeclared({
		id: "BL-99",
		title: "Sample poison effects are not authored",
		expected:
			"Each Sample Poisons heading applies its save, damage, and condition, or that effect is still declared.",
		context:
			"sk-jay0.3.19.4. Catalogue rows exist for Assassin's Blood, Burnt Othur Fumes, Crawler Mucus, Essence of Ether, Malice, Midnight Tears, Oil of Taggit, Pale Tincture, Purple Worm Poison, Serpent Venom, Spider's Sting, Torpor, Truth Serum, and Wyvern Poison. No apply, save, or condition behaviour is authored.",
		references: ["packages/spellkave-srd-cc/docs/sample-poisons.md"],
	});

	backlogItemDeclared({
		id: "BL-98",
		title: "Spell Scroll is not a cast-from-item",
		expected:
			"Reading a spell scroll casts its spell and consumes the scroll, or that cast-from-item behaviour is still declared.",
		context:
			"sk-jay0.3.19.5. srd/magic_item/spell-scroll is an identity row with rules text from magic-items.md. No cast-from-item action is authored.",
		references: ["packages/spellkave-srd-cc/docs/magic-items-and-loot.md"],
	});

	backlogItemDeclared({
		id: "BL-100",
		title: "Trinkets are catalogue identities",
		expected: "Each Trinkets d100 row is srd/trinket/trinket-01 through trinket-100.",
		context:
			"Compiled by character-creation/trinkets.ts. Not a creation-flow mechanic. First cell: 01 A mummified goblin hand; 02 A crystal that faintly glows in moonlight; 03 A gold coin minted in an unknown land; 04 A diary written in a language you don't know; 05 A brass ring that never tarnishes; 06 An old chess piece made from glass; 07 A pair of knucklebone dice, each with a skull symbol on the side that would normally show six pips; 08 A small idol depicting a nightmarish creature that gives you unsettling dreams when you sleep near it; 09 A lock of someone's hair; 10 The deed for a parcel of land in a realm unknown to you; 11 A 1-ounce block made from an unknown material; 12 A small cloth doll skewered with needles; 13 A tooth from an unknown beast; 14 An enormous scale, perhaps from a dragon; 15 A bright-green feather; 16 An old divination card bearing your likeness; 17 A glass orb filled with moving smoke; 18 A 1-pound egg with a bright-red shell; 19 A pipe that blows bubbles; 20 A glass jar containing a bit of flesh floating in pickling fluid; 21 A gnome-crafted music box that plays a song you dimly remember from your childhood; 22 A wooden statuette of a smug halfling; 23 A brass orb etched with strange runes; 24 A multicolored stone disk; 25 A silver icon of a raven; 26 A bag containing forty-seven teeth, one of which is rotten; 27 A shard of obsidian that always feels warm to the touch; 28 A dragon's talon strung on a leather necklace; 29 A pair of old socks; 30 A blank book whose pages refuse to hold ink, chalk, graphite, or any other marking; 31 A silver badge that is a five-pointed star; 32 A knife that belonged to a relative; 33 A glass vial filled with nail clippings; 34 A rectangular metal device with two tiny metal cups on one end that throws sparks when wet; 35 A white, sequined glove sized for a human; 36 A vest with one hundred tiny pockets; 37 A weightless stone; 38 A sketch of a goblin; 39 An empty glass vial that smells of perfume; 40 A gemstone that looks like a lump of coal when examined by anyone but you; 41 A scrap of cloth from an old banner; 42 A rank insignia from a lost legionnaire; 43 A silver bell without a clapper; 44 A mechanical canary inside a lamp; 45 A miniature chest carved to look like it has numerous feet on the bottom; 46 A dead sprite inside a clear glass bottle; 47 A metal can that has no opening but sounds as if it is filled with liquid, sand, spiders, or broken glass (your choice); 48 A glass orb filled with water, in which swims a clockwork goldfish; 49 A silver spoon with an M engraved on the handle; 50 A whistle made from gold-colored wood; 51 A dead scarab beetle the size of your hand; 52 Two toy soldiers, one missing a head; 53 A small box filled with different-sized buttons; 54 A candle that can't be lit; 55 A miniature cage with no door; 56 An old key; 57 An indecipherable treasure map; 58 A hilt from a broken sword; 59 A rabbit's foot; 60 A glass eye; 61 A cameo of a hideous person; 62 A silver skull the size of a coin; 63 An alabaster mask; 64 A cone of sticky black incense that stinks; 65 A nightcap that gives you pleasant dreams when you wear it; 66 A single caltrop made from bone; 67 A gold monocle frame without the lens; 68 A 1-inch cube, each side a different color; 69 A crystal doorknob; 70 A packet filled with pink dust; 71 A fragment of a beautiful song, written as musical notes on two pieces of parchment; 72 A silver teardrop earring containing a real teardrop; 73 An eggshell painted with scenes of misery in disturbing detail; 74 A fan that, when unfolded, shows a sleepy cat; 75 A set of bone pipes; 76 A four-leaf clover pressed inside a book discussing manners and etiquette; 77 A sheet of parchment upon which is drawn a mechanical contraption; 78 An ornate scabbard that fits no blade you have found; 79 An invitation to a party where a murder happened; 80 A bronze pentacle with an etching of a rat's head in its center; 81 A purple handkerchief embroidered with the name of an archmage; 82 Half a floor plan for a temple, a castle, or another structure; 83 A bit of folded cloth that, when unfolded, turns into a stylish cap; 84 A receipt of deposit at a bank in a far-off city; 85 A diary with seven missing pages; 86 An empty silver snuffbox bearing the inscription \"dreams\" on its lid; 87 An iron holy symbol devoted to an unknown god; 88 A book about a legendary hero's rise and fall, with the last chapter missing; 89 A vial of dragon blood; 90 An ancient arrow of elven design; 91 A needle that never bends; 92 An ornate brooch of dwarven design; 93 An empty wine bottle bearing a pretty label that says, \"The Wizard of Wines Winery, Red Dragon Crush, 331422-W\"; 94 A mosaic tile with a multicolored, glazed surface; 95 A petrified mouse; 96 A black pirate flag adorned with a dragon's skull and crossbones; 97 A tiny mechanical crab or spider that moves about when it's not being observed; 98 A glass jar containing lard with a label that reads, \"Griffon Grease\"; 99 A wooden box with a ceramic bottom that holds a living worm with a head on each end of its body; 00 A metal urn containing the ashes of a hero.",
		references: ["packages/spellkave-srd-cc/docs/character-creation-catalogue.md"],
	});

	backlogItemDeclared({
		id: "BL-101",
		title: "Class Overview likes, primary ability, and complexity stay declared",
		expected: "Each Class Overview row is compiled or remains declared.",
		context:
			"Character-creation catalogue. CharacterClass.json primary_abilities is empty for some classes. Rows: Barbarian: likes Battle, primary Strength, complexity Average; Bard: likes Performing, primary Charisma, complexity High; Cleric: likes Gods, primary Wisdom, complexity Average; Druid: likes Nature, primary Wisdom, complexity High; Fighter: likes Weapons, primary Strength or Dexterity, complexity Low; Monk: likes Unarmed combat, primary Dexterity and Wisdom, complexity High; Paladin: likes Defense, primary Strength and Charisma, complexity Average; Ranger: likes Survival, primary Dexterity and Wisdom, complexity Average; Rogue: likes Stealth, primary Dexterity, complexity Low; Sorcerer: likes Power, primary Charisma, complexity High; Warlock: likes Occult lore, primary Charisma, complexity High; Wizard: likes Spellbooks, primary Intelligence, complexity Average.",
		references: ["packages/spellkave-srd-cc/docs/character-creation-catalogue.md"],
	});

	backlogItemDeclared({
		id: "BL-102",
		title: "Ability Scores and Backgrounds pairings are catalogue identities",
		expected: "Each ability-to-background pairing is srd/catalogue/ability-background.",
		context:
			"Compiled by character-creation/catalogue-rows.ts. Rows: Strength pairs with Soldier; Dexterity pairs with Soldier; Constitution pairs with Soldier; Intelligence pairs with Acolyte; Wisdom pairs with Acolyte; Charisma pairs with Acolyte.",
		references: ["packages/spellkave-srd-cc/docs/character-creation-catalogue.md"],
	});

	backlogItemDeclared({
		id: "BL-103",
		title: "Starting Equipment at Higher Levels stays declared",
		expected: "Each higher-level starting-equipment row is compiled or remains declared.",
		context:
			"Character-creation catalogue. Not a creation-flow mechanic. Rows: levels 2\u20134: Normal starting equipment; magic 1 Common; levels 5\u201310: 500 GP plus 1d10 \u00d7 25 GP plus normal starting equipment; magic 1 Common, 1 Uncommon; levels 11\u201316: 5,000 gp plus 1d10 \u00d7 250 GP plus normal starting equipment; magic 2 Common, 3 Uncommon, 1 Rare; levels 17\u201320: 20,000 GP plus 1d10 \u00d7 250 GP plus normal starting equipment; magic 2 Common, 4 Uncommon, 3 Rare, 1 Very Rare.",
		references: ["packages/spellkave-srd-cc/docs/character-creation-catalogue.md"],
	});

	backlogItemDeclared({
		id: "BL-104",
		title: "Multiclass spellcaster slot rows stay declared",
		expected: "Each Multiclass Spellcaster slot row is compiled or remains declared.",
		context:
			"Character-creation catalogue. Not a creation-flow mechanic. Rows: level 1 2 \u2014 \u2014 \u2014 \u2014 \u2014 \u2014 \u2014 \u2014; level 2 3 \u2014 \u2014 \u2014 \u2014 \u2014 \u2014 \u2014 \u2014; level 3 4 2 \u2014 \u2014 \u2014 \u2014 \u2014 \u2014 \u2014; level 4 4 3 \u2014 \u2014 \u2014 \u2014 \u2014 \u2014 \u2014; level 5 4 3 2 \u2014 \u2014 \u2014 \u2014 \u2014 \u2014; level 6 4 3 3 \u2014 \u2014 \u2014 \u2014 \u2014 \u2014; level 7 4 3 3 1 \u2014 \u2014 \u2014 \u2014 \u2014; level 8 4 3 3 2 \u2014 \u2014 \u2014 \u2014 \u2014; level 9 4 3 3 3 1 \u2014 \u2014 \u2014 \u2014; level 10 4 3 3 3 2 \u2014 \u2014 \u2014 \u2014; level 11 4 3 3 3 2 1 \u2014 \u2014 \u2014; level 12 4 3 3 3 2 1 \u2014 \u2014 \u2014; level 13 4 3 3 3 2 1 1 \u2014 \u2014; level 14 4 3 3 3 2 1 1 \u2014 \u2014; level 15 4 3 3 3 2 1 1 1 \u2014; level 16 4 3 3 3 2 1 1 1 \u2014; level 17 4 3 3 3 2 1 1 1 1; level 18 4 3 3 3 3 1 1 1 1; level 19 4 3 3 3 3 2 1 1 1; level 20 4 3 3 3 3 2 2 1 1.",
		references: ["packages/spellkave-srd-cc/docs/character-creation-catalogue.md"],
	});

	backlogItemDeclared({
		id: "BL-105",
		title: "Multiclassing Rule.json pks stay declared",
		expected: "Each srd-2024_multiclassing rule pk is cited by a generator or remains declared.",
		context:
			"Character-creation catalogue. Pks: srd-2024_multiclassing_prerequisties, srd-2024_multiclassing_experience-points, srd-2024_multiclassing_hit-points, srd-2024_multiclassing_proficiencies, srd-2024_multiclassing_class-features, srd-2024_multiclassing_armor-class, srd-2024_multiclassing_extra-attack, srd-2024_multiclassing_spellcasting. The prerequisites pk keeps the cache spelling.",
		references: ["packages/spellkave-srd-cc/docs/character-creation-catalogue.md"],
	});

	backlogItemDeclared({
		id: "BL-106",
		title: "Uncited playing-the-game Rule.json pks stay declared",
		expected:
			"Each playing-the-game Rule.json pk is cited by a generator or remains declared. Rules-glossary headings are definition prose unless they are one of these pks.",
		context:
			"Playing-the-game catalogue. Not a combat or exploration mechanic. Pks: srd-2024_d20-tests_advantage-disadvantage, srd-2024_proficiency_bonus-dont-stack, srd-2024_proficiency_skill-proficiencies, srd-2024_proficiency_saving-throw-proficiencies, srd-2024_proficiency_equipment-proficiencies, srd-2024_social-interaction_roleplaying, srd-2024_social-interaction_ability-checks, srd-2024_exploration_adventuring-equipment, srd-2024_exploration_vision-and-light, srd-2024_exploration_hiding, srd-2024_exploration_marching-order, srd-2024_exploration_hazards, srd-2024_exploration_interacting-with-objects, srd-2024_damage-and-healing_hit-points, srd-2024_damage-and-healing_temporary-hit-points, srd-2024_damage-and-healing_damage-rolls, srd-2024_damage-and-healing_critical-hits, srd-2024_damage-and-healing_saving-throws-and-damage, srd-2024_damage-and-healing_damage-types, srd-2024_damage-and-healing_resistance-and-vulnerability, srd-2024_damage-and-healing_immunity, srd-2024_damage-and-healing_healing, srd-2024_damage-and-healing_resting, srd-2024_damage-and-healing_dropping-to-zero-hit-points, srd-2024_damage-and-healing_knocking-out-a-creature.",
		references: ["packages/spellkave-srd-cc/docs/playing-the-game-catalogue.md"],
	});

	backlogItemDeclared({
		id: "BL-107",
		title: "Three affordance templates still carry an empty capability_id",
		expected:
			"Every affordance template names a capability the acting body can hold, or the empty id is declared here with its reason.",
		context:
			"sk-jay0.1.23.36.22.10 gave the potion consume templates srd/action/consume (granted from srd.creature); sk-jay0.1.23.36.22.17 folded the ten per-potion verbs into one srd/consume verb whose target is the held potion. Still empty on purpose: srd/sense/look/affordance and srd/sense/look/same_substrate (baseline-sensing) are perception affordances whose outcome names no manipulation action, so the materialiser filter never reaches them; srd/bard/spend-bardic-inspiration-die/affordance (caster-features L12c) is gated on holding the Bardic Inspiration condition and needs that condition to grant a capability (condition-grant-and-suppression) before the PLAYER surface can disclose it.",
		references: [
			"packages/spellkave-srd-cc/src/chapters/playing-the-game/fragments/consume.ts",
			"packages/spellkave-world-author/docs/patterns/identity-tag-capability-grant.md",
		],
	});

	backlogItemDeclared({
		id: "BL-94",
		title: "Barding is a cost and weight rule, not a catalogue row",
		expected:
			"Any armor can be bought as barding at four times the armor cost and twice the armor weight, or that rule is still declared.",
		context:
			"sk-jay0.3.19. equipment.md Barding, under Mounts and Vehicles. Not a separate Item.json row. Not modelled in this catalogue pass.",
		references: ["packages/spellkave-srd-cc/docs/equipment-catalogue.md"],
	});

	// BL-77 RETIRED sk-tyhy (2026-08-23) (originally drafted as BL-73, renamed
	// before landing — BL-73/74/75/76 landed on main first, lane-awlo's #2469
	// and #2480) — sorcerer-creation-level2.test.ts /
	// wizard-creation-level2.test.ts standalone hang, root-caused: both files
	// hardcoded imports of the module-level default CANDIDATE_MANIFEST_KEY /
	// DM_MANIFEST_KEY / CANDIDATE_ENTITY_DEF_ID / CANDIDATE_ENTITY_KEY /
	// DM_ENTITY_KEY / STATION_PLACE_NODE_ID constants instead of deriving
	// them from their own harness instance's `identity` — so even given an
	// independent bundleId, driveDmCycle() dispatched runCreationCycle
	// against the wrong (default-bundle) entities. Fixed to derive every
	// manifest key from `harness.identity.*`, matching
	// wizard-creation-level4.test.ts / fighter-creation-level4.test.ts's
	// already-correct pattern; both files now take their own bundleId too,
	// closing the entity-sharing collision with creation-flow.test.ts this
	// same fix's own commit also root-caused.
});
