import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { FIXTURES_DIR } from "../../pipeline";

const PKG_ROOT = join(FIXTURES_DIR, "..");
const MANIFEST_PATH = join(PKG_ROOT, "art", "art-manifest.json");
const ASSETS = join(PKG_ROOT, "assets", "srd-art");
const ART_TOML = join(FIXTURES_DIR, "base/playing-the-game/srd-art.toml");

interface ManifestEntry {
	id: string;
	output_path: string;
	target_attachment_ref: string;
}

function listWebps(dir: string): string[] {
	const out: string[] = [];
	if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return out;
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		const st = statSync(path);
		if (st.isDirectory()) out.push(...listWebps(path));
		else if (name.endsWith(".webp")) out.push(path);
	}
	return out.sort();
}

describe("srd-art completeness", () => {
	it("every ingested webp has a manifest entry, sidecar hash, and srd.art.image attachment", () => {
		const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as {
			entries: ManifestEntry[];
		};
		const byTail = new Map<string, ManifestEntry>();
		for (const entry of manifest.entries) {
			const parts = entry.output_path.replaceAll("\\", "/").split("/");
			if (parts.length >= 2) byTail.set(parts.slice(-2).join("/"), entry);
		}
		const toml = readFileSync(ART_TOML, "utf8");
		const missingEntry: string[] = [];
		const mismatch: string[] = [];
		const missingAttach: string[] = [];
		for (const abs of listWebps(ASSETS)) {
			const rel = relative(ASSETS, abs).replaceAll("\\", "/");
			const entry = byTail.get(rel);
			if (entry === undefined) {
				missingEntry.push(rel);
				continue;
			}
			const hash = createHash("sha256").update(readFileSync(abs)).digest("hex");
			const sidecar = `${abs}.json`;
			if (existsSync(sidecar)) {
				const meta = JSON.parse(readFileSync(sidecar, "utf8")) as { sha256?: string };
				if (typeof meta.sha256 === "string" && meta.sha256 !== hash) {
					mismatch.push(entry.id);
				}
			} else {
				mismatch.push(entry.id);
			}
			const colon = entry.target_attachment_ref.indexOf(":");
			const hashAt = entry.target_attachment_ref.lastIndexOf("#");
			const body =
				hashAt === -1 ? entry.target_attachment_ref : entry.target_attachment_ref.slice(0, hashAt);
			const targetRef = colon === -1 ? body : body.slice(colon + 1);
			if (!toml.includes(`target_ref = "${targetRef}"`)) {
				missingAttach.push(targetRef);
			}
		}
		expect(missingEntry.slice(0, 20)).toEqual([]);
		expect(mismatch.slice(0, 20)).toEqual([]);
		expect(missingAttach.slice(0, 20)).toEqual([]);
		expect(listWebps(ASSETS).length).toBeGreaterThan(1000);
		expect(toml).toContain('namespace = "srd.art.image"');
		expect(toml).toContain("srd/item/rations");
	});
});
