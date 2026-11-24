// pattern: derived-value-mechanism
/** Roll healing once and cap it at the created hero's authored maximum.
 * Round 3 mirrors the current creation/advancement HP formula; see
 * sk-jay0.1.55.34 for Constitution-per-level and species advancement work.
 */
export function cappedHealingExpr(amount: string, subject: "actor" | "target"): string {
	const macro = subject === "actor" ? "srd/hit_point_maximum" : "srd/target_hit_point_maximum";
	return `let h = ${amount}; cond(${subject}.has_tag('srd.player_character'), let room = max(0, macro('${macro}') - ${subject}.stat('srd/hp')); h - max(0, h - room), h)`;
}
