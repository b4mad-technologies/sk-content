#!/usr/bin/env tsx
// The one pipeline for this package (AGENTS.md "Where things go"): render
// every registered chapter (`src/chapters/index.ts`) through the verb layer
// and write the result to `fixtures/`. `fixtures/` is generated + committed +
// inviolable (AGENTS.md) — this is the ONLY script that writes there.
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { renderManifestIncludeRoot } from "@spellkave/tool-authoring";
import { createLocalAuthorTarget } from "@spellkave/tool-node/authoring";
import { inspectManifest, loadBundleChainDetailed } from "@spellkave/world-author";
import { BUNDLE_ROW } from "./bundle-row";
import { buildDmGrantFragment } from "./chapters/classes/dm-act-catalog";
import { buildSrdDmActFragment } from "./chapters/classes/dm-act-units";
import { CHAPTERS } from "./chapters/index";
import { renderManifestRoot } from "./chapters/verb-runner";
import {
	FACTS_METADATA_PATHS,
	READER_PROSE_CHAPTER_GROUPS,
	READER_PROSE_PATHS,
	type ReaderProseChapterGroup,
	renderReaderProseForDocuments,
	renderSrdFactsMetadataFragments,
	srdRootMetadata,
	subjectAttachments,
} from "./compendium-metadata";
import {
	buildContainmentPoliciesFragment,
	CONTAINMENT_POLICIES_PATH,
} from "./containment-policies";
import { catalogueEntriesFromManifest, docsLinkTargetsFromManifest } from "./docs/catalogue";
import { exportCommittedFixtures } from "./export/write";
import { FIXTURES_DIR } from "./fixture-paths";
import {
	parseSubUnitId,
	pipelineUnitIds,
	UI_PIPELINE_UNIT,
	unitsForChapter,
} from "./pipeline-shards";
import { generateUi } from "./ui/index";

export { FIXTURES_DIR } from "./fixture-paths";

// Drop-in identity with the sister's `srd` bundle (AGENTS.md "Drop-in
// identity"): same bundle_id, same slugs — but `depends_on = []` (NOT
// `["core"]`; finding #3, `ledger/findings.md`), since this
// package's own offline test suite validates each fixture standalone, with
// no `core` bundle available to depend on.
// The bundle header row lives in `src/bundle-row.ts` (shared with the
// verb-runner's per-unit workspace seeding — see that module's header).

export interface RenderedBundle {
	/** `fixtures/manifest.toml` content. */
	manifestToml: string;
	/** relPath (under `fixtures/`) -> content, e.g. `base/playing-the-game/abilities.toml`. */
	files: Record<string, string>;
	/**
	 * relPath (under `fixtures/ui/`) -> content, e.g. `ui/self-summary.toml`.
	 * UI-surface curation fragments (`src/ui/`) — editorial membership in a
	 * PLAYER-facing surface, not book content, so kept out of `files` (which
	 * feeds the chapter TOML `base/<chapter>/<topic>.toml` shape);
	 * nothing SRD-sourced to cover, so it carries no coverage evidence either.
	 */
	uiFiles: Record<string, string>;
	/** Always empty — the sibling Markdown projection is retired (sk-jay0.3.5.13). */
	referenceFiles: Record<string, string>;
	/**
	 * relPath (under `fixtures/proofs/`) -> content, e.g.
	 * `playing-the-game-identity.proof.toml` and its review-sized include
	 * fragments. Live proof roots carry their own `[[bundles]]` header and
	 * are deliberately NEVER `[[include]]`d by
	 * `manifestToml` (fixture-hygiene: the shipped bundle stays pure; a proof
	 * is applied explicitly by whoever runs the live test that needs it).
	 */
	proofFiles: Record<string, string>;
	/** Versioned preserve-state delta roots, generated beside the full bundle. */
	migrationFiles: Record<string, string>;
}

const EQUIPMENT_SLOTS_MIGRATION_PATH = "migrations/2026-08-21-equipment-slots.manifest.toml";
// Rendered after the chapter walk; excluded from the playing-the-game slice so
// sharded and full renders place it identically (end of the root manifest).
// Every fragment that lives under a `base/<chapter>/` dir but renders AFTER
// the chapter walk: the art, DM grants and acts, reader prose and facts residuals. A
// sharded render must not copy these from the committed chapter includes, or
// they appear twice and out of place; each is appended by its own renderer.
const POST_WALK_FRAGMENT_PATHS: ReadonlySet<string> = new Set([
	CONTAINMENT_POLICIES_PATH,
	"base/classes/dm-grants.toml",
	"base/classes/dm-acts.toml",
	...READER_PROSE_PATHS,
	...FACTS_METADATA_PATHS,
]);

export interface RenderAllOptions {
	/**
	 * Pipeline units to render (chapter slugs + `ui`). Omit for the whole tree.
	 * Unselected chapters contribute their committed `[[include]]` paths so the
	 * reconstructed root manifest keeps CHAPTERS index order (the include-order
	 * barrier). Proofs overlay this run's fragments on the committed remainder
	 * so a shard still sees a full identity bundle.
	 */
	units?: ReadonlySet<string>;
}

/** `[[include]]` paths from one root manifest, in authored order. */
export function manifestIncludePaths(manifestToml: string): string[] {
	const manifest = inspectManifest(manifestToml).manifest as Record<string, unknown>;
	return Array.isArray(manifest.include)
		? manifest.include.flatMap((include) =>
				include !== null && typeof include === "object" && "path" in include
					? [String(include.path)]
					: [],
			)
		: [];
}

/** `[[include]]` paths from the committed root manifest, in authored order. */
export function committedManifestIncludePaths(): string[] {
	const manifestPath = join(FIXTURES_DIR, "manifest.toml");
	return existsSync(manifestPath) ? manifestIncludePaths(readFileSync(manifestPath, "utf8")) : [];
}

export function readCommittedFixtureFiles(): {
	files: Record<string, string>;
	uiFiles: Record<string, string>;
} {
	const files: Record<string, string> = {};
	const uiFiles: Record<string, string> = {};
	for (const relPath of committedManifestIncludePaths()) {
		const abs = join(FIXTURES_DIR, relPath);
		if (!existsSync(abs)) continue;
		const content = readFileSync(abs, "utf8");
		if (relPath.startsWith("ui/")) uiFiles[relPath] = content;
		else files[relPath] = content;
	}
	return { files, uiFiles };
}

function includePathsForPrefix(committed: readonly string[], prefix: string): string[] {
	return committed.filter((relPath) => relPath.startsWith(prefix));
}

function assertKnownUnits(units: ReadonlySet<string>): void {
	const known = new Set(pipelineUnitIds());
	for (const unit of units) {
		if (!known.has(unit)) {
			throw new Error(
				`unknown pipeline unit ${JSON.stringify(unit)}; known: ${pipelineUnitIds().join(", ")}`,
			);
		}
	}
}

/**
 * Cross-fragment verbs and proof scenes resolve refs (`srd/hp`, `srd/ac`,
 * inherited ability/skill ids) against the COMMITTED `fixtures/` directory —
 * the same "target = committed fixtures/" mechanism
 * `fixtures-author-tool/harness.ts` uses to read it, here used to WRITE against
 * it. This is deliberately the already-committed bundle, not this same run's
 * own in-memory `files` — bootstrapping from committed state is safe because
 * the offline clean-regen gate (`pipeline.test.ts`) already proves a fresh
 * render is byte-identical to what's committed; `undefined` (no committed
 * fixtures/ yet, e.g. the very first `run generate`) falls back to each
 * chapter/proof's own closed-world validation.
 */
function committedFixturesTarget() {
	return existsSync(join(FIXTURES_DIR, "manifest.toml"))
		? createLocalAuthorTarget(FIXTURES_DIR)
		: undefined;
}

/** Render registered chapters (or a shard subset) into one in-memory bundle. */
export async function renderAll(options?: RenderAllOptions): Promise<RenderedBundle> {
	const files: Record<string, string> = {};
	const uiFiles: Record<string, string> = {};
	const proofFiles: Record<string, string> = {};
	const includePaths: string[] = [];
	const committedTarget = committedFixturesTarget();
	const selected = options?.units;
	if (selected !== undefined) assertKnownUnits(selected);
	const committedIncludes = selected === undefined ? [] : committedManifestIncludePaths();
	const shard = selected !== undefined;
	// Reader-prose dispatch (`READER_PROSE_CHAPTER_GROUPS` below): a chapter
	// dir with no entry here has no owning chapter generator and renders
	// centrally instead.
	const chaptersBySlug = new Map(CHAPTERS.map((chapter) => [chapter.slug, chapter]));

	for (const chapter of CHAPTERS) {
		// A chapter's own leaf entity list may be split into sub-units
		// (`ChapterEntry.subUnitCount`, sk-jay0.7.23.28 — `magic-items/1of2`,
		// `2of2`); most chapters have exactly one ("the chapter itself").
		// `selected === undefined` means "everything", including every
		// sub-unit, so a whole-tree render walks this loop identically to
		// before this mechanism existed, just chunked per sub-unit.
		const chapterUnitIds = unitsForChapter(chapter.slug);
		const selectedUnitIds =
			selected === undefined ? chapterUnitIds : chapterUnitIds.filter((id) => selected.has(id));
		if (selectedUnitIds.length === 0) {
			includePaths.push(
				...includePathsForPrefix(committedIncludes, `base/${chapter.slug}/`).filter(
					(relPath) => !POST_WALK_FRAGMENT_PATHS.has(relPath),
				),
			);
			continue;
		}
		if (selectedUnitIds.length === chapterUnitIds.length) {
			// Every sub-unit selected (the common case: a chapter with no
			// sub-units at all, OR — on an unsharded whole-tree render,
			// `selected === undefined` — every sub-unit of a multi-slice one).
			// ONE unsliced call: its fragment insertion order IS this chapter's
			// canonical include order, nothing to reconcile against.
			const startedAt = Date.now();
			const { fragments } = await chapter.generate(committedTarget);
			console.error(
				`[pipeline] chapter ${chapter.slug} ${((Date.now() - startedAt) / 1000).toFixed(1)}s`,
			);
			for (const [relPath, content] of Object.entries(fragments)) {
				files[relPath] = content;
				includePaths.push(relPath);
			}
			continue;
		}
		// PARTIAL: some but not all sub-units selected — a shard row that owns
		// only a slice of a multi-slice chapter. Render just those slices...
		const renderedPaths = new Set<string>();
		for (const unitId of selectedUnitIds) {
			const parsed = parseSubUnitId(unitId);
			const slice = parsed === undefined ? undefined : { index: parsed.index, of: parsed.of };
			const startedAt = Date.now();
			const { fragments } = await chapter.generate(committedTarget, slice);
			console.error(
				`[pipeline] chapter ${unitId} ${((Date.now() - startedAt) / 1000).toFixed(1)}s`,
			);
			for (const [relPath, content] of Object.entries(fragments)) {
				files[relPath] = content;
				renderedPaths.add(relPath);
			}
		}
		// ...but the byte-identity gate compares the FULL assembled manifest,
		// not just this shard's own slice, so the include ORDER for this
		// chapter must match the committed order exactly — walk it, then
		// append any path that's genuinely new (not in the committed tree
		// yet) in this run's own render order, same as a whole-chapter render
		// would for brand-new content.
		// Post-walk fragments (POST_WALK_FRAGMENT_PATHS) stay out of the chapter
		// slice so sharded and full renders agree on their position in the root.
		const committedChapterPaths = includePathsForPrefix(
			committedIncludes,
			`base/${chapter.slug}/`,
		).filter((relPath) => !POST_WALK_FRAGMENT_PATHS.has(relPath));
		includePaths.push(...committedChapterPaths);
		const committedChapterSet = new Set(committedChapterPaths);
		for (const relPath of renderedPaths) {
			if (!committedChapterSet.has(relPath)) includePaths.push(relPath);
		}
	}

	// UI-surface curation renders AFTER the chapter walk (#2119 follow-up):
	// its own root, `fixtures/ui/`, still needs an `[[include]]` in the root
	// manifest for seeding to pick it up, but its fragment(s) are kept out of
	// `files` — see `RenderedBundle.uiFiles`'s doc comment.
	const renderUi = selected === undefined || selected.has(UI_PIPELINE_UNIT);
	if (renderUi) {
		const ui = await generateUi();
		for (const [relPath, content] of Object.entries(ui.fragments)) {
			uiFiles[relPath] = content;
			includePaths.push(relPath);
		}
	} else {
		includePaths.push(...includePathsForPrefix(committedIncludes, "ui/"));
	}


	// Reader prose is author-owned metadata in direct includes, not a giant
	// root table. It is independent from mechanical chapter selection, because
	// the root docs page always references every source-prose include. Each
	// owning chapter generator emits its own reader-prose fragment(s) through
	// `ChapterEntry.generateReaderProse` (a thin wrapper around the shared
	// `renderReaderProseForDocuments` helper, `compendium-metadata.ts`); a
	// document with no owning chapter generator (`rules-glossary`) renders
	// through that same shared helper directly. `gameplay-toolbox` owns its
	// sample-poison catalogue and still uses the shared reader-prose helper.
	// `READER_PROSE_CHAPTER_GROUPS` walks documents in reader-page order, NOT
	// `CHAPTERS`' book order (which places `monsters` before `magic-items`) —
	// that order IS the committed include order, so it must stay the
	// iteration driver here.
	//
	// This is a genuine two-phase render, not a leftover one: MOST documents
	// finish right here, in phase A, before the manifest below is even
	// assembled. Only a document containing a compact-collection page
	// (`docs/collections.toml`) can't finish yet — proving that page's exact
	// `srd.text` source range needs the ASSEMBLED manifest's
	// `metadata_attachments` rows (`compactCollectionBody`), which only exist
	// once every chapter's fragments have been parsed together below. Those
	// documents report `needsAssembledAttachments` and rerun once, in phase B
	// near the assembled manifest; everything else is already final here.
	const readerProseGroupsNeedingAssembledAttachments: ReaderProseChapterGroup[] = [];
	for (const group of READER_PROSE_CHAPTER_GROUPS) {
		const owner = chaptersBySlug.get(group.chapterDir);
		const rendered =
			owner === undefined
				? await renderReaderProseForDocuments(group.documentIds, [])
				: await owner.generateReaderProse([]);
		for (const [relPath, content] of Object.entries(rendered.fragments)) {
			files[relPath] = content;
			includePaths.push(relPath);
		}
		if (rendered.needsAssembledAttachments)
			readerProseGroupsNeedingAssembledAttachments.push(group);
	}
	// A preserve-state delta is rendered through the typed loader-root helper.
	// It references the one generated fragment it needs, so no equipment row,
	// bundle header, or TOML syntax is copied or hand-authored here.
	const migrationFiles = {
		[EQUIPMENT_SLOTS_MIGRATION_PATH]: renderManifestIncludeRoot([
			"../base/equipment/armor-slots.toml",
		]),
		"migrations/2026-11-16-containment-policies.manifest.toml": renderManifestIncludeRoot([
			`../${CONTAINMENT_POLICIES_PATH}`,
		]),
	};
	const committed = shard ? readCommittedFixtureFiles() : { files: {}, uiFiles: {} };
	const assembledFiles = { ...committed.files, ...files };
	const assembledUiFiles = { ...committed.uiFiles, ...uiFiles };
	const referenceFiles: Record<string, string> = {};
	const renderedTargetDir = mkdtempSync(join(tmpdir(), "spellkave-srd-cc-render-"));
	let manifestToml: string;
	try {
		// Catalogue identity comes from the assembled manifest source, not the
		// website/export projection. This means shard renders retain rows from
		// unselected committed fragments while freshly generated fragments win.
		// The provisional root is only a parser input; the emitted root below is
		// authored through the normal metadata verb with the resulting catalogue.
		const provisionalManifestToml = await renderManifestRoot(BUNDLE_ROW, includePaths);
		writeTargetFile(renderedTargetDir, "manifest.toml", provisionalManifestToml);
		for (const [relPath, content] of Object.entries(assembledFiles)) {
			writeTargetFile(renderedTargetDir, relPath, content);
		}
		for (const [relPath, content] of Object.entries(assembledUiFiles)) {
			writeTargetFile(renderedTargetDir, relPath, content);
		}
		const assembled = loadBundleChainDetailed({
			rootManifestPath: join(renderedTargetDir, "manifest.toml"),
			resolveDependency: () => undefined,
		});
		const catalogueBySection = catalogueEntriesFromManifest(assembled.manifest);
		// Definition attachments cover placed and runtime-created containers alike.
		files[CONTAINMENT_POLICIES_PATH] = await buildContainmentPoliciesFragment(
			assembled.manifest,
			createLocalAuthorTarget(renderedTargetDir),
		);
		includePaths.push(CONTAINMENT_POLICIES_PATH);
		writeTargetFile(renderedTargetDir, CONTAINMENT_POLICIES_PATH, files[CONTAINMENT_POLICIES_PATH]);
		// Phase B of the reader-prose render (see the phase-A comment above):
		// only the document groups that reported `needsAssembledAttachments`
		// rerun here, now that the assembled manifest can prove a compact
		// collection's exact srd.text attachment provenance. No includePaths
		// changes — those paths were already reserved in phase A.
		if (readerProseGroupsNeedingAssembledAttachments.length > 0) {
			const assembledAttachments = subjectAttachments(assembled.manifest);
			for (const group of readerProseGroupsNeedingAssembledAttachments) {
				const owner = chaptersBySlug.get(group.chapterDir);
				const rendered =
					owner === undefined
						? await renderReaderProseForDocuments(group.documentIds, assembledAttachments)
						: await owner.generateReaderProse(assembledAttachments);
				for (const [relPath, content] of Object.entries(rendered.fragments)) {
					files[relPath] = content;
					writeTargetFile(renderedTargetDir, relPath, content);
				}
			}
		}
		const catalogueMetadataFragments = await renderSrdFactsMetadataFragments(catalogueBySection);
		for (const [relPath, content] of Object.entries(catalogueMetadataFragments)) {
			files[relPath] = content;
			includePaths.push(relPath);
			writeTargetFile(renderedTargetDir, relPath, content);
		}
		manifestToml = await renderManifestRoot(
			BUNDLE_ROW,
			includePaths,
			undefined,
			srdRootMetadata(catalogueBySection, docsLinkTargetsFromManifest(assembled.manifest)),
			"srd",
		);
		writeTargetFile(renderedTargetDir, "manifest.toml", manifestToml);
		const renderedTarget = createLocalAuthorTarget(renderedTargetDir);
		// Cross-chapter grant membership is grounded in this run's assembled rows.
		const dmGrantPath = "base/classes/dm-grants.toml";
		files[dmGrantPath] = await buildDmGrantFragment(renderedTarget);
		includePaths.push(dmGrantPath);
		writeTargetFile(renderedTargetDir, dmGrantPath, files[dmGrantPath]);
		manifestToml = await renderManifestRoot(
			BUNDLE_ROW,
			includePaths,
			undefined,
			srdRootMetadata(catalogueBySection, docsLinkTargetsFromManifest(assembled.manifest)),
			"srd",
		);
		writeTargetFile(renderedTargetDir, "manifest.toml", manifestToml);
		const dmActPath = "base/classes/dm-acts.toml";
		files[dmActPath] = await buildSrdDmActFragment(createLocalAuthorTarget(renderedTargetDir));
		includePaths.push(dmActPath);
		writeTargetFile(renderedTargetDir, dmActPath, files[dmActPath]);
		manifestToml = await renderManifestRoot(
			BUNDLE_ROW,
			includePaths,
			undefined,
			srdRootMetadata(catalogueBySection, docsLinkTargetsFromManifest(assembled.manifest)),
			"srd",
		);
		writeTargetFile(renderedTargetDir, "manifest.toml", manifestToml);
		for (const chapter of CHAPTERS) {
			if (chapter.generateProofs === undefined) continue;
			// A chapter's proof scenes are generated by that chapter's own
			// generator source (`chapters/<slug>/proof-scene*`), so they are
			// inputs of the SAME unit: an unselected chapter keeps its committed
			// proof files, exactly like its committed fragments
			// (sk-jay0.7.23.31). `pipeline.test.ts` asserts the full proof path
			// set only on a run that rendered the owning chapter. Proofs are
			// chapter-level, not per-sub-unit, so render them whenever ANY of
			// this chapter's sub-units was selected (sk-jay0.7.23.28).
			const anySubUnitSelected =
				selected === undefined || unitsForChapter(chapter.slug).some((id) => selected.has(id));
			if (!anySubUnitSelected) continue;
			for (const [relPath, content] of Object.entries(
				await chapter.generateProofs(renderedTarget),
			)) {
				proofFiles[`proofs/${relPath}`] = content;
			}
		}
	} finally {
		rmSync(renderedTargetDir, { recursive: true, force: true });
	}
	return { manifestToml, files, uiFiles, referenceFiles, proofFiles, migrationFiles };
}

function writeTargetFile(root: string, relPath: string, content: string): void {
	const outPath = join(root, relPath);
	mkdirSync(dirname(outPath), { recursive: true });
	writeFileSync(outPath, content, "utf8");
}

function writeRel(relPath: string, content: string): void {
	writeTargetFile(FIXTURES_DIR, relPath, content);
}

/**
 * Delete direct generated topic files under `base/<chapter>/` that this run
 * did not emit, so a retired or renamed fragment cannot survive beside its
 * replacement. Nested per-entity directories are reconciled by their own
 * generators. Sibling Markdown is pruned separately (`pruneGeneratedBaseMarkdown`).
 */
function pruneStaleBaseTopicFiles(emitted: ReadonlySet<string>): void {
	const baseDir = join(FIXTURES_DIR, "base");
	if (!existsSync(baseDir)) return;
	for (const chapter of readdirSync(baseDir, { withFileTypes: true })) {
		if (!chapter.isDirectory()) continue;
		const chapterDir = join(baseDir, chapter.name);
		for (const entry of readdirSync(chapterDir, { withFileTypes: true })) {
			if (!entry.isFile() || !entry.name.endsWith(".toml")) continue;
			const relPath = `base/${chapter.name}/${entry.name}`;
			if (emitted.has(relPath)) continue;
			rmSync(join(chapterDir, entry.name), { force: true });
		}
	}
}

/** Retire leftover sibling Markdown under `fixtures/base/` (sk-jay0.3.5.13). */
function pruneGeneratedBaseMarkdown(): void {
	const baseDir = join(FIXTURES_DIR, "base");
	const walk = (dir: string): void => {
		if (!existsSync(dir)) return;
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const abs = join(dir, entry.name);
			if (entry.isDirectory()) walk(abs);
			else if (entry.name.endsWith(".md")) rmSync(abs, { force: true });
		}
	};
	walk(baseDir);
}

/** Coverage is test-derived at `fixtures/coverage.md`; retire the old coverage directory. */
function pruneLegacyCoverage(): void {
	rmSync(join(FIXTURES_DIR, "coverage"), { recursive: true, force: true });
}

/** Write the complete generated fixture bundle. Kept explicit so imports stay disk-safe. */
export async function generateFixtures(): Promise<void> {
	const { manifestToml, files, uiFiles, proofFiles, migrationFiles } = await renderAll();
	// Proof layout is generator-owned and may change as scenes are split for
	// review. Reconcile that bounded subtree before writing so retired
	// fragments cannot linger beside the current root includes.
	rmSync(join(FIXTURES_DIR, "proofs"), { recursive: true, force: true });
	rmSync(join(FIXTURES_DIR, "migrations"), { recursive: true, force: true });
	rmSync(join(FIXTURES_DIR, "reference"), { recursive: true, force: true });
	pruneLegacyCoverage();
	pruneGeneratedBaseMarkdown();
	writeRel("manifest.toml", manifestToml);
	for (const [relPath, content] of Object.entries(files)) writeRel(relPath, content);
	for (const [relPath, content] of Object.entries(uiFiles)) writeRel(relPath, content);
	pruneStaleBaseTopicFiles(new Set(Object.keys(files)));
	for (const [relPath, content] of Object.entries(proofFiles)) writeRel(relPath, content);
	for (const [relPath, content] of Object.entries(migrationFiles)) writeRel(relPath, content);
	const total =
		1 +
		Object.keys(files).length +
		Object.keys(uiFiles).length +
		Object.keys(proofFiles).length +
		Object.keys(migrationFiles).length;
	console.log(`[pipeline] wrote ${total} file(s) under ${FIXTURES_DIR}`);
	const exported = exportCommittedFixtures();
	console.log(
		`[pipeline] compendium export ${exported.entryCount} entries (${Object.keys(exported.files).length} files)`,
	);
}
