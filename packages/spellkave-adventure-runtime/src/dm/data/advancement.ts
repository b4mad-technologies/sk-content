// `src/dm/data/` — the DM Runtime Library's DATA layer (ADR-0096, S3),
// dm-generic-advancement-metadata M2
// (`ledger/designs/dm-generic-advancement-metadata.md` §2/§4). Reads the
// `srd.advancement_grant`/`srd.advancement_choice` ADR-0073 metadata
// attachments K1's own `advancement-metadata-units.ts` authors — a GENERIC
// query over `(class, level)`, never a per-class/per-level branch, exactly
// the "the SAME two functions answer 'what does a Wizard get at level 3' and
// 'what does a Fighter get at level 2'" contract the design note names.
//
// SURFACE (design note's own concrete naming): `AuthorTarget.lookup(rowKind,
// filter)` (`@spellkave/tool-authoring`'s `author-target.ts`) — the SAME
// connection-level target `src/dm/creation/seat-steps.ts`'s
// `runCreationCycle` already threads as an OPTIONAL parameter. `lookup`
// returns rows in the manifest's OWN snake_case shape (`ManifestRow = Record
// <string, unknown>`, `author-target.ts:41`'s own doc comment — "never live
// camelCase"), NOT the SDK's `MetadataAttachmentRow` camelCase live-table
// shape (`@spellkave/sdk`'s `readAffordanceGroupMembership` is the sibling
// reader for that DIFFERENT surface — this module deliberately does not
// import from `@spellkave/sdk` at all).
//
// ONE DOCUMENTED EXCEPTION to this DIRECTORY's own "no dependency on the
// server/shared tool runtime authoring surface at all" boundary
// (`./index.ts`'s own module header, SRD BOUNDARY paragraph): every other
// file under `src/dm/data/` reads only this package's own committed
// `cache/` (a build-time fact, the SAME on every host). This module instead
// reads WORLD-side metadata attachments through an `AuthorTarget` — a
// runtime read, not a cache read — because `srd.advancement_grant` rows are
// AUTHORED DATA (ADR-0073 metadata, not a `cache/`-derived rule table), and
// the design note's own concrete surface naming (§2, "How the DM library
// queries it at runtime") is explicit that this is the correct seam. Still
// SRD-boundary clean (ADR-0096 D-3): this module defines no NEW manifest
// rows, no DSL, no server dependency — it only READS rows K1's own generator
// already authored, through the SAME target the creation-dialogue brain
// already threads.
import type { AuthorTarget } from "@spellkave/tool-authoring";

const SRD_BUNDLE = "srd";
const METADATA_ATTACHMENTS_ROW_KIND = "metadata_attachments";
const CAPABILITY_DEFINITIONS_ROW_KIND = "capability_definitions";
const GRANT_TARGET_KIND = "entity_definition";
const GRANT_NAMESPACE = "srd.advancement_grant";
const CHOICE_NAMESPACE = "srd.advancement_choice";

/** One member of a choose-N menu at `(class, level, choiceGroup)` — `srd.advancement_choice`'s own row shape (design note §2), grouped back into one menu per `choiceGroup`. */
export interface AdvancementChoiceGroup {
	choiceGroup: string;
	chooseN: number;
	memberCapabilityIds: readonly string[];
	/** The definition each member grants (`grants_ref`), parallel to `memberCapabilityIds`. */
	memberGrantRefs: readonly string[];
	/** Member id the SRD names as default (D-7 adoption), when authored. */
	recommended: string | null;
	/** `none` (default) or `long_rest_one` — documentary until a rest writer exists. */
	rechoose: "none" | "long_rest_one";
}

/** {@link advancementGrantsForClassLevel}'s own result, split by whether the
 * grant's `capability_definitions` row actually exists on `target` — the
 * `dm-generic-advancement-metadata.md` §4a "M3 baseline split" ruling: grant
 * only what the seeded node can back, and report the per-class remainder as
 * gaps instead of silently dropping it or authoring new SRD capabilities
 * from the DM layer (never this module's job, ADR-0096 D-3). */
export interface GrantableAdvancementCapabilities {
	grantable: readonly string[];
	missingCapabilityDefinitions: readonly string[];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return typeof value === "object" && value !== null
		? (value as Record<string, unknown>)
		: undefined;
}

function asString(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

/**
 * Parse one `metadata_attachments` row's `payload_json` into a plain object,
 * tolerating malformed JSON/non-object payloads by returning `undefined`
 * (same "skip, never throw" posture `@spellkave/sdk`'s
 * `readAffordanceGroupMembership`'s own `parseGroupPayload` uses for the
 * sibling `ui.affordance_group` namespace) — ADR-0073 D-5: payload keys are
 * author-defined, never server-schema-enforced, so a reader must be
 * defensive rather than trust every row's shape.
 */
function parsePayload(payloadJson: unknown): Record<string, unknown> | undefined {
	const raw = asString(payloadJson);
	if (raw === undefined) return undefined;
	try {
		return asRecord(JSON.parse(raw));
	} catch {
		return undefined;
	}
}

/**
 * Every `srd.advancement_grant` capability id granted at `(classSlug,
 * level)` — a pure query over `target.lookup("metadata_attachments", {
 * bundle: "srd" })`'s current contents, filtered by namespace + target_kind
 * + the payload's own `class`/`level` fields. Returns an EMPTY array (never
 * throws) for a class/level combination with no authored rows — "nothing
 * granted here yet" is a legitimate, honest answer (M1 only authors level 1
 * for most classes, plus Fighter's own level 2), not an error.
 */
export function advancementGrantsForClassLevel(
	target: AuthorTarget,
	classSlug: string,
	level: number,
): readonly string[] {
	const rows = target.lookup(METADATA_ATTACHMENTS_ROW_KIND, { bundle: SRD_BUNDLE });
	const out: string[] = [];
	for (const row of rows) {
		if (asString(row.namespace) !== GRANT_NAMESPACE) continue;
		if (asString(row.target_kind) !== GRANT_TARGET_KIND) continue;
		const payload = parsePayload(row.payload_json);
		if (payload === undefined) continue;
		if (payload.class !== classSlug || payload.level !== level) continue;
		const targetRef = asString(row.target_ref);
		if (targetRef !== undefined) out.push(targetRef);
	}
	return out;
}

/**
 * {@link advancementGrantsForClassLevel}'s ids at `(classSlug, level)`, split
 * by whether a `capability_definitions` row with a matching `capability_id`
 * exists on `target.lookup("capability_definitions", { bundle: "srd" })` —
 * pure, deterministic, same defensive-read posture as every other function
 * in this module (a row with no `capability_id` field is simply not counted
 * as backing anything, never thrown on). `grantable` is what a caller may
 * safely `buildCapabilityGrants` today; `missingCapabilityDefinitions` is the
 * per-class remainder still awaiting its own `capability_definitions` row
 * (M4+ scope, never authored here).
 */
export function grantableAdvancementCapabilities(
	target: AuthorTarget,
	classSlug: string,
	level: number,
): GrantableAdvancementCapabilities {
	const grantIds = advancementGrantsForClassLevel(target, classSlug, level);
	const definedIds = new Set(
		target
			.lookup(CAPABILITY_DEFINITIONS_ROW_KIND, { bundle: SRD_BUNDLE })
			.map((row) => asString(row.capability_id))
			.filter((id): id is string => id !== undefined),
	);
	const grantable: string[] = [];
	const missingCapabilityDefinitions: string[] = [];
	for (const id of grantIds) {
		(definedIds.has(id) ? grantable : missingCapabilityDefinitions).push(id);
	}
	return { grantable, missingCapabilityDefinitions };
}

/**
 * Every `srd.advancement_choice` MEMBER row at `(classSlug, level)`,
 * regrouped by their own `choice_group` field into one
 * {@link AdvancementChoiceGroup} per menu. SHAPE-PROVEN, CONTENT-EMPTY as of
 * M1/M2 (dm-generic-advancement-metadata's own M1 scope: no already-authored
 * level-1 choice content exists to cite — see
 * `advancement-metadata-units.ts`'s own header) — returns `[]` until M5/BL-46
 * authors the first real rows; this function's own logic needs no change
 * when that happens; it group by whatever `choice_group` values it finds.
 */
export function advancementChoicesForClassLevel(
	target: AuthorTarget,
	classSlug: string,
	level: number,
): readonly AdvancementChoiceGroup[] {
	const rows = target.lookup(METADATA_ATTACHMENTS_ROW_KIND, { bundle: SRD_BUNDLE });
	const groups = new Map<
		string,
		{
			chooseN: number;
			members: { id: string; grantsRef: string }[];
			recommended: string | null;
			rechoose: "none" | "long_rest_one";
		}
	>();
	for (const row of rows) {
		if (asString(row.namespace) !== CHOICE_NAMESPACE) continue;
		const payload = parsePayload(row.payload_json);
		if (payload === undefined) continue;
		if (payload.class !== classSlug || payload.level !== level) continue;
		const choiceGroup = payload.choice_group;
		const chooseN = payload.choose_n;
		const targetRef = asString(row.target_ref);
		const grantsRef = payload.grants_ref;
		if (
			typeof choiceGroup !== "string" ||
			typeof chooseN !== "number" ||
			typeof grantsRef !== "string" ||
			targetRef === undefined
		) {
			continue;
		}
		const recommended = typeof payload.recommended === "string" ? payload.recommended : null;
		const rechooseRaw = payload.rechoose;
		const rechoose: "none" | "long_rest_one" =
			rechooseRaw === "long_rest_one" ? "long_rest_one" : "none";
		const bucket = groups.get(choiceGroup) ?? {
			chooseN,
			members: [],
			recommended,
			rechoose,
		};
		bucket.members.push({ id: targetRef, grantsRef });
		if (recommended !== null) bucket.recommended = recommended;
		if (rechoose === "long_rest_one") bucket.rechoose = rechoose;
		groups.set(choiceGroup, bucket);
	}
	return [...groups.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([choiceGroup, { chooseN, members, recommended, rechoose }]) => {
			const sorted = [...members].sort((x, y) => x.id.localeCompare(y.id));
			return {
				choiceGroup,
				chooseN,
				memberCapabilityIds: sorted.map((member) => member.id),
				memberGrantRefs: sorted.map((member) => member.grantsRef),
				recommended,
				rechoose,
			};
		});
}
