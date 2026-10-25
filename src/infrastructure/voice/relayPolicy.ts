export class RelayError extends Error {}

export function canStopRelay(input: {
    channelId: string | null;
    fromId: string;
    userId: string;
    startedBy: string;
    ownerId?: string;
    administrator: boolean;
}): boolean {
    return input.channelId === input.fromId || input.userId === input.startedBy ||
        input.userId === input.ownerId || input.administrator;
}

/** 既存タイマーを維持し、bot の出入りでは60秒の起点を動かさない。 */
export function autoStopAction(members: readonly { user: { bot: boolean } }[], timerPending: boolean): 'schedule' | 'cancel' | 'keep' {
    const occupied = members.some(member => !member.user.bot);
    if (occupied) return timerPending ? 'cancel' : 'keep';
    return timerPending ? 'keep' : 'schedule';
}
