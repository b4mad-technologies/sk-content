// Documentation authors classify every kernel row and expose only declared owner fields.
// Runs offline against the schema, committed fixtures and malformed temporary coverage tables.
// keep-file(K1): enumerate classifications, owner joins and invalid authored data.
import {
	copyFileSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
	describeManifestSchema,
	ROW_KIND_COMPOSITE_KEY,
	ROW_KIND_NATURAL_KEY,
} from "@spellkave/world-author";
import { parse as parseToml } from "smol-toml";
import { describe, expect, it } from "vitest";

import {
	ownerCandidates,
	POLYMORPHIC_OWNER,
	pagedRowKinds,
	rowCompositeColumns,
	rowKindCoverage,
	rowKindCoverageFor,
	unclassifiedRowKinds,
} from "./row-kind-coverage";

const HERE = dirname(fileURLToPath(import.meta.url));
const MODULE_SOURCE = join(HERE, "row-kind-coverage.ts");
const FIXTURES_ROOT = join(HERE, "..", "..", "fixtures");

describe("rowKindCoverage", () => {
	it("owns authority vocabulary by bundle and exposes only approved binding scope fields", () => {
		for (const kind of ["role_definitions", "role_aggregations", "role_bindings"])
			expect(rowKindCoverageFor(kind)).toMatchObject({ surface: "owner", owner: "bundles" });
		expect(rowKindCoverageFor("role_bindings")?.public_fields).toEqual([
			"role_id",
			"extent_kind_ref",
			"extent_ref",
			"bundle_id",
		]);
		expect(rowKindCoverageFor("role_definitions")?.public_fields).toBeUndefined();
	});
	it("classifies every row with one of the four surfaces", () => {
		const rows = rowKindCoverage();
		expect(rows.length).toBeGreaterThan(0);
		for (const row of rows) expect(["page", "owner", "relation", "none"]).toContain(row.surface);
	});

	it("classifies each kind exactly once", () => {
		const kinds = rowKindCoverage().map((row) => row.kind);
		expect(new Set(kinds).size).toBe(kinds.length);
	});

	it("names an owner that is itself classified, for every owner-surfaced row", () => {
		const rows = rowKindCoverage();
		const known = new Set(rows.map((row) => row.kind));
		for (const row of rows.filter((row) => row.surface === "owner")) {
			// `*` is the one owner that is not a kind name: the owner is chosen per
			// row, from the row's own target columns. The loader has allowed it
			// since `metadata_attachments` was reclassified; this assertion had not
			// caught up, and no gate reached this file to say so.
			if (row.owner === POLYMORPHIC_OWNER) continue;
			// A row names its owner either as one fixed `owner`, or as several
			// `owner_candidates` (e.g. `spatial_environment_state`, which belongs to
			// whichever of place_nodes/place_edges/location_definitions it actually
			// sets). `ownerCandidates` normalizes both shapes to the same list.
			const candidates = ownerCandidates(row);
			expect(candidates.length, row.kind).toBeGreaterThan(0);
			for (const candidate of candidates)
				expect(known.has(candidate.owner), `${row.kind} -> ${candidate.owner}`).toBe(true);
		}
	});

	it("carries a non-empty reason for every none-surfaced row", () => {
		for (const row of rowKindCoverage().filter((row) => row.surface === "none"))
			expect(row.reason).toBeTruthy();
	});
});

describe("pagedRowKinds", () => {
	it("returns exactly the page-surfaced kinds, in authored order", () => {
		const paged = pagedRowKinds();
		const expected = rowKindCoverage()
			.filter((row) => row.surface === "page")
			.map((row) => row.kind);
		expect(paged).toEqual(expected);
		for (const kind of paged) expect(rowKindCoverageFor(kind)?.surface).toBe("page");
	});
});

describe("rowKindCoverageFor", () => {
	it("finds a known kind and returns undefined for an invented one", () => {
		expect(rowKindCoverageFor("entity_definitions")?.surface).toBe("page");
		expect(rowKindCoverageFor("not_a_real_row_kind")).toBeUndefined();
	});
});

describe("unclassifiedRowKinds", () => {
	it("reports nothing missing for already-classified candidates", () => {
		const known = rowKindCoverage().map((row) => row.kind);
		expect(unclassifiedRowKinds(known)).toEqual([]);
	});

	it("reports an invented kind", () => {
		expect(unclassifiedRowKinds(["not_a_real_row_kind"])).toEqual(["not_a_real_row_kind"]);
	});
});

describe("kernel registry coverage", () => {
	it("classifies every row kind the kernel registers", () => {
		const kernelKinds = [
			...Object.keys(ROW_KIND_NATURAL_KEY),
			...Object.keys(ROW_KIND_COMPOSITE_KEY),
		];
		const missing = unclassifiedRowKinds(kernelKinds);
		expect(
			missing,
			`These kernel row kinds have no [[kinds]] row in row-kind-coverage.toml: ${missing.join(", ")}. ` +
				"A new kernel row kind needs a [[kinds]] row in row-kind-coverage.toml.",
		).toEqual([]);
	});
});

describe("authored fixture coverage", { timeout: 60_000 }, () => {
	it("classifies every array-of-tables key any fixture actually authors", () => {
		const authored = new Set<string>();
		for (const file of walkTomlFiles(FIXTURES_ROOT)) {
			const parsed = parseToml(readFileSync(file, "utf8")) as Record<string, unknown>;
			for (const [key, value] of Object.entries(parsed)) {
				// `include` is a manifest-composition directive, not a row kind — the
				// TOML header calls this out explicitly.
				if (key === "include") continue;
				if (Array.isArray(value)) authored.add(key);
			}
		}
		const missing = unclassifiedRowKinds(authored);
		expect(
			missing,
			`These fixture-authored row kinds have no [[kinds]] row in row-kind-coverage.toml: ${missing.join(", ")}.`,
		).toEqual([]);
	});
});

describe("readCoverage (malformed data)", () => {
	// COVERAGE_PATH is derived from the module's own `import.meta.url`, and the
	// parsed result is cached at module scope — there is no way to point the
	// shipped module at a substitute file from outside it. Rather than
	// restructure row-kind-coverage.ts to accept an injectable path (out of
	// scope here — see the team report), this loads an unmodified copy of the
	// module into a scratch directory next to a controlled, invalid sibling
	// TOML, so the exact shipped read/validate logic runs against bad input.
	// The temp dir must outlive the `rowKindCoverage()` call: the module caches
	// lazily on first invocation, not at import time, so cleanup can only
	// happen once the caller is done asserting against it.
	async function loadWithToml(
		tomlBody: string,
	): Promise<{ mod: { rowKindCoverage: () => unknown }; cleanup: () => void }> {
		const dir = mkdtempSync(join(tmpdir(), "row-kind-coverage-malformed-"));
		copyFileSync(MODULE_SOURCE, join(dir, "row-kind-coverage.ts"));
		writeFileSync(join(dir, "row-kind-coverage.toml"), tomlBody);
		const mod = (await import(pathToFileURL(join(dir, "row-kind-coverage.ts")).href)) as {
			rowKindCoverage: () => unknown;
		};
		return { mod, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
	}

	it.each([
		"[]",
		'["scope", "scope"]',
		'[""]',
		"[17]",
	])("rejects invalid public_fields %s", async (fields) => {
		const { mod, cleanup } = await loadWithToml(
			`[[kinds]]\nkind = "bundles"\nsurface = "page"\n[[kinds]]\nkind = "x"\nsurface = "owner"\nowner = "bundles"\npublic_fields = ${fields}\n`,
		);
		try {
			expect(() => mod.rowKindCoverage()).toThrow(/public_fields/);
		} finally {
			cleanup();
		}
	});

	it("refuses public_fields on a non-owner kind", async () => {
		const { mod, cleanup } = await loadWithToml(
			'[[kinds]]\nkind = "x"\nsurface = "page"\npublic_fields = ["scope"]\n',
		);
		try {
			expect(() => mod.rowKindCoverage()).toThrow(/public_fields/);
		} finally {
			cleanup();
		}
	});

	it("rejects a surface outside the four known values", async () => {
		const { mod, cleanup } = await loadWithToml('[[kinds]]\nkind = "x"\nsurface = "bogus"\n');
		try {
			expect(() => mod.rowKindCoverage()).toThrow(/'x' has surface 'bogus'/);
		} finally {
			cleanup();
		}
	});

	it("rejects a kind classified twice", async () => {
		const { mod, cleanup } = await loadWithToml(
			'[[kinds]]\nkind = "x"\nsurface = "page"\n\n[[kinds]]\nkind = "x"\nsurface = "page"\n',
		);
		try {
			expect(() => mod.rowKindCoverage()).toThrow(/'x' is classified twice/);
		} finally {
			cleanup();
		}
	});

	it("rejects an owner-surfaced row with no named owner", async () => {
		const { mod, cleanup } = await loadWithToml('[[kinds]]\nkind = "x"\nsurface = "owner"\n');
		try {
			expect(() => mod.rowKindCoverage()).toThrow(/'x' is owner-surfaced but names no owner/);
		} finally {
			cleanup();
		}
	});

	it("rejects an owner naming a kind that is not itself classified", async () => {
		const { mod, cleanup } = await loadWithToml(
			'[[kinds]]\nkind = "x"\nsurface = "owner"\nowner = "ghost"\n',
		);
		try {
			expect(() => mod.rowKindCoverage()).toThrow(
				/'x' belongs to 'ghost', which is not classified/,
			);
		} finally {
			cleanup();
		}
	});

	it("rejects owner_candidates naming a kind that is not itself classified", async () => {
		const { mod, cleanup } = await loadWithToml(
			'[[kinds]]\nkind = "x"\nsurface = "owner"\nowner_candidates = [{ owner = "ghost" }]\n',
		);
		try {
			expect(() => mod.rowKindCoverage()).toThrow(
				/'x' belongs to 'ghost', which is not classified/,
			);
		} finally {
			cleanup();
		}
	});

	it("rejects a row naming both owner and owner_candidates", async () => {
		const { mod, cleanup } = await loadWithToml(
			'[[kinds]]\nkind = "y"\nsurface = "page"\n\n' +
				'[[kinds]]\nkind = "x"\nsurface = "owner"\nowner = "y"\nowner_candidates = [{ owner = "y" }]\n',
		);
		try {
			expect(() => mod.rowKindCoverage()).toThrow(/'x' names both owner and owner_candidates/);
		} finally {
			cleanup();
		}
	});

	it("rejects an empty owner_candidates array", async () => {
		const { mod, cleanup } = await loadWithToml(
			'[[kinds]]\nkind = "x"\nsurface = "owner"\nowner_candidates = []\n',
		);
		try {
			expect(() => mod.rowKindCoverage()).toThrow(/'x' owner_candidates is empty/);
		} finally {
			cleanup();
		}
	});

	it("rejects an owner_candidates entry with no owner", async () => {
		const { mod, cleanup } = await loadWithToml(
			'[[kinds]]\nkind = "x"\nsurface = "owner"\nowner_candidates = [{ owner_field = "y_id" }]\n',
		);
		try {
			expect(() => mod.rowKindCoverage()).toThrow(/'x' owner_candidates\[0\] names no owner/);
		} finally {
			cleanup();
		}
	});

	it("rejects an empty label", async () => {
		const { mod, cleanup } = await loadWithToml(
			'[[kinds]]\nkind = "x"\nsurface = "owner"\nowner = "x"\nlabel = ""\n',
		);
		try {
			expect(() => mod.rowKindCoverage()).toThrow(/'x' label must be a non-empty string/);
		} finally {
			cleanup();
		}
	});

	it("rejects a label on a kind that is not owner-surfaced", async () => {
		const { mod, cleanup } = await loadWithToml(
			'[[kinds]]\nkind = "x"\nsurface = "page"\nlabel = "X"\n',
		);
		try {
			expect(() => mod.rowKindCoverage()).toThrow(/'x' names a label but is not owner-surfaced/);
		} finally {
			cleanup();
		}
	});

	it("rejects a none-surfaced row with no reason", async () => {
		const { mod, cleanup } = await loadWithToml('[[kinds]]\nkind = "x"\nsurface = "none"\n');
		try {
			expect(() => mod.rowKindCoverage()).toThrow(/'x' has no reader surface and no reason/);
		} finally {
			cleanup();
		}
	});

	it("rejects an empty [[kinds]] table", async () => {
		const { mod, cleanup } = await loadWithToml("");
		try {
			expect(() => mod.rowKindCoverage()).toThrow(/must contain \[\[kinds\]\] rows/);
		} finally {
			cleanup();
		}
	});
});

describe("rowCompositeColumns", () => {
	it("fills a gap the kernel leaves, and never overrides it", () => {
		const columns = rowCompositeColumns(ROW_KIND_COMPOSITE_KEY);
		// The kernel registers nothing for metadata_attachments: an attachment
		// reaches a page as a parsed payload, not as the authored row, so nothing
		// could ever match it whole.
		expect(ROW_KIND_COMPOSITE_KEY.metadata_attachments).toBeUndefined();
		expect(columns.metadata_attachments).toEqual(["target_kind", "target_ref", "namespace"]);
		// Where the kernel does speak it stays authoritative, byte for byte.
		for (const [kind, key] of Object.entries(ROW_KIND_COMPOSITE_KEY))
			expect(columns[kind], kind).toEqual(key);
	});

	it("refuses a row that claims two identities", () => {
		const row = rowKindCoverage().find((item) => item.kind === "metadata_attachments");
		expect(row?.id_fields).toBeDefined();
		expect(row?.id_field).toBeUndefined();
	});
});

interface JsonSchemaObject {
	properties?: Record<string, JsonSchemaObject>;
	items?: { $ref?: string };
	$ref?: string;
}

/**
 * `[[kind]]`'s own authored field names, read from the authoritative manifest
 * schema (`spellkave_schema::manifest_json_schema()`, the same source
 * `scripts/generate-authoring-reference-docs.ts` renders `manifest-format.md`
 * from — this reads the schema directly rather than the generated markdown,
 * so it never drifts a release behind it). `undefined` for a kind the schema
 * does not carry an array-of-tables entry for at all (there should be none
 * among owner-surfaced kinds; a row with no manifest shape could not be
 * authored).
 */
function manifestRowFields(
	schema: JsonSchemaObject,
	kind: string,
): ReadonlySet<string> | undefined {
	const definitions =
		(schema as { definitions?: Record<string, JsonSchemaObject> }).definitions ?? {};
	const manifest = definitions.Manifest ?? schema;
	const property = manifest.properties?.[kind];
	const defName = property?.items?.$ref?.split("/").pop();
	const fields = defName ? definitions[defName]?.properties : undefined;
	return fields ? new Set(Object.keys(fields)) : undefined;
}

describe("owner join columns", () => {
	it("names a real field of the owned kind's own manifest row, for every owner-surfaced kind", () => {
		// `ownedFacets` (apps/website/src/compendium/project-metadata-docs.ts) joins
		// an owned row to its owner through `owner_field ?? ROW_KIND_NATURAL_KEY[owner]`.
		// That join column must exist on the OWNED kind's own row shape, or the join
		// silently matches nothing (`row[joinField]` reads `undefined` off a row that
		// never carries the field) and the row falls into the overflow basin —
		// exactly the bug `actor_capabilities.actor_entity_key` and
		// `place_graph_instances.blueprint_id` were authored to fix. Checked against
		// the schema itself, not the generated `manifest-format.md`, so this never
		// trails a doc regeneration.
		const schema = describeManifestSchema() as JsonSchemaObject;
		const offenders: string[] = [];
		for (const owned of rowKindCoverage()) {
			if (owned.surface !== "owner") continue;
			if (owned.named_by !== undefined) {
				// The other direction: the OWNER's row names this one, so the column
				// must exist on the owner, and this kind needs a natural key to be named by.
				const ownerFields = manifestRowFields(schema, owned.owner as string);
				if (!ownerFields?.has(owned.named_by))
					offenders.push(
						`${owned.kind}: named_by '${owned.named_by}' is not a field of its owner '${owned.owner}'`,
					);
				if (ROW_KIND_NATURAL_KEY[owned.kind] === undefined)
					offenders.push(`${owned.kind}: named_by needs a natural key on '${owned.kind}' to match`);
				continue;
			}
			// A row belongs to one fixed owner, or to whichever of several
			// `owner_candidates` it actually sets (`spatial_environment_state`).
			// Every candidate gets the same check: its join column must be a real
			// field of the OWNED kind's own row shape.
			for (const candidate of ownerCandidates(owned)) {
				if (candidate.owner === POLYMORPHIC_OWNER) continue;
				const joinField = candidate.owner_field ?? ROW_KIND_NATURAL_KEY[candidate.owner];
				if (joinField === undefined) continue; // caught by delivery.test.ts's own kernel-identity check
				const fields = manifestRowFields(schema, owned.kind);
				if (fields === undefined) {
					offenders.push(`${owned.kind}: no manifest row shape found in the schema`);
					continue;
				}
				if (!fields.has(joinField))
					offenders.push(
						`${owned.kind}: join column '${joinField}' (owner '${candidate.owner}') is not a field of '${owned.kind}'`,
					);
			}
		}
		expect(offenders).toEqual([]);
	});
});

function walkTomlFiles(root: string): string[] {
	const out: string[] = [];
	const visit = (dir: string): void => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const abs = join(dir, entry.name);
			if (entry.isDirectory()) visit(abs);
			else if (entry.name.endsWith(".toml")) out.push(abs);
		}
	};
	visit(root);
	return out;
}
