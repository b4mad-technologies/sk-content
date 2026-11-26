#!/usr/bin/env tsx
// Build-time Kavemouth compendium JSON. Same document shape as
// `@spellkave/srd-cc/compendium` (corpus kavemouth). Everything is public
// in alpha — no spoiler_tier field.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { inspectManifest, ROW_KIND_NATURAL_KEY } from "@spellkave/world-author";
import {
	catalogNamesForLinkify,
	hrefForCompendiumEntry,
	hrefFromCatalogId,
	linkifyVerbatim,
} from "../../spellkave-srd-cc/src/export/linkify.ts";

import { CULT_RELIC_KEY, MOONPETAL_KEY, QUESTS, TOMB_KEY_ITEM_KEY } from "../author/quests.ts";

const STORYLINE_QUEST_ITEM_KEYS = [MOONPETAL_KEY, CULT_RELIC_KEY, TOMB_KEY_ITEM_KEY] as const;

const PKG_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FIXTURES = join(PKG_ROOT, "fixtures");
const DIST = join(PKG_ROOT, "dist", "compendium");
const AUTHOR_DIR = join(PKG_ROOT, "author");

type FixtureRow = Record<string, unknown>;

function stableJson(value: unknown): string {
	return `${JSON.stringify(sortKeys(value), null, 2)}\n`;
}

function sortKeys(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortKeys);
	if (value !== null && typeof value === "object") {
		const record = value as Record<string, unknown>;
		return Object.fromEntries(
			Object.keys(record)
				.sort()
				.map((key) => [key, sortKeys(record[key])]),
		);
	}
	return value;
}

function asRows(value: unknown): FixtureRow[] {
	if (!Array.isArray(value)) return [];
	return value.filter(
		(row): row is FixtureRow => row !== null && typeof row === "object" && !Array.isArray(row),
	);
}

function str(row: FixtureRow, name: string): string {
	const value = row[name];
	return typeof value === "string" ? value : "";
}

function walkToml(dir: string, prefix = ""): string[] {
	if (!existsSync(dir)) return [];
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
		if (entry.isDirectory()) out.push(...walkToml(join(dir, entry.name), rel));
		else if (entry.name.endsWith(".toml")) out.push(rel);
	}
	return out.sort();
}

function parsePayload(raw: unknown): Record<string, unknown> {
	if (raw !== null && typeof raw === "object" && !Array.isArray(raw))
		return raw as Record<string, unknown>;
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

function sourceExcerptFor(generator: string): string {
	const abs = join(PKG_ROOT, generator);
	if (!existsSync(abs)) return "";
	const text = readFileSync(abs, "utf8");
	const cap = 4000;
	return text.length <= cap ? text : `${text.slice(0, cap)}\n// …`;
}

function generatorFor(relPath: string): string {
	const stem = basename(relPath, ".toml").replaceAll("_", "-");
	const candidate = join(AUTHOR_DIR, `${stem}.ts`);
	if (existsSync(candidate)) return `author/${stem}.ts`;
	if (relPath.includes("/cast/npcs/")) return "author/storyline-npcs.ts";
	if (relPath.includes("/cast/monsters/")) return "author/encounters.ts";
	if (relPath.includes("/world/")) return "author/layout.ts";
	if (relPath.includes("/combat/")) return "author/crypt-fight.ts";
	return "author/adventure.ts";
}

function slugFromId(id: string): string {
	const slash = id.lastIndexOf("/");
	return slash === -1 ? id : id.slice(slash + 1);
}

function chapterTitle(id: string): string {
	if (id === "quest-lines") return "Quest lines";
	return `${id.slice(0, 1).toUpperCase()}${id.slice(1)}`;
}

function uniqueLinks(links: { rel: string; id: string }[]): { rel: string; id: string }[] {
	return [...new Map(links.map((link) => [`${link.rel}:${link.id}`, link])).values()].sort(
		(left, right) => {
			const byRel = left.rel.localeCompare(right.rel);
			return byRel !== 0 ? byRel : left.id.localeCompare(right.id);
		},
	);
}

function srdLinksFromFields(fields: Record<string, unknown>): { rel: string; id: string }[] {
	const links: { rel: string; id: string }[] = [];
	for (const value of Object.values(fields)) {
		if (typeof value === "string" && value.startsWith("srd/")) {
			links.push({ rel: "srd", id: value });
		}
	}
	return uniqueLinks(links);
}

function questLinksFor(entryId: string): { rel: string; id: string }[] {
	const quest = QUESTS.find((row) => `kavemouth/quest/${row.id}` === entryId);
	if (quest === undefined) return [];
	const links: { rel: string; id: string }[] = [{ rel: "ref", id: quest.giverKey }];
	const itemKey = quest.terminal.itemKey;
	if (typeof itemKey === "string" && itemKey.length > 0) {
		links.push({ rel: "ref", id: itemKey });
	}
	for (const creature of quest.killXpCreatures) {
		links.push({ rel: "srd", id: `srd/creature/${creature.slug}` });
	}
	return links;
}

interface BuiltEntry {
	id: string;
	kind: string;
	chapter: string;
	row: FixtureRow;
	sourcePath: string;
	toml: string;
}

function build(): { files: Record<string, string>; entryCount: number } {
	const manifestToml = readFileSync(join(FIXTURES, "adventure.manifest.toml"), "utf8");
	const preamble = `${manifestToml.match(/^#:schema[^\n]+/m)?.[0] ?? ""}\n${manifestToml.match(/^schema_version\s*=\s*[^\n]+/m)?.[0] ?? ""}\n`;
	const rels = walkToml(join(FIXTURES, "adventure"));
	const entries: BuiltEntry[] = [];
	const attachmentsByRef = new Map<
		string,
		{ namespace: string; target_kind: string; payload: Record<string, unknown> }[]
	>();
	const tagsByKey = new Map<string, string[]>();

	for (const rel of rels) {
		const sourcePath = `fixtures/adventure/${rel}`;
		const toml = readFileSync(join(FIXTURES, "adventure", rel), "utf8");
		const manifest = inspectManifest(`${preamble}\n${toml}`).manifest as Record<string, unknown>;
		for (const row of asRows(manifest.place_graphs)) {
			const id = str(row, "place_graph_id");
			if (id.length === 0) continue;
			entries.push({ id, kind: "place", chapter: "places", row, sourcePath, toml });
		}
		for (const row of asRows(manifest.entities)) {
			const id = str(row, "entity_key");
			const kind = str(row, "kind");
			if (id.length === 0) continue;
			if (kind === "npc" || kind === "player") {
				entries.push({ id, kind: "cast", chapter: "cast", row, sourcePath, toml });
			} else if (kind === "item") {
				entries.push({ id, kind: "item", chapter: "items", row, sourcePath, toml });
			}
		}
		for (const row of asRows(manifest.session_definitions)) {
			const id = str(row, "session_def_id");
			if (id.length === 0) continue;
			entries.push({ id, kind: "encounter", chapter: "encounters", row, sourcePath, toml });
		}
		for (const row of asRows(manifest.entity_tag)) {
			const id = str(row, "entity_key");
			const tag = str(row, "tag");
			if (id.length === 0 || tag.length === 0) continue;
			const list = tagsByKey.get(id) ?? [];
			list.push(tag);
			tagsByKey.set(id, list);
		}
		for (const row of asRows(manifest.metadata_attachments)) {
			const ref = str(row, "target_ref");
			if (ref.length === 0) continue;
			const list = attachmentsByRef.get(ref) ?? [];
			list.push({
				namespace: str(row, "namespace"),
				target_kind: str(row, "target_kind"),
				payload: parsePayload(row.payload_json),
			});
			attachmentsByRef.set(ref, list);
		}
	}

	const adventure = readFileSync(join(PKG_ROOT, "adventures", "kavemouth.toml"), "utf8");
	const adventureName = /name = "([^"]+)"/.exec(adventure)?.[1] ?? "kavemouth";
	const adventureDesc =
		/description = "([^"]+)"/.exec(adventure)?.[1] ?? "The kavemouth adventure.";
	entries.push({
		id: "kavemouth/adventure",
		kind: "adventure",
		chapter: "cast",
		row: { display_name: adventureName, description: adventureDesc },
		sourcePath: "adventures/kavemouth.toml",
		toml: adventure,
	});

	const unique = new Map<string, BuiltEntry>();
	for (const entry of entries) unique.set(entry.id, entry);

	const questItemKeys = new Set<string>(STORYLINE_QUEST_ITEM_KEYS);
	for (const quest of QUESTS) {
		const questId = `kavemouth/quest/${quest.id}`;
		unique.set(questId, {
			id: questId,
			kind: "quest",
			chapter: "quest-lines",
			row: {
				display_name: quest.name,
				description: quest.objective,
				rung: quest.rung,
				giver_key: quest.giverKey,
				giver_name: quest.giverName,
				reward_xp: quest.rewardXp,
			},
			sourcePath: "author/quests.ts",
			toml: "# pattern: quest-composition\n# pattern: milestone-gate-terminal-flags\n",
		});
	}

	const files: Record<string, string> = {};
	const indexEntries: Record<string, unknown>[] = [];
	const byChapter = new Map<string, Record<string, unknown>[]>();
	const docs: Record<string, unknown>[] = [];

	for (const entry of [...unique.values()].sort((a, b) => a.id.localeCompare(b.id))) {
		const attachments = (attachmentsByRef.get(entry.id) ?? []).map((row) => ({
			namespace: row.namespace,
			target_kind: row.target_kind,
			target_ref: entry.id,
			payload: row.payload,
		}));
		const artRow = attachments.find(
			(row) => row.namespace === "kavemouth.art.image" || row.namespace.endsWith(".art.image"),
		);
		const art =
			artRow !== undefined && typeof artRow.payload.path === "string"
				? {
						path: artRow.payload.path,
						hash: typeof artRow.payload.hash === "string" ? artRow.payload.hash : "",
						license: typeof artRow.payload.license === "string" ? artRow.payload.license : "",
						native_px: null,
					}
				: null;
		const name = str(entry.row, "display_name") || str(entry.row, "name") || slugFromId(entry.id);
		const description = str(entry.row, "description");
		const tags = [
			...new Set([
				...(tagsByKey.get(entry.id) ?? []),
				...(questItemKeys.has(entry.id) ? ["quest-item"] : []),
				...(entry.kind === "quest" && typeof entry.row.rung === "string"
					? [`quest.rung.${entry.row.rung}`]
					: []),
			]),
		].sort();
		const natural = ROW_KIND_NATURAL_KEY.entities;
		void natural;
		const links = uniqueLinks([...srdLinksFromFields(entry.row), ...questLinksFor(entry.id)]);
		const doc = {
			id: entry.id,
			corpus: "kavemouth",
			kind: entry.kind,
			chapter: entry.chapter,
			slug: slugFromId(entry.id),
			name,
			description_short: description,
			text:
				description.length > 0
					? { verbatim: description, format: "plain", attachment_namespace: "" }
					: null,
			source: {
				label: "Kavemouth",
				cache_path: "",
				primary_key: "",
				fixture_path: entry.sourcePath,
			},
			stats: [],
			tags,
			art,
			rows: [
				{
					kind:
						entry.kind === "place"
							? "place_graphs"
							: entry.kind === "encounter"
								? "session_definitions"
								: entry.kind === "quest"
									? "quest_lines"
									: "entities",
					key: entry.id,
					fields: entry.row,
				},
			],
			attachments,
			author: {
				generator: generatorFor(entry.sourcePath),
				patterns: [...new Set([...(entry.toml.match(/^# pattern: (\S+)/gm) ?? [])])],
				docs: [
					{ id: "quest-composition", title: "Quest composition" },
					{ id: "blueprint-instance-override", title: "Blueprint instance override" },
				],
				source_excerpt: sourceExcerptFor(generatorFor(entry.sourcePath)),
			},
			links,
		};
		docs.push(doc);
		const indexRow = {
			id: entry.id,
			name,
			kind: entry.kind,
			chapter: entry.chapter,
			slug: slugFromId(entry.id),
			tags,
			search_text: `${name} ${description}`.replace(/\s+/g, " ").trim().slice(0, 200),
			art_thumb: art?.path ?? null,
			has_art: art !== null,
		};
		indexEntries.push(indexRow);
		const chapterList = byChapter.get(entry.chapter) ?? [];
		chapterList.push(indexRow);
		byChapter.set(entry.chapter, chapterList);
	}

	const names = catalogNamesForLinkify(
		docs.map((doc) => ({
			id: String(doc.id),
			name: String(doc.name),
			chapter: String(doc.chapter),
			slug: String(doc.slug),
		})),
	);
	const byDocId = new Map(docs.map((doc) => [String(doc.id), doc]));
	for (const doc of docs) {
		const text = doc.text as { verbatim?: string } | null;
		if (text !== null && typeof text?.verbatim === "string") {
			text.verbatim = linkifyVerbatim(text.verbatim, names, String(doc.id));
		}
		const links = Array.isArray(doc.links) ? doc.links : [];
		doc.links = links.map((raw) => {
			const link = raw as { rel: string; id: string };
			const target = byDocId.get(link.id);
			if (target === undefined) {
				return {
					...link,
					name: link.id.split("/").pop() ?? link.id,
					kind: link.id.startsWith("srd/") ? "srd" : "",
					href: hrefFromCatalogId(link.id),
				};
			}
			return {
				...link,
				name: String(target.name),
				kind: String(target.kind),
				href: hrefForCompendiumEntry({
					id: String(target.id),
					chapter: String(target.chapter),
					slug: String(target.slug),
				}),
			};
		});
		files[`entries/${String(doc.id)}.json`] = stableJson(doc);
	}

	const chapters = [...byChapter.keys()].sort().map((id) => ({
		id,
		name: chapterTitle(id),
		count: byChapter.get(id)?.length ?? 0,
	}));
	files["index.json"] = stableJson({
		generated_at: "deterministic",
		entry_count: unique.size,
		corpus: "kavemouth",
		chapters,
	});
	for (const chapter of chapters) {
		const chapterEntries = (byChapter.get(chapter.id) ?? []).sort((a, b) =>
			String(a.id).localeCompare(String(b.id)),
		);
		files[`chapters/${chapter.id}.json`] = stableJson({
			id: chapter.id,
			name: chapter.name,
			count: chapterEntries.length,
			filters: [],
			entries: chapterEntries,
		});
	}
	files["search.json"] = stableJson(
		indexEntries.sort((a, b) => String(a.id).localeCompare(String(b.id))),
	);
	return { files, entryCount: unique.size };
}

const { files, entryCount } = build();
rmSync(DIST, { recursive: true, force: true });
for (const [relPath, content] of Object.entries(files)) {
	const abs = join(DIST, relPath);
	mkdirSync(dirname(abs), { recursive: true });
	writeFileSync(abs, content, "utf8");
}
console.log(
	`[kavemouth-export] wrote ${Object.keys(files).length} file(s) (${entryCount} entries) under ${DIST}`,
);
