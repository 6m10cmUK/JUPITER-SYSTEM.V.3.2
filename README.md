# JUPITER-SYSTEM.V.3.2

クトゥルフ神話TRPG（6版・7版）の卓をまわすための Discord bot。ダイス、探索者のステータス作成、卓用チャンネルの準備、VC の音声中継までをひとつの bot で受け持つ。

## できること

| コマンド | 内容 |
| --- | --- |
| `/roll` | ダイスを振る。コマンドを使わずチャットに `1d100` や `CCB<=80` と書いても振れる |
| `/status` | 6版・7版の能力値を作る。ボタンで個別に振り直し・名前変更・ダイス式の差し替えができる |
| `/feature` | 特徴表を1〜3個引く |
| `/job` | 職業を名前・技能・職業ポイントで探す |
| `/name` | 名前をランダムに出す |
| `/table` | 卓用のカテゴリ・ロール・チャンネルをまとめて作る。HO 割り当て、陣の追加、削除も |
| `/relay` | VC の音声を別の VC へ中継する（要 `JUPITER_RELAY_SPEAKER_TOKEN`） |
| `/ccfolia-log` | CCFOLIA のログ HTML から、キャラごとの決定的成功・スペシャル・致命的失敗を抜き出す |
| `/densuke` | 日程調整用の日付カレンダーを出す |
| `/schedule` | 指定日時に通知を飛ばす |
| `/ninpo` | シノビガミの忍法を検索する |
| `/choice` | 選択肢からひとつ選ぶ |
| `/meigen` | 名言を登録してランダムに出す |
| `/wordle` | 4文字の日本語 Wordle |
| `/r6s` | R6S のオペレーターをランダムに選ぶ |

オプションと使用例は [COMMANDS.md](./COMMANDS.md) にある。

### ダイス記法の例

```
1d100          2d6+3          D66
CCB<=80        CC<=80         CBR(50,80)      RES(12-10)
3U6[5]         10B6>=4        C(10-4*3/2+2)
choice[A,B,C]
```

## 動かす

Node.js 22.12 以上が要る。

```bash
npm install
cp .env.example .env   # 値を埋める
npm run build
npm start              # 開発中は npm run dev
```

| 変数 | 必須 | 用途 |
| --- | --- | --- |
| `DISCORD_TOKEN` | ○ | bot のトークン |
| `APPLICATION_ID` | ○ | アプリケーション ID（スラッシュコマンド登録に使う） |
| `OWNER_ID` | | bot 運営者の Discord ユーザー ID。BAN 系コマンドの実行者判定 |
| `JUPITER_RELAY_SPEAKER_TOKEN` | | `/relay` の中継先で喋る2台目の bot のトークン。空なら中継は無効 |
| `PORT` | | HTTP / WebSocket の待ち受けポート（既定 8080） |

bot には Message Content Intent を有効にしておく。チャットのダイスはこれがないと反応しない。

### サーバーへのコマンド登録

スラッシュコマンドはサーバーごとに登録する。サーバーの管理者がチャンネルに次のように書く。

```
/#setup -a       全コマンドを登録
/#setup roll status   指定したものだけ登録
/#add relay      1つ追加
/#update         登録済みのコマンドを最新の定義に更新
```

`/#ban` `/#unban` `/#bans` は `OWNER_ID` のユーザーだけが使える。

## 開発

```bash
npm test               # Jest
npm run test:coverage
```

`main` への push と PR で GitHub Actions が Node 22 / 24 でビルドとテストを回す。

コードは `src/` 以下にあり、Discord との接続（`adapters/`）、コマンド定義とハンドラー（`infrastructure/commands/`）、ダイスやステータス生成の中身（`domain/`）に分かれている。コマンドを足すときは既存の `*-command.ts` と `handlers/` の組を真似るのが早い。
