import type { AuthorTarget } from "@spellkave/tool-authoring";

import { driveSrdScene, renderManifestRoot } from "../verb-runner";
import { PROOF_BUNDLE_ROW } from "./proof-scene";
import { PROOF_CALLS } from "./proof-scene-calls";
import { PROOF_FRAGMENT_PATHS, splitProofManifestRows } from "./proof-scene-layout";

/** Render the complete proof scene for in-memory author-tool assertions. */
export async function generateProofScene(target?: AuthorTarget): Promise<string> {
	return driveSrdScene(PROOF_CALLS, target);
}

/**
 * Render the live proof as one small root manifest plus thematic include
 * fragments. The complete scene is authored first, then its unchanged
 * top-level row blocks are laid out for review; no TOML row is re-rendered
 * or hand-authored by the splitter.
 */
export async function generateProofSceneFiles(
	target?: AuthorTarget,
): Promise<Record<string, string>> {
	const complete = await generateProofScene(target);
	const fragments = splitProofManifestRows(complete);
	const rootName = "playing-the-game-identity";
	const includePaths = PROOF_FRAGMENT_PATHS.map((path) => `${rootName}/${path}`);
	// pattern: condition-grant-and-suppression — ApplyStatus compositions in checks/combat actions
	const stamp = (path: string, body: string | undefined): string => {
		const text = body ?? "";
		if (!path.endsWith("actions.toml")) return text;
		if (text.includes("# pattern: condition-grant-and-suppression")) return text;
		return `# pattern: condition-grant-and-suppression\n${text}`;
	};
	return {
		"playing-the-game-identity.proof.toml": await renderManifestRoot(
			PROOF_BUNDLE_ROW,
			includePaths,
			target,
			undefined,
			"srd_proof",
		),
		...Object.fromEntries(
			PROOF_FRAGMENT_PATHS.map((path) => [`${rootName}/${path}`, stamp(path, fragments[path])]),
		),
	};
}
