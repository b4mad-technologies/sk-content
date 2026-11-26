// flavor-ingest.ts's frontmatter provenance line(s): openai/paid cells keep
// their original `model: openai/<id>` line byte-identical; `agent-session`
// cells (bin/skgen prose ingest, no provider credential) never claim a model
// they didn't call — `provider` + `author` instead (sk-jay0.3.17 unblock).
import { describe, expect, it } from "vitest";
import { frontmatterProvenance } from "../../../scripts/flavor-ingest.ts";

describe("flavor-ingest frontmatterProvenance", () => {
	it("keeps an openai/paid cell's model line byte-identical", () => {
		expect(frontmatterProvenance({ model: "openai/gpt-5.6-terra" })).toBe(
			"model: openai/gpt-5.6-terra",
		);
	});

	it("normalizes a bare (unprefixed) model id the same way", () => {
		expect(frontmatterProvenance({ model: "gpt-5.6-terra" })).toBe("model: openai/gpt-5.6-terra");
	});

	it("records provider + author, never a model, for an agent-session cell", () => {
		const lines = frontmatterProvenance({
			provider: "agent-session",
			author: "agent-session:claude-code (supervisor)",
		});
		expect(lines).toBe("provider: agent-session\nauthor: agent-session:claude-code (supervisor)");
		expect(lines).not.toContain("model:");
	});
});
