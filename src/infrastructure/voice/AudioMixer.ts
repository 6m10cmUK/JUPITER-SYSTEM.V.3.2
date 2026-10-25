import { Readable } from 'node:stream';

export const FRAME_BYTES = 3840;
const MAX_QUEUE_FRAMES = 10;
const PREFILL_FRAMES = 2;

interface UserPcm {
    frames: Buffer[];
    remainder: Buffer;
    ended: boolean;
    started: boolean;
}

export class AudioMixer extends Readable {
    private readonly users = new Map<string, UserPcm>();

    private readonly onNonSilentFrame?: () => void;

    private readonly encode?: (pcm: Buffer) => Buffer;
    private underruns = 0;
    private overflowDrops = 0;
    private maxQueue = 0;
    private maxReadIntervalMs = 0;
    private lastReadAt?: number;

    constructor(options?: { onNonSilentFrame?: () => void; encode?: (pcm: Buffer) => Buffer }) {
        super({ objectMode: true, highWaterMark: 1 });
        this.encode = options?.encode;
        this.onNonSilentFrame = options?.onNonSilentFrame;
    }

    pushPcm(userId: string, chunk: Buffer): void {
        if (this.destroyed || chunk.length === 0) return;

        const user = this.users.get(userId) ?? { frames: [], remainder: Buffer.alloc(0), ended: false, started: false };
        user.ended = false;
        const pcm = Buffer.concat([user.remainder, chunk]);
        let offset = 0;
        while (offset + FRAME_BYTES <= pcm.length) {
            user.frames.push(Buffer.from(pcm.subarray(offset, offset + FRAME_BYTES)));
            if (user.frames.length > MAX_QUEUE_FRAMES) {
                user.frames.shift();
                this.overflowDrops++;
            }
            this.maxQueue = Math.max(this.maxQueue, user.frames.length);
            offset += FRAME_BYTES;
        }
        user.remainder = Buffer.from(pcm.subarray(offset));
        this.users.set(userId, user);
    }

    remove(userId: string): void {
        const user = this.users.get(userId);
        if (user) user.ended = true;
    }

    nextFrame(): Buffer {
        const output = Buffer.alloc(FRAME_BYTES);
        const frames: Buffer[] = [];
        for (const [userId, user] of this.users) {
            if (!user.started && (user.frames.length >= PREFILL_FRAMES || user.ended)) user.started = true;
            const frame = user.started ? user.frames.shift() : undefined;
            if (frame) frames.push(frame);
            else if (user.started && !user.ended) this.underruns++;
            if (user.ended && user.frames.length === 0) this.users.delete(userId);
        }
        for (let offset = 0; offset < FRAME_BYTES; offset += 2) {
            let sample = 0;
            for (const frame of frames) sample += frame.readInt16LE(offset);
            output.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), offset);
        }
        if (this.onNonSilentFrame && output.some(byte => byte !== 0)) this.onNonSilentFrame();
        return output;
    }

    stats(): { underruns: number; overflowDrops: number; maxQueue: number; maxReadIntervalMs: number } {
        const stats = { underruns: this.underruns, overflowDrops: this.overflowDrops,
            maxQueue: this.maxQueue, maxReadIntervalMs: this.maxReadIntervalMs };
        this.maxQueue = 0;
        this.maxReadIntervalMs = 0;
        return stats;
    }

    _read(): void {
        if (this.destroyed) return;
        const now = Date.now();
        if (this.lastReadAt !== undefined) this.maxReadIntervalMs = Math.max(this.maxReadIntervalMs, now - this.lastReadAt);
        this.lastReadAt = now;
        const pcm = this.nextFrame();
        this.push(this.encode ? this.encode(pcm) : pcm);
    }

    _destroy(error: Error | null, callback: (error?: Error | null) => void): void {
        this.users.clear();
        callback(error);
    }
}
