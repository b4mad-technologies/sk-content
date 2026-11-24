import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { renderManifestInclude } from "@spellkave/tool-authoring";
import { parse as parseToml } from "smol-toml";
import { BUNDLE_ROW } from "./bundle-row";
import { renderManifestRoot } from "./chapters/verb-runner";
import {
	catalogueFactsById,
	type SrdCatalogueEntry,
	type SrdDocsLinkTarget,
} from "./docs/catalogue";
import {
	markdownForMetadata,
	readSrdMarkdownDocumentPages,
	readSrdReaderPagesForSection,
	SRD_MARKDOWN_DOCUMENTS,
	type SrdMarkdownDocument,
	type SrdReaderPage,
} from "./markdown/docs-reader-pages";
import { readPlayingTheGameReaderPages } from "./markdown/playing-the-game";

/**
 * Reader/catalogue metadata files live beside the chapter content they
 * describe, one directory per chapter under `fixtures/base/`, instead of in
 * a shared "docs" bucket. Most document/section ids match their chapter
 * directory name 1:1; the monster document family (`monsters`,
 * `monsters-a-z`, `animals`) is the one exception. `rules-glossary` has no
 * other chapter content. `gameplay-toolbox` also holds the sample-poison
 * catalogue. Both still use a directory of their own name.
 */
const DOCUMENT_CHAPTER_DIR: Readonly<Record<string, string>> = {
	"playing-the-game": "playing-the-game",
	"character-creation": "character-creation",
	"character-origins": "character-origins",
	classes: "classes",
	feats: "feats",
	equipment: "equipment",
	spells: "spells",
	"magic-items": "magic-items",
	monsters: "monsters",
	"monsters-a-z": "monsters",
	animals: "monsters",
	"gameplay-toolbox": "gameplay-toolbox",
	"rules-glossary": "rules-glossary",
};

function chapterDirFor(id: string): string {
	const dir = DOCUMENT_CHAPTER_DIR[id];
	if (dir === undefined) {
		throw new Error(`SRD docs metadata: no chapter directory mapped for document/section '${id}'.`);
	}
	return dir;
}

export function readerMetadataPathForId(id: string): string {
	return `base/${chapterDirFor(id)}/${id}.toml`;
}

const PACKAGE_ROOT = dirname(fileURLToPath(import.meta.url));
const SRD_NOTICE_PATH = join(PACKAGE_ROOT, "../cache/NOTICE.md");
const COLLECTIONS_PATH = join(PACKAGE_ROOT, "docs/collections.toml");
const REPOSITORY_SOURCE_BASE = "";

function readerMetadataPath(document: SrdMarkdownDocument): string {
	return readerMetadataPathForId(document.id);
}

/**
 * Every reader-prose fragment the pipeline renders AFTER the chapter walk: one
 * per SRD markdown document. They live under a chapter directory
 * (`base/playing-the-game/playing-the-game.toml`) but are not chapter output,
 * so a sharded render must not copy them from the committed chapter includes,
 * or they are included twice and out of place.
 */
export const READER_PROSE_PATHS: ReadonlySet<string> = new Set([
	...SRD_MARKDOWN_DOCUMENTS.map(readerMetadataPath),
]);

/**
 * The 3 of 9 docs sections whose catalogued entities still carry an
 * authored facts residual (sk-jay0.3.5.59: equipment weapon [minus
 * Category]/armor/item cost/weight/damage/…, feat category/prerequisite,
 * class hit die/caster type/subclass class — none of these has a SAFE tag
 * counterpart; see `docs/catalogue.ts`'s own `equipmentFactsById` header for
 * the full per-row finding). The other 6 (spells, monsters, magic-items,
 * playing-the-game, character-creation, character-origins) carry no
 * authored payload of ANY kind — their catalogue listing AND their facts
 * (where they have any) are both derived at website projection time, so
 * this package emits nothing for them at all.
 */
const FACTS_RESIDUAL_SECTIONS: readonly string[] = ["classes", "equipment", "feats"];

/** `srd/class/barbarian` -> `"classes"` / `srd/weapon/dagger` -> `"equipment"` / `srd/feat/alert` -> `"feats"` — the 3 residual sections' own id-prefix boundaries, cache-verified against `REQUIRED_ENTITY_PREFIXES`/`entity_routes` in `sections.toml` (never re-derived from there: this is a closed, 3-branch fixture-family switch, not general placement). */
function factsResidualSectionForRef(ref: string): string | undefined {
	if (ref.startsWith("srd/class/") || ref.startsWith("srd/subclass/")) return "classes";
	if (ref.startsWith("srd/weapon/") || ref.startsWith("srd/armor/") || ref.startsWith("srd/item/"))
		return "equipment";
	if (ref.startsWith("srd/feat/")) return "feats";
	return undefined;
}

function factsResidualMetadataPath(sectionId: string): string {
	return `base/${chapterDirFor(sectionId)}/facts.toml`;
}

/**
 * Every facts-residual fragment path `renderSrdFactsMetadataFragments` can
 * emit. Like `READER_PROSE_PATHS`, these live under a chapter directory
 * (`base/classes/facts.toml`) but render AFTER the chapter walk, so a sharded
 * render must not copy them from the committed chapter includes.
 */
export const FACTS_METADATA_PATHS: ReadonlySet<string> = new Set(
	FACTS_RESIDUAL_SECTIONS.map(factsResidualMetadataPath),
);

function factsResidualMetadataKey(sectionId: string): string {
	return `docs_facts_${sectionId.replaceAll("-", "_")}`;
}

function readerContentPage(page: SrdReaderPage, id = page.id) {
	const document = SRD_MARKDOWN_DOCUMENTS.find((candidate) => candidate.path === page.source.path);
	if (document === undefined) {
		throw new Error(`SRD docs metadata: no source document for '${page.source.path}'.`);
	}
	return {
		id,
		title: page.title,
		content: {
			source_path: readerMetadataPath(document),
			namespace: "docs",
			id: page.id,
		},
	};
}

export type ManifestRows = Record<string, unknown>;

export interface ReaderSubjectAttachment {
	kind: "entity_definition" | "resource_definition";
	ref: string;
	text: string;
	source: string;
}

interface CompactSubjectCollection {
	pageId: string;
	intro: string;
	subjects: readonly {
		kind: "entity_definition" | "resource_definition";
		ref: string;
		view: "compact";
	}[];
}

/** Read author-owned collection relationships; TypeScript contains no page identities. */
export function readCompactSubjectCollections(): ReadonlyMap<string, CompactSubjectCollection> {
	const parsed = parseToml(readFileSync(COLLECTIONS_PATH, "utf8")) as Record<string, unknown>;
	if (!Array.isArray(parsed.collections)) {
		throw new Error("SRD docs metadata: collections.toml must contain [[collections]].");
	}
	const result = new Map<string, CompactSubjectCollection>();
	for (const [index, raw] of parsed.collections.entries()) {
		if (raw === null || typeof raw !== "object") {
			throw new Error(`SRD docs metadata: collections[${index}] must be a table.`);
		}
		const row = raw as Record<string, unknown>;
		if (typeof row.page_id !== "string" || row.page_id.length === 0) {
			throw new Error(`SRD docs metadata: collections[${index}].page_id must be nonempty.`);
		}
		if (typeof row.intro !== "string" || row.intro.trim().length === 0) {
			throw new Error(`SRD docs metadata: collection '${row.page_id}' needs a nonempty intro.`);
		}
		if (!Array.isArray(row.subjects) || row.subjects.length < 2) {
			throw new Error(
				`SRD docs metadata: collection '${row.page_id}' needs at least two subjects.`,
			);
		}
		const subjects = row.subjects.map((rawSubject, subjectIndex) => {
			if (rawSubject === null || typeof rawSubject !== "object") {
				throw new Error(
					`SRD docs metadata: collection '${row.page_id}' subject ${subjectIndex} must be a table.`,
				);
			}
			const subject = rawSubject as Record<string, unknown>;
			if (
				(subject.kind !== "entity_definition" && subject.kind !== "resource_definition") ||
				typeof subject.ref !== "string" ||
				subject.ref.length === 0 ||
				subject.view !== "compact"
			) {
				throw new Error(
					`SRD docs metadata: collection '${row.page_id}' subject ${subjectIndex} needs a supported kind, nonempty ref, and view = "compact".`,
				);
			}
			const kind: "entity_definition" | "resource_definition" = subject.kind;
			const ref: string = subject.ref;
			return { kind, ref, view: "compact" as const };
		});
		if (result.has(row.page_id)) {
			throw new Error(`SRD docs metadata: duplicate collection page '${row.page_id}'.`);
		}
		result.set(row.page_id, { pageId: row.page_id, intro: row.intro, subjects });
	}
	return result;
}

function sourceRange(value: string): { path: string; start: number; end: number } | undefined {
	const match = /^(.*):(\d+)-(\d+)$/u.exec(value);
	if (match?.[1] === undefined || match[2] === undefined || match[3] === undefined)
		return undefined;
	return { path: match[1], start: Number(match[2]), end: Number(match[3]) };
}

export function subjectAttachments(manifest: ManifestRows): readonly ReaderSubjectAttachment[] {
	const result: ReaderSubjectAttachment[] = [];
	for (const row of Array.isArray(manifest.metadata_attachments)
		? manifest.metadata_attachments
		: []) {
		if (row === null || typeof row !== "object") continue;
		const attachment = row as ManifestRows;
		if (
			attachment.namespace !== "srd.text" ||
			(attachment.target_kind !== "entity_definition" &&
				attachment.target_kind !== "resource_definition") ||
			typeof attachment.target_ref !== "string" ||
			typeof attachment.payload_json !== "string"
		)
			continue;
		let payload: unknown;
		try {
			payload = JSON.parse(attachment.payload_json);
		} catch {
			continue;
		}
		if (payload === null || typeof payload !== "object") continue;
		const text = (payload as ManifestRows).text;
		const source = (payload as ManifestRows).source;
		if (typeof text !== "string" || typeof source !== "string") continue;
		result.push({
			kind: attachment.target_kind,
			ref: attachment.target_ref,
			text: markdownForMetadata(text),
			source,
		});
	}
	return result;
}

function compactCollectionBody(
	page: SrdReaderPage,
	attachments: readonly ReaderSubjectAttachment[],
	collection: CompactSubjectCollection | undefined,
): string {
	if (collection === undefined || attachments.length === 0) return page.body;
	const pageRange = page.attachment_sources.map(sourceRange).find((range) => range !== undefined);
	if (pageRange === undefined) {
		throw new Error(`SRD docs metadata: collection page '${page.id}' has no source range.`);
	}
	const attachmentsByIdentity = new Map(
		attachments.map((attachment) => [`${attachment.kind}\0${attachment.ref}`, attachment]),
	);
	const members = collection.subjects.map((subject) => {
		const attachment = attachmentsByIdentity.get(`${subject.kind}\0${subject.ref}`);
		if (attachment === undefined) {
			throw new Error(
				`SRD docs metadata: collection '${page.id}' subject '${subject.ref}' has no srd.text attachment.`,
			);
		}
		const range = sourceRange(attachment.source);
		if (
			range === undefined ||
			range.path !== pageRange.path ||
			range.start < pageRange.start ||
			range.end > pageRange.end
		) {
			throw new Error(
				`SRD docs metadata: collection '${page.id}' subject '${subject.ref}' is outside the page source range.`,
			);
		}
		return attachment;
	});
	let remainder = page.body;
	for (const member of members) {
		const first = remainder.indexOf(member.text);
		if (first === -1 || remainder.indexOf(member.text, first + member.text.length) !== -1) {
			throw new Error(
				`SRD docs metadata: '${member.ref}' does not occur exactly once in collection '${page.id}'.`,
			);
		}
		remainder = `${remainder.slice(0, first)}${remainder.slice(first + member.text.length)}`;
	}
	if (remainder.trim().length > 0) {
		throw new Error(
			`SRD docs metadata: collection page '${page.id}' contains prose outside its exact subject attachments.`,
		);
	}
	return [
		collection.intro,
		...collection.subjects.map(
			(subject) => `::subject{kind="${subject.kind}" ref="${subject.ref}" view="${subject.view}"}`,
		),
	].join("\n\n");
}

function isExistingPlayingTheGameFragment(page: SrdReaderPage): boolean {
	return (
		page.id === "playing-the-game-the-six-abilities" || page.id === "playing-the-game-d20-tests"
	);
}

export interface ReaderDocumentFragment {
	relPath: string;
	content: string;
	/**
	 * True when at least one page of this document is authored as a compact
	 * subject collection (`docs/collections.toml`). Such a page's final prose
	 * can only be proven correct once assembled `metadata_attachments` rows
	 * exist for its member subjects — `compactCollectionBody` needs each
	 * member's exact `srd.text` source range, which is only provable against
	 * the ASSEMBLED manifest (every chapter's fragments parsed together), not
	 * a single fragment in isolation. A document with no collection page is
	 * already final after one render, regardless of `attachments` (see the
	 * two-phase render in `pipeline.ts`).
	 */
	needsAssembledAttachments: boolean;
}

/**
 * Render one reader-prose document (`SRD_MARKDOWN_DOCUMENTS`) into its own
 * fragment. The shared per-document core — both `renderReaderProseForDocuments`
 * below (used by every owning chapter's `generateReaderProse` and by the
 * central, no-owning-chapter fallback) and the `renderSrdReaderMetadataFragments`
 * convenience/test entry point call this; neither re-implements page reading
 * or compact-collection substitution.
 */
export async function renderReaderDocumentFragment(
	documentId: string,
	attachments: readonly ReaderSubjectAttachment[],
): Promise<ReaderDocumentFragment | undefined> {
	const document = SRD_MARKDOWN_DOCUMENTS.find((candidate) => candidate.id === documentId);
	if (document === undefined) {
		throw new Error(`SRD docs metadata: unknown reader document id '${documentId}'.`);
	}
	const pages = readSrdMarkdownDocumentPages(document).filter(
		(page) => !isExistingPlayingTheGameFragment(page),
	);
	if (pages.length === 0) return undefined;
	const collections = readCompactSubjectCollections();
	const docs = Object.fromEntries(
		pages.map((page) => [
			page.id,
			{
				body: compactCollectionBody(page, attachments, collections.get(page.id)),
				source: page.source,
			},
		]),
	);
	const root = await renderManifestRoot(BUNDLE_ROW, [], undefined, { docs });
	return {
		relPath: readerMetadataPath(document),
		content: renderManifestInclude(root, { retainMetadata: true }),
		needsAssembledAttachments: pages.some((page) => collections.has(page.id)),
	};
}

export interface ChapterReaderProseResult {
	fragments: Record<string, string>;
	needsAssembledAttachments: boolean;
}

/**
 * Render the reader-prose fragment(s) owned by one chapter (one document id
 * for most chapters, three for `monsters` — `monsters`/`monsters-a-z`/
 * `animals`, `DOCUMENT_CHAPTER_DIR`'s one many-to-one exception). Every
 * `ChapterEntry.generateReaderProse` (`src/chapters/<slug>/index.ts`) is a
 * thin wrapper around this shared helper; it is also the fallback used
 * centrally for a document with no owning chapter generator
 * (`gameplay-toolbox`, `rules-glossary`).
 */
export async function renderReaderProseForDocuments(
	documentIds: readonly string[],
	attachments: readonly ReaderSubjectAttachment[],
): Promise<ChapterReaderProseResult> {
	const fragments: Record<string, string> = {};
	let needsAssembledAttachments = false;
	for (const documentId of documentIds) {
		const rendered = await renderReaderDocumentFragment(documentId, attachments);
		if (rendered === undefined) continue;
		fragments[rendered.relPath] = rendered.content;
		needsAssembledAttachments ||= rendered.needsAssembledAttachments;
	}
	return { fragments, needsAssembledAttachments };
}

export interface ReaderProseChapterGroup {
	/** Chapter directory (a `DOCUMENT_CHAPTER_DIR` value) — may own more than
	 * one reader document (`monsters`: `monsters`/`monsters-a-z`/`animals`). */
	chapterDir: string;
	documentIds: readonly string[];
}

/**
 * `SRD_MARKDOWN_DOCUMENTS` grouped by owning chapter directory
 * (`DOCUMENT_CHAPTER_DIR`, reused here rather than duplicated), deduplicated
 * in first-occurrence order. This IS the committed include order for reader
 * prose fragments in `fixtures/manifest.toml` — `pipeline.ts` walks this
 * list, not `CHAPTERS`' own book-order registration (which places `monsters`
 * before `magic-items`; the reader-page order here places `magic-items`
 * first) — reordering this breaks the byte-identity gate.
 */
export const READER_PROSE_CHAPTER_GROUPS: readonly ReaderProseChapterGroup[] = (() => {
	const order: string[] = [];
	const documentIdsByDir = new Map<string, string[]>();
	for (const document of SRD_MARKDOWN_DOCUMENTS) {
		const dir = chapterDirFor(document.id);
		let ids = documentIdsByDir.get(dir);
		if (ids === undefined) {
			ids = [];
			documentIdsByDir.set(dir, ids);
			order.push(dir);
		}
		ids.push(document.id);
	}
	return order.map((chapterDir) => ({
		chapterDir,
		documentIds: documentIdsByDir.get(chapterDir) as readonly string[],
	}));
})();

/**
 * Render every reader-prose fragment (every chapter-owned document),
 * independent of chapter ownership. Convenience/test entry point built from
 * the same pieces above; `pipeline.ts` itself calls
 * `ChapterEntry.generateReaderProse` / `renderReaderProseForDocuments`
 * directly so it can skip the post-assembly rerun for every document group
 * that doesn't need it (see `ReaderDocumentFragment.needsAssembledAttachments`).
 */
export async function renderSrdReaderMetadataFragments(
	manifest?: ManifestRows,
): Promise<Record<string, string>> {
	const attachments = manifest === undefined ? [] : subjectAttachments(manifest);
	const fragments: Record<string, string> = {};
	for (const group of READER_PROSE_CHAPTER_GROUPS) {
		const rendered = await renderReaderProseForDocuments(group.documentIds, attachments);
		Object.assign(fragments, rendered.fragments);
	}
	return fragments;
}

/**
 * Render the 3 slim facts-only residuals (sk-jay0.3.5.59) — one small file
 * per `FACTS_RESIDUAL_SECTIONS` entry, keyed by entity ref, carrying ONLY
 * `{label, value}` rows. No `kind`/`family`/`slug`/`title` scaffolding
 * (that's the website-derived listing's job, `srd-catalogue-listing.ts`)
 * and no per-section `catalogue_content` pointer on `SRD_DOCS_PAGE` either
 * — `docs_facts_<section>` is a plain top-level `[metadata]` key the
 * website reads directly off each loaded source
 * (`apps/website/src/compendium/project-metadata-docs.ts`'s
 * `residualFactsIndex`), the SAME "second reader of an authored plain key"
 * posture `sections.toml` itself already uses; it deliberately does NOT
 * go through the docs-page JSON schema at all (no catalogue entry shape to
 * satisfy), so adding it needed no schema change.
 *
 * `catalogueBySection` narrows `catalogueFactsById()`'s typed-source union
 * to refs that are ACTUALLY catalogued entities — required, not cosmetic:
 * `equipmentFactsById()` keys facts by every raw `Item.json` pk (`srd/item/
 * <pk>`), most of which back a weapon/armor's own cost/weight lookup and
 * never became a standalone `srd/item/*` entity_definition at all. Skipping
 * this filter emitted ~90 phantom entries with no matching entity (caught
 * by comparing entry counts against the retired `catalogue.toml`'s own
 * 163/495 before regenerating this residual — never trust "it typechecks
 * and runs" for a row-count claim without checking the row count).
 */
export async function renderSrdFactsMetadataFragments(
	catalogueBySection: ReadonlyMap<string, readonly SrdCatalogueEntry[]>,
): Promise<Record<string, string>> {
	const cataloguedRefs = new Set(
		FACTS_RESIDUAL_SECTIONS.flatMap(
			(section) => catalogueBySection.get(section)?.map((entry) => entry.ref) ?? [],
		),
	);
	const factsById = catalogueFactsById();
	const bySection = new Map<
		string,
		Array<{ ref: string; facts: readonly { label: string; value: string }[] }>
	>();
	for (const [ref, facts] of factsById) {
		if (facts.length === 0) continue;
		if (!cataloguedRefs.has(ref)) continue;
		const section = factsResidualSectionForRef(ref);
		if (section === undefined) {
			throw new Error(`SRD docs metadata: facts residual entry '${ref}' matches no known section.`);
		}
		const entries = bySection.get(section) ?? [];
		entries.push({ ref, facts });
		bySection.set(section, entries);
	}
	const fragments: Record<string, string> = {};
	for (const section of FACTS_RESIDUAL_SECTIONS) {
		const entries = [...(bySection.get(section) ?? [])].sort((left, right) =>
			left.ref.localeCompare(right.ref),
		);
		if (entries.length === 0) continue;
		const docs_facts = { [factsResidualMetadataKey(section)]: { entries } };
		const root = await renderManifestRoot(BUNDLE_ROW, [], undefined, docs_facts);
		fragments[factsResidualMetadataPath(section)] = renderManifestInclude(root, {
			retainMetadata: true,
		});
	}
	return fragments;
}

const [RHYTHM_OF_PLAY_PAGE] = readPlayingTheGameReaderPages();
if (RHYTHM_OF_PLAY_PAGE?.id !== "rhythm-of-play") {
	throw new Error("SRD docs metadata: expected Rhythm of Play as the first reader page.");
}

function sourcePages(section: string) {
	return readSrdReaderPagesForSection(section).map((page) => readerContentPage(page));
}

function playingTheGamePages() {
	return readSrdReaderPagesForSection("playing-the-game").map((page) => {
		const id = page.id.replace(/^playing-the-game-/, "");
		if (id === "rhythm-of-play") {
			return {
				id,
				title: page.title,
				content: readerContentPage(page).content,
			};
		}
		if (id === "the-six-abilities") {
			return {
				id,
				title: page.title,
				content: {
					source_path: "base/playing-the-game/abilities.toml",
					namespace: "docs",
					id,
				},
			};
		}
		if (id === "d20-tests") {
			return {
				id,
				title: page.title,
				content: {
					source_path: "base/playing-the-game/d20-tests.toml",
					namespace: "docs",
					id,
				},
			};
		}
		return readerContentPage(page, id);
	});
}

function srdAttributions() {
	const notice = readFileSync(SRD_NOTICE_PATH, "utf8");
	const heading = "# Attribution\n\n";
	if (!notice.startsWith(heading)) {
		throw new Error(
			"SRD docs metadata: cache NOTICE no longer starts with its Attribution heading.",
		);
	}
	return [
		{
			body: notice.slice(heading.length).replace(/\n+$/u, ""),
			source: {
				path: "packages/spellkave-srd-cc/cache/NOTICE.md",
				anchor: "Attribution",
				license: "CC-BY-4.0",
			},
		},
	];
}

/**
 * The SRD's website-facing page metadata. The generator writes this object to
 * the root manifest; the website owns its schema validation and projection.
 * Section ids deliberately match existing compendium chapter ids, so this
 * controls presentation order and prose without classifying catalog entries.
 */
export const SRD_DOCS_PAGE = {
	version: 1,
	source_base: REPOSITORY_SOURCE_BASE,
	attributions: srdAttributions(),
	page_id: "srd",
	title: "System Reference",
	nav_group: "reference",
	intro:
		"Explore the rules and content of the System Reference Document (SRD 5.2.1). Start with Playing the Game, or browse a chapter below.",
	sections: [
		{
			id: "playing-the-game",
			title: "Playing the Game",
			intro: "Core rules for actions, movement, combat, and play.",
			pages: playingTheGamePages(),
		},
		{
			id: "character-creation",
			title: "Character Creation",
			intro: "Rules and options for creating and advancing a character.",
			pages: sourcePages("character-creation"),
		},
		{
			id: "character-origins",
			title: "Character Origins",
			intro: "Species, backgrounds, and traits for creating characters.",
			pages: sourcePages("character-origins"),
		},
		{
			id: "classes",
			title: "Classes",
			intro: "Classes, subclasses, and class features.",
			pages: sourcePages("classes"),
		},
		{
			id: "feats",
			title: "Feats",
			intro: "Feats and character options.",
			pages: sourcePages("feats"),
		},
		{
			id: "equipment",
			title: "Equipment",
			intro: "Weapons, armor, tools, and adventuring gear.",
			pages: sourcePages("equipment"),
		},
		{
			id: "spells",
			title: "Spells",
			intro: "Spells and spellcasting content.",
			pages: sourcePages("spells"),
		},
		{
			id: "magic-items",
			title: "Magic Items",
			intro: "Magic items and their properties.",
			pages: sourcePages("magic-items"),
		},
		{
			id: "monsters",
			title: "Monsters",
			intro: "Creatures and monster stat blocks.",
			pages: sourcePages("monsters"),
		},
		{
			id: "gameplay-toolbox",
			title: "Gameplay Toolbox",
			intro: "Optional rules and guidance for running games.",
			pages: sourcePages("gameplay-toolbox"),
		},
		{
			id: "mechanics",
			title: "Mechanics",
			intro:
				"How the rules actually run: the verb that is attempted, the offer that makes it attemptable, the outcome the world reports, and the consequence that changes something.",
			pages: [],
		},
		{
			id: "tags",
			title: "Tag Vocabulary",
			intro:
				"Every SRD tag value, one page per namespace and per value — the vocabulary rules, DSL predicates, and reference cards key on.",
			pages: [],
		},
		{
			id: "rules-glossary",
			title: "Rules Glossary",
			intro: "Definitions and conventions used throughout the rules.",
			pages: sourcePages("rules-glossary"),
		},
	],
} as const;

/**
 * Root metadata emitted for the generated SRD bundle. Catalogue membership is
 * supplied by the pipeline from its assembled manifest rows, so a shard keeps
 * unselected subjects without consulting a website/export artifact.
 */
export function srdRootMetadata(
	catalogueBySection: ReadonlyMap<string, readonly SrdCatalogueEntry[]>,
	links: readonly SrdDocsLinkTarget[] = [],
) {
	return {
		docs: {
			...SRD_DOCS_PAGE,
			...(links.length === 0 ? {} : { links }),
			sections: SRD_DOCS_PAGE.sections.map((section) => {
				const catalogue = catalogueBySection.get(section.id);
				if (catalogue === undefined || catalogue.length === 0) return section;
				const featuredByPageId = new Map(
					catalogue.flatMap((entry) =>
						entry.reader_page_id === undefined
							? []
							: [[entry.reader_page_id, { kind: entry.kind, ref: entry.ref }] as const],
					),
				);
				return {
					...section,
					...(section.pages
						? {
								pages: section.pages.map((page) => {
									const featuredReference = featuredByPageId.get(page.id);
									return featuredReference === undefined
										? page
										: { ...page, featured_reference: featuredReference };
								}),
							}
						: {}),
				};
			}),
		},
	};
}

/** Static page metadata used by reader-only unit tests before catalogue rows are assembled. */
export const SRD_ROOT_METADATA = srdRootMetadata(new Map());
