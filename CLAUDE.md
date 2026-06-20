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

### pokeinfoコマンド表示

3レイヤー構成:
- `src/pokeinfo/index.ts`: データアクセス（Pokemon型、検索関数）
- `src/pokeinfo/view-model.ts`: 何を表示するか（PokemonViewModel、StatActuals — baseStatsからPokémon Champions仕様(Lv.50・個体値31・SP 0/32・性格0.9/1.0/1.1)で実数値4値を計算。従来の「努力値」概念は使わず、ステータス計算は常にSP(Status Point, 0〜32)で表現する）
- `src/pokeinfo/embed.ts`: どう表示するか（Discord Embed構築 — fields、footer、タイプ色）

テストもソース構造に対応して分割: `index.test.ts` / `view-model.test.ts` / `embed.test.ts`

### ポケモンデータ

- **データソース**: `vendor/pokedex` (git submodule, towakey/pokedex) をベース、`vendor/champout` (git submodule, projectpokemon/champout) を Champions 最新データとしてオーバーレイ
- **生成スクリプト**: `pnpm exec tsx scripts/generate-pokemon-data.ts` → `src/pokeinfo/data.generated.json` を生成
  - `scripts/lib/pokedex-parser.ts`: pokedex解析（グローバル図鑑→名前マッピング、ゲームデータ→種族値）
  - `scripts/lib/champout-parser.ts`: champout解析（masterdata/personal.json + rom-txt ローカライズデータ → ポケモンデータ）
  - `scripts/lib/fallback.ts`: pokedex にデータ不足があるエントリを `@pkmn/dex` (Showdown) から補完
- **yakkun URL照合**: `src/pokeinfo/yakkun-map.json` (手動管理、null補完は `update-yakkun-map` スキルで実行)
- **コスメティックフォーム除外**: `champout-parser.ts` の `filterCosmeticForms` で同一 no 内のベースフォームと種族値・特性が一致するフォームを自動検出・除外（タイプのみ異なるフォームも除外対象：ポワルン天候フォーム等）
- **正誤表（errata）**: `scripts/pokedex-errata.json` に外部データソースの既知の誤りに対する補正データを記載。パイプラインの末尾で適用。`types`（文字列配列）、`abilities`（文字列配列）、`baseStats`（`{ H, A, B, C, D, S }` の部分指定）を個別に指定可能。例: `{ "ポケモン名": { "types": ["みず", "ひこう"], "baseStats": { "A": 100 } } }`
- **データ優先順位**: errata（最終補正） > champout（オーバーレイ、Champions実装分） > pokedex（ベース） > @pkmn/dex（フォールバック）
- **フォールバック**: pokedex にデータ不足があるエントリ（stats欠損、type欠損、メガ/ゲンシフォーム未収録）を `@pkmn/dex` から補完
- **champout データ構造**: `masterdata/personal.json`（種族値・タイプID・特性ID）、`rom-txt/jpn/monsname_syn.json`（日本語名）、`rom-txt/jpn/tokusei.json`（特性名）、`rom-txt/jpn/zkn_form_syn.json`（フォーム名）、`rom-txt/usa/monsname_syn.json`（英語名）
- **一貫性チェーン**: ファイル名・型名・関数名・テスト構造・呼び出し側は一つのチェーン。1つを変更したら残り全てを同時に揃える。部分的なリネームは禁止
- **出力フォーマット駆動設計**: UI変更時は出力フォーマットの構造要素を先に理解し、その機能を活かした設計にする。テキストを流し込むだけなら形式を変える意味がない
- **表示形式の選択と情報量の変更は別の承認事項**: 形式（テーブル→Embed等）の選択を、情報量の削減（4値→2値等）の暗黙的承認とみなさない
- **定期更新**: `update-pokemon-data.yml` が毎日 champout submodule を更新しPR作成
- `*.generated.*` ファイルは eslint / prettier の対象外

### 環境変数・シークレット

- `wrangler.toml`に定義: `DISCORD_APPLICATION_ID`, `SENTRY_DSN`（公開値）
- `wrangler secret put`で設定: `DISCORD_TOKEN`, `DISCORD_PUBLIC_KEY`, `NEWS_NOTIFICATION_CHANNEL_ID`, `NEWS_SUBSCRIBER_ROLE_ID`（シークレット）
- KVバインディング: `NEWS_KV`（ニュース通知状態の永続化）
- 全環境変数の型定義: `src/context.ts`の`Env`型

### 運用ルール

- ユーザー指示に含まれない破壊的・不可逆フラグをコマンドに追加しない（`--delete-branch`, `--force`, `-D`, `--hard`, `--no-verify` 等）。付与が必要と判断した場合は必ず事前に確認を取る