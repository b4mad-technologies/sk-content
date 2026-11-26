// Shared offline harness for reading the committed `fixtures/` bundle through
// the same author-facing `spellkave_query` surface used by `sk --target`.
// Feature assertions live in the neighbouring focused test files; generator
// determinism remains covered separately by `pipeline.test.ts`.
import {
	type AuthorToolContext,
	type AuthorWorkspace,
	type QueryDetailResult,
	type QueryListResult,
	type QueryResult,
	type QuerySummaryResult,
	queryToolDef,
} from "@spellkave/tool-authoring";
import { createLocalAuthorTarget } from "@spellkave/tool-node/authoring";
import { bindTool } from "@spellkave/tool-runtime";

import { FIXTURES_DIR } from "../../../fixture-paths";

export type { QueryDetailResult, QueryListResult, QuerySummaryResult };

/** Split the documented `parent::tag` composite identity used by tag rows. */
export function splitTagCompositeId(id: string): { parentId: string; tag: string } {
	const sep = id.lastIndexOf("::");
	if (sep < 0) {
		throw new Error(`fixtures-author-tool test: '${id}' is not a '::'-joined composite id.`);
	}
	return { parentId: id.slice(0, sep), tag: id.slice(sep + 2) };
}

function emptyWorkspace(): AuthorWorkspace {
	return { readToml: () => null, writeToml: () => "(unused)" };
}

export function buildTools() {
	const target = createLocalAuthorTarget(FIXTURES_DIR);
	const context: AuthorToolContext = { workspace: emptyWorkspace(), target };
	return bindTool(queryToolDef, { context, capabilities: {} });
}

export async function query(
	tools: ReturnType<typeof buildTools>,
	params: Parameters<ReturnType<typeof buildTools>["execute"]>[1],
): Promise<QueryResult> {
	const details = (await tools.execute("fixtures-author-tool-test", params)).details;
	// These tests never send `explore`; an exploration answer here is a harness bug.
	if ("shape" in details && details.shape === "exploration") {
		throw new Error("fixtures-author-tool test: unexpected exploration result");
	}
	return details;
}
