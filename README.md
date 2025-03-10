# JUPITER-SYSTEM.V.3.2

## 環境構築

1. 依存パッケージのインストール:
```bash
npm install
```

2. 設定ファイルの準備:
- `src/.example.env`を`src/.env`にコピー
- 以下の項目を設定:
  - `DISCORD_TOKEN`: DiscordBotトークン
  - `APPLICATION_ID`: アプリケーションID

  開発用botは自分で用意しな

3. 開発用サーバーの準備:
```bash
npm run all
```

## ファイル構成

```bash
src/
├── adapters/     # アダプター discordと通信する部分
├── commands/     # コマンド
│   └── adminCommands/ # 管理者用コマンド
├── interactions/ # インタラクション
├── types/        # 型定義
├── interfaces/   # インターフェース
├── commons/      # 共通関数
├── data/         # データ
├── index.ts      # エントリーポイント
├── package.json
├── README.md
└── .env          # 環境変数
```