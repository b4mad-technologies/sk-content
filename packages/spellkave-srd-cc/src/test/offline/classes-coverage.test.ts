import { describe } from "vitest";
import { srdUnencoded } from "../srd-coverage/evidence";

// spellcasting-slots + spellcasting-feature: declared with real evidence in
// spellcasting-substrate-units.test.ts (docs/spellcasting-substrate.md).
const UNITS = [
	"base-class-identities",
	"subclass-identities",
	"training-capabilities",
	"fighter-feature-identities",
	"second-wind",
	// action-surge: LIVE evidence in martial-features-coverage.test.ts (finding #102)
	"remaining-classes",
] as const;
describe("Classes executable coverage", () => {
	for (const unit of UNITS)
		for (const aspect of ["source", "mechanic", "fixture", "live"] as const)
			srdUnencoded({
				chapter: "classes",
				unit,
				aspect,
				claim: "Coverage is not yet declared.",
				references: ["ledger/archive/classes-details.md"],
			});
});
