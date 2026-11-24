// Neutral (non-story) host-act config shared by the generic twin tests.
import type { VerbCall } from "../lib/index.ts";
import type { HostActConfig } from "./index.ts";

export const NEUTRAL_HOST_ACT: HostActConfig = {
	bundle: "demo",
	dmEntityKey: "demo/dm_1",
	personaName: "Warden",
	bundleHeader: (): VerbCall => ({
		toolName: "spellkave_write_rows",
		label: "define-demo-bundle",
		params: { bundle: "demo", kind: "bundles", rows: [] },
	}),
};
