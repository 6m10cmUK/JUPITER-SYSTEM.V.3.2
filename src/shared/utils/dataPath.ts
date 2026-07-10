import path from 'path';

/**
 * 静的データディレクトリの絶対パスを返す。
 *
 * このファイルは src/shared/utils/ に配置されるため、
 * ts-node 実行時: src/shared/utils/ → ../../data = src/data
 * ビルド後:       dist/shared/utils/ → ../../data = dist/data
 *
 * ビルド時に src/data → dist/data へコピーされる前提。
 */
export function getDataDir(): string {
    return path.resolve(__dirname, '../../data');
}
