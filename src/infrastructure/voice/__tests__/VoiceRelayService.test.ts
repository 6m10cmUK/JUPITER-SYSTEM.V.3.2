import { monitorEventLoopDelay } from 'node:perf_hooks';
import OpusScript from 'opusscript';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import type { Client, Guild, VoiceChannel } from 'discord.js';
import { DiscordAPIError, PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { VoiceRelayService } from '../VoiceRelayService';
import { logSystem } from '../../../shared/utils/UsageLogger';

const mockEncoder = { encode: jest.fn(() => Buffer.from([1, 2, 3])), delete: jest.fn() };
const mockEventLoopDelay = { enable: jest.fn(), disable: jest.fn(), reset: jest.fn(), max: 25_000_000 };
jest.mock('opusscript', () => Object.assign(jest.fn(() => mockEncoder), { Application: { AUDIO: 2049 } }));
jest.mock('node:perf_hooks', () => ({ monitorEventLoopDelay: jest.fn(() => mockEventLoopDelay) }));

jest.mock('../../../shared/utils/UsageLogger', () => ({ logSystem: jest.fn() }));
const mockConnections: ReturnType<typeof connection>[] = [];
const mockPlayer = Object.assign(new EventEmitter(), { play: jest.fn(), stop: jest.fn(), state: { status: 'playing' } });
const mockResource = new PassThrough();
function connection() {
    return Object.assign(new EventEmitter(), {
        state: { status: 'ready' },
        receiver: { speaking: new EventEmitter(), subscribe: jest.fn() },
        subscribe: jest.fn(), destroy: jest.fn()
    });
}
jest.mock('@discordjs/voice', () => ({
    joinVoiceChannel: () => { const value = connection(); mockConnections.push(value); return value; },
    getVoiceConnection: jest.fn(), entersState: jest.fn().mockResolvedValue(undefined),
    VoiceConnectionStatus: { Ready: 'ready', Disconnected: 'disconnected', Destroyed: 'destroyed', Signalling: 'signalling', Connecting: 'connecting' },
    createAudioPlayer: jest.fn(() => mockPlayer), NoSubscriberBehavior: { Play: 'play' },
    createAudioResource: jest.fn(() => ({ playStream: mockResource })), StreamType: { Opus: 'opus' }, EndBehaviorType: { AfterSilence: 'silence' }
}));

function fixture() {
    const members = new Map([['human', { user: { bot: false } }]]);
    const send = jest.fn().mockResolvedValue(undefined);
    const guild = { id: 'guild', members: { fetchMe: jest.fn().mockResolvedValue({}) } };
    const from = { id: 'from', guild, members, send, permissionsFor: () => ({ has: () => true }) };
    const to = { id: 'to', guild };
    const speakerChannel = { userLimit: 0, members: new Map(), isVoiceBased: () => true, permissionsFor: jest.fn().mockReturnValue(new PermissionsBitField([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])) };
    const speakerGuild = {
        members: { fetchMe: jest.fn().mockResolvedValue({}) },
        channels: { fetch: jest.fn().mockResolvedValue(speakerChannel) }
    };
    const speaker = { isReady: () => true, user: { id: 'speaker' }, guilds: { fetch: jest.fn().mockResolvedValue(speakerGuild) } };
    const client = Object.assign(new EventEmitter(), { users: { cache: new Map([['human', { bot: false }], ['bot', { bot: true }]]) } });
    const service = new VoiceRelayService();
    service.setSpeakerClient(speaker as unknown as Client);
    const start = () => service.start({ guild: guild as unknown as Guild, from: from as unknown as VoiceChannel,
        to: to as unknown as VoiceChannel, listenerClient: client as Client, startedBy: 'starter' });
    const update = () => client.emit('voiceStateUpdate', { channelId: 'from' }, { channelId: null });
    return { service, members, send, client, speaker, speakerChannel, start, update };
}

beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockConnections.length = 0;
    mockPlayer.removeAllListeners();
    mockResource.removeAllListeners();
});
afterEach(() => jest.useRealTimers());

test('empty for 60 seconds stops, bot changes do not restart timer, notifies once and detaches', async () => {
    const f = fixture(); await f.start();
    f.members.clear(); f.update();
    jest.advanceTimersByTime(30_000);
    f.members.set('bot', { user: { bot: true } }); f.update();
    jest.advanceTimersByTime(29_999);
    expect(f.service.status('guild')?.startedBy).toBe('starter');
    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(f.service.status('guild')).toBeUndefined();
    expect(f.send).toHaveBeenCalledTimes(1);
    expect(f.send).toHaveBeenCalledWith({ content: '中継を終了しました', allowedMentions: { parse: [] } });
    expect(f.client.listenerCount('voiceStateUpdate')).toBe(0);
    expect(mockConnections.every(c => c.destroy.mock.calls.length === 1)).toBe(true);
});

test('return cancels timeout and next departure gets a full minute', async () => {
    const f = fixture(); await f.start();
    f.members.clear(); f.update(); jest.advanceTimersByTime(59_000);
    f.members.set('human', { user: { bot: false } }); f.update(); jest.advanceTimersByTime(60_000);
    expect(f.service.status('guild')).toBeDefined();
    f.members.clear(); f.update(); jest.advanceTimersByTime(59_999);
    expect(f.service.status('guild')).toBeDefined();
    jest.advanceTimersByTime(1); expect(f.service.status('guild')).toBeUndefined();
});

test.each(['connection', 'player', 'resource'])('%s error is logged and stops safely', async source => {
    const f = fixture(); await f.start();
    const emitter = source === 'connection' ? mockConnections[0] : source === 'player' ? mockPlayer : mockResource;
    expect(() => emitter.emit('error', new Error('broken'))).not.toThrow();
    expect(f.service.status('guild')).toBeUndefined();
    expect(logSystem).toHaveBeenCalledWith('voice-relay', expect.stringContaining('broken'));
    await Promise.resolve(); expect(f.send).toHaveBeenCalledTimes(1);
});

test('cleanup failure still destroys second connection and sends notification', async () => {
    const f = fixture(); await f.start();
    mockConnections[0].destroy.mockImplementationOnce(() => { throw new Error('destroy failed'); });
    expect(() => f.service.stop('guild')).not.toThrow();
    expect(mockConnections[1].destroy).toHaveBeenCalledTimes(1);
    await Promise.resolve(); expect(f.send).toHaveBeenCalledTimes(1);
});

test('missing speaker guild includes permission-derived invite URL', async () => {
    const f = fixture(); f.speaker.guilds.fetch.mockRejectedValue(new DiscordAPIError({ message: 'Unknown Guild', code: 10004 }, 10004, 404, 'GET', 'https://discord.com/api/guilds/guild', { body: undefined, files: [] }));
    const permissions = PermissionFlagsBits.ViewChannel | PermissionFlagsBits.Connect | PermissionFlagsBits.Speak;
    await expect(f.start()).rejects.toThrow(`https://discord.com/oauth2/authorize?client_id=speaker&permissions=${permissions}&scope=bot`);
    expect(f.service.status('guild')).toBeUndefined();
});

test('stale start notification failure cannot stop a replacement session', async () => {
    const f = fixture();
    const oldSession = await f.start();
    f.service.stop('guild');
    await f.start();
    expect(f.service.stop('guild', oldSession)).toBe(false);
    expect(f.service.status('guild')).toBeDefined();
    f.service.stop('guild');
});

const mockDecoders: PassThrough[] = [];
jest.mock('prism-media', () => ({
    opus: { Decoder: jest.fn(() => { const decoder = new PassThrough(); mockDecoders.push(decoder); return decoder; }) }
}));

test('player keeps its resource across missed frames', async () => {
    const f = fixture(); await f.start();
    const { createAudioPlayer } = await import('@discordjs/voice');
    expect(createAudioPlayer).toHaveBeenCalledWith(expect.objectContaining({ behaviors: { noSubscriber: 'play', maxMissedFrames: Infinity } }));
    f.service.stop('guild');
});

test.each([undefined, '0'])('debug=%s does not attach diagnostics', async value => {
    const previous = process.env.JUPITER_RELAY_DEBUG;
    if (value === undefined) delete process.env.JUPITER_RELAY_DEBUG;
    else process.env.JUPITER_RELAY_DEBUG = value;
    const f = fixture();
    try {
        await f.start();
        expect(mockConnections[0].listenerCount('debug')).toBe(0);
        expect(mockPlayer.listenerCount('debug')).toBe(0);
        expect(monitorEventLoopDelay).not.toHaveBeenCalled();
        jest.advanceTimersByTime(5_000);
        expect(logSystem).not.toHaveBeenCalledWith('voice-relay', expect.stringContaining('diagnostics='));
    } finally {
        f.service.stop('guild');
        if (previous === undefined) delete process.env.JUPITER_RELAY_DEBUG;
        else process.env.JUPITER_RELAY_DEBUG = previous;
    }
});

test('debug logs cumulative pipeline counts, bot decisions, states and errors, then detaches on stop', async () => {
    const previous = process.env.JUPITER_RELAY_DEBUG;
    process.env.JUPITER_RELAY_DEBUG = '1';
    const f = fixture();
    try {
        await f.start();
        const stream = new PassThrough();
        mockConnections[0].receiver.subscribe.mockReturnValue(stream);
        mockConnections[0].receiver.speaking.emit('start', 'human');
        mockConnections[0].receiver.speaking.emit('start', 'bot');
        for (let i = 0; i < 10; i++) await Promise.resolve();
        expect(mockConnections[0].receiver.subscribe).toHaveBeenCalledTimes(1);
        expect(logSystem).toHaveBeenCalledWith('voice-relay', 'guild=guild speaking start userId=human bot=false');
        expect(logSystem).toHaveBeenCalledWith('voice-relay', 'guild=guild speaking start userId=bot bot=true');
        stream.write(Buffer.alloc(3840 * 2, 1));
        // The mocked resource does not consume the mixer, so request a frame explicitly.
        const session = await Promise.resolve((f.service as any).sessions.get('guild'));
        session.mixer.read();
        mockDecoders[mockDecoders.length - 1].emit('error', new Error('decode failed'));
        for (const emitter of [...mockConnections, mockPlayer]) {
            expect(emitter.listenerCount('debug')).toBe(0);
            emitter.emit('debug', 'secret_key=synthetic-secret token=synthetic-token');
        }
        expect(logSystem).not.toHaveBeenCalledWith('voice-relay', expect.stringContaining('synthetic-'));
        jest.advanceTimersByTime(4_999);
        expect(logSystem).not.toHaveBeenCalledWith('voice-relay', expect.stringContaining('diagnostics='));
        jest.advanceTimersByTime(1);
        expect(logSystem).toHaveBeenCalledWith('voice-relay', expect.stringContaining('diagnostics={"speakingStarts":2,"subscriptions":1,"opusPackets":1,"pcmChunks":1,"pcmBytes":7680,"decoderErrors":1,"nonSilentFrames":1} player=playing listener=ready speaker=ready'));
        expect(logSystem).toHaveBeenCalledWith('voice-relay', expect.stringMatching(/mixer=\{"underruns":0,"overflowDrops":0,"maxQueue":2,"maxReadIntervalMs":0\} eventLoopMaxMs=25$/));
        expect(monitorEventLoopDelay).toHaveBeenCalledWith({ resolution: 10 });
        expect(mockEventLoopDelay.enable).toHaveBeenCalledTimes(1);
        expect(mockEventLoopDelay.reset).toHaveBeenCalledTimes(1);
        expect(logSystem).toHaveBeenCalledWith('voice-relay', expect.stringContaining('decoder error: decode failed'));
        jest.mocked(logSystem).mockClear();
        jest.advanceTimersByTime(5_000);
        expect(logSystem).toHaveBeenCalledWith('voice-relay', expect.stringContaining('"nonSilentFrames":1}'));
        expect(logSystem).toHaveBeenCalledWith('voice-relay', expect.stringMatching(/mixer=.*"maxQueue":0,.* eventLoopMaxMs=25$/));
        expect(mockEventLoopDelay.reset).toHaveBeenCalledTimes(2);
        f.service.stop('guild');
        expect(mockEventLoopDelay.disable).toHaveBeenCalledTimes(1);
        expect(mockConnections[0].listenerCount('debug')).toBe(0);
        expect(mockPlayer.listenerCount('debug')).toBe(0);
        jest.mocked(logSystem).mockClear();
        jest.advanceTimersByTime(10_000);
        expect(logSystem).not.toHaveBeenCalledWith('voice-relay', expect.stringContaining('diagnostics='));
    } finally {
        f.service.stop('guild');
        if (previous === undefined) delete process.env.JUPITER_RELAY_DEBUG;
        else process.env.JUPITER_RELAY_DEBUG = previous;
    }
});


test.each([50001, 10004, 50013, 0])('guild fetch code %s only invites for missing access/guild', async code => {
    const f = fixture();
    const error = code ? new DiscordAPIError({ message: 'failure', code }, code, 403, 'GET', 'https://discord.com/api/guilds/guild', { body: undefined, files: [] }) : new Error('network');
    f.speaker.guilds.fetch.mockRejectedValue(error);
    if ([10004, 50001].includes(code)) await expect(f.start()).rejects.toThrow('招待 URL');
    else await expect(f.start()).rejects.toBe(error);
    await Promise.resolve();
    expect(f.send).not.toHaveBeenCalled();
});

test('failed connection startup cleans resources without a stop announcement', async () => {
    const { entersState } = await import('@discordjs/voice');
    jest.mocked(entersState).mockRejectedValueOnce(new Error('timeout'));
    const f = fixture();
    await expect(f.start()).rejects.toThrow('timeout');
    await Promise.resolve();
    expect(f.send).not.toHaveBeenCalled();
    expect(mockConnections.every(c => c.destroy.mock.calls.length === 1)).toBe(true);
});

test.each([false, true])('full destination requires MoveMembers=%s', async moveMembers => {
    const f = fixture();
    f.speakerChannel.userLimit = 1;
    f.speakerChannel.members.set('human', {});
    if (moveMembers) f.speakerChannel.permissionsFor().add(PermissionFlagsBits.MoveMembers);
    if (moveMembers) { await f.start(); f.service.stop('guild'); }
    else { await expect(f.start()).rejects.toThrow('満室'); expect(mockConnections).toHaveLength(0); }
});

test('start/status return detached status snapshots and stop accepts their session ID', async () => {
    const f = fixture();
    const result = await f.start();
    expect(Object.keys(result).sort()).toEqual(['from', 'sessionId', 'startedAt', 'startedBy', 'to']);
    result.startedAt.setTime(0);
    result.startedBy = 'changed';
    expect(f.service.status('guild')?.startedBy).toBe('starter');
    expect(f.service.status('guild')?.startedAt.getTime()).not.toBe(0);
    expect(f.service.stop('guild', result)).toBe(true);
});

test('duplicate subscription failure cannot delete or remove the active subscription', async () => {
    const f = fixture(); await f.start();
    const stream = new PassThrough();
    mockConnections[0].receiver.subscribe.mockReturnValue(stream);
    mockConnections[0].receiver.speaking.emit('start', 'human');
    for (let i = 0; i < 10; i++) await Promise.resolve();
    // A second lookup fails while the first subscription remains live.
    f.client.users.cache.set('human', { get bot(): boolean { throw new Error('lookup failed'); } });
    mockConnections[0].receiver.speaking.emit('start', 'human');
    for (let i = 0; i < 10; i++) await Promise.resolve();
    f.client.users.cache.set('human', { bot: false });
    mockConnections[0].receiver.speaking.emit('start', 'human');
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(mockConnections[0].receiver.subscribe).toHaveBeenCalledTimes(1);
    expect(stream.destroyed).toBe(false);
    f.service.stop('guild');
});

test('disconnection waits for signalling/connecting and ignores late failure after stop', async () => {
    const f = fixture(); await f.start();
    const { entersState } = await import('@discordjs/voice');
    let reject!: (error: Error) => void;
    jest.mocked(entersState).mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }))
        .mockImplementationOnce(() => new Promise(() => {}));
    mockConnections[0].emit('disconnected');
    expect(entersState).toHaveBeenCalledWith(mockConnections[0], 'signalling', 5000);
    expect(entersState).toHaveBeenCalledWith(mockConnections[0], 'connecting', 5000);
    f.service.stop('guild');
    jest.mocked(logSystem).mockClear();
    reject(new Error('late reconnect error'));
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(logSystem).not.toHaveBeenCalled();
});

test('speaker login failure is distinct from unconfigured', async () => {
    const { initRelaySpeaker } = await import('../initRelaySpeaker');
    const { getVoiceRelayService } = await import('../VoiceRelayService');
    const { Client } = await import('discord.js');
    const token = process.env.JUPITER_RELAY_SPEAKER_TOKEN;
    const login = jest.spyOn(Client.prototype, 'login').mockRejectedValue(new Error('login failure'));
    const destroy = jest.spyOn(Client.prototype, 'destroy').mockResolvedValue(undefined);
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
        delete process.env.JUPITER_RELAY_SPEAKER_TOKEN;
        await initRelaySpeaker();
        expect(login).not.toHaveBeenCalled();
        const f = fixture();
        const args = { guild: { id: 'guild' } as Guild, from: {} as VoiceChannel, to: {} as VoiceChannel, listenerClient: f.client as Client, startedBy: 'starter' };
        await expect(getVoiceRelayService().start(args)).rejects.toThrow('未設定');
        process.env.JUPITER_RELAY_SPEAKER_TOKEN = 'test-token';
        await initRelaySpeaker();
        expect(login).toHaveBeenCalledTimes(1);
        expect(destroy).toHaveBeenCalledTimes(1);
        await expect(getVoiceRelayService().start(args)).rejects.toThrow('中継用 bot が起動していません');
    } finally {
        login.mockRestore(); destroy.mockRestore(); error.mockRestore();
        if (token === undefined) delete process.env.JUPITER_RELAY_SPEAKER_TOKEN;
        else process.env.JUPITER_RELAY_SPEAKER_TOKEN = token;
    }
});


test('unconfigured startup and start do not load voice dependencies', () => {
    const { execFileSync } = require('node:child_process') as typeof import('node:child_process');
    execFileSync(process.execPath, ['-r', 'ts-node/register', '-e', `
        const assert = require('node:assert/strict');
        delete process.env.JUPITER_RELAY_SPEAKER_TOKEN;
        (async () => {
            await require('./src/infrastructure/voice/initRelaySpeaker').initRelaySpeaker();
            assert(!Object.keys(require.cache).some(path => path.endsWith('/VoiceRelayService.ts')));
            const { VoiceRelayService } = require('./src/infrastructure/voice/VoiceRelayService');
            await assert.rejects(new VoiceRelayService().start({ guild: { id: 'guild' } }), /未設定/);
            assert(!Object.keys(require.cache).some(path => /@discordjs\\/voice|prism-media|AudioMixer/.test(path)));
        })().catch(error => { console.error(error); process.exitCode = 1; });
    `], { cwd: process.cwd(), stdio: 'pipe' });
});

test('main logs in the main client before starting a potentially stalled speaker', async () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const { runInNewContext } = require('node:vm') as typeof import('node:vm');
    const ts = require('typescript') as typeof import('typescript');
    const calls: string[] = [];
    let resolveLogin!: () => void;
    const mainLogin = new Promise<void>(resolve => { resolveLogin = resolve; });
    const initRelaySpeaker = jest.fn(() => { calls.push('speaker'); return new Promise(() => {}); });
    const client = { on: jest.fn(), once: jest.fn(), login: jest.fn(() => { calls.push('main'); return mainLogin; }) };
    const dependencies: Record<string, unknown> = {
        'discord.js': { Client: jest.fn(() => client), GatewayIntentBits: {}, ActivityType: {} },
        './adapters/discord/DiscordAdapter': { DiscordAdapter: jest.fn(() => ({ waitForInit: async () => {} })) },
        dotenv: { config: jest.fn() }, '../package.json': {},
        http: { createServer: () => ({ listen: jest.fn() }) },
        './infrastructure/websocket/WebSocketServer': { WebSocketServer: jest.fn() },
        './infrastructure/services/NotificationScheduler': { NotificationScheduler: jest.fn() },
        './shared/utils/UsageLogger': { logSystem: jest.fn(), logError: jest.fn() },
        './infrastructure/voice/initRelaySpeaker': { initRelaySpeaker }
    };
    const source = ts.transpileModule(readFileSync('src/index.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const exit = jest.fn();
    runInNewContext(source, { exports: {}, require: (name: string) => {
        if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`);
        return dependencies[name];
    }, process: { env: { DISCORD_TOKEN: 'test-token' }, on: jest.fn(), exit }, console });
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(calls).toEqual(['main']);
    resolveLogin();
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(calls).toEqual(['main', 'speaker']);
    expect(exit).not.toHaveBeenCalled();
});
test('resource consumes Opus packets and stop deletes the encoder once', async () => {
    const { createAudioResource } = await import('@discordjs/voice');
    const f = fixture(); await f.start();
    expect(OpusScript).toHaveBeenCalledWith(48000, 2, OpusScript.Application.AUDIO);
    expect(createAudioResource).toHaveBeenCalledWith(expect.anything(), { inputType: 'opus' });
    const mixer = jest.mocked(createAudioResource).mock.calls[0][0] as import('../AudioMixer').AudioMixer;
    expect(mixer.read()).toEqual(Buffer.from([1, 2, 3]));
    expect(mockEncoder.encode).toHaveBeenCalledWith(Buffer.alloc(3840), 960);
    f.service.stop('guild');
    f.service.stop('guild');
    expect(mixer.destroyed).toBe(true);
    expect(mockEncoder.delete).toHaveBeenCalledTimes(1);
});

test('startup failure after encoder creation releases the encoder', async () => {
    mockPlayer.play.mockImplementationOnce(() => { throw new Error('play failed'); });
    const f = fixture();
    await expect(f.start()).rejects.toThrow('play failed');
    expect(mockEncoder.delete).toHaveBeenCalledTimes(1);
});
