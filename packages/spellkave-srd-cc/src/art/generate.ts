import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { AuthorTarget } from "@spellkave/tool-authoring";

import { driveUnitScene, metadataCall, type VerbCall } from "../chapters/verb-runner";
import { SRD_ART_AUDIENCE, SRD_ART_BUNDLE_ID, SRD_ART_LICENSE, SRD_ART_NAMESPACE } from "./types";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MANIFEST_PATH = join(PKG_ROOT, "art", "art-manifest.json");
const REPO_ROOT = join(PKG_ROOT, "..", "..");

interface ManifestEntry {
	id: string;
	output_path: string;
	target_attachment_ref: string;
}

interface ArtManifestFile {
	entries: ManifestEntry[];
}

function parseTarget(ref: string): { targetKind: string; targetRef: string } {
	const hash = ref.lastIndexOf("#");
	const body = hash === -1 ? ref : ref.slice(0, hash);
	const colon = body.indexOf(":");
	if (colon === -1) {
		return { targetKind: "entity_definition", targetRef: body };
	}
	return { targetKind: body.slice(0, colon), targetRef: body.slice(colon + 1) };
}

function assetPath(outputPath: string): string {
	const marker = "assets/";
	const at = outputPath.indexOf(marker);
	if (at === -1) {
		throw new Error(`srd-art: output_path is not under assets/: ${outputPath}`);
	}
	return outputPath.slice(at + marker.length);
}

/** Public srd.art.image namespace + one attachment per ingested sprite. */
export async function generateSrdArtFragment(target?: AuthorTarget): Promise<string> {
	const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as ArtManifestFile;
	const attachmentUpdates: import("@spellkave/tool-authoring").SetMetadataUpdate[] = [];
	for (const entry of manifest.entries) {
		// Effect-family badge PNGs are versioned composition inputs under art/badge.
		// Only emitted assets participate in the public srd.art.image attachment surface.
		if (!entry.output_path.includes("assets/")) continue;
		const abs = join(REPO_ROOT, entry.output_path);
		// Planned assets may not be ingested yet; omit their attachment until they are.
		if (!existsSync(abs)) {
			continue;
		}
		const hash = createHash("sha256").update(readFileSync(abs)).digest("hex");
		const { targetKind, targetRef } = parseTarget(entry.target_attachment_ref);
		attachmentUpdates.push({
			target: { kind: targetKind, ref: targetRef },
			key: SRD_ART_NAMESPACE,
			value: {
				path: assetPath(entry.output_path),
				hash,
				license: SRD_ART_LICENSE,
			},
		});
	}
	const calls: VerbCall[] = [
		metadataCall("srd-art", SRD_ART_BUNDLE_ID, [
			{
				target: "namespace",
				key: SRD_ART_NAMESPACE,
				value: {
					audience: SRD_ART_AUDIENCE,
					description:
						"Public image reference, SHA-256 content hash and license for an SRD catalog entry; consumers choose presentation.",
				},
			},
			...attachmentUpdates,
		]),
	];
	return driveUnitScene(SRD_ART_BUNDLE_ID, calls, target);
}
