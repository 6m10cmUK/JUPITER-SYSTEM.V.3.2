import { ChatInputCommandInteraction } from 'discord.js';
import { JobEmbedFormatter } from '../../../presentation/formatters/JobEmbedFormatter';
import { JobSearchCriteria } from '../../../application/dto/JobDto';
import { logResult } from '../../../shared/utils/UsageLogger';

const RESULT_DETAIL_LIMIT = 300;

/**
 * 職業検索コマンドハンドラー
 * ビジネスロジックを適切に分離し、統一的なアーキテクチャを実現
 */
export class JobCommandHandler {
    constructor(
        private readonly formatter: JobEmbedFormatter
    ) {}

    /**
     * 職業検索処理を実行
     * @param interaction Discord インタラクション
     */
    async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        const subcommand = interaction.options.getSubcommand() as JobSearchCriteria['subcommand'];
        
        await interaction.deferReply();

        try {
            if (subcommand === 'random') {
                await this.handleRandomJob(interaction);
            } else {
                await this.handleJobSearch(interaction, subcommand);
            }
        } catch (error) {
            await interaction.editReply({
                content: '職業検索の処理中にエラーが発生しました。'
            });
            console.error('Job command error:', {
                error: error instanceof Error ? error.message : String(error),
                subcommand,
                userId: interaction.user.id,
                guildId: interaction.guildId
            });
        }
    }

    /**
     * ランダム職業生成処理
     * @param interaction Discord インタラクション
     */
    private async handleRandomJob(interaction: ChatInputCommandInteraction): Promise<void> {
        const rawCount = interaction.options.getInteger('count') ?? 1;
        const count = Math.min(Math.max(rawCount, 1), 8); // 1〜8に制限（コマンド定義のsetMaxValue(8)と一致）
        
        const criteria: JobSearchCriteria = {
            query: '',
            subcommand: 'random',
            page: count // randomの場合、pageがcountとして使われる
        };
        
        const display = await this.formatter.format(interaction, criteria);
        await interaction.editReply(display);
        logResult(
            interaction,
            truncateResultDetail(formatJobResultDetail(criteria, display.embeds[0]?.data.fields?.map(field => field.name) ?? []))
        );
    }

    /**
     * 職業検索処理
     * @param interaction Discord インタラクション
     * @param subcommand サブコマンド種別
     */
    private async handleJobSearch(
        interaction: ChatInputCommandInteraction, 
        subcommand: JobSearchCriteria['subcommand']
    ): Promise<void> {
        const query = interaction.options.getString('query') ?? '';
        const criteria: JobSearchCriteria = {
            query,
            subcommand,
            page: 1
        };
        
        const display = await this.formatter.format(interaction, criteria);
        await interaction.editReply(display);
        logResult(
            interaction,
            truncateResultDetail(formatJobResultDetail(criteria, display.embeds[0]?.data.fields?.map(field => field.name) ?? []))
        );
    }
}

function formatJobResultDetail(criteria: JobSearchCriteria, jobNames: string[]): string {
    const query = criteria.query ? ` query=${criteria.query}` : '';
    const count = criteria.count != null ? ` count=${criteria.count}` : '';
    const representative = jobNames[0] ?? '-';

    return `status=success subcommand=${criteria.subcommand}${query}${count} page=${criteria.page} displayed=${jobNames.length} representative=${representative}`;
}

function truncateResultDetail(detail: string): string {
    if (detail.length <= RESULT_DETAIL_LIMIT) {
        return detail;
    }

    return `${detail.slice(0, RESULT_DETAIL_LIMIT - 3)}...`;
}
