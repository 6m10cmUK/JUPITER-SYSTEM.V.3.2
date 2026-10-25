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
        mixer.pushPcm('a', frame);
        expect(mixer.nextFrame()).toEqual(frame);
        expect(mixer.nextFrame()).toEqual(Buffer.alloc(3840));
    });

    test('2ユーザーの各チャンネルを加算する', () => {
        mixer.pushPcm('a', pcmFrame(1000, -2000));
        mixer.pushPcm('b', pcmFrame(3000, 500));
        expect(mixer.nextFrame()).toEqual(pcmFrame(4000, -1500));
    });

    test('正負の上限でクリップする', () => {
        mixer.pushPcm('a', pcmFrame(30000, -30000));
        mixer.pushPcm('b', pcmFrame(10000, -10000));
        expect(mixer.nextFrame()).toEqual(pcmFrame(32767, -32768));
    });

    test('全ユーザーを加算してからクリップする', () => {
        mixer.pushPcm('a', pcmFrame(30000, -30000));
        mixer.pushPcm('b', pcmFrame(10000, -10000));
        mixer.pushPcm('c', pcmFrame(-20000, 20000));
        expect(mixer.nextFrame()).toEqual(pcmFrame(20000, -20000));
    });

    test('nextFrameの直接呼び出しは入力なしなら無音を返す', () => {
        expect(mixer.nextFrame()).toEqual(Buffer.alloc(3840));
        expect(mixer.nextFrame()).toEqual(Buffer.alloc(3840));
    });

    test('ユーザーごとに奇数byteの端数と複数フレームを保持する', () => {
        const frames = Buffer.concat([pcmFrame(100), pcmFrame(200)]);
        mixer.pushPcm('a', frames.subarray(0, 1));
        mixer.pushPcm('b', pcmFrame(300));
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
        mixer.pushPcm('b', pcmFrame(300));
        mixer.remove('a');
        mixer.remove('unknown');
        expect(mixer.nextFrame()).toEqual(pcmFrame(400));
        expect(mixer['users'].has('a')).toBe(true);
        expect(mixer.nextFrame()).toEqual(pcmFrame(200));
        expect(mixer['users'].has('a')).toBe(false);
        expect(mixer['users'].has('b')).toBe(true);
        mixer.pushPcm('a', pcmFrame(500));
        expect(mixer.nextFrame()).toEqual(pcmFrame(500));
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
        mixer.pushPcm('a', pcmFrame(100));
        mixer.nextFrame();
        mixer.remove('a');
        expect(mixer.nextFrame()).toEqual(Buffer.alloc(FRAME_BYTES));
        expect(mixer['users'].has('a')).toBe(false);
    });

    test('_readはフレームがある間だけpushする', () => {
        const push = jest.spyOn(mixer, 'push').mockReturnValue(true);
        mixer.pushPcm('a', pcmFrame(100));
        mixer.pushPcm('a', pcmFrame(200));
        mixer._read();
        mixer._read();
        mixer._read();
        expect(push).toHaveBeenCalledTimes(2);
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

    test('待機中は完全なフレームが揃ったときだけ1フレームpushする', () => {
        const push = jest.spyOn(mixer, 'push').mockReturnValue(false);
        mixer._read();
        mixer.pushPcm('a', Buffer.alloc(1000));
        expect(push).not.toHaveBeenCalled();
        mixer.pushPcm('a', Buffer.alloc(FRAME_BYTES - 1000));
        expect(push).toHaveBeenCalledTimes(1);
        mixer.pushPcm('b', Buffer.alloc(FRAME_BYTES));
        expect(push).toHaveBeenCalledTimes(1);
        mixer._read();
        expect(push).toHaveBeenCalledTimes(2);
        mixer._read();
        mixer.destroy();
        mixer.pushPcm('a', Buffer.alloc(FRAME_BYTES));
        expect(push).toHaveBeenCalledTimes(2);
    });

    test('実ストリームは入力停止後も終了せず再開する', () => {
        expect(mixer.read(FRAME_BYTES)).toBeNull();
        mixer.pushPcm('a', pcmFrame(123));
        expect(mixer.read(FRAME_BYTES)).toEqual(pcmFrame(123));
        expect(mixer.read(FRAME_BYTES)).toBeNull();
        expect(mixer.readableEnded).toBe(false);
        mixer.pushPcm('a', pcmFrame(456));
        expect(mixer.read(FRAME_BYTES)).toEqual(pcmFrame(456));
        mixer.destroy();
    });

    test('非無音カウンタは相殺と無音を除く', () => {
        const onNonSilentFrame = jest.fn();
        mixer.destroy();
        mixer = new AudioMixer({ onNonSilentFrame });
        mixer.pushPcm('a', pcmFrame(100));
        mixer.pushPcm('b', pcmFrame(-100));
        mixer.nextFrame();
        mixer.nextFrame();
        expect(onNonSilentFrame).not.toHaveBeenCalled();
        mixer.pushPcm('a', pcmFrame(100));
        mixer.nextFrame();
        expect(onNonSilentFrame).toHaveBeenCalledTimes(1);
        mixer.destroy();
    });
});
