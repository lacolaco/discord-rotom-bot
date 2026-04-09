# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cloudflare Workers上で動作するDiscordボット。ポケモン情報の検索（スラッシュコマンド）とポケモンニュースの定期通知を提供する。

**技術スタック**: TypeScript (ESM) / Hono / Cloudflare Workers + KV / discord-interactions / towakey/pokedex (submodule) / Sentry (toucan-js)

**パッケージマネージャ**: pnpm

## Development Commands

```bash
pnpm dev                  # wrangler devでローカル開発サーバー起動
pnpm typecheck            # TypeScript型チェック（tsc --noEmit）
pnpm lint                 # ESLint
pnpm format               # Prettierでコード整形
pnpm format:check         # Prettierのチェックのみ（CI用）
pnpm test                 # vitest実行
pnpm deploy               # Cloudflare Workersへデプロイ
pnpm register-commands    # Discordスラッシュコマンドを登録（環境変数DISCORD_TOKEN, DISCORD_APPLICATION_ID, DISCORD_GUILD_IDが必要）
```

ビルドコマンドは不要（wranglerがデプロイ時にTypeScriptをコンパイルする）。

### CI / CD

- **CI** (`ci.yml`): PR時にformat / lint / typecheck / testを実行。renovate PRはclaude-renovate-reviewで自動レビュー+auto-merge。人間PRはclaude-code-actionでレビュー。`ok`ジョブ（alls-green gate）が唯一のrequired check。
- **Deployment** (`deployment.yml`): mainへのpush時にtypecheck → deploy → register-commandsを実行
- GitHub ActionsはSHAピン留め済み（`pinact`で管理）

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

### ニュース通知の仕組み

- ソース: `src/news/fetch.ts`の`newsBaseUrl`で定義されたURLから`/json/list.json`を取得
- スキーマ: `src/news/types.ts`の`NewsItemJSON`。ソース変更時はAPIレスポンスとの整合性を確認すること
- フィルタリング: `isOngoingNews()`で`stAt`〜`endAt`の期間内のニュースのみ対象
- 重複排除: KVにニュースIDを保存し、通知済みをスキップ
- Discord投稿形式: `新着情報ロト！ @ロール` + embed（`[kindTxt] title` / バナー画像 / タイムスタンプ / 記事リンク）
- URL構築: バナー画像=`{newsBaseUrl}/{banner}`、記事=`{newsBaseUrl}/{link}`

### ポケモンデータ

- **データソース**: `vendor/pokedex` (git submodule, towakey/pokedex)
- **生成スクリプト**: `npx tsx scripts/generate-pokemon-data.ts` → `src/pokeinfo/data.generated.json` を生成
- **yakkun URL照合**: `src/pokeinfo/yakkun-map.json` (手動管理、null補完は `update-yakkun-map` スキルで実行)
- **除外パターン**: `generate-pokemon-data.ts` の `COSMETIC_ONLY_PREFIXES` / `EXCLUDED_FORM_SUFFIXES` / `UPSTREAM_MISSING_FORMS`
- **定期更新**: `update-pokemon-data.yml` が週次でpokedex submoduleを更新しPR作成
- `*.generated.*` ファイルは eslint / prettier の対象外

### 環境変数・シークレット

- `wrangler.toml`に定義: `DISCORD_APPLICATION_ID`, `SENTRY_DSN`（公開値）
- `wrangler secret put`で設定: `DISCORD_TOKEN`, `DISCORD_PUBLIC_KEY`, `NEWS_NOTIFICATION_CHANNEL_ID`, `NEWS_SUBSCRIBER_ROLE_ID`（シークレット）
- KVバインディング: `NEWS_KV`（ニュース通知状態の永続化）
- 全環境変数の型定義: `src/context.ts`の`Env`型