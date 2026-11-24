// DOC-IMPL: srd-text#attachment
import type { SetMetadataUpdate } from "@spellkave/tool-authoring";
import { metadataCall, type VerbCall } from "../chapters/verb-runner";
import {
	type ExtractedSrdText,
	SRD_TEXT_AUDIENCE,
	SRD_TEXT_BUNDLE_ID,
	SRD_TEXT_LICENSE,
	SRD_TEXT_NAMESPACE,
	type SrdTextTargetKind,
} from "./types";

export function srdTextNamespaceUpdate(): SetMetadataUpdate {
	return {
		target: "namespace",
		key: SRD_TEXT_NAMESPACE,
		value: {
			audience: SRD_TEXT_AUDIENCE,
			description:
				"Verbatim CC-BY-4.0 SRD 5.2.1 prose for a catalog entry. Payload keys: text, source, license.",
			on_demand: true,
		},
	};
}

export function srdTextAttachmentUpdate(args: {
	targetKind: SrdTextTargetKind;
	targetRef: string;
	extracted: ExtractedSrdText;
}): SetMetadataUpdate {
	if (args.extracted.text.trim().length === 0) {
		throw new Error(`srd-text: empty verbatim text for ${args.targetRef}.`);
	}
	if (!args.extracted.source.startsWith("cache/")) {
		throw new Error(
			`srd-text: source pointer for ${args.targetRef} must start with cache/, got '${args.extracted.source}'.`,
		);
	}
	return {
		target: { kind: args.targetKind, ref: args.targetRef },
		key: SRD_TEXT_NAMESPACE,
		value: {
			text: args.extracted.text,
			source: args.extracted.source,
			license: SRD_TEXT_LICENSE,
		},
	};
}

export function srdTextNamespaceWriteCall(): VerbCall {
	return metadataCall("srd-text-namespace", SRD_TEXT_BUNDLE_ID, [srdTextNamespaceUpdate()]);
}

export function srdTextAttachmentWriteCall(args: {
	targetKind: SrdTextTargetKind;
	targetRef: string;
	extracted: ExtractedSrdText;
}): VerbCall {
	return metadataCall(`srd-text:${args.targetRef}`, SRD_TEXT_BUNDLE_ID, [
		srdTextAttachmentUpdate(args),
	]);
}

export function withSrdTextNamespace(calls: readonly VerbCall[]): VerbCall[] {
	return [srdTextNamespaceWriteCall(), ...calls];
}
