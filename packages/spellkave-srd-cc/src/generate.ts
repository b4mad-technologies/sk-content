// Executable entry point for fixture regeneration. `pipeline.ts` deliberately
// stays import-safe so render tests can inspect it without writing fixtures.
import { generateFixtures } from "./pipeline";

await generateFixtures();
