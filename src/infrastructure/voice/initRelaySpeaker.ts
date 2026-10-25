import { Client, GatewayIntentBits } from 'discord.js';
import { logSystem } from '../../shared/utils/UsageLogger';

export async function initRelaySpeaker(): Promise<void> {
    const token = process.env.JUPITER_RELAY_SPEAKER_TOKEN;
    if (!token) {
        logSystem('relay-speaker', 'JUPITER_RELAY_SPEAKER_TOKEN 未設定のため中継用 bot を起動しません');
        return;
    }
    const { getVoiceRelayService } = await import('./VoiceRelayService');
    const service = getVoiceRelayService();
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
    client.on('error', error => console.error('relay-speaker error', error));
    service.setSpeakerClient(client);
    try {
        await client.login(token);
    } catch (error) {
        service.setSpeakerStartupFailed();
        console.error('relay-speaker ログイン失敗', error);
        await client.destroy().catch(destroyError => console.error('relay-speaker cleanup', destroyError));
    }
}
