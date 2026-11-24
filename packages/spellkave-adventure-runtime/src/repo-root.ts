import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Repo root. `SPELLKAVE_REPO_ROOT` wins (tests / odd worktrees); else git. */
export function repoRoot(): string {
	const override = process.env.SPELLKAVE_REPO_ROOT?.trim();
	if (override) return override;
	return execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
}

/**
 * DM-seed descriptor dir (ADR-0115 D-3). Slug packages keep their own
 * `adventures/` directory; see {@link adventureDescriptorSearchDirs}.
 */
export function adventureDescriptorsDir(root: string = repoRoot()): string {
	return join(root, "packages/spellkave-srd-cc/scripts/adventures");
}

/** Every directory that may contain `<name>.toml` adventure descriptors. */
export function adventureDescriptorSearchDirs(root: string = repoRoot()): string[] {
	const dirs = [adventureDescriptorsDir(root)];
	const packagesDir = join(root, "packages");
	if (!existsSync(packagesDir)) return dirs;
	for (const name of readdirSync(packagesDir)) {
		if (!name.startsWith("spellkave-adventure-") || name === "spellkave-adventure-runtime") {
			continue;
		}
		const adventures = join(packagesDir, name, "adventures");
		if (existsSync(adventures)) dirs.push(adventures);
	}
	return dirs;
}
