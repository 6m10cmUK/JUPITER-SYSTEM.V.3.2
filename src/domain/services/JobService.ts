import fs from 'fs';
import path from 'path';
import { JobData, JobSearchCriteria } from '../../application/dto/JobDto';
import { getDataDir } from '../../shared/utils/dataPath';

export class JobService {
    private jobData: JobData[] = [];

    constructor() {
        this.loadJobData();
    }

    private loadJobData(): void {
        const dataPath = path.join(getDataDir(), 'jobs.json');
        this.jobData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    }

    searchJobs(criteria: JobSearchCriteria): JobData[] {
        const { query, subcommand } = criteria;

        if (subcommand === 'all') {
            return this.jobData;
        }

        if (subcommand === 'random') {
            const count = criteria.count || 1;
            return [...this.jobData].sort(() => Math.random() - 0.5).slice(0, count);
        }

        // name, skill, point で検索
        return this.jobData.filter((job: JobData) => {
            const value = job[subcommand as keyof JobData];
            return typeof value === 'string' && value.toLowerCase().includes(query.toLowerCase());
        });
    }

    getTitle(criteria: JobSearchCriteria): string {
        const { query, subcommand } = criteria;

        switch (subcommand) {
            case 'all':
                return '職業一覧';
            case 'name':
                return `職業名検索：${query}`;
            case 'skill':
                return `職業技能検索：${query}`;
            case 'point':
                return `職業ポイント検索：${query}`;
            case 'random':
                return 'ランダム職業';
            default:
                return '職業一覧';
        }
    }
}
