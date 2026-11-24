/**
 * Runtime verb-scene driver (sk-jay0.7.21). The implementation moved to
 * `@spellkave/tool-node` (sk-jay0.7.174.1) so srd-cc and the runtime share
 * one copy; this module keeps the runtime's import path.
 */
export {
	driveManifestScene,
	type VerbCall,
	VerbExecutionError,
	VerbRunnerError,
} from "@spellkave/tool-node";
