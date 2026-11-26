import { defineConfig } from "vitest/config";

// The offline content tests compile whole SRD chapters; some take longer
// than Vitest's 5 s default.
export default defineConfig({
	test: {
		testTimeout: 60_000,
	},
});
