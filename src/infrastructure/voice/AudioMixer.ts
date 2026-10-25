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

    constructor(options?: { onNonSilentFrame?: () => void }) {
        super({ highWaterMark: FRAME_BYTES });
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
            if (user.frames.length > MAX_QUEUE_FRAMES) user.frames.shift();
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

    _read(): void {
        if (this.destroyed) return;
        this.push(this.nextFrame());
    }

    _destroy(error: Error | null, callback: (error?: Error | null) => void): void {
        this.users.clear();
        callback(error);
    }
}
