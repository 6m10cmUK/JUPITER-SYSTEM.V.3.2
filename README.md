# JUPITER-SYSTEM.V.3.2

Discord bot for Call of Cthulhu TRPG dice rolling and character management.

## 最新アップデート (v3.2.2)

- **カスタムセット機能**: ステータスにカスタムダイス式を設定可能（例: 2d6+6, 3*4）
- **UI改善**: Discord embedの色を統一（#333333）、セレクトメニューの説明にダイス詳細を追加
- **Ver7サポート拡張**: 7版でもカスタムセットと名前変更機能が利用可能
- **マークダウンエスケープ**: ダイス式の特殊文字（*など）の表示問題を修正
- **ステータス表示**: Botプロフィールに「ver.X.X.X をプレイ中」を表示
- **モーダル改善**: カスタムセット時のセレクトメニューリセット機能

## 主な機能

- CoC 6版・7版のキャラクター生成
- 多様なダイスロール（1d100, CCB, choice, res等）
- キャラクターステータス管理（振り直し、入れ替え、カスタムセット）
- 日本語コマンドと全角文字対応
- ギルド固有のコマンド管理
- iacharaへの直接エクスポート

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

## テスト

### テストの実行
```bash
# 全テストを実行
npm test

# ウォッチモードでテストを実行
npm run test:watch

# カバレッジレポート付きでテスト実行
npm run test:coverage
```

### テスト構造
- 各モジュールのテストは`__tests__`ディレクトリに配置
- 命名規則: `{module-name}.test.ts` または `{module-name}.spec.ts`
- Jestを使用したユニットテスト

## ファイル構成

```bash
src/
├── adapters/           # アダプター層 - Discordイベントをアプリケーションに変換
│   └── discord/        # Discord固有のアダプター実装
├── adminCommands/      # 管理者用コマンド
├── application/        # アプリケーション層 - ユースケースとDTO
│   ├── dto/           # データ転送オブジェクト
│   └── use-cases/     # ビジネスロジックのオーケストレーション
├── config/            # 設定ファイル
├── data/              # 静的データ（JSON等）
├── domain/            # ドメイン層 - ビジネスロジックの中核
│   ├── entities/      # エンティティ
│   ├── interfaces/    # ドメインインターフェース
│   ├── services/      # ドメインサービス
│   │   └── status/    # ステータス関連サービス
│   ├── utils/         # ユーティリティ
│   └── value-objects/ # 値オブジェクト
├── infrastructure/    # インフラストラクチャ層 - 技術的実装
│   ├── commands/      # コマンド実装
│   │   ├── handlers/  # コマンドハンドラー
│   │   └── legacy/    # レガシー機能
│   └── repositories/  # リポジトリ実装
├── interactions/      # インタラクションハンドラー
├── interfaces/        # インターフェース定義
├── presentation/      # プレゼンテーション層 - Discord向けフォーマット
│   ├── discord/       # Discord固有の表示処理
│   │   ├── builders/  # メッセージビルダー
│   │   │   ├── __tests__/  # ビルダーのテスト
│   │   │   │   └── StatusComponentBuilder.test.ts
│   │   │   ├── StatusComponentBuilder.ts
│   │   │   ├── embedGenerator.ts
│   │   │   └── messages.ts
│   │   └── displays/  # 表示コンポーネント
│   └── formatters/    # 汎用フォーマッター
│       ├── DiceEmbedFormatter.ts
│       └── StatusEmbedFormatter.ts
├── shared/            # 共有ユーティリティ
│   ├── errors/        # エラーハンドリング
│   └── utils/         # 汎用ユーティリティ
├── types/             # 型定義
├── index.ts           # エントリーポイント
├── package.json
├── jest.config.js     # Jestの設定ファイル
├── README.md
├── CLAUDE.md          # Claude Code用の指示ファイル
└── .env               # 環境変数
```

## アーキテクチャの特徴

### ドメイン駆動設計（DDD）の採用
- **層の分離**: ビジネスロジック（Domain）、アプリケーションロジック（Application）、技術的詳細（Infrastructure）を明確に分離
- **依存関係の方向**: 外側の層から内側の層への一方向の依存のみ許可

### ステータスコマンドのリファクタリング
- **共通化**: 6版と7版で共通のインターフェースと基底クラスを使用
- **戦略パターン**: バージョン固有の処理をStatusServiceVer6/Ver7で実装
- **ファクトリーパターン**: StatusServiceFactoryでバージョンに応じたサービスを生成

### コマンドの構造
- **動的ロード**: `infrastructure/commands/`配下の`*-command.ts`ファイルを自動読み込み
- **ハンドラー分離**: ビジネスロジックをCommandHandlerに集約
- **統一された命名規則**: すべてのコマンドファイルは`{command-name}-command.ts`形式