// Offline guard: every `[[metadata_attachments]]` target_ref in the srd-cc
// root bundle must resolve to a row of the matching target_kind in the same
// include tree. Live apply rejects unresolved refs with MF-APPLY-026
// ("metadata '…' references unresolved target_ref '…'") — the offline
// validator historically did not, so caster-features choice members could
// ship pointing at never-emitted option ids (Divine Order, Metamagic, …).
//
// Mirrors server/src/metadata_attachment.rs::metadata_target_resolves_with
// for the kinds the server knows. Scope is the root fixtures/manifest.toml
// include tree (what `just seed packages/spellkave-srd-cc/fixtures` applies).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FIXTURES_DIR } from "../../pipeline";

/** Natural-key field(s) per TOML section that can be a metadata target. */
const ID_FIELDS: Record<string, readonly string[]> = {
	entity_definitions: ["entity_def_id"],
	entities: ["entity_id", "id"],
	resource_definitions: ["resource_definition_id"],
	place_graphs: ["place_graph_id", "graph_id", "id"],
	place_nodes: ["node_id", "place_node_id", "id"],
	place_edges: ["edge_id", "place_edge_id", "id"],
	affordance_templates: ["template_id", "affordance_template_id", "affordance_id", "id"],
	capability_definitions: ["capability_id"],
};

/** target_kind → section that must contain the id (server match). */
const TARGET_KIND_SECTION: Record<string, string> = {
	entity: "entities",
	entity_definition: "entity_definitions",
	item_definition: "entity_definitions",
	place_graph: "place_graphs",
	place_node: "place_nodes",
	place_edge: "place_edges",
	resource_definition: "resource_definitions",
	affordance_template: "affordance_templates",
	capability_definition: "capability_definitions",
};

// Dot-all blocks: JS `.` does not match newlines, so use [\s\S].
const SECTION_RE = /^\[\[(\w+)\]\]\s*\n((?:(?!^\[\[)[\s\S])*)/gm;
const INCLUDE_RE = /^\[\[include\]\]\s*\n(?:(?!^\[\[)[\s\S])*?^\s*path\s*=\s*"([^"]+)"/gm;

function collectIncludeTree(manifestPath: string): string[] {
	const seen = new Set<string>();
	const files: string[] = [];
	const walk = (abs: string) => {
		const key = path.resolve(abs);
		if (seen.has(key)) return;
		seen.add(key);
		files.push(key);
		const text = readFileSync(key, "utf8");
		INCLUDE_RE.lastIndex = 0;
		for (const match of text.matchAll(INCLUDE_RE)) {
			const rel = match[1];
			if (rel === undefined) continue;
			walk(path.resolve(path.dirname(key), rel));
		}
	};
	walk(manifestPath);
	return files;
}

function fieldInBlock(block: string, name: string): string | undefined {
	const match = new RegExp(`^\\s*${name}\\s*=\\s*"([^"]*)"`, "m").exec(block);
	return match?.[1];
}

function collectIdsBySection(files: readonly string[]): Map<string, Set<string>> {
	const out = new Map<string, Set<string>>();
	for (const section of Object.keys(ID_FIELDS)) out.set(section, new Set());
	for (const file of files) {
		const text = readFileSync(file, "utf8");
		SECTION_RE.lastIndex = 0;
		for (const match of text.matchAll(SECTION_RE)) {
			const kind = match[1];
			const block = match[2];
			if (kind === undefined || block === undefined) continue;
			const fields = ID_FIELDS[kind];
			if (fields === undefined) continue;
			const bucket = out.get(kind);
			if (bucket === undefined) continue;
			for (const field of fields) {
				const id = fieldInBlock(block, field);
				if (id !== undefined && id.length > 0) bucket.add(id);
			}
		}
	}
	return out;
}

interface AttachmentRow {
	targetKind: string;
	targetRef: string;
	namespace: string;
	file: string;
}

function collectAttachments(files: readonly string[]): AttachmentRow[] {
	const rows: AttachmentRow[] = [];
	for (const file of files) {
		const text = readFileSync(file, "utf8");
		SECTION_RE.lastIndex = 0;
		for (const match of text.matchAll(SECTION_RE)) {
			if (match[1] !== "metadata_attachments") continue;
			const block = match[2] ?? "";
			const targetKind = fieldInBlock(block, "target_kind");
			const targetRef = fieldInBlock(block, "target_ref");
			const namespace = fieldInBlock(block, "namespace") ?? "";
			if (targetKind === undefined || targetRef === undefined) continue;
			rows.push({
				targetKind,
				targetRef,
				namespace,
				file: path.relative(FIXTURES_DIR, file),
			});
		}
	}
	return rows;
}

function unresolvedAttachments(files: readonly string[]): { row: AttachmentRow; reason: string }[] {
	const ids = collectIdsBySection(files);
	const bad: { row: AttachmentRow; reason: string }[] = [];
	for (const row of collectAttachments(files)) {
		const section = TARGET_KIND_SECTION[row.targetKind];
		if (section === undefined) {
			bad.push({ row, reason: `unknown target_kind '${row.targetKind}'` });
			continue;
		}
		const pool = ids.get(section) ?? new Set();
		if (!pool.has(row.targetRef)) {
			bad.push({
				row,
				reason: `no ${section} id '${row.targetRef}' (ns=${row.namespace})`,
			});
		}
	}
	return bad;
}

describe("metadata_attachments target_ref resolution (MF-APPLY-026 guard)", () => {
	it("every metadata_attachments target_ref in the root srd bundle resolves", () => {
		const files = collectIncludeTree(path.join(FIXTURES_DIR, "manifest.toml"));
		expect(files.length).toBeGreaterThan(100);
		const bad = unresolvedAttachments(files);
		const uniqueRefs = [...new Set(bad.map((b) => b.row.targetRef))].sort();
		expect(
			uniqueRefs,
			[
				`MF-APPLY-026 offline twin: ${bad.length} attachment(s) / ${uniqueRefs.length} unique unresolved target_ref(s).`,
				"Live apply rejects the first with: metadata '…' references unresolved target_ref '…'.",
				"Emit option entity_definitions (martial expertise-option / skill-option idiom) or retarget members.",
				"Unresolved:",
				...uniqueRefs.map((ref) => `  - ${ref}`),
			].join("\n"),
		).toEqual([]);
	});
});
