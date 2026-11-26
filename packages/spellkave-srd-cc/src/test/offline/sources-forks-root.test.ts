// Offline unit coverage for finding #80 / issue #2102 —
// forksRoot must not assume a fixed hop count from the package root.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FORKS_ROOT_MARKERS, resolveForksRoot } from "../../sources.ts";
import { findingEvidence } from "../srd-coverage/evidence";

describe("resolveForksRoot (#2102 / finding #80)", () => {
	const temps: string[] = [];

	afterEach(() => {
		for (const dir of temps.splice(0)) {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	function tempTree(): string {
		const root = mkdtempSync(path.join(tmpdir(), "srd-cc-forks-"));
		temps.push(root);
		return root;
	}

	function plantForks(container: string): void {
		for (const name of FORKS_ROOT_MARKERS) {
			mkdirSync(path.join(container, name), { recursive: true });
			writeFileSync(path.join(container, name, ".keep"), "");
		}
	}

	findingEvidence(
		{
			id: "80",
			title: "Nested worktrees resolve the source forks root",
			expected:
				"Source-cache discovery walks ancestors until both required sibling forks are found.",
			observed:
				"The former fixed three-hop path landed inside nested agent worktrees and threw ENOENT.",
			impact:
				"Agents in nested worktrees could not run sync-cache without an absolute-path override.",
			references: [
				"ledger/archive/findings-details.md",
				"https://github.com/b4arena/spellkave/issues/2102",
			],
		},
		() => {
			const container = tempTree();
			plantForks(container);
			const nestedPkg = path.join(container, "deep", "agent", "wt", "packages", "spellkave-srd-cc");
			mkdirSync(nestedPkg, { recursive: true });

			expect(resolveForksRoot({ startDir: nestedPkg, env: {} })).toBe(path.resolve(container));
		},
	);

	it("honors SPELLKAVE_FORKS_ROOT when the override contains both markers", () => {
		const container = tempTree();
		plantForks(container);
		const elsewhere = path.join(tempTree(), "unrelated", "pkg");
		mkdirSync(elsewhere, { recursive: true });

		expect(
			resolveForksRoot({
				startDir: elsewhere,
				env: { SPELLKAVE_FORKS_ROOT: container },
			}),
		).toBe(path.resolve(container));
	});

	it("throws a loud error listing tried ancestors when forks are missing", () => {
		const orphan = path.join(tempTree(), "a", "b", "pkg");
		mkdirSync(orphan, { recursive: true });

		expect(() => resolveForksRoot({ startDir: orphan, env: {} })).toThrow(
			/Could not locate SRD source forks root/,
		);
		expect(() => resolveForksRoot({ startDir: orphan, env: {} })).toThrow(/SPELLKAVE_FORKS_ROOT/);
	});

	it("rejects SPELLKAVE_FORKS_ROOT that lacks the required siblings", () => {
		const bad = tempTree();
		mkdirSync(path.join(bad, "dnd-5e-srd-markdown"), { recursive: true });
		// open5e-api deliberately missing

		expect(() =>
			resolveForksRoot({
				startDir: bad,
				env: { SPELLKAVE_FORKS_ROOT: bad },
			}),
		).toThrow(/SPELLKAVE_FORKS_ROOT=/);
	});
});
