# JUPITER-SYSTEM.V.3.2

## 環境構築

1. 依存パッケージのインストール:
```bash
npm install
```

2. 設定ファイルの準備:
- `src/config.json.example`を`src/config.json`にコピー
- 以下の項目を設定:
  - `token`: Discordボットのトークン
  - `applicationId`: アプリケーションID
  - `guildId`: 開発用サーバーのID

3. 開発用サーバーの準備:
```bash
npm run dev
```

## セキュリティに関する注意

- `config.json`には機密情報が含まれるため、Gitリポジトリにコミットしないでください
- トークンが漏洩した場合は、すぐにDiscord Developer Portalで再発行してください 