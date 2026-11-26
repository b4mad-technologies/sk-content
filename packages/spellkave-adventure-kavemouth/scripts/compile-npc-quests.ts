/** Offline authoring only: no publisher credentials or world connection. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectManifest, loadFlattened } from "@spellkave/world-author";
import {
	compileNpcQuestLegacySource,
	compileNpcQuestSource,
} from "@spellkave/world-author/npc-quests";
import { QUEST_REFERENCE_ROOTS } from "../author/quest-reference-worlds.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = readFileSync(resolve(root, "author/quests.toml"), "utf8");
const legacy = await compileNpcQuestLegacySource(source);
const path = resolve(root, "author/quests.generated.ts");
const output = `// Generated from author/quests.toml by scripts/compile-npc-quests.ts.\n// Edit the TOML; this is a static compatibility loader, not an authored catalog.\nexport const COMPILED_QUEST_SOURCE = ${JSON.stringify(legacy, null, "\t")} as const;\n`;
if (process.argv.includes("--check")) {
	if (readFileSync(path, "utf8") !== output)
		throw new Error("Quest source loader is stale; run compile:npc-quests.");
} else {
	writeFileSync(path, output);
}
// The optional sealed artifact's non-test consumer belongs to sk-jay0.3.33.32.
const artifactIndex = process.argv.indexOf("--artifact");
if (artifactIndex >= 0) {
	const target = process.argv[artifactIndex + 1];
	if (!target || target.startsWith("--"))
		throw new Error("--artifact requires an explicit output path");
	const artifactPath = resolve(target);
	const worlds = QUEST_REFERENCE_ROOTS.map(
		([directory, entry]) =>
			inspectManifest(loadFlattened(resolve(root, "../..", directory), entry)).manifest,
	);
	const compiled = await compileNpcQuestSource(source, worlds);
	mkdirSync(dirname(artifactPath), { recursive: true, mode: 0o700 });
	writeFileSync(artifactPath, `${JSON.stringify(compiled.artifact, null, "\t")}\n`, {
		mode: 0o600,
	});
	for (const diagnostic of compiled.artifact.reference_diagnostics)
		console.log(JSON.stringify(diagnostic));
}
console.log(
	JSON.stringify({
		kind: "npc_quest_compile",
		quests: legacy.quests.length,
		check: process.argv.includes("--check"),
	}),
);
