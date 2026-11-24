import { readD20TestsReaderFragmentMetadata } from "../../../markdown/playing-the-game";
import { driveUnitScene, metadataCall } from "../../verb-runner";
import { BUNDLE_ID } from "../constants";

/**
 * D20 Tests is reader prose, not a second implementation of the existing
 * D20 mechanics. It owns only the fragment metadata addressed by the root
 * docs page; no world rows are authored here.
 */
export async function buildD20ReaderFragment(): Promise<{ toml: string }> {
	const article = readD20TestsReaderFragmentMetadata();
	return {
		toml: await driveUnitScene(
			BUNDLE_ID,
			[
				metadataCall("docs-d20-tests", BUNDLE_ID, [
					{
						target: "manifest",
						key: "docs",
						value: { "d20-tests": article },
					},
				]),
			],
			undefined,
			{ retainMetadata: true },
		),
	};
}
