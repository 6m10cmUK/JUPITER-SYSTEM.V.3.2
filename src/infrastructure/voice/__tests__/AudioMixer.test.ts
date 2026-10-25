import { AudioMixer, FRAME_BYTES } from '../AudioMixer';

function pcmFrame(left: number, right = left): Buffer {
    const frame = Buffer.alloc(FRAME_BYTES);
    for (let offset = 0; offset < frame.length; offset += 4) {
        frame.writeInt16LE(left, offset);
        frame.writeInt16LE(right, offset + 2);
    }
    return frame;
}

describe('AudioMixer', () => {
    let mixer: AudioMixer;

    beforeEach(() => {
        mixer = new AudioMixer();
    });

    afterEach(() => {
        mixer.destroy();
    });

    test('単一ユーザーのPCMをそのまま返す', () => {
        const frame = pcmFrame(1234, -5678);
        mixer.pushPcm('a', Buffer.concat([frame, frame]));
        expect(mixer.nextFrame()).toEqual(frame);
        expect(mixer.nextFrame()).toEqual(frame);
        expect(mixer.nextFrame()).toEqual(Buffer.alloc(3840));
    });

    test('2ユーザーの各チャンネルを加算する', () => {
        mixer.pushPcm('a', Buffer.concat([pcmFrame(1000, -2000), pcmFrame(1000, -2000)]));
        mixer.pushPcm('b', Buffer.concat([pcmFrame(3000, 500), pcmFrame(3000, 500)]));
        expect(mixer.nextFrame()).toEqual(pcmFrame(4000, -1500));
    });

    test('正負の上限でクリップする', () => {
        mixer.pushPcm('a', Buffer.concat([pcmFrame(30000, -30000), pcmFrame(30000, -30000)]));
        mixer.pushPcm('b', Buffer.concat([pcmFrame(10000, -10000), pcmFrame(10000, -10000)]));
        expect(mixer.nextFrame()).toEqual(pcmFrame(32767, -32768));
    });

    test('全ユーザーを加算してからクリップする', () => {
        mixer.pushPcm('a', Buffer.concat([pcmFrame(30000, -30000), pcmFrame(30000, -30000)]));
        mixer.pushPcm('b', Buffer.concat([pcmFrame(10000, -10000), pcmFrame(10000, -10000)]));
        mixer.pushPcm('c', Buffer.concat([pcmFrame(-20000, 20000), pcmFrame(-20000, 20000)]));
        expect(mixer.nextFrame()).toEqual(pcmFrame(20000, -20000));
    });

    test('nextFrameの直接呼び出しは入力なしなら無音を返す', () => {
        expect(mixer.nextFrame()).toEqual(Buffer.alloc(3840));
        expect(mixer.nextFrame()).toEqual(Buffer.alloc(3840));
    });

    test('ユーザーごとに奇数byteの端数と複数フレームを保持する', () => {
        const frames = Buffer.concat([pcmFrame(100), pcmFrame(200)]);
        mixer.pushPcm('a', frames.subarray(0, 1));
        mixer.pushPcm('b', Buffer.concat([pcmFrame(300), pcmFrame(0)]));
        expect(mixer.nextFrame()).toEqual(pcmFrame(300));
        mixer.pushPcm('a', frames.subarray(1));
        expect(mixer.nextFrame()).toEqual(pcmFrame(100));
        expect(mixer.nextFrame()).toEqual(pcmFrame(200));
    });

    test('既定のキュー上限は10フレーム', () => {
        mixer.pushPcm('a', Buffer.concat(Array.from({ length: 11 }, (_, i) => pcmFrame(i + 1))));
        for (let sample = 2; sample <= 11; sample++) {
            expect(mixer.nextFrame()).toEqual(pcmFrame(sample));
        }
        expect(mixer.nextFrame()).toEqual(Buffer.alloc(3840));
    });

    test('remove後も残ったフレームを出力し、流し切ったユーザーだけを消す', () => {
        mixer.pushPcm('a', Buffer.concat([pcmFrame(100), pcmFrame(200), Buffer.alloc(1, 1)]));
        mixer.pushPcm('b', Buffer.concat([pcmFrame(300), pcmFrame(0)]));
        mixer.remove('a');
        mixer.remove('unknown');
        expect(mixer.nextFrame()).toEqual(pcmFrame(400));
        expect(mixer['users'].has('a')).toBe(true);
        expect(mixer.nextFrame()).toEqual(pcmFrame(200));
        expect(mixer['users'].has('a')).toBe(false);
        expect(mixer['users'].has('b')).toBe(true);
        mixer.pushPcm('a', pcmFrame(500));
        expect(mixer.nextFrame()).toEqual(Buffer.alloc(FRAME_BYTES));
        mixer.pushPcm('a', pcmFrame(600));
        expect(mixer.nextFrame()).toEqual(pcmFrame(500));
        expect(mixer.nextFrame()).toEqual(pcmFrame(600));
        expect(mixer.nextFrame()).toEqual(Buffer.alloc(FRAME_BYTES));
    });

    test('remove後の再pushで終了マークを外して端数とキューを継続する', () => {
        const frame = pcmFrame(200);
        mixer.pushPcm('a', Buffer.concat([pcmFrame(100), frame.subarray(0, 1)]));
        mixer.remove('a');
        mixer.pushPcm('a', frame.subarray(1));
        expect(mixer.nextFrame()).toEqual(pcmFrame(100));
        expect(mixer.nextFrame()).toEqual(frame);
        expect(mixer['users'].has('a')).toBe(true);
        mixer.pushPcm('a', pcmFrame(300));
        expect(mixer.nextFrame()).toEqual(pcmFrame(300));
    });

    test('キューが空のユーザーも終了マーク後の排出処理で消す', () => {
        mixer.pushPcm('a', Buffer.concat([pcmFrame(100), pcmFrame(200)]));
        mixer.nextFrame();
        mixer.nextFrame();
        mixer.remove('a');
        expect(mixer.nextFrame()).toEqual(Buffer.alloc(FRAME_BYTES));
        expect(mixer['users'].has('a')).toBe(false);
    });

    test('_readは呼び出しごとに1フレームpushする', () => {
        const push = jest.spyOn(mixer, 'push').mockReturnValue(true);
        mixer.pushPcm('a', pcmFrame(100));
        mixer.pushPcm('a', pcmFrame(200));
        mixer._read();
        mixer._read();
        mixer._read();
        expect(push).toHaveBeenCalledTimes(3);
        expect(push).toHaveBeenNthCalledWith(3, Buffer.alloc(FRAME_BYTES));
        expect(push).toHaveBeenNthCalledWith(1, pcmFrame(100));
        expect(push).toHaveBeenNthCalledWith(2, pcmFrame(200));
        push.mockRestore();
    });

    test('destroyでキューと端数を破棄する', () => {
        mixer.pushPcm('a', Buffer.concat([pcmFrame(100), Buffer.alloc(1000, 1)]));
        mixer.destroy();
        expect(mixer.nextFrame()).toEqual(Buffer.alloc(3840));
        mixer.pushPcm('a', pcmFrame(200));
        expect(mixer.nextFrame()).toEqual(Buffer.alloc(3840));
    });

    test('_readは入力がなくても無音フレームを1つpushする', () => {
        const push = jest.spyOn(mixer, 'push').mockReturnValue(false);
        mixer._read();
        expect(push).toHaveBeenCalledTimes(1);
        expect(push).toHaveBeenCalledWith(Buffer.alloc(FRAME_BYTES));
    });

    test('pushPcmは端数やフレームが揃ってもpushしない', () => {
        const push = jest.spyOn(mixer, 'push').mockReturnValue(false);
        mixer._read();
        push.mockClear();
        mixer.pushPcm('a', Buffer.alloc(1000));
        mixer.pushPcm('a', Buffer.alloc(FRAME_BYTES - 1000));
        mixer.pushPcm('a', pcmFrame(100));
        expect(push).not.toHaveBeenCalled();
        mixer._read();
        expect(push).toHaveBeenCalledTimes(1);
        mixer.destroy();
        mixer._read();
        mixer.pushPcm('a', pcmFrame(200));
        expect(push).toHaveBeenCalledTimes(1);
    });

    test('2フレーム未満のユーザーは混ざらず揃ったら混ざる', () => {
        mixer.pushPcm('a', Buffer.concat([pcmFrame(100), pcmFrame(200)]));
        mixer.pushPcm('b', pcmFrame(300));
        expect(mixer.nextFrame()).toEqual(pcmFrame(100));
        mixer.pushPcm('b', pcmFrame(400));
        expect(mixer.nextFrame()).toEqual(pcmFrame(500));
        expect(mixer.nextFrame()).toEqual(pcmFrame(400));
    });

    test('終了したユーザーは2フレーム未満でも残りを流して端数ごと消す', () => {
        mixer.pushPcm('a', Buffer.concat([pcmFrame(100), Buffer.alloc(1, 1)]));
        mixer.remove('a');
        expect(mixer.nextFrame()).toEqual(pcmFrame(100));
        expect(mixer['users'].has('a')).toBe(false);
        mixer.pushPcm('b', Buffer.alloc(1, 1));
        mixer.remove('b');
        expect(mixer.nextFrame()).toEqual(Buffer.alloc(FRAME_BYTES));
        expect(mixer['users'].has('b')).toBe(false);
    });

    test('実ストリームは入力停止後にプリフィルして再開する', () => {
        expect(mixer.readableHighWaterMark).toBe(1);
        expect(mixer.readableObjectMode).toBe(true);
        expect(mixer.read()).toEqual(Buffer.alloc(FRAME_BYTES));
        mixer.pushPcm('a', pcmFrame(123));
        expect(mixer.read()).toEqual(Buffer.alloc(FRAME_BYTES));
        mixer.pushPcm('a', pcmFrame(456));
        expect(mixer.read()).toEqual(pcmFrame(123));
        expect(mixer.read()).toEqual(pcmFrame(456));
        expect(mixer.read()).toEqual(Buffer.alloc(FRAME_BYTES));
        expect(mixer.readableEnded).toBe(false);
        mixer.pushPcm('a', pcmFrame(789));
        expect(mixer.read()).toEqual(Buffer.alloc(FRAME_BYTES));
        mixer.pushPcm('a', pcmFrame(900));
        expect(mixer.read()).toEqual(pcmFrame(789));
        expect(mixer.read()).toEqual(pcmFrame(900));
    });

    test('2ユーザーの到着がずれてもプリフィル後は毎フレーム加算する', () => {
        mixer.pushPcm('a', pcmFrame(100));
        mixer.pushPcm('b', pcmFrame(300));
        expect(mixer.read()).toEqual(Buffer.alloc(FRAME_BYTES));
        mixer.pushPcm('a', pcmFrame(100));
        mixer.pushPcm('b', pcmFrame(300));
        expect(mixer.read()).toEqual(pcmFrame(400));
        for (let i = 0; i < 10; i++) {
            mixer.pushPcm('a', pcmFrame(100));
            expect(mixer.read()).toEqual(pcmFrame(400));
            mixer.pushPcm('b', pcmFrame(300));
        }
    });

    test('非無音カウンタは相殺と無音を除く', () => {
        const onNonSilentFrame = jest.fn();
        mixer.destroy();
        mixer = new AudioMixer({ onNonSilentFrame });
        mixer.pushPcm('a', Buffer.concat([pcmFrame(100), pcmFrame(100)]));
        mixer.pushPcm('b', Buffer.concat([pcmFrame(-100), pcmFrame(-100)]));
        mixer.nextFrame();
        mixer.nextFrame();
        expect(onNonSilentFrame).not.toHaveBeenCalled();
        mixer.pushPcm('a', pcmFrame(100));
        mixer.nextFrame();
        expect(onNonSilentFrame).toHaveBeenCalledTimes(1);
        mixer.destroy();
    });
    test('readの回数を超える先読みは1フレーム以内に収まる', async () => {
        const nextFrame = jest.spyOn(mixer, 'nextFrame');
        for (let i = 1; i <= 30; i++) {
            expect(mixer.read()).toEqual(Buffer.alloc(FRAME_BYTES));
            await new Promise<void>(resolve => setImmediate(resolve));
            expect(nextFrame.mock.calls.length).toBeGreaterThanOrEqual(i);
            expect(nextFrame.mock.calls.length).toBeLessThanOrEqual(i + 1);
            expect(mixer.readableLength).toBeLessThanOrEqual(1);
        }
    });

    test('encodeしたパケットを返し非無音判定はPCMで行う', () => {
        mixer.destroy();
        const packet = Buffer.from([1, 2, 3]);
        const encode = jest.fn(() => packet);
        const onNonSilentFrame = jest.fn();
        mixer = new AudioMixer({ encode, onNonSilentFrame });
        expect(mixer.read()).toEqual(packet);
        expect(encode).toHaveBeenLastCalledWith(Buffer.alloc(FRAME_BYTES));
        expect(onNonSilentFrame).not.toHaveBeenCalled();
        mixer.pushPcm('a', Buffer.concat([pcmFrame(100), pcmFrame(200)]));
        expect(mixer.read()).toEqual(packet);
        expect(encode).toHaveBeenLastCalledWith(pcmFrame(100));
        expect(onNonSilentFrame).toHaveBeenCalledTimes(1);
    });

    test('underrunsは開始済みかつ未終了の空キューだけを累計する', () => {
        mixer.nextFrame();
        mixer.pushPcm('a', pcmFrame(100));
        mixer.nextFrame();
        expect(mixer.stats().underruns).toBe(0);
        mixer.pushPcm('a', pcmFrame(200));
        mixer.nextFrame();
        mixer.nextFrame();
        mixer.nextFrame();
        expect(mixer.stats().underruns).toBe(1);
        mixer.nextFrame();
        mixer.remove('a');
        mixer.nextFrame();
        expect(mixer.stats().underruns).toBe(1);
    });

    test('空キュー後は2フレーム溜め直すまで無音でunderrunsも増えない', () => {
        mixer.pushPcm('a', Buffer.concat([pcmFrame(100), pcmFrame(200)]));
        mixer.nextFrame();
        mixer.nextFrame();
        expect(mixer.nextFrame()).toEqual(Buffer.alloc(FRAME_BYTES));
        expect(mixer.stats().underruns).toBe(1);
        for (let i = 0; i < 10; i++) expect(mixer.nextFrame()).toEqual(Buffer.alloc(FRAME_BYTES));
        mixer.pushPcm('a', pcmFrame(300));
        for (let i = 0; i < 10; i++) expect(mixer.nextFrame()).toEqual(Buffer.alloc(FRAME_BYTES));
        expect(mixer.stats().underruns).toBe(1);
        mixer.pushPcm('a', pcmFrame(400));
        expect(mixer.nextFrame()).toEqual(pcmFrame(300));
        expect(mixer.nextFrame()).toEqual(pcmFrame(400));
        expect(mixer.nextFrame()).toEqual(Buffer.alloc(FRAME_BYTES));
        expect(mixer.stats().underruns).toBe(2);
    });

    test('overflowDropsは累計しmaxQueueは取得時にリセットする', () => {
        mixer.pushPcm('a', Buffer.concat(Array.from({ length: 12 }, () => pcmFrame(100))));
        expect(mixer.stats()).toMatchObject({ overflowDrops: 2, maxQueue: 10 });
        expect(mixer.stats()).toMatchObject({ overflowDrops: 2, maxQueue: 0 });
        for (let i = 0; i < 10; i++) mixer.nextFrame();
        mixer.pushPcm('a', pcmFrame(200));
        expect(mixer.stats()).toMatchObject({ overflowDrops: 2, maxQueue: 1 });
    });

    test('maxReadIntervalMsは最大間隔を取得してリセットする', () => {
        const now = jest.spyOn(Date, 'now');
        jest.spyOn(mixer, 'push').mockReturnValue(false);
        try {
            now.mockReturnValue(0); mixer._read();
            expect(mixer.stats().maxReadIntervalMs).toBe(0);
            now.mockReturnValue(20); mixer._read();
            now.mockReturnValue(400); mixer._read();
            expect(mixer.stats().maxReadIntervalMs).toBe(380);
            expect(mixer.stats().maxReadIntervalMs).toBe(0);
            now.mockReturnValue(420); mixer._read();
            expect(mixer.stats().maxReadIntervalMs).toBe(20);
        } finally { now.mockRestore(); }
    });

});
