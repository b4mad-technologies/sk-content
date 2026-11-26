import { describe, expect, it } from "vitest";

import { LEFTOVER_SHARD_COUNT, parseCoverageShard } from "./check";

describe("srd-cc leftover coverage shard", () => {
	it("parses SRD_COVERAGE_SHARD=i/K and rejects typos", () => {
		expect(parseCoverageShard(undefined)).toBeUndefined();
		expect(parseCoverageShard("")).toBeUndefined();
		expect(parseCoverageShard("1/4")).toEqual({ index: 1, of: 4 });
		expect(parseCoverageShard(`1/${LEFTOVER_SHARD_COUNT}`)).toEqual({
			index: 1,
			of: LEFTOVER_SHARD_COUNT,
		});
		expect(() => parseCoverageShard("0/4")).toThrow(/i\/K/);
		expect(() => parseCoverageShard("5/4")).toThrow(/greater than/);
		expect(() => parseCoverageShard("1of4")).toThrow(/i\/K/);
		expect(() => parseCoverageShard("1/4/extra")).toThrow(/i\/K/);
	});
});
