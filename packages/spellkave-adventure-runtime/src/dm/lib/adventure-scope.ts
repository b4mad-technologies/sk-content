/** Owning adventure and its seeded header for per-play manifest deltas. */
import type { VerbCall } from "./scene-driver";

export interface AdventureScope {
	readonly bundleId: string;
	readonly bundleHeaderCall: () => VerbCall;
}

export function withAdventureBundleHeader(
	scope: AdventureScope,
	calls: readonly VerbCall[],
): VerbCall[] {
	if (scope.bundleId.length === 0)
		throw new Error("Runtime authoring requires an adventure bundle.");
	const header = scope.bundleHeaderCall();
	const headerOwner =
		header.params.bundle_id ??
		(header.params.kind === "bundles"
			? (header.params.rows as { bundle_id: string }[])[0]?.bundle_id
			: undefined);
	if (headerOwner !== scope.bundleId)
		throw new Error("Runtime adventure header does not match its owner.");
	return [header, ...calls];
}
