import { StatusServiceVer6 } from './StatusServiceVer6';
import { StatusServiceVer7 } from './StatusServiceVer7';
import { BaseStatusService } from './BaseStatusService';
import { CoCVersion } from '../../../application/dto/StatusDto';

/**
 * StatusServiceのファクトリークラス（シングルトンパターン採用）
 * インスタンス生成コストを削減し、メモリ使用量を最適化
 */
export class StatusServiceFactory {
    private static instances = new Map<CoCVersion, BaseStatusService>();
    
    /**
     * 指定バージョンのStatusServiceインスタンスを取得
     * 初回アクセス時のみインスタンス化し、以降はキャッシュされたインスタンスを返却
     * @param version CoCのバージョン
     * @returns StatusServiceインスタンス
     */
    static create(version: CoCVersion): BaseStatusService {
        if (!this.instances.has(version)) {
            this.instances.set(version, this.createInstance(version));
        }
        return this.instances.get(version)!;
    }
    
    /**
     * 新しいStatusServiceインスタンスを作成
     * @param version CoCのバージョン
     * @returns StatusServiceインスタンス
     */
    private static createInstance(version: CoCVersion): BaseStatusService {
        switch (version) {
            case '6':
                return new StatusServiceVer6();
            case '7':
                return new StatusServiceVer7();
            default:
                // TypeScript exhaustiveness check
                const _exhaustiveCheck: never = version;
                throw new Error(`Unknown status version: ${_exhaustiveCheck}`);
        }
    }
    
    /**
     * キャッシュされたインスタンスをクリア（テスト用）
     */
    static clearCache(): void {
        this.instances.clear();
    }
}