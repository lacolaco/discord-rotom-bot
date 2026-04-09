# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cloudflare Workers上で動作するDiscordボット。ポケモン情報の検索（スラッシュコマンド）とポケモンニュースの定期通知を提供する。

**技術スタック**: TypeScript (CommonJS) / Hono / Cloudflare Workers + KV / discord-interactions / @lacolaco/pokemon-data / Sentry (toucan-js)

**パッケージマネージャ**: pnpm

## Development Commands

```bash
pnpm dev                  # wrangler devでローカル開発サーバー起動
pnpm deploy               # Cloudflare Workersへデプロイ
pnpm format               # Prettierでコード整形
pnpm register-commands    # Discordスラッシュコマンドを登録（環境変数DISCORD_TOKEN, DISCORD_APPLICATION_ID, DISCORD_GUILD_IDが必要）
```

テストフレームワークは未導入。ビルドコマンドも不要（wranglerがデプロイ時にTypeScriptをコンパイルする）。

## Architecture

### 2つのエントリーポイント (`src/index.ts`)

1. **HTTP handler** (`fetch`): Honoアプリ。`POST /api/interactions`でDiscordからのインタラクションを受け付ける。リクエスト署名検証 → コマンドルックアップ → レスポンス返却の流れ。
2. **Scheduled handler** (`scheduled`): 5分間隔のcronジョブ。ポケモンニュースを取得し、未通知のものをDiscordチャンネルに投稿する。KVで通知済みニュースIDを管理。

### コマンドの追加方法

1. `src/commands/`に新ファイルを作成
2. `default`オブジェクト（`name`, `description`）をエクスポート
3. `createResponse(interaction)`関数をエクスポート（autocompleteが必要なら`createAutocompleteResponse`も）
4. `src/commands/index.ts`のimportと`commands`配列に追加
5. `pnpm register-commands`でDiscord APIに登録

コマンドの型定義は`src/commands/index.ts`の`Command`型を参照。

### 環境変数・シークレット

- `wrangler.toml`に定義: `DISCORD_APPLICATION_ID`, `SENTRY_DSN`（公開値）
- `wrangler secret put`で設定: `DISCORD_TOKEN`, `DISCORD_PUBLIC_KEY`, `NEWS_NOTIFICATION_CHANNEL_ID`, `NEWS_SUBSCRIBER_ROLE_ID`（シークレット）
- KVバインディング: `NEWS_KV`（ニュース通知状態の永続化）
- 全環境変数の型定義: `src/context.ts`の`Env`型