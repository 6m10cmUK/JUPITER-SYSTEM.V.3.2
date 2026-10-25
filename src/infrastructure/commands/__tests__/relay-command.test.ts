import { command } from '../relay-command';
import { ChannelType, PermissionFlagsBits, PermissionsBitField, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';

const mockService = { start: jest.fn(), stop: jest.fn(), status: jest.fn() };
jest.mock('../../voice/VoiceRelayService', () => {
    return { getVoiceRelayService: () => mockService };
});
jest.mock('../../../shared/utils/UsageLogger', () => ({ logError: jest.fn(), logResult: jest.fn() }));
jest.mock('../../../presentation/discord/builders/messages', () => ({
    createErrorMessage: (_interaction: unknown, _title: string, message: string) => ({ content: message })
}));

test.each([false, true])('guildless error uses ephemeral flags with replied=%s', async replied => {
    const interaction = {
        guild: null, deferred: false, replied,
        reply: jest.fn().mockResolvedValue(undefined),
        followUp: jest.fn().mockResolvedValue(undefined)
    };
    await command.execute(interaction as unknown as ChatInputCommandInteraction);
    expect(replied ? interaction.followUp : interaction.reply).toHaveBeenCalledWith({
        content: 'サーバー内で実行してください', flags: MessageFlags.Ephemeral
    });
    expect(replied ? interaction.reply : interaction.followUp).not.toHaveBeenCalled();
});


describe('/relay start from the current voice channel', () => {
    const token = process.env.JUPITER_RELAY_SPEAKER_TOKEN;
    beforeEach(() => {
        process.env.JUPITER_RELAY_SPEAKER_TOKEN = 'test-token';
        jest.clearAllMocks();
        mockService.start.mockResolvedValue({ id: 'session' });
    });
    afterAll(() => {
        if (token === undefined) delete process.env.JUPITER_RELAY_SPEAKER_TOKEN;
        else process.env.JUPITER_RELAY_SPEAKER_TOKEN = token;
    });

    function setup(channelType: ChannelType | null = ChannelType.GuildVoice,
        permissions = new PermissionsBitField([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])) {
        const from = { id: 'current-vc', type: channelType, send: jest.fn().mockResolvedValue({ delete: jest.fn().mockResolvedValue(undefined) }) };
        const member = { id: 'user', voice: { channel: channelType === null ? null : from } };
        const to = { id: 'to', type: ChannelType.GuildVoice, permissionsFor: jest.fn().mockReturnValue(permissions) };
        const interaction = {
            guild: { id: 'guild', members: { fetch: jest.fn().mockResolvedValue(member) },
                channels: { fetch: jest.fn().mockResolvedValue(to) } },
            user: { id: 'user' }, client: {}, deferred: true,
            options: { getSubcommand: () => 'start', getChannel: jest.fn().mockReturnValue(to) },
            deferReply: jest.fn().mockResolvedValue(undefined), editReply: jest.fn().mockResolvedValue(undefined)
        };
        const execute = () => command.execute(interaction as unknown as ChatInputCommandInteraction);
        return { from, to, member, interaction, execute };
    }

    test('registers only the required GuildVoice destination', () => {
        const start = command.data.toJSON().options?.find(option => option.name === 'start');
        expect(start).toMatchObject({ options: [
            { name: 'to', required: true, channel_types: [ChannelType.GuildVoice] }
        ] });
        expect(start && 'options' in start && start.options).toHaveLength(1);
    });

    test('uses member.voice.channel and not a source option', async () => {
        const { from, to, member, interaction, execute } = setup();
        await execute();
        expect(interaction.options.getChannel.mock.calls).toEqual([['to', true]]);
        expect(interaction.guild.channels.fetch.mock.calls).toEqual([['to']]);
        expect(to.permissionsFor).toHaveBeenCalledWith(member);
        expect(mockService.start).toHaveBeenCalledWith({ guild: interaction.guild, from, to,
            listenerClient: interaction.client, startedBy: member.id });
        expect(from.send).toHaveBeenCalledWith({ content: '🔴 この VC の参加者全員の音声が <#to> に流れます', allowedMentions: { parse: [] } });
        expect(interaction.editReply).toHaveBeenCalledWith({ content: '<#current-vc> → <#to> の中継を開始しました', allowedMentions: { parse: [] } });
    });

    test.each([
        [null, 'ボイスチャンネルに参加してから実行してください'],
        [ChannelType.GuildStageVoice, '通常のボイスチャンネルに参加してから実行してください']
    ])('rejects current channel type %s', async (type, message) => {
        const { interaction, execute } = setup(type);
        await execute();
        expect(interaction.editReply).toHaveBeenCalledWith({ content: message });
        expect(mockService.start).not.toHaveBeenCalled();
    });

    test('rejects the current channel as destination', async () => {
        const { from, to, interaction, execute } = setup();
        to.id = from.id;
        await execute();
        expect(interaction.editReply).toHaveBeenCalledWith({ content: '中継元と中継先は別のチャンネルを指定してください' });
        expect(mockService.start).not.toHaveBeenCalled();
    });

    test.each([[[]], [[PermissionFlagsBits.ViewChannel]], [[PermissionFlagsBits.Connect]], [[PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]]])('requires both destination permissions: %s', async bits => {
        const { interaction, execute } = setup(ChannelType.GuildVoice, new PermissionsBitField(bits));
        await execute();
        expect(interaction.editReply).toHaveBeenCalledWith({ content: '中継元に参加し、中継先の ViewChannel・Connect・Speak 権限を持つ人だけ開始できます' });
        expect(mockService.start).not.toHaveBeenCalled();
    });

    test('rejects unavailable destination permissions', async () => {
        const { to, interaction, execute } = setup();
        to.permissionsFor.mockReturnValue(null);
        await execute();
        expect(interaction.editReply).toHaveBeenCalledWith({ content: '中継元に参加し、中継先の ViewChannel・Connect・Speak 権限を持つ人だけ開始できます' });
        expect(mockService.start).not.toHaveBeenCalled();
    });

    test.each([null, { type: ChannelType.GuildStageVoice }])('rejects an invalid destination %j', async destination => {
        const { interaction, execute } = setup();
        interaction.guild.channels.fetch.mockResolvedValue(destination);
        await execute();
        expect(interaction.editReply).toHaveBeenCalledWith({ content: '通常のボイスチャンネルを指定してください' });
        expect(mockService.start).not.toHaveBeenCalled();
    });

    test('does not start when the source notification fails', async () => {
        const { from, interaction, execute } = setup();
        from.send.mockRejectedValue(new Error('notification failed'));
        await execute();
        expect(mockService.start).not.toHaveBeenCalled();
        expect(mockService.stop).not.toHaveBeenCalled();
        expect(interaction.editReply).toHaveBeenCalledWith({ content: '中継元に開始通知を送れなかったため、中継を開始しませんでした' });
    });
    test('awaits announcement before starting audio', async () => {
        const { from, execute } = setup();
        let resolve!: (value: { delete: jest.Mock }) => void;
        from.send.mockReturnValue(new Promise(done => { resolve = done; }));
        const running = execute();
        for (let i = 0; i < 10; i++) await Promise.resolve();
        expect(from.send).toHaveBeenCalledTimes(1);
        expect(mockService.start).not.toHaveBeenCalled();
        resolve({ delete: jest.fn() });
        await running;
        expect(mockService.start).toHaveBeenCalledTimes(1);
    });

    test('removes announcement on start failure and hides unexpected details', async () => {
        const { from, interaction, execute } = setup();
        const announcement = { delete: jest.fn().mockResolvedValue(undefined) };
        from.send.mockResolvedValue(announcement);
        mockService.start.mockRejectedValueOnce(new Error('private failure details'));
        await execute();
        expect(announcement.delete).toHaveBeenCalledTimes(1);
        expect(interaction.editReply).toHaveBeenCalledWith({ content: '中継の操作に失敗しました' });
    });

});


describe('stop/status command permissions', () => {
    beforeEach(() => jest.clearAllMocks());
    test.each([
        ['participant', 'from', false, true],
        ['starter', null, false, true],
        ['owner', null, false, true],
        ['admin', null, true, true],
        ['outsider', null, false, false]
    ])('stop by %s', async (id, channelId, administrator, allowed) => {
        const owner = process.env.OWNER_ID;
        process.env.OWNER_ID = 'owner';
        mockService.status.mockReturnValue({ from: { id: 'from' }, startedBy: 'starter' });
        const interaction = {
            guild: { id: 'guild', members: { fetch: jest.fn().mockResolvedValue({ id, voice: { channelId }, permissions: { has: () => administrator } }) } },
            user: { id }, options: { getSubcommand: () => 'stop' }, deferred: true,
            deferReply: jest.fn(), editReply: jest.fn()
        };
        try {
            await command.execute(interaction as unknown as ChatInputCommandInteraction);
            expect(mockService.stop).toHaveBeenCalledTimes(allowed ? 1 : 0);
            expect(interaction.editReply).toHaveBeenCalledWith(allowed ? '中継を終了しました' : { content: '中継元の参加者・開始者・bot オーナー・管理者だけ終了できます' });
        } finally {
            if (owner === undefined) delete process.env.OWNER_ID;
            else process.env.OWNER_ID = owner;
        }
    });

    test.each([true, false])('status is visible regardless of administrator=%s', async administrator => {
        mockService.status.mockReturnValue({ from: { id: 'from' }, to: { id: 'to' }, startedAt: new Date(0) });
        const interaction = {
            guild: { id: 'guild' }, memberPermissions: new PermissionsBitField(administrator ? [PermissionFlagsBits.Administrator] : []),
            options: { getSubcommand: () => 'status' }, deferred: true, deferReply: jest.fn(), editReply: jest.fn()
        };
        await command.execute(interaction as unknown as ChatInputCommandInteraction);
        expect(interaction.editReply).toHaveBeenCalledWith({ content: '<#from> → <#to>\n開始時刻 <t:0:F>', allowedMentions: { parse: [] } });
        expect(mockService.stop).not.toHaveBeenCalled();
    });
});
