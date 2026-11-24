import { existsSync, readFileSync } from "node:fs";
import { flavorAbsPath } from "./completeness";
import {
	actionFlavorPath,
	capabilityFlavorPath,
	conditionFlavorPath,
	parseFlavorMarkdown,
	readActionFlavor,
	readCapabilityFlavor,
	readConditionFlavor,
	ruleFlavorSlug,
} from "./read";

const DEFAULT_BUNDLE = "srd";

/** Tags whose description IS the SRD table (no srd.text target kind yet). */
export const TAGS_KEEP_BUILDER_DESCRIPTION = new Set([
	"srd.ability_score",
	"srd.difficulty_class",
	"srd.travel_pace.fast",
	"srd.travel_pace.normal",
	"srd.travel_pace.slow",
]);

type RuleKind = "capability" | "condition" | "action";

function qualifyId(bundle: unknown, localId: unknown): string | null {
	if (typeof localId !== "string" || localId.length === 0) return null;
	if (localId.startsWith("srd/") || localId.startsWith("core/")) return localId;
	const owner = typeof bundle === "string" && bundle.length > 0 ? bundle : DEFAULT_BUNDLE;
	return `${owner}/${localId}`;
}

function flavorPath(kind: RuleKind, id: string): string {
	const slug = ruleFlavorSlug(id);
	if (kind === "capability") return capabilityFlavorPath(slug);
	if (kind === "condition") return conditionFlavorPath(slug);
	return actionFlavorPath(slug);
}

function readBody(kind: RuleKind, id: string): string | null {
	if (!existsSync(flavorPath(kind, id))) return null;
	if (kind === "capability") return readCapabilityFlavor(id).body;
	if (kind === "condition") return readConditionFlavor(id).body;
	return readActionFlavor(id).body;
}

function overlayParamsDescription(
	kind: RuleKind,
	params: Record<string, unknown>,
	id: string,
): Record<string, unknown> {
	const body = readBody(kind, id);
	if (body === null) return params;
	return { ...params, description: body };
}

type CatalogKind =
	| "entity_definitions"
	| "resource_definitions"
	| "tag_value_definitions"
	| "niche_definitions"
	| "dsl_macro_definitions"
	| "session_definitions"
	| "consequence_templates";

function readCatalogBody(kind: CatalogKind, id: string): string | null {
	const path = flavorAbsPath({ kind, id });
	if (path === null || !existsSync(path)) return null;
	return parseFlavorMarkdown(readFileSync(path, "utf8"), path).body;
}

function readEntityBody(id: string): string | null {
	return readCatalogBody("entity_definitions", id);
}

function overlayWriteRow(
	kind: RuleKind,
	idField: string,
	row: Record<string, unknown>,
): Record<string, unknown> {
	const id = row[idField];
	if (typeof id !== "string") return row;
	const body = readBody(kind, id);
	if (body === null) return row;
	return { ...row, description: body };
}

interface FlavorCall {
	toolName: string;
	params: Record<string, unknown>;
}

/** Replace player-facing descriptions with authored glossary blurbs when present. */
export function overlayRuleFlavor<T extends FlavorCall>(call: T): T {
	const params = call.params;
	if (call.toolName === "spellkave_define_entity_type") {
		const id = qualifyId(params.bundle, params.id);
		if (id === null) return call;
		const body = readEntityBody(id);
		if (body === null) return call;
		return { ...call, params: { ...params, description: body } };
	}
	if (call.toolName === "spellkave_define_niche") {
		const id = qualifyId(params.bundle, params.id);
		if (id === null) return call;
		const body = readCatalogBody("niche_definitions", id);
		if (body === null) return call;
		return { ...call, params: { ...params, description: body } };
	}
	if (call.toolName === "spellkave_define_session") {
		const id = qualifyId(params.bundle, params.id);
		if (id === null) return call;
		const body = readCatalogBody("session_definitions", id);
		if (body === null) return call;
		return { ...call, params: { ...params, description: body } };
	}
	if (call.toolName === "spellkave_define_consequence") {
		const id = qualifyId(params.bundle, params.id);
		if (id === null) return call;
		const body = readCatalogBody("consequence_templates", id);
		if (body === null) return call;
		return { ...call, params: { ...params, description: body } };
	}
	if (call.toolName === "spellkave_define_resource") {
		const id = qualifyId(params.bundle, params.id);
		if (id === null) return call;
		const body = readCatalogBody("resource_definitions", id);
		if (body === null) return call;
		return { ...call, params: { ...params, description: body } };
	}
	if (call.toolName === "spellkave_define_capability") {
		const id = qualifyId(params.bundle, params.id);
		if (id === null) return call;
		return { ...call, params: overlayParamsDescription("capability", params, id) };
	}
	if (call.toolName === "spellkave_define_condition") {
		const id = qualifyId(params.bundle, params.id);
		if (id === null) return call;
		return { ...call, params: overlayParamsDescription("condition", params, id) };
	}
	if (call.toolName === "spellkave_define_action") {
		const id = qualifyId(params.bundle, params.id);
		if (id === null) return call;
		return { ...call, params: overlayParamsDescription("action", params, id) };
	}
	if (call.toolName === "spellkave_define_action_verb") {
		const id = qualifyId(params.bundle, params.id);
		if (id === null) return call;
		let next = overlayParamsDescription("action", params, id);
		const suffix =
			typeof params.consequence_id_suffix === "string" && params.consequence_id_suffix.length > 0
				? params.consequence_id_suffix
				: "success";
		const consequenceId = `${id}/${suffix}`;
		const body = readCatalogBody("consequence_templates", consequenceId);
		const consequence = next.consequence;
		if (body !== null && consequence !== undefined && typeof consequence === "object") {
			next = {
				...next,
				consequence: { ...(consequence as Record<string, unknown>), description: body },
			};
		}
		return { ...call, params: next };
	}
	if (call.toolName === "spellkave_define_behavior") {
		const capabilityId =
			typeof params.capability_id === "string" && params.capability_id.length > 0
				? params.capability_id
				: qualifyId(params.bundle, `spell/${String(params.id ?? "")}`);
		if (capabilityId === null) return call;
		return { ...call, params: overlayParamsDescription("capability", params, capabilityId) };
	}
	if (call.toolName === "spellkave_write_rows") {
		const kind = params.kind;
		const rows = params.rows;
		if (!Array.isArray(rows)) return call;
		if (kind === "capability_definitions") {
			return {
				...call,
				params: {
					...params,
					rows: rows.map((row) =>
						overlayWriteRow("capability", "capability_id", row as Record<string, unknown>),
					),
				},
			};
		}
		if (kind === "condition_definitions") {
			return {
				...call,
				params: {
					...params,
					rows: rows.map((row) =>
						overlayWriteRow("condition", "condition_definition_id", row as Record<string, unknown>),
					),
				},
			};
		}
		if (kind === "action_definitions") {
			return {
				...call,
				params: {
					...params,
					rows: rows.map((row) =>
						overlayWriteRow("action", "action_id", row as Record<string, unknown>),
					),
				},
			};
		}
		if (kind === "entity_definitions") {
			return {
				...call,
				params: {
					...params,
					rows: (rows as Record<string, unknown>[]).map((row) => {
						const id = row.entity_def_id;
						if (typeof id !== "string") return row;
						const body = readEntityBody(id);
						return body === null ? row : { ...row, description: body };
					}),
				},
			};
		}
		if (kind === "tag_value_definitions") {
			return {
				...call,
				params: {
					...params,
					rows: (rows as Record<string, unknown>[]).map((row) => {
						const id = row.tag;
						if (typeof id !== "string") return row;
						if (TAGS_KEEP_BUILDER_DESCRIPTION.has(id)) return row;
						const body = readCatalogBody("tag_value_definitions", id);
						return body === null ? row : { ...row, description: body };
					}),
				},
			};
		}
		if (kind === "niche_definitions") {
			return {
				...call,
				params: {
					...params,
					rows: (rows as Record<string, unknown>[]).map((row) => {
						const id = row.niche_id;
						if (typeof id !== "string") return row;
						const body = readCatalogBody("niche_definitions", id);
						return body === null ? row : { ...row, description: body };
					}),
				},
			};
		}
		if (kind === "dsl_macro_definitions") {
			return {
				...call,
				params: {
					...params,
					rows: (rows as Record<string, unknown>[]).map((row) => {
						const id = row.macro_id;
						if (typeof id !== "string") return row;
						const body = readCatalogBody("dsl_macro_definitions", id);
						return body === null ? row : { ...row, description: body };
					}),
				},
			};
		}
		if (kind === "session_definitions") {
			return {
				...call,
				params: {
					...params,
					rows: (rows as Record<string, unknown>[]).map((row) => {
						const id = row.session_def_id;
						if (typeof id !== "string") return row;
						const body = readCatalogBody("session_definitions", id);
						return body === null ? row : { ...row, description: body };
					}),
				},
			};
		}
		if (kind === "consequence_templates") {
			return {
				...call,
				params: {
					...params,
					rows: (rows as Record<string, unknown>[]).map((row) => {
						const id = row.template_id;
						if (typeof id !== "string") return row;
						const body = readCatalogBody("consequence_templates", id);
						return body === null ? row : { ...row, description: body };
					}),
				},
			};
		}
		if (kind === "resource_definitions") {
			return {
				...call,
				params: {
					...params,
					rows: (rows as Record<string, unknown>[]).map((row) => {
						const id = row.resource_definition_id;
						if (typeof id !== "string") return row;
						const body = readCatalogBody("resource_definitions", id);
						return body === null ? row : { ...row, description: body };
					}),
				},
			};
		}
	}
	return call;
}

const GENERATED_TABLES: Array<{ kind: CatalogKind; idField: string }> = [
	{ kind: "niche_definitions", idField: "niche_id" },
	{ kind: "dsl_macro_definitions", idField: "macro_id" },
	{ kind: "session_definitions", idField: "session_def_id" },
	{ kind: "consequence_templates", idField: "template_id" },
];

/** Overlay flavor onto rows a folding verb emitted internally (not via write_rows). */
export function overlayGeneratedToml(toml: string): string {
	return toml.replace(
		/^\[\[(niche_definitions|dsl_macro_definitions|session_definitions|consequence_templates)\]\]\n[\s\S]*?(?=^\[\[|Z)/gm,
		(block, kind: string) => {
			const spec = GENERATED_TABLES.find((row) => row.kind === kind);
			if (spec === undefined) return block;
			const idMatch = new RegExp(`^${spec.idField} = "(.*)"$`, "m").exec(block);
			if (idMatch === null) return block;
			const body = readCatalogBody(spec.kind, idMatch[1] ?? "");
			if (body === null) return block;
			const quoted = JSON.stringify(body);
			if (/^description = """/m.test(block)) {
				return block.replace(/^description = """[\s\S]*?^"""$/m, `description = ${quoted}`);
			}
			return block.replace(/^description = ".*"$/m, `description = ${quoted}`);
		},
	);
}
