/** Typed authoring builders and the scripted DM act port.
 * Build-time authors use the definition builders to seed shared vocabulary.
 * Scripted seats consume authored vocabulary through receipt-ordered acts.
 * Legacy manifest composition remains for build-time authors and fixtures. Source ids
 * continue to identify the definition bundle; bundle_id identifies ownership.
 * Ownership is proved by runtime-ownership.test.ts and the live survival suite.
 */

export * from "./act-port";
export * from "./adventure-scope";
export * from "./apply-before-latch";
export * from "./apply-port";
export * from "./dialogue";
export { advancementAct, setStateAct, trainAct } from "./dm-act-plan.ts";
export * from "./frame-writes";
export * from "./grants";
export * from "./niches";
export * from "./readers";
export * from "./render";
export * from "./resources";
export {
	driveManifestScene,
	type VerbCall,
	VerbExecutionError,
	VerbRunnerError,
} from "./scene-driver.ts";
