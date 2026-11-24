// Reader coverage: which manifest row kinds surface in the documentation, and
// in what shape.
//
// This module is DELIBERATELY standalone. It imports nothing from the
// generator — no open5e readers, no chapter units, no markdown readers — so
// that the website can consume it directly instead of porting it. Its sibling
// `catalogue.ts` pulls in most of the pipeline and is the reason a hand-synced
// copy of the placement rules ever existed. Keep this file's import list to
// node builtins and the TOML parser; the moment it grows a generator import,
// the copy comes back.
//
// The authored data lives in `row-kind-coverage.toml`. Read that file's header
// first: it explains the four surfaces and why the natural-key field is NOT
// restated there.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseToml } from "smol-toml";

/**
 * How a row kind reaches a reader.
 *
 * - `page` — a subject of its own; gets a catalogue page and a component.
 * - `owner` — payload of another row; renders on that row's page.
 * - `relation` — an edge between two rows; becomes a link, never a page.
 * - `none` — no reader surface at all, for a stated structural reason.
 */
export type RowKindSurface = "page" | "owner" | "relation" | "none";

/** One fixed candidate owner for a row that may belong to several kinds. */
export interface RowKindOwnerCandidate {
	readonly owner: string;
	readonly owner_field?: string;
}

export interface RowKindCoverage {
	readonly kind: string;
	readonly surface: RowKindSurface;
	/** Explicit public projection of an owned row. Omission preserves whole-row delivery. */
	readonly public_fields?: readonly string[];
	/**
	 * Present exactly when `surface` is `"owner"` and the row belongs to ONE
	 * fixed kind. Mutually exclusive with `owner_candidates`, which is for a
	 * row that belongs to whichever of SEVERAL kinds it names in its own data.
	 */
	readonly owner?: string;
	/**
	 * Only when the column joining an owned row to its owner is NOT the
	 * owner's own natural-key column name. Most owned kinds repeat the
	 * owner's key verbatim (`entity_definition_initial_state.entity_def_id`
	 * points at `entity_definitions` through its own key column), so the
	 * default (the owner's `ROW_KIND_NATURAL_KEY` column) covers them and
	 * this stays unset. Authored only for the exceptions — e.g.
	 * `actor_capabilities.actor_entity_key`, which resolves against
	 * `entities.entity_key` under a different name (`server/src/manifest/
	 * commit.rs`, `crates/spellkave-schema/src/lib.rs`'s `ActorCapabilityRow`
	 * doc comment). Mutually exclusive with `owner_candidates`, which carries
	 * its own join column per candidate.
	 */
	readonly owner_field?: string;
	/**
	 * For a row that is owned by whichever of SEVERAL fixed kinds it actually
	 * names — e.g. `spatial_environment_state`, whose own row sets exactly one
	 * of `place_node_id` / `place_edge_key` / `location_def_id`
	 * (`SpatialEnvironmentStateRow`, `crates/spellkave-schema/src/lib.rs`,
	 * mutually exclusive per its own doc comment). Each candidate names the
	 * owner kind and, same rule as the singular `owner_field`, the join column
	 * only when it does not repeat that owner's own natural-key name.
	 *
	 * This differs from `owner = "*"` (`metadata_attachments`): a `"*"` row's
	 * owner is any kind at all, resolved from generic target columns the row
	 * carries for exactly that purpose. `owner_candidates` is for a SMALL,
	 * FIXED set of possible owner kinds, each with its own named column —
	 * there is no generic target column here, just several typed ones, at
	 * most one of which is ever set on a given row. Mutually exclusive with
	 * `owner`/`owner_field`.
	 */
	readonly owner_candidates?: readonly RowKindOwnerCandidate[];
	/**
	 * Only for a row its owner POINTS AT, rather than one that points at its
	 * owner: the owner's own column that names this row's natural key. A
	 * session definition names its turn scheduler (`turn_scheduler_id`) and the
	 * scheduler carries no column back, so no `owner_field` could express the
	 * join. Mutually exclusive with `owner_field`/`owner_candidates`.
	 */
	readonly named_by?: string;
	/** Present exactly when `surface` is `"none"`: why the kind has no reader surface. */
	readonly reason?: string;
	/**
	 * Only for kinds the kernel registry does not know. For every registered
	 * kind the natural key comes from `ROW_KIND_NATURAL_KEY`, never from here —
	 * restating it would be a second source of truth for the same fact.
	 */
	readonly id_field?: string;
	/**
	 * The ordered columns identifying a row, for a kind the kernel registers no
	 * composite key for and whose rows a reader never sees whole. An attachment
	 * reaches the page as a parsed payload, not as the authored row, so nothing
	 * could match it byte for byte; naming its columns is what lets the delivery
	 * measurement recognise the same row on both sides. Mutually exclusive with
	 * `id_field`.
	 */
	readonly id_fields?: readonly string[];
	/**
	 * The catalogue entry's `kind`, when it is not the table name with its
	 * trailing `s` removed. Only `entities` needs this today (`entity`, not
	 * `entitie`), which is why the rule is a function and the exception is
	 * authored rather than the whole mapping being tabulated.
	 */
	readonly entry_kind?: string;
	/**
	 * Only for `surface = "owner"`: the reader-facing facet title on the
	 * owner's page, when the generic prefix-strip rule (drop the owner table's
	 * name off the front, title-case the rest — `entity_definition_initial_state`
	 * on `entity_definitions` -> "Initial state") does not read well, or cannot
	 * even apply (`entities`' irregular plural strips to `entitie_`, which none
	 * of its owned kinds' columns start with, so every one of them would
	 * otherwise fall back to its raw, unstripped name). Editorial wording is
	 * authored data, same as every other fact this file carries — never a code
	 * table beside the projection that renders it, and it wins on EVERY page the
	 * kind is owner-surfaced onto, carrier or not.
	 */
	readonly label?: string;
	readonly note?: string;
}

/**
 * The candidate owners of an owner-surfaced row, normalized to one shape
 * whether the kind authored a single fixed `owner`/`owner_field` or several
 * `owner_candidates`. Empty for `owner = "*"` (polymorphic, resolved from
 * generic target columns a caller reads itself) and for anything not
 * owner-surfaced at all.
 */
export function ownerCandidates(row: RowKindCoverage): readonly RowKindOwnerCandidate[] {
	if (row.surface !== "owner") return [];
	if (row.owner_candidates !== undefined) return row.owner_candidates;
	if (row.owner === undefined || row.owner === POLYMORPHIC_OWNER) return [];
	return [{ owner: row.owner, owner_field: row.owner_field }];
}

/**
 * The catalogue entry kind for a table: the table name without its trailing
 * `s`, unless the row authored an exception.
 */
export function entryKindForTable(row: RowKindCoverage): string {
	return row.entry_kind ?? row.kind.replace(/s$/, "");
}

export interface CatalogueIdentityShape {
	/** The manifest table the entry's row lives in. */
	readonly table: string;
	/** The column holding that row's identity. */
	readonly idField: string;
}

/**
 * Catalogue entry kind -> where to find its row, for every kind that earns a
 * page.
 *
 * The natural-key column is READ from the kernel registry rather than restated
 * here; pass `ROW_KIND_NATURAL_KEY` from `@spellkave/world-author`. Taking it
 * as an argument is deliberate: it keeps this module free of the wasm-backed
 * import, so anything that only needs the classification stays cheap.
 *
 * A paged kind the registry does not know, and which authored no `id_field`,
 * is skipped — it has no addressable identity, so nothing could route to it.
 */
export function catalogueIdentities(
	naturalKey: Readonly<Record<string, string>>,
): Readonly<Record<string, CatalogueIdentityShape>> {
	const identities: Record<string, CatalogueIdentityShape> = {};
	for (const row of rowKindCoverage()) {
		if (row.surface !== "page") continue;
		const idField = row.id_field ?? naturalKey[row.kind];
		if (idField === undefined) continue;
		identities[entryKindForTable(row)] = { table: row.kind, idField };
	}
	return identities;
}

/**
 * The identity column of every table, for recognising the same row twice.
 *
 * The kernel registry is the authority and wins wherever it speaks. It does not
 * speak for every table a reader can reach — `boundary_definitions` has pages
 * but no registered natural key — so the authored `id_field` fills those gaps.
 * Without this a page kind the kernel does not know is silently unrecognisable:
 * its rows render on real pages and are still counted as reaching nobody.
 */
export function rowIdentityColumns(
	naturalKey: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
	const columns: Record<string, string> = {};
	for (const identity of Object.values(catalogueIdentities(naturalKey)))
		columns[identity.table] = identity.idField;
	return { ...columns, ...naturalKey };
}

/**
 * The ordered identity columns of every table, for recognising the same row
 * twice when one column is not enough.
 *
 * Same rule as `rowIdentityColumns`: the kernel registry wins wherever it
 * speaks, and the authored `id_fields` fill the gaps it leaves. Without this an
 * attachment — which reaches a page as a parsed payload, never as the authored
 * row — falls back to whole-row comparison and can never be recognised, so
 * thousands of rows a reader plainly sees read as reaching nobody.
 */
export function rowCompositeColumns(
	compositeKey: Readonly<Record<string, readonly string[]>>,
): Readonly<Record<string, readonly string[]>> {
	const columns: Record<string, readonly string[]> = {};
	for (const row of rowKindCoverage()) if (row.id_fields) columns[row.kind] = row.id_fields;
	return { ...columns, ...compositeKey };
}

const SURFACES: readonly RowKindSurface[] = ["page", "owner", "relation", "none"];

/**
 * The `owner` value meaning "whichever row this one names in its own target
 * columns", rather than one fixed kind.
 */
export const POLYMORPHIC_OWNER = "*";

const COVERAGE_PATH = join(dirname(fileURLToPath(import.meta.url)), "row-kind-coverage.toml");

function readCoverage(): readonly RowKindCoverage[] {
	const parsed = parseToml(readFileSync(COVERAGE_PATH, "utf8")) as Record<string, unknown>;
	const rows = parsed.kinds;
	if (!Array.isArray(rows) || rows.length === 0)
		throw new Error("row-kind-coverage.toml must contain [[kinds]] rows.");

	const byKind = new Map<string, RowKindCoverage>();
	for (const raw of rows as Record<string, unknown>[]) {
		const kind = raw.kind;
		const surface = raw.surface;
		if (typeof kind !== "string" || kind === "")
			throw new Error("row-kind-coverage.toml: every [[kinds]] row needs a kind.");
		if (typeof surface !== "string" || !(SURFACES as readonly string[]).includes(surface))
			throw new Error(
				`row-kind-coverage.toml: '${kind}' has surface '${String(surface)}'; expected one of ${SURFACES.join(", ")}.`,
			);
		if (byKind.has(kind)) throw new Error(`row-kind-coverage.toml: '${kind}' is classified twice.`);
		const ownerCandidatesRaw = Array.isArray(raw.owner_candidates)
			? (raw.owner_candidates as unknown[]).map((candidate, at) => {
					if (typeof candidate !== "object" || candidate === null)
						throw new Error(
							`row-kind-coverage.toml: '${kind}' owner_candidates[${at}] must be a table.`,
						);
					const { owner, owner_field: ownerField, ...rest } = candidate as Record<string, unknown>;
					if (Object.keys(rest).length > 0)
						throw new Error(
							`row-kind-coverage.toml: '${kind}' owner_candidates[${at}] has unexpected keys: ${Object.keys(rest).join(", ")}.`,
						);
					if (typeof owner !== "string" || owner === "")
						throw new Error(
							`row-kind-coverage.toml: '${kind}' owner_candidates[${at}] names no owner.`,
						);
					if (ownerField !== undefined && (typeof ownerField !== "string" || ownerField === ""))
						throw new Error(
							`row-kind-coverage.toml: '${kind}' owner_candidates[${at}] owner_field must be a non-empty string.`,
						);
					return {
						owner,
						...(typeof ownerField === "string" ? { owner_field: ownerField } : {}),
					};
				})
			: undefined;
		if (raw.owner_candidates !== undefined && ownerCandidatesRaw === undefined)
			throw new Error(`row-kind-coverage.toml: '${kind}' owner_candidates must be an array.`);
		if (ownerCandidatesRaw !== undefined && ownerCandidatesRaw.length === 0)
			throw new Error(`row-kind-coverage.toml: '${kind}' owner_candidates is empty.`);
		if (ownerCandidatesRaw !== undefined && surface !== "owner")
			throw new Error(
				`row-kind-coverage.toml: '${kind}' names owner_candidates but is not owner-surfaced.`,
			);
		if (ownerCandidatesRaw !== undefined && typeof raw.owner === "string")
			throw new Error(
				`row-kind-coverage.toml: '${kind}' names both owner and owner_candidates; a row belongs one way or the other.`,
			);
		if (ownerCandidatesRaw !== undefined && raw.owner_field !== undefined)
			throw new Error(
				`row-kind-coverage.toml: '${kind}' names both owner_field and owner_candidates; each candidate carries its own owner_field.`,
			);
		if (ownerCandidatesRaw !== undefined && raw.named_by !== undefined)
			throw new Error(
				`row-kind-coverage.toml: '${kind}' names both named_by and owner_candidates; a join runs one way.`,
			);
		// An owner without a named owner, or a `none` without a reason, is the
		// failure mode this file exists to prevent: a kind that looks decided
		// but says nothing. Reject it at read time rather than at review time.
		if (
			surface === "owner" &&
			ownerCandidatesRaw === undefined &&
			(typeof raw.owner !== "string" || raw.owner === "")
		)
			throw new Error(
				`row-kind-coverage.toml: '${kind}' is owner-surfaced but names no owner or owner_candidates.`,
			);
		if (
			raw.owner_field !== undefined &&
			(typeof raw.owner_field !== "string" || raw.owner_field === "")
		)
			throw new Error(`row-kind-coverage.toml: '${kind}' owner_field must be a non-empty string.`);
		if (raw.owner_field !== undefined && surface !== "owner")
			throw new Error(
				`row-kind-coverage.toml: '${kind}' names owner_field but is not owner-surfaced.`,
			);
		if (raw.named_by !== undefined && (typeof raw.named_by !== "string" || raw.named_by === ""))
			throw new Error(`row-kind-coverage.toml: '${kind}' named_by must be a non-empty string.`);
		if (raw.named_by !== undefined && surface !== "owner")
			throw new Error(
				`row-kind-coverage.toml: '${kind}' names named_by but is not owner-surfaced.`,
			);
		if (raw.named_by !== undefined && raw.owner_field !== undefined)
			throw new Error(
				`row-kind-coverage.toml: '${kind}' names both owner_field and named_by; a join runs one way.`,
			);
		if (surface === "none" && (typeof raw.reason !== "string" || raw.reason === ""))
			throw new Error(`row-kind-coverage.toml: '${kind}' has no reader surface and no reason.`);
		if (raw.label !== undefined && (typeof raw.label !== "string" || raw.label === ""))
			throw new Error(`row-kind-coverage.toml: '${kind}' label must be a non-empty string.`);
		if (raw.label !== undefined && surface !== "owner")
			throw new Error(`row-kind-coverage.toml: '${kind}' names a label but is not owner-surfaced.`);
		const publicFields = raw.public_fields;
		if (
			publicFields !== undefined &&
			(surface !== "owner" ||
				!Array.isArray(publicFields) ||
				publicFields.length === 0 ||
				publicFields.some((field) => typeof field !== "string" || field === "") ||
				new Set(publicFields).size !== publicFields.length)
		)
			throw new Error(
				`row-kind-coverage.toml: '${kind}' public_fields must be distinct non-empty columns on an owner-surfaced kind.`,
			);
		const idFields = Array.isArray(raw.id_fields)
			? (raw.id_fields as unknown[]).map((column, at) => {
					if (typeof column !== "string" || column === "")
						throw new Error(
							`row-kind-coverage.toml: '${kind}' id_fields[${at}] is not a column name.`,
						);
					return column;
				})
			: undefined;
		if (raw.id_fields !== undefined && idFields === undefined)
			throw new Error(`row-kind-coverage.toml: '${kind}' id_fields must be an array of columns.`);
		if (idFields !== undefined && typeof raw.id_field === "string")
			throw new Error(
				`row-kind-coverage.toml: '${kind}' declares both id_field and id_fields; a row has one identity.`,
			);
		byKind.set(kind, {
			kind,
			surface: surface as RowKindSurface,
			...(typeof raw.entry_kind === "string" ? { entry_kind: raw.entry_kind } : {}),
			...(typeof raw.owner === "string" ? { owner: raw.owner } : {}),
			...(typeof raw.reason === "string" ? { reason: raw.reason } : {}),
			...(typeof raw.id_field === "string" ? { id_field: raw.id_field } : {}),
			...(idFields ? { id_fields: idFields } : {}),
			...(typeof raw.owner_field === "string" ? { owner_field: raw.owner_field } : {}),
			...(ownerCandidatesRaw ? { owner_candidates: ownerCandidatesRaw } : {}),
			...(typeof raw.named_by === "string" ? { named_by: raw.named_by } : {}),
			...(typeof raw.label === "string" ? { label: raw.label } : {}),
			...(typeof raw.note === "string" ? { note: raw.note } : {}),
			...(publicFields ? { public_fields: publicFields as string[] } : {}),
		});
	}

	// `*` is the one owner that is not a kind name: it means the owner is
	// chosen per row, from the row's own target columns. `metadata_attachments`
	// works that way — every row names its own target — and pretending it
	// belongs to one fixed kind would be a lie the file then has to carry.
	// `owner_candidates` names several FIXED kinds instead of one, so every one
	// of them needs the same "is this actually classified" check the singular
	// `owner` gets.
	for (const row of byKind.values()) {
		if (row.owner !== undefined && row.owner !== POLYMORPHIC_OWNER && !byKind.has(row.owner))
			throw new Error(
				`row-kind-coverage.toml: '${row.kind}' belongs to '${row.owner}', which is not classified.`,
			);
		for (const candidate of row.owner_candidates ?? [])
			if (candidate.owner !== POLYMORPHIC_OWNER && !byKind.has(candidate.owner))
				throw new Error(
					`row-kind-coverage.toml: '${row.kind}' belongs to '${candidate.owner}', which is not classified.`,
				);
	}

	return [...byKind.values()];
}

let cached: readonly RowKindCoverage[] | undefined;

/** Every classified row kind, in authored order. */
export function rowKindCoverage(): readonly RowKindCoverage[] {
	cached ??= readCoverage();
	return cached;
}

/** The classification for one kind, or `undefined` when it is unclassified. */
export function rowKindCoverageFor(kind: string): RowKindCoverage | undefined {
	return rowKindCoverage().find((row) => row.kind === kind);
}

/** Kind names that earn their own catalogue page, in authored order. */
export function pagedRowKinds(): readonly string[] {
	return rowKindCoverage()
		.filter((row) => row.surface === "page")
		.map((row) => row.kind);
}

/**
 * Kinds in `candidates` that nothing has classified.
 *
 * The caller supplies the candidates so this module never has to decide where
 * truth comes from: the gate passes the KERNEL registry plus whatever tables a
 * manifest actually carries, which is a wider set than any fixture scan.
 */
export function unclassifiedRowKinds(candidates: Iterable<string>): readonly string[] {
	const known = new Set(rowKindCoverage().map((row) => row.kind));
	const missing = new Set<string>();
	for (const kind of candidates) if (!known.has(kind)) missing.add(kind);
	return [...missing].sort();
}
