#!/usr/bin/env tsx
/**
 * `dm` bundle orchestrator — companion verbs only.
 *
 *   just srd-cc-author-dm
 *   just srd-cc-author-dm --check
 *
 * Reusable DM-NPC/mechanic DEFINITIONS (today: Aldwin, `./aldwin.ts`),
 * decoupled from any one adventure's PLACEMENT — see `./aldwin.ts`'s own
 * module header for the 2026-08-08 split rationale. `depends_on = ["srd"]`
 * only: this bundle must never name a specific adventure.
 *
 * Mirrors `elven-mini/generate.ts`'s own pattern: `target` resolves refs
 * against the committed `fixtures/` root (the `srd` bundle) only — output is
 * written by hand via `inspectManifest`/`renderSchemaManifest`, never through
 * `target.applyBatch`.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { createLocalAuthorTarget } from "@spellkave/tool-node/authoring";
import { withRootApplyset } from "@spellkave/world-author";
import { driveSrdScene } from "../../../../spellkave-srd-cc/src/chapters/verb-runner";
import { FIXTURES_DIR } from "../../../../spellkave-srd-cc/src/pipeline";
import { dmAldwin } from "./aldwin.ts";
import { BUNDLE } from "./lib/ids.ts";
import { FIXTURE_ROOT } from "./lib/paths.ts";

const CHECK = process.argv.includes("--check");

function writeReadme(): string {
	return `# \`dm\` bundle (generated)

Do not hand-edit TOML here — regenerate:

\`\`\`bash
just srd-cc-author-dm
just srd-cc-author-dm --check
\`\`\`

## Bundle

bundle_id = \`${BUNDLE}\` · depends_on = ["srd"]

ADR-0154 restores shared dialogue, character-creation and level-up vocabulary
at build time. Adventures author entity/actor placement, authority and spatial
niche attachments. Runtime plans perform authored acts; phase conditions and
identity tags supply derived grants, and directed traces carry menu presentation.

Built via companion tools (\`driveManifestScene\` / \`createAuthorFacingTools\`).
`;
}

async function main(): Promise<void> {
	const target = createLocalAuthorTarget(FIXTURES_DIR);
	const dmToml = await driveSrdScene(dmAldwin(target), target);

	const outDir = CHECK ? join(FIXTURE_ROOT, ".check-tmp") : FIXTURE_ROOT;
	if (CHECK) {
		rmSync(outDir, { recursive: true, force: true });
	}
	mkdirSync(outDir, { recursive: true });

	// pattern: dialog-choice-slots
	// ADR-0145: the dm root is its own applyset.
	const namedToml = withRootApplyset(dmToml, "dm");
	const dmBody = namedToml.includes("# pattern: dialog-choice-slots")
		? namedToml
		: `# pattern: dialog-choice-slots\n${namedToml}`;
	writeFileSync(join(outDir, "manifest.toml"), dmBody.endsWith("\n") ? dmBody : `${dmBody}\n`);
	const readme = writeReadme();
	writeFileSync(join(outDir, "README.md"), readme.endsWith("\n") ? readme : `${readme}\n`);

	if (CHECK) {
		const drifts: string[] = [];
		for (const f of ["manifest.toml", "README.md"]) {
			const committed = join(FIXTURE_ROOT, f);
			const fresh = join(outDir, f);
			if (!existsSync(committed)) {
				drifts.push(`missing: ${f}`);
				continue;
			}
			if (readFileSync(committed, "utf8") !== readFileSync(fresh, "utf8")) {
				drifts.push(`drift: ${f}`);
			}
		}
		rmSync(outDir, { recursive: true, force: true });
		if (drifts.length) {
			console.error("[dm] CHECK failed");
			for (const d of drifts) console.error(`  ${d}`);
			process.exit(1);
		}
		console.log("[dm] OK — fixtures match generators");
		return;
	}

	console.log(`[dm] wrote bundle under ${FIXTURE_ROOT}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
