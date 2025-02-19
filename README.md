# JUPITER-SYSTEM.V.3.2

## 環境構築

1. 依存パッケージのインストール:
```bash
npm install
```

2. 設定ファイルの準備:
- `src/config.json.example`を`src/config.json`にコピー
- 以下の項目を設定:
  - `DISCORD_TOKEN`: Discordボットのトークン
  - `APPLICATION_ID`: アプリケーションID

3. 開発用サーバーの準備:
```bash
npm run all
```