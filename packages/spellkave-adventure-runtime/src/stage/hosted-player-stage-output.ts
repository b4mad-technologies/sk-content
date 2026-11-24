export function serializeHostedPlayerStage(actorKey: string, entityId: bigint): string {
	return `${JSON.stringify({
		kind: "hosted_player_stage",
		status: "ok",
		actor_key: actorKey,
		actor_id: entityId.toString(),
	})}\n`;
}
