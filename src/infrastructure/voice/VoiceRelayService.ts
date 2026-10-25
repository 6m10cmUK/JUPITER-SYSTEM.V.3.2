import { randomUUID } from 'node:crypto';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import type OpusScript from 'opusscript';
import { Client, DiscordAPIError, Guild, PermissionFlagsBits, VoiceChannel, type VoiceState } from 'discord.js';
import type { AudioPlayer, AudioReceiveStream, VoiceConnection } from '@discordjs/voice';
import type prism from 'prism-media';
import type { AudioMixer } from './AudioMixer';
import { autoStopAction, RelayError } from './relayPolicy';
import { logSystem } from '../../shared/utils/UsageLogger';

interface RelayStatus {
    sessionId: string;
    from: VoiceChannel;
    to: VoiceChannel;
    startedAt: Date;
    startedBy: string;
}

interface RelayDiagnostics {
    speakingStarts: number;
    subscriptions: number;
    opusPackets: number;
    pcmChunks: number;
    pcmBytes: number;
    decoderErrors: number;
    nonSilentFrames: number;
}

interface RelaySession extends RelayStatus {
    diagnostics?: RelayDiagnostics;
    debugTimer?: ReturnType<typeof setInterval>;
    listener?: VoiceConnection;
    speaker?: VoiceConnection;
    player?: AudioPlayer;
    mixer?: AudioMixer;
    encoder?: OpusScript;
    eventLoopDelay?: ReturnType<typeof monitorEventLoopDelay>;
    subscriptions: Map<string, () => void>;
    started: boolean;
    detachSpeaking?: () => void;
    detachVoiceState?: () => void;
    emptyTimer?: ReturnType<typeof setTimeout>;
}

export class VoiceRelayService {
    private speakerClient?: Client;
    private speakerStartupFailed = false;
    private readonly sessions = new Map<string, RelaySession>();

    setSpeakerClient(client: Client): void {
        this.speakerClient = client;
        this.speakerStartupFailed = false;
    }

    setSpeakerStartupFailed(): void {
        this.speakerClient = undefined;
        this.speakerStartupFailed = true;
    }

    async start({ guild, from, to, listenerClient, startedBy }: {
        startedBy: string;
        guild: Guild;
        from: VoiceChannel;
        to: VoiceChannel;
        listenerClient: Client;
    }): Promise<RelayStatus> {
        if (this.sessions.has(guild.id)) throw new RelayError('このサーバーでは既に中継を開始しています');
        const speakerClient = this.speakerClient;
        if (this.speakerStartupFailed) throw new RelayError('中継用 bot が起動していません');
        if (!speakerClient) throw new RelayError('中継用 bot が未設定');
        if (!speakerClient.isReady()) throw new RelayError('中継用 bot が接続されていません');
        if (from.guild.id !== guild.id || to.guild.id !== guild.id || from.id === to.id) {
            throw new RelayError('同じサーバー内の異なるボイスチャンネルを指定してください');
        }
        const session: RelaySession = {
            sessionId: randomUUID(), from, to, startedBy, startedAt: new Date(), subscriptions: new Map(), started: false,
            diagnostics: process.env.JUPITER_RELAY_DEBUG === '1' ? {
                speakingStarts: 0, subscriptions: 0, opusPackets: 0, pcmChunks: 0,
                pcmBytes: 0, decoderErrors: 0, nonSilentFrames: 0
            } : undefined
        };
        // 接続待ちの間も同じギルドの二重起動を防ぐ。
        this.sessions.set(guild.id, session);
        const assertCurrent = () => {
            if (this.sessions.get(guild.id) !== session) throw new RelayError('中継の開始が取り消されました');
        };
        try {
            const voice = await import('@discordjs/voice');
            const { AudioMixer } = await import('./AudioMixer');
            const { default: OpusScript } = await import('opusscript');
            const { getVoiceConnection, joinVoiceChannel, entersState, VoiceConnectionStatus,
                createAudioPlayer, NoSubscriberBehavior, createAudioResource, StreamType } = voice;
            assertCurrent();
            const speakerGuild = await speakerClient.guilds.fetch(guild.id).catch((error: unknown) => {
                if (!(error instanceof DiscordAPIError) || ![10004, 50001].includes(Number(error.code))) throw error;
                const permissions = PermissionFlagsBits.ViewChannel | PermissionFlagsBits.Connect | PermissionFlagsBits.Speak;
                throw new RelayError(`中継用 bot がこのサーバーに参加していないか、サーバーを取得できません。招待 URL: https://discord.com/oauth2/authorize?client_id=${speakerClient.user.id}&permissions=${permissions}&scope=bot`);
            });
            const speakerMember = await speakerGuild.members.fetchMe();
            const speakerChannel = await speakerGuild.channels.fetch(to.id);
            if (!speakerChannel || !speakerChannel.isVoiceBased() ||
                !speakerChannel.permissionsFor(speakerMember)?.has([
                    PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak
                ])) {
                throw new RelayError('中継用 bot に中継先の Connect・Speak 権限がありません');
            }
            if (speakerChannel.userLimit > 0 && speakerChannel.members.size >= speakerChannel.userLimit &&
                !speakerChannel.permissionsFor(speakerMember)?.has(PermissionFlagsBits.MoveMembers)) {
                throw new RelayError('中継先が満室です。中継用 bot に MoveMembers 権限が必要です');
            }
            const listenerMember = await guild.members.fetchMe();
            if (!from.permissionsFor(listenerMember)?.has(PermissionFlagsBits.Connect)) {
                throw new RelayError('JUPITER に中継元の Connect 権限がありません');
            }
            assertCurrent();
            if (getVoiceConnection(guild.id) || getVoiceConnection(guild.id, 'relay-speaker')) {
                throw new RelayError('このサーバーでは bot が既にボイスチャンネルに接続しています');
            }
            session.listener = joinVoiceChannel({
                guildId: guild.id, channelId: from.id, adapterCreator: guild.voiceAdapterCreator,
                selfDeaf: false, selfMute: true
            });
            this.watchConnection(guild.id, session, session.listener, voice);
            session.speaker = joinVoiceChannel({
                guildId: guild.id, channelId: to.id, adapterCreator: speakerGuild.voiceAdapterCreator,
                group: 'relay-speaker', selfDeaf: true, selfMute: false
            });
            this.watchConnection(guild.id, session, session.speaker, voice);
            await Promise.all([
                entersState(session.listener, VoiceConnectionStatus.Ready, 15_000),
                entersState(session.speaker, VoiceConnectionStatus.Ready, 15_000)
            ]);
            assertCurrent();
            const encoder = session.encoder = new OpusScript(48000, 2, OpusScript.Application.AUDIO);
            const mixer = session.mixer = new AudioMixer({
                encode: pcm => Buffer.from(encoder.encode(pcm, 960)),
                onNonSilentFrame: session.diagnostics ? () => { session.diagnostics!.nonSilentFrames++; } : undefined
            });
            const player = session.player = createAudioPlayer({
                debug: !!session.diagnostics,
                behaviors: { noSubscriber: NoSubscriberBehavior.Play, maxMissedFrames: Infinity }
            });
            if (session.diagnostics) {
                const eventLoopDelay = session.eventLoopDelay = monitorEventLoopDelay({ resolution: 10 });
                eventLoopDelay.enable();
                session.debugTimer = setInterval(() => {
                    logSystem('voice-relay', `guild=${guild.id} diagnostics=${JSON.stringify(session.diagnostics)} player=${player.state.status} listener=${session.listener?.state.status} speaker=${session.speaker?.state.status} mixer=${JSON.stringify(mixer.stats())} eventLoopMaxMs=${eventLoopDelay.max / 1e6}`);
                    eventLoopDelay.reset();
                }, 5_000);
            }
            const fail = (error: Error) => {
                if (this.sessions.get(guild.id) !== session) return;
                logSystem('voice-relay', `guild=${guild.id} error: ${error.message}`);
                this.stopIfCurrent(guild.id, session);
            };
            mixer.on('error', fail);
            player.on('error', fail);
            session.speaker.subscribe(player);
            const resource = createAudioResource(mixer, { inputType: StreamType.Opus });
            resource.playStream.on('error', fail);
            player.play(resource);
            const onSpeaking = (userId: string) => {
                if (session.diagnostics) session.diagnostics.speakingStarts++;
                void this.subscribe(guild.id, session, listenerClient, userId);
            };
            session.listener.receiver.speaking.on('start', onSpeaking);
            session.detachSpeaking = () => session.listener?.receiver.speaking.off('start', onSpeaking);
            const onVoiceState = (oldState: VoiceState, newState: VoiceState) => {
                if (oldState.channelId === from.id || newState.channelId === from.id) {
                    this.updateEmptyTimer(guild.id, session);
                }
            };
            listenerClient.on('voiceStateUpdate', onVoiceState);
            session.detachVoiceState = () => listenerClient.off('voiceStateUpdate', onVoiceState);
            this.updateEmptyTimer(guild.id, session);
            session.startedAt = new Date();
            logSystem('voice-relay', `guild=${guild.id} start from=${from.id} to=${to.id}`);
            session.started = true;
            return this.status(guild.id)!;
        } catch (error) {
            this.stopIfCurrent(guild.id, session);
            throw error;
        }
    }

    private async subscribe(guildId: string, session: RelaySession, client: Client, userId: string): Promise<void> {
        let stream: AudioReceiveStream | undefined;
        let decoder: prism.opus.Decoder | undefined;
        let cleaned = false;
        const cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            const ownsSubscription = session.subscriptions.get(userId) === cleanup;
            if (ownsSubscription) session.subscriptions.delete(userId);
            for (const release of [() => stream?.unpipe(decoder), () => stream?.destroy(),
                () => decoder?.destroy(), () => { if (ownsSubscription) session.mixer?.remove(userId); }]) {
                this.releaseSafely(guildId, release);
            }
        };
        try {
            const { EndBehaviorType } = await import('@discordjs/voice');
            const { default: prism } = await import('prism-media');
            const user = client.users.cache.get(userId) ?? await client.users.fetch(userId);
            if (session.diagnostics) {
                logSystem('voice-relay', `guild=${guildId} speaking start userId=${userId} bot=${user.bot}`);
            }
            if (user.bot || this.sessions.get(guildId) !== session ||
                session.subscriptions.has(userId)) return;
            stream = session.listener!.receiver.subscribe(userId, {
                end: { behavior: EndBehaviorType.AfterSilence, duration: 100 }
            });
            if (session.diagnostics) {
                session.diagnostics.subscriptions++;
                stream.on('data', () => { session.diagnostics!.opusPackets++; });
            }
            const onError = (error: Error) => {
                logSystem('voice-relay', `guild=${guildId} user=${userId} error: ${error.message}`);
                cleanup();
            };
            stream.on('error', onError);
            decoder = new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 });
            session.subscriptions.set(userId, cleanup);
            decoder.on('error', (error: Error) => {
                if (session.diagnostics) {
                    session.diagnostics.decoderErrors++;
                    logSystem('voice-relay', `guild=${guildId} userId=${userId} decoder error: ${error.message}`);
                }
                onError(error);
            });
            stream.once('close', cleanup);
            decoder.once('end', cleanup);
            decoder.once('close', cleanup);
            decoder.on('data', (chunk: Buffer) => {
                if (session.diagnostics) {
                    session.diagnostics.pcmChunks++;
                    session.diagnostics.pcmBytes += chunk.length;
                }
                try {
                    if (!cleaned) session.mixer?.pushPcm(userId, chunk);
                } catch (error) { onError(error instanceof Error ? error : new Error(String(error))); }
            });
            stream.pipe(decoder);
        } catch (error) {
            cleanup();
            logSystem('voice-relay', `guild=${guildId} user=${userId} error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private watchConnection(guildId: string, session: RelaySession, connection: VoiceConnection, voice: typeof import('@discordjs/voice')): void {
        const { entersState, VoiceConnectionStatus } = voice;
        connection.on('error', error => {
            if (this.sessions.get(guildId) !== session || connection.state.status === VoiceConnectionStatus.Destroyed) return;
            logSystem('voice-relay', `guild=${guildId} error: ${error.message}`);
            this.stopIfCurrent(guildId, session);
        });
        connection.on(VoiceConnectionStatus.Destroyed, () => {
            this.stopIfCurrent(guildId, session);
        });
        connection.on(VoiceConnectionStatus.Disconnected, () => {
            if (this.sessions.get(guildId) !== session) return;
            void Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000)
            ]).catch(error => {
                if (this.sessions.get(guildId) !== session || connection.state.status === VoiceConnectionStatus.Destroyed) return;
                logSystem('voice-relay', `guild=${guildId} reconnect error: ${String(error)}`);
                this.stopIfCurrent(guildId, session);
            });
        });
    }

    private updateEmptyTimer(guildId: string, session: RelaySession): void {
        if (this.sessions.get(guildId) !== session) return;
        const members = () => [...session.from.members.values()];
        const action = autoStopAction(members(), session.emptyTimer !== undefined);
        if (action === 'cancel') {
            clearTimeout(session.emptyTimer);
            session.emptyTimer = undefined;
        } else if (action === 'schedule') {
            session.emptyTimer = setTimeout(() => {
                session.emptyTimer = undefined;
                if (autoStopAction(members(), false) === 'schedule') {
                    this.stopIfCurrent(guildId, session);
                }
            }, 60_000);
        }
    }

    private releaseSafely(guildId: string, release: () => unknown): void {
        try { release(); }
        catch (error) { logSystem('voice-relay', `guild=${guildId} cleanup error: ${String(error)}`); }
    }

    private stopIfCurrent(guildId: string, session: RelaySession): boolean {
        return this.stop(guildId, session);
    }

    stop(guildId: string, expectedSession?: RelayStatus): boolean {
        const session = this.sessions.get(guildId);
        if (!session || (expectedSession && session.sessionId !== expectedSession.sessionId)) return false;
        this.sessions.delete(guildId);
        if (session.emptyTimer) clearTimeout(session.emptyTimer);
        if (session.debugTimer) clearInterval(session.debugTimer);
        this.releaseSafely(guildId, () => session.eventLoopDelay?.disable());
        this.releaseSafely(guildId, () => session.detachVoiceState?.());
        this.releaseSafely(guildId, () => session.detachSpeaking?.());
        for (const cleanup of session.subscriptions.values()) cleanup();
        this.releaseSafely(guildId, () => session.player?.stop(true));
        this.releaseSafely(guildId, () => session.mixer?.destroy());
        this.releaseSafely(guildId, () => session.encoder?.delete());
        for (const connection of [session.listener, session.speaker]) {
            this.releaseSafely(guildId, () => {
                if (connection && connection.state.status !== 'destroyed') connection.destroy();
            });
        }
        if (session.started) void Promise.resolve().then(() => session.from.send({ content: '中継を終了しました', allowedMentions: { parse: [] } }))
            .catch(error => logSystem('voice-relay', `guild=${guildId} stop notification error: ${String(error)}`));
        logSystem('voice-relay', `guild=${guildId} stop`);
        return true;
    }

    status(guildId: string): RelayStatus | undefined {
        const session = this.sessions.get(guildId);
        if (!session) return undefined;
        return { sessionId: session.sessionId, from: session.from, to: session.to, startedBy: session.startedBy, startedAt: new Date(session.startedAt) };
    }
}

const service = new VoiceRelayService();
export function getVoiceRelayService(): VoiceRelayService {
    return service;
}
