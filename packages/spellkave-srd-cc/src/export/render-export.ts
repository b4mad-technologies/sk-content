// DOC-IMPL: compendium-export#legacy-contract
import { inspectManifest, ROW_KIND_NATURAL_KEY } from "@spellkave/world-author";

import { docsForKind, generatorForChapter, patternsFromToml, tomlExcerpt } from "./author";
import { isCatalogEntityId, kindChapterForId, REQUIRED_RESOURCES, slugFromId } from "./catalog";
import { stableJson } from "./json";
import { catalogNamesForLinkify, createLinkifier, hrefForCompendiumEntry } from "./linkify";
import { statsFromTags } from "./stats";
import type {
	CompendiumArt,
	CompendiumAttachment,
	CompendiumChapterIndex,
	CompendiumEntry,
	CompendiumIndexEntry,
	CompendiumRootIndex,
	CompendiumRow,
	CompendiumText,
	RenderedCompendiumExport,
} from "./types";

type FixtureRow = Record<string, unknown>;

interface FileRows {
	sourcePath: string;
	chapter: string;
	toml: string;
	byKind: Map<string, FixtureRow[]>;
}

const TOPIC_PATH_PATTERN = /^base\/([^/]+)\/(?:([^/]+)\/)?([^/]+)\.toml$/;
const ART_NAMESPACE_SUFFIX = ".art.image";

function schemaPreamble(manifestToml: string): string {
	const directive = manifestToml.match(/^#:schema[^\n]+/m)?.[0];
	const version = manifestToml.match(/^schema_version\s*=\s*[^\n]+/m)?.[0];
	if (directive === undefined || version === undefined) {
		throw new Error("compendium-export: root manifest is missing its schema preamble");
	}
	return `${directive}\n${version}\n`;
}

function asRows(value: unknown): FixtureRow[] {
	if (!Array.isArray(value)) return [];
	return value.filter(
		(row): row is FixtureRow => row !== null && typeof row === "object" && !Array.isArray(row),
	);
}

function stringField(row: FixtureRow, name: string): string {
	const value = row[name];
	return typeof value === "string" ? value : "";
}

function parseTopics(manifestToml: string, files: Record<string, string>): FileRows[] {
	const preamble = schemaPreamble(manifestToml);
	const topics: FileRows[] = [];
	for (const [sourcePath, toml] of Object.entries(files)) {
		const match = TOPIC_PATH_PATTERN.exec(sourcePath);
		if (match === null) continue;
		const chapter = match[1];
		if (chapter === undefined) continue;
		const manifest = inspectManifest(`${preamble}\n${toml}`).manifest as Record<string, unknown>;
		const byKind = new Map<string, FixtureRow[]>();
		for (const [kind, value] of Object.entries(manifest)) {
			const rows = asRows(value);
			if (rows.length > 0) byKind.set(kind, rows);
		}
		topics.push({ sourcePath, chapter, toml, byKind });
	}
	return topics;
}

function parsePayload(raw: unknown): Record<string, unknown> {
	if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
		return raw as Record<string, unknown>;
	}
	if (typeof raw !== "string" || raw.trim().length === 0) return {};
	try {
		const parsed: unknown = JSON.parse(raw);
		if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
			return parsed as Record<string, unknown>;
		}
	} catch {
		return {};
	}
	return {};
}

function rowKey(kind: string, row: FixtureRow, ordinal: number): string {
	const natural = ROW_KIND_NATURAL_KEY[kind];
	if (natural !== undefined) {
		const value = row[natural];
		if (typeof value === "string" && value.length > 0) return value;
	}
	return `${kind}:${ordinal}`;
}

function srdTextFromAttachments(attachments: CompendiumAttachment[]): CompendiumText | null {
	const row = attachments.find((attachment) => attachment.namespace === "srd.text");
	if (row === undefined) return null;
	const verbatim = row.payload.text;
	if (typeof verbatim !== "string" || verbatim.trim().length === 0) return null;
	return {
		verbatim,
		format: "markdown",
		attachment_namespace: "srd.text",
	};
}

function parseCachePointer(source: string): { cache_path: string; primary_key: string } {
	const open5e = /^cache\/open5e\/([^ ]+) pk[= ](.+)$/.exec(source);
	if (open5e?.[1] !== undefined && open5e[2] !== undefined) {
		return { cache_path: `cache/open5e/${open5e[1]}`, primary_key: open5e[2] };
	}
	const markdown = /^(cache\/markdown\/\S+)$/.exec(source);
	if (markdown?.[1] !== undefined) {
		const [path, range] = markdown[1].split(":");
		return {
			cache_path: path ?? markdown[1],
			primary_key: range ?? "",
		};
	}
	if (source.startsWith("cache/")) {
		return { cache_path: source, primary_key: "" };
	}
	return { cache_path: "", primary_key: source };
}

function artFromAttachments(attachments: CompendiumAttachment[]): CompendiumArt | null {
	const row = attachments.find(
		(attachment) =>
			attachment.namespace === "srd.art.image" ||
			attachment.namespace.endsWith(ART_NAMESPACE_SUFFIX),
	);
	if (row === undefined) return null;
	const path = row.payload.path;
	if (typeof path !== "string" || path.length === 0) return null;
	const hash = typeof row.payload.hash === "string" ? row.payload.hash : "";
	const license = typeof row.payload.license === "string" ? row.payload.license : "";
	const native =
		typeof row.payload.native_px === "number"
			? row.payload.native_px
			: typeof row.payload.native_px === "string"
				? Number(row.payload.native_px)
				: null;
	return {
		path,
		hash,
		license,
		native_px: native !== null && Number.isFinite(native) ? native : null,
	};
}

function chapterTitle(chapter: string): string {
	return chapter
		.split("-")
		.map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
		.join(" ");
}

function entryPath(id: string): string {
	return `entries/${id}.json`;
}

function indexRow(entry: CompendiumEntry): CompendiumIndexEntry {
	const search = [entry.name, entry.kind, entry.description_short, entry.text?.verbatim ?? ""]
		.join(" ")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 200);
	return {
		id: entry.id,
		name: entry.name,
		kind: entry.kind,
		chapter: entry.chapter,
		slug: entry.slug,
		tags: entry.tags,
		search_text: search,
		art_thumb: entry.art?.path ?? null,
		has_art: entry.art !== null,
	};
}

/**
 * Project committed/generated base fixtures into the nested per-entry JSON
 * the website copies at build time. Pure: does not write disk.
 */
export function renderCompendiumExport(
	manifestToml: string,
	files: Record<string, string>,
): RenderedCompendiumExport {
	const topics = parseTopics(manifestToml, files);
	const catalogIds = new Set<string>();
	const attachmentsByRef = new Map<string, CompendiumAttachment[]>();
	const tagsByEntity = new Map<string, string[]>();
	const entities = new Map<string, { row: FixtureRow; file: FileRows }>();
	const resources = new Map<string, { row: FixtureRow; file: FileRows }>();

	for (const file of topics) {
		for (const row of file.byKind.get("entity_definitions") ?? []) {
			const id = stringField(row, "entity_def_id");
			if (isCatalogEntityId(id)) {
				catalogIds.add(id);
				entities.set(id, { row, file });
			}
		}
		for (const row of file.byKind.get("resource_definitions") ?? []) {
			const id = stringField(row, "resource_definition_id");
			if (REQUIRED_RESOURCES.includes(id)) {
				catalogIds.add(id);
				resources.set(id, { row, file });
			}
		}
		for (const row of file.byKind.get("entity_definition_tag") ?? []) {
			const id = stringField(row, "entity_def_id");
			const tag = stringField(row, "tag");
			if (id.length === 0 || tag.length === 0) continue;
			const list = tagsByEntity.get(id) ?? [];
			list.push(tag);
			tagsByEntity.set(id, list);
		}
		for (const row of file.byKind.get("resource_definition_tag") ?? []) {
			const id = stringField(row, "resource_definition_id");
			const tag = stringField(row, "tag");
			if (id.length === 0 || tag.length === 0) continue;
			const list = tagsByEntity.get(id) ?? [];
			list.push(tag);
			tagsByEntity.set(id, list);
		}
		for (const row of file.byKind.get("metadata_attachments") ?? []) {
			const targetRef = stringField(row, "target_ref");
			if (targetRef.length === 0) continue;
			const attachment: CompendiumAttachment = {
				namespace: stringField(row, "namespace"),
				target_kind: stringField(row, "target_kind"),
				target_ref: targetRef,
				payload: parsePayload(row.payload_json),
			};
			const list = attachmentsByRef.get(targetRef) ?? [];
			list.push(attachment);
			attachmentsByRef.set(targetRef, list);
		}
	}

	const entries: CompendiumEntry[] = [];
	for (const id of [...catalogIds].sort()) {
		const mapping = kindChapterForId(id);
		if (mapping === undefined) continue;
		const hosted = entities.get(id) ?? resources.get(id);
		if (hosted === undefined) continue;
		const attachments = attachmentsByRef.get(id) ?? [];
		const tags = [...new Set(tagsByEntity.get(id) ?? [])].sort();
		const text = srdTextFromAttachments(attachments);
		const pointer =
			typeof attachments.find((row) => row.namespace === "srd.text")?.payload.source === "string"
				? String(attachments.find((row) => row.namespace === "srd.text")?.payload.source)
				: "";
		const parsed = parseCachePointer(pointer);
		const name =
			stringField(hosted.row, "display_name") || stringField(hosted.row, "name") || slugFromId(id);
		const ownedRows: CompendiumRow[] = [];
		for (const [kind, rows] of hosted.file.byKind) {
			for (const [ordinal, row] of rows.entries()) {
				const key = rowKey(kind, row, ordinal);
				const owns =
					key === id ||
					stringField(row, "entity_def_id") === id ||
					stringField(row, "resource_definition_id") === id ||
					stringField(row, "target_ref") === id;
				if (!owns) continue;
				ownedRows.push({ kind, key, fields: row });
			}
		}
		const links: { rel: string; id: string }[] = [];
		for (const row of ownedRows) {
			for (const value of Object.values(row.fields)) {
				if (typeof value !== "string" || value === id) continue;
				if (catalogIds.has(value)) links.push({ rel: "ref", id: value });
			}
		}
		const uniqueLinks = [...new Map(links.map((link) => [`${link.rel}:${link.id}`, link])).values()]
			.sort((left, right) => left.id.localeCompare(right.id))
			.map((link) => ({ ...link, name: "", kind: "", href: "" }));

		entries.push({
			id,
			corpus: "srd",
			kind: mapping.kind,
			chapter: mapping.chapter,
			slug: slugFromId(id),
			name,
			description_short: stringField(hosted.row, "description"),
			text,
			source: {
				label: "SRD 5.2.1",
				cache_path: parsed.cache_path,
				primary_key: parsed.primary_key,
				fixture_path: hosted.file.sourcePath,
			},
			stats: statsFromTags(tags),
			tags,
			art: artFromAttachments(attachments),
			rows: ownedRows,
			attachments,
			author: {
				generator: generatorForChapter(mapping.chapter),
				patterns: patternsFromToml(hosted.file.toml),
				docs: docsForKind(mapping.kind),
				source_excerpt: tomlExcerpt(hosted.file.toml, id),
			},
			links: uniqueLinks,
		});
	}

	const linkify = createLinkifier(catalogNamesForLinkify(entries));
	const byId = new Map(entries.map((entry) => [entry.id, entry]));
	for (const entry of entries) {
		if (entry.text !== null) {
			entry.text = {
				...entry.text,
				verbatim: linkify(entry.text.verbatim, entry.id),
			};
		}
		entry.links = entry.links.map((link) => {
			const target = byId.get(link.id);
			if (target === undefined) {
				return { ...link, name: link.id, kind: "", href: "" };
			}
			return {
				...link,
				name: target.name,
				kind: target.kind,
				href: hrefForCompendiumEntry(target),
			};
		});
	}

	const outFiles: Record<string, string> = {};
	const byChapter = new Map<string, CompendiumEntry[]>();
	for (const entry of entries) {
		outFiles[entryPath(entry.id)] = stableJson(entry);
		const list = byChapter.get(entry.chapter) ?? [];
		list.push(entry);
		byChapter.set(entry.chapter, list);
	}

	const chapters: CompendiumRootIndex["chapters"] = [...byChapter.keys()].sort().map((id) => ({
		id,
		name: chapterTitle(id),
		count: byChapter.get(id)?.length ?? 0,
	}));

	const root: CompendiumRootIndex = {
		generated_at: "deterministic",
		entry_count: entries.length,
		corpus: "srd",
		chapters,
	};
	outFiles["index.json"] = stableJson(root);

	const searchEntries: CompendiumIndexEntry[] = [];
	for (const chapter of chapters) {
		const chapterEntries = (byChapter.get(chapter.id) ?? []).sort((left, right) =>
			left.id.localeCompare(right.id),
		);
		const filters = [
			...new Set(chapterEntries.flatMap((entry) => entry.stats.map((stat) => stat.key))),
		].sort();
		const chapterIndex: CompendiumChapterIndex = {
			id: chapter.id,
			name: chapter.name,
			count: chapterEntries.length,
			filters,
			entries: chapterEntries.map(indexRow),
		};
		outFiles[`chapters/${chapter.id}.json`] = stableJson(chapterIndex);
		searchEntries.push(...chapterIndex.entries);
	}
	outFiles["search.json"] = stableJson(
		searchEntries.sort((left, right) => left.id.localeCompare(right.id)),
	);

	return {
		files: outFiles,
		entryCount: entries.length,
		entryIds: entries.map((entry) => entry.id),
	};
}
