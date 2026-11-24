#!/usr/bin/env tsx
import { COMPENDIUM_DIST_DIR } from "./from-fixtures";
import { exportCommittedFixtures } from "./write";

const rendered = exportCommittedFixtures();
console.log(
	`[compendium-export] wrote ${Object.keys(rendered.files).length} file(s) (${rendered.entryCount} entries) under ${COMPENDIUM_DIST_DIR}`,
);
