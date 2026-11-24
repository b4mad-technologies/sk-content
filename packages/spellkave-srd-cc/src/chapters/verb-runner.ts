// Shared verb-call driver for every chapter generator in this package
// (AGENTS.md "one authoring engine" invariant): drives the SAME AUTHOR-facing
// tool an agent would call (`@spellkave/tool-authoring`'s
// `createAuthorFacingBoundTools`) against a throwaway in-memory workspace, so
// every fixture byte is rendered/validated through
// `@spellkave/tool-authoring` -> `@spellkave/world-author` — never
// hand-rolled TOML, and never a direct `@spellkave/world-author` dependency
// (that stays tool-authoring's own re-export surface; see
// `ledger/findings.md` for the two symbols this package needed and how
// they got there).
import {
	type AuthorTarget,
	type AuthorToolContext,
	type AuthorWorkspace,
	createAuthorFacingBoundTools,
	renderManifestInclude,
	type SetMetadataParams,
	type SetMetadataUpdate,
	splitIncludedManifestMetadata,
	stripManifestHeaders,
} from "@spellkave/tool-authoring";
import {
	driveManifestScene,
	nodeToolCapability,
	type VerbCall,
	VerbRunnerError,
} from "@spellkave/tool-node";
import { inspectManifest, renderManifestToml, renderSchemaManifest } from "@spellkave/world-author";
import { parse, stringify } from "smol-toml";

import { BUNDLE_ROW } from "../bundle-row";
import { overlayGeneratedToml, overlayRuleFlavor } from "../flavor/overlay";
import { equipmentSlotDefinitionRows } from "./equipment/slot-definition-rows";
import {
	buildBoundaryUnits,
	buildEconomyChannelUnits,
} from "./playing-the-game/action-economy-units";
import { dslMacroDefinitionRows } from "./playing-the-game/macro-units";
import { buildTagValueDefinitionUnits } from "./playing-the-game/tag-value-vocabulary";

export type { VerbCall } from "@spellkave/tool-node";
export { VerbRunnerError } from "@spellkave/tool-node";

/**
 * Finding #66 workaround (`ledger/archive/findings-details.md`): a bare
 * `outcome_graphs` + `outcome_graph_nodes` pair cannot be written through
 * `spellkave_write_rows`, because each call re-validates the whole scratch
 * manifest and each row kind's first write is fatal without the other
 * (MF-VAL-259 "root_node_id has no authored nodes" / "references missing
 * outcome_graph"). This pseudo-step appends BOTH row kinds to the scratch
 * workspace in one step; the NEXT real verb in the same scene re-validates the
 * whole merged manifest, so nothing reaches a fragment unvalidated —
 * `runCalls` refuses a scene that ends on this step. Remove once an authoring
 * verb can write a graph atomically.
 */
export const OUTCOME_GRAPH_ROWS_STEP = "srd-cc:outcome-graph-rows";

export function outcomeGraphRowsCall(
	label: string,
	rows: {
		outcome_graphs: Record<string, unknown>[];
		outcome_graph_nodes: Record<string, unknown>[];
		outcome_graph_edges?: Record<string, unknown>[];
	},
): VerbCall {
	return { toolName: OUTCOME_GRAPH_ROWS_STEP, label, params: rows };
}

const OUTCOME_GRAPH_ROW_KINDS = new Set([
	"outcome_graphs",
	"outcome_graph_nodes",
	"outcome_graph_edges",
]);

function appendOutcomeGraphRows(workspace: AuthorWorkspace, step: VerbCall): void {
	for (const key of Object.keys(step.params)) {
		if (!OUTCOME_GRAPH_ROW_KINDS.has(key)) {
			throw new Error(
				`verb-runner: '${step.label}' may only append outcome graph rows, not '${key}'.`,
			);
		}
	}
	const current = workspace.readToml();
	if (current === null) {
		throw new Error(`verb-runner: '${step.label}' needs an authored workspace to append to.`);
	}
	workspace.writeToml(`${current.trimEnd()}\n\n${stringify(step.params)}\n`);
}

/** One atomic call to the public metadata verb; callers author values, not manifest rows. */
export function metadataCall(
	label: string,
	bundle: string | undefined,
	updates: readonly SetMetadataUpdate[],
): VerbCall {
	if (updates.length === 0) throw new Error(`verb-runner: '${label}' has no metadata updates.`);
	const [singleUpdate] = updates;
	const params: SetMetadataParams =
		updates.length === 1 && singleUpdate !== undefined
			? { ...(bundle === undefined ? {} : { bundle }), ...singleUpdate }
			: { ...(bundle === undefined ? {} : { bundle }), updates: [...updates] };
	return {
		toolName: "spellkave_set_metadata",
		label,
		params: params as Record<string, unknown>,
	};
}

function memoryWorkspace(): AuthorWorkspace {
	let current: string | null = null;
	return {
		readToml: () => current,
		writeToml: (toml: string) => {
			current = toml;
			return "(in-memory)";
		},
	};
}

/**
 * The two-call bundle-header authoring sequence (finding #20,
 * `ledger/findings.md`): `spellkave_define_bundle` (deliberate
 * `depends_on`, the verb's whole point — finding #8) has NO params for the
 * post-#2008 vocabulary declaration fields (`tag_prefixes`,
 * `allow_flat_tags`), so when the row declares vocabulary, a
 * `spellkave_write_rows` UPSERT of the same row (single-column natural key:
 * replaces in place) follows to add them. Fold the second call away once the
 * verb grows the params.
 */
function bundleHeaderCalls(bundleRow: Record<string, unknown>): VerbCall[] {
	const { tag_prefixes, allow_flat_tags, ...verbParams } = bundleRow;
	const calls: VerbCall[] = [
		{ toolName: "spellkave_define_bundle", label: "bundle-header", params: verbParams },
	];
	if (tag_prefixes !== undefined || allow_flat_tags !== undefined) {
		calls.push({
			toolName: "spellkave_write_rows",
			label: "bundle-header-tag-vocabulary (finding #20 workaround)",
			params: {
				bundle: String(bundleRow.bundle_id),
				kind: "bundles",
				rows: [bundleRow],
			},
		});
	}
	return calls;
}

/**
 * Seed exact values beside the declared header in every srd unit workspace.
 * Ref-typed tag validation runs at each individual authoring call, so the
 * definitions must be visible before a later capability/resource writes one
 * of the declared values; the root bundle still renders these rows once in
 * its own generated fragment.
 */
function tagValueVocabularySeedCall(): VerbCall {
	return {
		toolName: "spellkave_write_rows",
		label: "tag-value-vocabulary-seed",
		params: {
			bundle: String(BUNDLE_ROW.bundle_id),
			kind: "tag_value_definitions",
			rows: buildTagValueDefinitionUnits().map(({ tag, prefix, description }) => ({
				tag,
				prefix,
				bundle_id: BUNDLE_ROW.bundle_id,
				description,
			})),
		},
	};
}

function actionEconomySeedCalls(): VerbCall[] {
	return [
		{
			toolName: "spellkave_write_rows",
			label: "action-economy-boundary-seed",
			params: {
				bundle: String(BUNDLE_ROW.bundle_id),
				kind: "boundary_definitions",
				rows: buildBoundaryUnits(),
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "action-economy-channel-seed",
			params: {
				bundle: String(BUNDLE_ROW.bundle_id),
				kind: "economy_channel_definitions",
				rows: buildEconomyChannelUnits(),
			},
		},
	];
}

/**
 * Seed the central macro catalog into each isolated validation workspace.
 * Macro definitions remain authored once in `macros.toml`; this copy exists
 * only so predicates in another fragment can resolve their typed calls.
 */
function dslMacroDefinitionSeedCall(): VerbCall {
	return {
		toolName: "spellkave_write_rows",
		label: "dsl-macro-definition-seed",
		params: {
			bundle: String(BUNDLE_ROW.bundle_id),
			kind: "dsl_macro_definitions",
			rows: dslMacroDefinitionRows(),
		},
	};
}

/**
 * Drive a SEQUENCE of calls against ONE shared throwaway workspace scoped to
 * `bundle` — the shared engine both {@link driveUnitFragment} (one call) and
 * {@link driveUnitScene} (many, cross-referencing calls) reduce to.
 */
async function runCalls(
	bundle: string,
	calls: readonly VerbCall[],
	target?: AuthorTarget,
	options: {
		seedActionEconomyDefinitions?: boolean;
		seedDslMacroDefinitions?: boolean;
	} = {},
): Promise<string> {
	const workspace = memoryWorkspace();
	const context: AuthorToolContext =
		target === undefined
			? { workspace, defaultBundle: bundle }
			: { workspace, defaultBundle: bundle, target };
	const tools = createAuthorFacingBoundTools(context, { node: nodeToolCapability });
	// Post-#2008, the tag-grammar warnings (MF-VAL-297/298) validate every
	// tagged row against the bundle's DECLARED vocabulary — but a throwaway
	// unit workspace would otherwise start from `ensureBundleScaffold`'s bare
	// namespace-only auto-header. Seed the REAL declared header first (verb-
	// driven, same finding-#20 sequence the root render uses); it is discarded
	// from the fragment by `stripManifestHeaders` exactly like the scaffold
	// header was.
	const seedCalls =
		bundle === String(BUNDLE_ROW.bundle_id)
			? [
					...bundleHeaderCalls(BUNDLE_ROW),
					tagValueVocabularySeedCall(),
					{
						toolName: "spellkave_write_rows",
						label: "equipment-slot-validation-seed",
						params: {
							bundle,
							kind: "equipment_slot_definitions",
							rows: equipmentSlotDefinitionRows(),
						},
					},
					...(options.seedActionEconomyDefinitions === false ? [] : actionEconomySeedCalls()),
					...(options.seedDslMacroDefinitions === false ? [] : [dslMacroDefinitionSeedCall()]),
				]
			: [];
	const steps = [...seedCalls, ...calls];
	const last = steps.at(-1);
	if (last?.toolName === OUTCOME_GRAPH_ROWS_STEP) {
		throw new Error(
			`verb-runner: '${last.label}' is the last step — a real verb must follow it so the appended graph rows are validated.`,
		);
	}
	for (const step of steps) {
		if (step.toolName === OUTCOME_GRAPH_ROWS_STEP) {
			appendOutcomeGraphRows(workspace, step);
			continue;
		}
		const flavored = overlayRuleFlavor(step);
		const tool = tools.find((t) => t.name === flavored.toolName);
		if (tool === undefined) {
			throw new Error(`verb-runner: tool '${flavored.toolName}' is not registered.`);
		}
		const result = await tool.execute(`srd-cc-gen-${flavored.label}`, flavored.params);
		const details = (result as { details: { ok: boolean; diagnostics?: unknown } }).details;
		if (!details.ok) {
			throw new VerbRunnerError(step.label, step.toolName, details.diagnostics);
		}
	}
	const toml = workspace.readToml();
	if (toml === null) {
		const labels = calls.map((c) => c.label).join(", ");
		throw new Error(`verb-runner: call(s) [${labels}] produced no rows.`);
	}
	return overlayGeneratedToml(toml);
}

/**
 * Drive ONE verb call against a fresh, throwaway workspace scoped to `bundle`
 * and return the header-stripped fragment TOML (no `[[bundles]]`/`[metadata]`
 * — see `stripManifestHeaders`'s own doc comment). Every write verb self-
 * scaffolds a `[[bundles]]` header the first time it sees a new bundle
 * (`ensureBundleScaffold`, shared tool runtime's `authoring-verbs.ts`) with
 * `depends_on: ["core"]` — irrelevant here because the header is discarded
 * outright by `stripManifestHeaders`. The REAL bundle header
 * (`depends_on = []`, drop-in identity) is authored once, separately, by
 * {@link renderManifestRoot} (finding #3, `ledger/findings.md`).
 *
 * One call per throwaway workspace (rather than accumulating many calls into
 * one shared workspace) is a deliberate per-unit choice for THIS package: it
 * makes "one TOML block per generated unit" trivial to produce, so the
 * per-unit provenance comment (open5e pk + markdown anchor) a chapter
 * generator prepends lines up exactly with the block it describes.
 */
export async function driveUnitFragment(
	bundle: string,
	call: VerbCall,
	options: {
		retainTagValueDefinitions?: boolean;
		retainMetadata?: boolean;
		/**
		 * A unit that AUTHORS new `tag_value_definitions` rows (rather than
		 * merely relying on the seeded existing vocabulary) sees BOTH the
		 * seed rows `tagValueVocabularySeedCall` writes first AND its own new
		 * rows in the same throwaway workspace — `retainTagValueDefinitions`
		 * alone can't tell them apart (it is an all-or-nothing keep/strip
		 * toggle over every `[[tag_value_definitions]]` block). Pass the
		 * exact `tag` values this call authors to keep ONLY those blocks and
		 * drop the carried-over seed rows (already shipped by whichever
		 * fragment owns them) — first consumer:
		 * `character-creation/index.ts`'s `srd.alignment*` fragment, the
		 * first tag_value_definitions rows a chapter OTHER than
		 * playing-the-game has authored; second consumer:
		 * `character-creation/language-units.ts`'s `srd.language*` fragment
		 * (C2, `ledger/character-creation.md`).
		 */
		onlyTagValueDefinitionTags?: readonly string[];
		retainDslMacroDefinitions?: boolean;
		seedDslMacroDefinitions?: boolean;
		retainSrdTextNamespace?: boolean;
	} = {},
): Promise<string> {
	const toml = await runCalls(bundle, [call], undefined, options);
	const preserved = splitFragmentForFiltering(toml, options.retainMetadata === true);
	let fragment = stripBundleSubTables(preserved.rowsToml);
	fragment = filterAuthoredEquipmentSlots(fragment, [call]);
	if (options.onlyTagValueDefinitionTags !== undefined) {
		fragment = filterTagValueDefinitionRows(fragment, new Set(options.onlyTagValueDefinitionTags));
	} else if (!options.retainTagValueDefinitions) {
		fragment = stripTagValueDefinitionSeedRows(fragment);
	}
	if (!options.retainDslMacroDefinitions) {
		fragment = stripDslMacroDefinitionSeedRows(fragment);
	}
	if (!options.retainSrdTextNamespace) {
		fragment = stripSrdTextNamespaceSeedRows(fragment);
	}
	return reattachFragmentMetadata(
		normalizeFragment(stripActionEconomyDefinitionSeedRows(fragment)),
		preserved.metadataToml,
	);
}

/**
 * Drive a SEQUENCE of calls against ONE shared throwaway workspace, returning
 * the header-stripped fragment TOML — the multi-call sibling of
 * {@link driveUnitFragment}, for a unit whose rows genuinely cross-reference
 * one another WITHIN the fragment (e.g. a check verb's `action_definitions`
 * row naming its own `consequence_templates`/`outcome_templates` ids, which
 * must already exist in the SAME workspace for the verb layer's referential
 * validation to resolve them — `driveUnitFragment`'s one-call-per-workspace
 * isolation can't express that). First consumer:
 * `generic-check-units.ts`'s shipped 24-verb affordance chain
 * (`playing-the-game/fragments/generic.ts`'s
 * `buildGenericCheckAffordancesFragment`). Same bundle-header
 * seeding + header-stripping as `driveUnitFragment` — this is genuinely the
 * same engine, just handed more than one call.
 */
export async function driveUnitScene(
	bundle: string,
	calls: readonly VerbCall[],
	target?: AuthorTarget,
	options: {
		retainActionEconomyDefinitions?: boolean;
		retainMetadata?: boolean;
		retainDslMacroDefinitions?: boolean;
		seedActionEconomyDefinitions?: boolean;
		seedDslMacroDefinitions?: boolean;
		omitRowKinds?: readonly string[];
		/**
		 * A scene that AUTHORS its own NEW `dsl_macro_definitions` row (rather
		 * than merely relying on the seeded central catalog to resolve a
		 * `macro(...)` call elsewhere in the same scene) sees BOTH the
		 * automatic seed rows (`dslMacroDefinitionSeedCall`, the five
		 * package-wide macros) AND its own new row in the same throwaway
		 * workspace — `retainDslMacroDefinitions` alone can't tell them apart
		 * (all-or-nothing). Pass the exact `macro_id` values this scene
		 * authors to keep ONLY those blocks and drop the carried-over seed
		 * rows (already shipped in `playing-the-game/macros.toml`) — same
		 * idiom as `driveUnitFragment`'s `onlyTagValueDefinitionTags`. First
		 * consumer: `character-creation/advancement-units.ts`'s
		 * `srd/xp_threshold` macro (C4), authored in-scene so the level-up
		 * action's gate predicate can resolve it within the SAME workspace.
		 */
		onlyDslMacroDefinitionIds?: readonly string[];
		/**
		 * The `tag_value_definitions` twin of `onlyDslMacroDefinitionIds`,
		 * with the same semantics as `driveUnitFragment`'s option of the same
		 * name: a scene that AUTHORS its own new tag-value row sees both the
		 * automatic vocabulary seed (`tagValueVocabularySeedCall`) and its own
		 * row in one throwaway workspace, so pass the exact `tag` values this
		 * scene authors to keep ONLY those and drop the carried-over seed.
		 * Without it a scene's own rows are stripped along with the seed
		 * (the default below), which is right for every scene that authors
		 * none.
		 *
		 * sk-0f5 folded `srd.advancement_trainer` into the central
		 * `playing-the-game/tag-value-vocabulary.ts` catalog (bare-`srd` identity
		 * tags register there, they do not grow a second vocabulary file).
		 * **This option is not an invitation to declare per-chapter `srd.*`
		 * vocabulary** — it exists so a scene can keep genuinely scene-local
		 * tag-value rows at all.
		 */
		onlyTagValueDefinitionTags?: readonly string[];
		retainSrdTextNamespace?: boolean;
	} = {},
): Promise<string> {
	const toml = await runCalls(bundle, calls, target, options);
	const preserved = splitFragmentForFiltering(toml, options.retainMetadata === true);
	let fragment = stripBundleSubTables(preserved.rowsToml);
	fragment = filterAuthoredEquipmentSlots(fragment, calls);
	if (options.onlyTagValueDefinitionTags !== undefined) {
		fragment = filterTagValueDefinitionRows(fragment, new Set(options.onlyTagValueDefinitionTags));
	} else {
		fragment = stripTagValueDefinitionSeedRows(fragment);
	}
	if (options.onlyDslMacroDefinitionIds !== undefined) {
		fragment = filterDslMacroDefinitionRows(fragment, new Set(options.onlyDslMacroDefinitionIds));
	} else if (!options.retainDslMacroDefinitions) {
		fragment = stripDslMacroDefinitionSeedRows(fragment);
	}
	if (!options.retainActionEconomyDefinitions) {
		fragment = stripActionEconomyDefinitionSeedRows(fragment);
	}
	for (const rowKind of options.omitRowKinds ?? []) {
		fragment = stripRowKind(fragment, rowKind);
	}
	if (!options.retainSrdTextNamespace) {
		fragment = stripSrdTextNamespaceSeedRows(fragment);
	}
	return reattachFragmentMetadata(normalizeFragment(fragment), preserved.metadataToml);
}

/**
 * Legacy row filters are intentionally line-oriented, so they must never see
 * authored metadata prose: a Markdown code sample can legitimately resemble
 * a TOML row header. The native splitter removes metadata structurally before
 * those filters run; this renderer reattaches typed metadata afterwards.
 */
function splitFragmentForFiltering(
	toml: string,
	retainMetadata: boolean,
): { rowsToml: string; metadataToml: string } {
	if (!retainMetadata) return { rowsToml: stripManifestHeaders(toml), metadataToml: "" };
	const { metadata, rowsToml } = splitIncludedManifestMetadata(
		renderManifestInclude(toml, { retainMetadata: true }),
	);
	const metadataToml = normalizeFragment(
		renderManifestInclude(renderSchemaManifest({ schema_version: "1.0.0", metadata }), {
			retainMetadata: true,
		}),
	);
	return { rowsToml, metadataToml };
}

function reattachFragmentMetadata(rowsToml: string, metadataToml: string): string {
	return metadataToml.length === 0 || rowsToml.length === 0
		? `${metadataToml}${rowsToml}`
		: `${metadataToml}\n${rowsToml}`;
}

/** Validation seeds are context, not fragment-owned rows, even for partial catalogs. */
function filterAuthoredEquipmentSlots(toml: string, calls: readonly VerbCall[]): string {
	const authoredIds = new Set<string>();
	for (const call of calls) {
		if (call.params.kind !== "equipment_slot_definitions" || !Array.isArray(call.params.rows)) {
			continue;
		}
		for (const row of call.params.rows) {
			if (
				row !== null &&
				typeof row === "object" &&
				"slot_id" in row &&
				typeof row.slot_id === "string"
			) {
				authoredIds.add(row.slot_id);
			}
		}
	}
	return toml.replaceAll(/\[\[equipment_slot_definitions\]\]\n(?:[^\n]+\n)*\n?/g, (block) => {
		// Compare decoded identities; admitted IDs can require TOML escaping.
		// Keep the original rendered block so filtering cannot rewrite fixture bytes.
		const rows = parse(block).equipment_slot_definitions;
		const row = Array.isArray(rows) ? rows[0] : undefined;
		return row !== null &&
			typeof row === "object" &&
			"slot_id" in row &&
			typeof row.slot_id === "string" &&
			authoredIds.has(row.slot_id)
			? block
			: "";
	});
}

function stripRowKind(toml: string, rowKind: string): string {
	const escaped = rowKind.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return toml.replaceAll(
		new RegExp(`\\[\\[${escaped}(?:\\.[^\\]]+)?\\]\\]\\n(?:[^\\n]+\\n)*\\n?`, "g"),
		"",
	);
}

/**
 * Finding #20 (second half): `stripManifestHeaders` predates the
 * tag-vocabulary-declaration change and strips only the `[[bundles]]` /
 * `[metadata]` blocks themselves — a bundle row's NESTED array-of-tables
 * (`[[bundles.tag_prefixes]]`, the post-#2008 vocabulary declaration) leaks
 * through into the fragment. Strip those blocks locally until the upstream
 * helper learns about bundle sub-tables; the declaration's home is the root
 * `manifest.toml`'s header, never an `[[include]]` fragment.
 */
function stripBundleSubTables(toml: string): string {
	return toml.replaceAll(/\[\[bundles\.[^\]]+\]\]\n(?:[^\n]+\n)*\n?/g, "");
}

/**
 * Per-unit workspaces seed the complete exact vocabulary so tag resolution is
 * available to every call. Those seed rows belong only in tag-values.toml,
 * not in each independent include fragment.
 */
function stripSrdTextNamespaceSeedRows(toml: string): string {
	return toml.replace(/\[\[metadata_namespaces\]\][\s\S]*?(?=\n\[\[|$)/g, (block) =>
		/\nnamespace = "srd.text"/.test(`\n${block}`) ? "" : block,
	);
}

function stripTagValueDefinitionSeedRows(toml: string): string {
	return toml.replaceAll(/\[\[tag_value_definitions\]\]\n(?:[^\n]+\n)*\n?/g, "");
}

/**
 * Keep only the `[[tag_value_definitions]]` blocks whose `tag` field is in
 * `keepTags`, dropping every other block (the carried-over seed rows) —
 * see {@link driveUnitFragment}'s `onlyTagValueDefinitionTags` doc comment.
 */
function filterTagValueDefinitionRows(toml: string, keepTags: ReadonlySet<string>): string {
	return toml.replaceAll(/\[\[tag_value_definitions\]\]\n(?:[^\n]+\n)*\n?/g, (block) => {
		const match = /\ntag = "([^"]*)"/.exec(`\n${block}`);
		return match?.[1] !== undefined && keepTags.has(match[1]) ? block : "";
	});
}

function stripActionEconomyDefinitionSeedRows(toml: string): string {
	return toml.replaceAll(
		/\[\[(?:boundary_definitions|economy_channel_definitions)\]\]\n(?:[^\n]+\n)*\n?/g,
		"",
	);
}

const DSL_MACRO_DEFINITION_BLOCK_PATTERN =
	/\[\[dsl_macro_definitions\]\][\s\S]*?(?=\n\[\[dsl_macro_definitions\]\]|\n\[\[(?!dsl_macro_definitions\.parameters\]\])|$)/g;

function stripDslMacroDefinitionSeedRows(toml: string): string {
	// A macro owns nested `[[dsl_macro_definitions.parameters]]` rows. Consume
	// those together with the parent seed; removing only the parent would leave
	// orphaned parameter tables in every unrelated fragment.
	const stripped = toml.replace(DSL_MACRO_DEFINITION_BLOCK_PATTERN, "");
	return stripped.replace(/\n{3,}/g, "\n\n");
}

/**
 * Keep only the `[[dsl_macro_definitions]]` blocks (each WITH its own nested
 * `[[dsl_macro_definitions.parameters]]` rows) whose `macro_id` is in
 * `keepIds`, dropping every other block (the carried-over central-catalog
 * seed rows) — see {@link driveUnitScene}'s `onlyDslMacroDefinitionIds` doc
 * comment.
 */
function filterDslMacroDefinitionRows(toml: string, keepIds: ReadonlySet<string>): string {
	const filtered = toml.replace(DSL_MACRO_DEFINITION_BLOCK_PATTERN, (block) => {
		const match = /\nmacro_id = "([^"]*)"/.exec(`\n${block}`);
		return match?.[1] !== undefined && keepIds.has(match[1]) ? block : "";
	});
	return filtered.replace(/\n{3,}/g, "\n\n");
}

/** Keep independent generated fragments composable with exactly one trailing newline. */
function normalizeFragment(toml: string): string {
	return toml.replace(/\n+$/, "\n");
}

/** One independent per-entity `spellkave_define_entity_type` call, batched for validation but still split into its own file. */
export interface BatchEntity {
	/** e.g. `srd/spell/acid-splash` — the exact `entity_def_id` the call will produce (`${bundle}/${call.params.id}`), used to route this entity's own rows back out of the shared batch. */
	entityDefId: string;
	call: VerbCall;
	/** Additional rows owned by this definition, validated in the same workspace. */
	extraCalls?: readonly VerbCall[];
	/** Child definition ids whose rendered rows belong in this entity's file. */
	ownedEntityDefIds?: readonly string[];
}

// Non-greedy up to the NEXT top-level `[[kind]]` header (or end of string),
// the SAME lookahead idiom `DSL_MACRO_DEFINITION_BLOCK_PATTERN` already uses
// above — required because a field value can be a TOML multi-line string
// (`"""..."""`, e.g. a long spell description) spanning blank lines, which
// a line-by-line pattern (`(?:[^\n]+\n)*`) stops matching at prematurely,
// truncating the block before its own `entity_def_id` field.
const TOML_BLOCK_PATTERN = /\[\[[a-zA-Z0-9_.]+\]\][\s\S]*?(?=\n\[\[|$)/g;

/**
 * Split ONE combined fragment TOML — the output of a batched
 * {@link driveUnitScene} call authoring MANY independent per-entity rows —
 * back into ONE fragment PER ENTITY, keyed by its own `entity_def_id`
 * (#2124: decoupling render/validation granularity from file granularity).
 * Pure string filtering, the SAME idiom `filterTagValueDefinitionRows`/
 * `filterDslMacroDefinitionRows` already use above, generalized across
 * every row kind a `spellkave_define_entity_type` call can produce
 * (`entity_definitions`, `entity_definition_tag`,
 * `entity_definition_initial_state` — all keyed by `entity_def_id`, cache-
 * verified against this package's own committed fixtures). `[[metadata_attachments]]`
 * rows (srd.text) are routed by `target_ref` matching the same entity id.
 * Throws loudly on a block with no recognized id — a batch is expected to carry
 * ONLY entity-owned rows (seed rows are already stripped by
 * {@link driveUnitScene}'s own post-processing before this runs), so an
 * unrecognized block means the batch's own call shape changed underneath
 * this function.
 */
export function splitEntityRows(
	toml: string,
	entityDefIds: readonly string[],
): Map<string, string> {
	const blocksById = new Map<string, string[]>(entityDefIds.map((id) => [id, []]));
	for (const [block] of toml.matchAll(TOML_BLOCK_PATTERN)) {
		const header = /^\[\[([^\]]+)\]\]/.exec(block)?.[1];
		const idMatch = /\nentity_def_id = "([^"]*)"/.exec(`\n${block}`);
		const targetRef =
			header === "metadata_attachments"
				? /\ntarget_ref = "([^"]*)"/.exec(`\n${block}`)?.[1]
				: undefined;
		const entityDefId = idMatch?.[1] ?? targetRef;
		const bucket = entityDefId === undefined ? undefined : blocksById.get(entityDefId);
		if (bucket === undefined) {
			throw new Error(
				`verb-runner: splitEntityRows found a block with no recognized entity_def_id:\n${block}`,
			);
		}
		bucket.push(block);
	}
	const result = new Map<string, string>();
	// Each captured block's own trailing newline stops right after its last
	// field (the lookahead above consumes the blank-line separator without
	// including it) — join with an extra "\n" to restore the standard
	// one-blank-line spacing between this entity's own row-kind blocks.
	for (const [id, blocks] of blocksById) result.set(id, normalizeFragment(blocks.join("\n")));
	return result;
}

/**
 * #2124 (decoupling render/validation granularity from file granularity,
 * operator directive 2026-08-06 for the per-entity fixture layout itself):
 * batch MANY independent `spellkave_define_entity_type` calls into fixed-
 * size GROUPS, validating each group as ONE throwaway workspace
 * ({@link driveUnitScene}) — restoring the PRE-per-entity-file validation
 * cost (one workspace per batch of ~30-40, not one per entity) — then
 * splitting each group's own combined fragment back into one fragment PER
 * ENTITY ({@link splitEntityRows}). The rendered per-entity FILE layout is
 * unchanged; only the internal render/validation cost is. `seedCalls` run
 * ONCE per batch (e.g. a chapter's own tag-value catalog seed), not once
 * per entity — {@link driveUnitScene}'s own post-processing already strips
 * every seed-row kind it knows about before this function's own split runs.
 */
export async function driveEntityBatch(
	bundle: string,
	entities: readonly BatchEntity[],
	batchSize: number,
	target?: AuthorTarget,
	seedCalls: readonly VerbCall[] = [],
	options: { omitRowKinds?: readonly string[] } = {},
): Promise<Map<string, string>> {
	const groups: BatchEntity[][] = [];
	for (let index = 0; index < entities.length; index += batchSize) {
		groups.push(entities.slice(index, index + batchSize));
	}
	const groupTomls = await Promise.all(
		groups.map((group) =>
			driveUnitScene(
				bundle,
				// extraCalls first: definition-level equipment may reference a natural-weapon
				// entity_def authored in extraCalls (MF-VAL-311 if the parent entity_type runs first).
				[...seedCalls, ...group.flatMap((entity) => [...(entity.extraCalls ?? []), entity.call])],
				target,
				options,
			),
		),
	);
	const result = new Map<string, string>();
	for (const [index, group] of groups.entries()) {
		const combined = groupTomls[index];
		if (combined === undefined) {
			throw new Error(`verb-runner: driveEntityBatch group ${index} produced no result.`);
		}
		const split = splitEntityRows(
			combined,
			group.flatMap((entity) => [entity.entityDefId, ...(entity.ownedEntityDefIds ?? [])]),
		);
		for (const entity of group) {
			const fragments = [entity.entityDefId, ...(entity.ownedEntityDefIds ?? [])].map(
				(id) => split.get(id) ?? "",
			);
			result.set(entity.entityDefId, normalizeFragment(fragments.join("\n")));
		}
	}
	return result;
}

/**
 * Author the bundle's OWN `[[bundles]]` header row directly via
 * `spellkave_define_bundle` — the deliberate first-class verb
 * (`packages/spellkave-tool-authoring/src/authoring-verbs.ts`) that closed
 * finding #8 (`ledger/findings.md`): this package's ONLY
 * `spellkave_write_rows` use WAS authoring this same header via the
 * `kind: "bundles"` escape hatch (finding #3) — a smell for exactly this
 * missing verb, now resolved. `spellkave_define_bundle`'s required, explicit
 * `depends_on` param is how `[]` (drop-in identity with the sister's `srd`
 * bundle) is authored deliberately, instead of the OTHER write verbs' own
 * silent `["core"]` auto-scaffold default. Returns the full root
 * `manifest.toml` text: the rendered `[[bundles]]` header followed by one
 * `[[include]]` block per `includePaths` entry (a pure loader-level directive,
 * never schema-validated content — same convention
 * `@spellkave/world-author`'s `authoring-harness.ts` `renderManifestToml`
 * uses).
 */
export async function renderManifestRoot(
	bundleRow: Record<string, unknown>,
	includePaths: readonly string[],
	target?: AuthorTarget,
	metadata?: Record<string, unknown>,
	/** ADR-0145: the applyset this root names; omitted for non-seed roots. */
	applyset?: string,
): Promise<string> {
	// Vocabulary-declaring rows go through the finding-#20 two-call sequence —
	// see `bundleHeaderCalls`'s own doc comment.
	const calls = bundleHeaderCalls(bundleRow);
	if (metadata !== undefined && Object.keys(metadata).length > 0) {
		calls.push(
			metadataCall(
				"manifest-metadata",
				undefined,
				Object.entries(metadata).map(([key, value]) => ({ target: "manifest", key, value })),
			),
		);
	}
	const authoredToml = await driveSrdScene(calls, target);
	const authored = inspectManifest(authoredToml).manifest as Record<string, unknown>;
	const bundles = Array.isArray(authored.bundles) ? authored.bundles : [];
	if (bundles.length !== 1 || bundles[0] === null || typeof bundles[0] !== "object") {
		throw new Error("verb-runner: define_bundle did not produce exactly one bundle header.");
	}
	const authoredMetadata =
		authored.metadata !== null &&
		typeof authored.metadata === "object" &&
		!Array.isArray(authored.metadata)
			? (authored.metadata as Record<string, unknown>)
			: {};
	// Both the normalized bundle header and root metadata have already passed
	// through their author verbs. The shared renderer only adds loader includes.
	return renderManifestToml(
		bundles[0] as Record<string, unknown>,
		authoredMetadata,
		includePaths,
		applyset,
	);
}

/**
 * Drive a SEQUENCE of verb calls against ONE shared workspace, returning the
 * final accumulated manifest TOML unstripped (a complete root manifest — own
 * `[[bundles]]` header + every authored row — not an `[[include]]`-ready
 * fragment). Unlike {@link driveUnitFragment} (one throwaway workspace per
 * call, for independent per-unit identity rows), a proof SCENE is genuinely
 * one cohesive manifest built incrementally across several verb calls (bundle
 * header, place, entity type, spawn) that must see each other's prior writes
 * — the same one-workspace-per-cohesive-manifest shape
 * `packages/spellkave-cli` uses for a whole authoring session.
 *
 * `target`, when given, is wired into every call's `AuthorToolContext` so a
 * verb whose row DEPENDS ON another bundle's content (e.g. a proof scene's
 * `depends_on` naming the base identity bundle, or an
 * `entity_definition_initial_state`/`initial_capability` referencing one of
 * that bundle's ids) validates against (target ∪ workspace) instead of the
 * bare workspace in isolation (mirrors `commitOrReport`'s own target-aware
 * validation augmentation, `authoring-verbs.ts`).
 *
 * The driver itself is `@spellkave/tool-node`'s `driveManifestScene`, the one
 * the runtime uses too (sk-jay0.7.174.1); this adds srd-cc's own
 * `overlayGeneratedToml` step.
 */
export async function driveSrdScene(
	calls: readonly VerbCall[],
	target?: AuthorTarget,
): Promise<string> {
	return overlayGeneratedToml(await driveManifestScene(calls, target));
}
