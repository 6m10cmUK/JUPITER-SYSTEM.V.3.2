import { autoStopAction, canStopRelay } from '../relayPolicy';

describe('relay B permissions', () => {
    const outsider = { channelId: null, fromId: 'from', userId: 'user', startedBy: 'starter', administrator: false };
    test('outsider cannot stop', () => expect(canStopRelay(outsider)).toBe(false));
    test.each([
        { channelId: 'from' }, { userId: 'starter' }, { ownerId: 'user' }, { administrator: true }
    ])('each stop exception is independently sufficient: %j', override => {
        expect(canStopRelay({ ...outsider, ...override })).toBe(true);
    });
    test('destination member cannot stop', () => expect(canStopRelay({ ...outsider, channelId: 'to' })).toBe(false));
});

describe('empty channel auto stop decisions', () => {
    const bot = { user: { bot: true } };
    const human = { user: { bot: false } };
    test.each([
        [[], false, 'schedule'], [[bot], false, 'schedule'], [[bot, bot], true, 'keep'],
        [[], true, 'keep'], [[human], true, 'cancel'], [[bot, human], true, 'cancel'],
        [[human], false, 'keep']
    ] as const)('members=%j pending=%s', (members, pending, expected) => {
        expect(autoStopAction(members, pending)).toBe(expected);
    });
});
