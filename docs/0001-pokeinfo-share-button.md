# pokeinfo コマンド: 2段階レスポンス（プレビュー→シェア）

- Status: Draft
- Author: lacolaco
- Date: 2026-04-23

## 背景

現在 `/pokeinfo` は実行と同時にチャンネルに公開 embed を投稿する。検索結果が意図通りでなかった場合（名前の打ち間違い、同名フォームの選択ミスなど）でも取り消せず、ノイズがそのまま残る。

## ゴール

- `/pokeinfo` の検索結果を、まず呼び出したユーザー本人にだけ見える ephemeral メッセージとして返す。
- ephemeral に「チャンネルに共有」ボタンを付け、押下時に同じ embed を public メッセージとして投稿する。
- 共有後は ephemeral からボタンを消し、二重共有を防ぐ。

## 非ゴール

- `ping` などその他のコマンドの挙動変更。
- 検索結果が見つからなかった場合のフロー変更（従来通り ephemeral で完結、ボタンなし）。
- 編集機能・フォーム選択 UI の追加（別スコープ）。
- shared message への「取り消す」ボタンの追加（Discord の通常の削除 UI で十分）。

## ユーザー体験

1. ユーザーが `/pokeinfo name:ピカチュウ` を実行。
2. Bot は ephemeral メッセージで embed + 「チャンネルに共有」ボタンを返す。
3. ユーザーが embed を確認し、意図通りなら「チャンネルに共有」を押す。
4. 同じ embed がチャンネルに公開メッセージとして投稿される。ephemeral は「共有しました」などに更新されボタンは消える。
5. 意図と違ったら押さずに放置すればよい（ephemeral は本人にしか見えず、時間経過で Discord クライアント上から自動的に消える）。

検索失敗時（"見つからなかったロトね..." のケース）は ephemeral で完結し、ボタンを表示しない。

## 技術設計

### Discord インタラクションフロー

```
[User] /pokeinfo name:ピカチュウ
   │
   ▼
[Bot] InteractionResponseType.ChannelMessageWithSource
      data: { embeds: [embed], components: [Button], flags: Ephemeral(64) }
   │
[User] ボタン押下
   │
   ▼
[Discord] MessageComponent interaction (type=3) を Bot に送信
          custom_id = "pokeinfo:share:ピカチュウ"
   │
   ▼
[Bot] Response: InteractionResponseType.UpdateMessage
      data: { content: '共有しました', embeds: [], components: [] }
      （ephemeral メッセージを置き換え、ボタンを消す）
   │
[Bot] Followup webhook (ctx.waitUntil で非同期):
      POST /webhooks/{app_id}/{interaction_token}
      body: { embeds: [embed] }  // flags なし → 公開メッセージ
```

- ボタン押下時の Discord 仕様: `UPDATE_MESSAGE` (type 7) は押されたメッセージ（ephemeral）を編集する。一方、同じ interaction_token で `POST /webhooks/{app_id}/{token}` を叩くと「チャンネルへの新規投稿」になる。この 2 つを組み合わせる。
- `ctx.waitUntil` は Hono の `c.executionCtx.waitUntil` 経由で取得できる。fetch handler は 3 秒以内に応答を返す必要があるため、followup 投稿は非同期化する。

### custom_id 設計

フォーマット: `pokeinfo:share:<ポケモン日本語名>`

例: `pokeinfo:share:ピカチュウ`、`pokeinfo:share:メガフシギバナ`

- 命名: `<namespace>:<action>:<payload>` のコロン区切り。`pokeinfo` namespace は将来の他アクション（例: フォーム切替）も同 prefix で受けられる。
- 識別子の選定: ポケモン日本語名を採用。このプロジェクトの primary key は日本語名で、`data.generated.json` のオブジェクトキー・`searchPokemonByName` の引数・autocomplete 返り値すべてに一貫して使われている。外部データソース非依存で、プロジェクト固有の安定した識別子。
  - `yakkun.key` は外部サイト（yakkun.com）の URL スラッグであり、このボットの primary key ではない。yakkun 依存を外した将来に意味を失うため不採用。
  - Showdown ID（`pikachu` 等）は ASCII だが現データに含まれず、参照のための追加コスト（`@pkmn/dex` 依存）が発生する。
  - ビルド時に内部 ID を付与するのはパイプライン改修が必要で過剰。
- 安全性検証:
  - 全 1235 エントリで `:` を含むキーはゼロ（デリミタ衝突なし）。
  - 最大長 23 文字、Discord custom_id 上限 100 文字に余裕。
  - サロゲートペア・制御文字なし。`♀♂` は Discord が問題なく扱える Unicode。
  - custom_id は Interaction JSON body で往復するため URL エンコード不要。
- 認可: ephemeral メッセージは呼び出し元ユーザーにしか表示されないため、他人がボタンを押下することは物理的に不可能。`user_id` の埋め込み・照合は不要。
- 状態保存: KV や DB を使わない。全情報を custom_id に載せる（stateless）。これにより Worker の複数インスタンスでも一貫動作する。
- パース: `custom_id.split(':')` の 3 番目以降を `:` で再結合（将来ペイロードに `:` が紛れ込んでも対応できる）。現状は 3 セグメントで十分。

### ルーティング

現状の `handleInteractionRequest` (src/discord/interactions.ts:33) は `ApplicationCommand` と `ApplicationCommandAutocomplete` のみ扱う。ここに `MessageComponent` (type=3) を追加する。

Command 型の拡張方針:

```ts
type Command = {
  default: { name: string; description: string };
  createResponse: (...) => Promise<APIInteractionResponse | null>;
  createAutocompleteResponse?: (...) => ...;
  // 追加
  createComponentResponse?: (
    interaction: APIMessageComponentInteraction,
  ) => Promise<ComponentResult | null>;
};

type ComponentResult = {
  response: APIInteractionResponse;  // UPDATE_MESSAGE など即時応答
  followup?: () => Promise<void>;    // ctx.waitUntil で非同期実行
};
```

- custom_id の先頭セグメント（コロン分割）を namespace として commands から該当 Command を探す（`pokeinfo` → pokeinfo コマンド）。
- pokeinfo コマンド内の `createComponentResponse` は `action` で分岐（現状は `share` のみ）。
- `followup` は `DiscordApi` に followup webhook 送信メソッドを追加して呼ぶ。

### DiscordApi への追加

`src/discord/api.ts` に以下を追加:

```ts
async postInteractionFollowup(
  applicationId: string,
  interactionToken: string,
  body: RESTPostAPIWebhookWithTokenJSONBody,
): Promise<void>
```

エンドポイント: `POST /webhooks/{application_id}/{interaction_token}`（Bot token 不要、interaction_token で認証）。

### 環境変数

新規追加なし。`DISCORD_APPLICATION_ID` は既に `wrangler.toml` に存在。

### テスト

- `src/commands/pokeinfo.test.ts`（新規）: `createResponse` が ephemeral flag + Button component を含む response を返すこと。検索失敗時はボタンなし ephemeral を返すこと。
- `src/commands/pokeinfo.test.ts`: `createComponentResponse` が UPDATE_MESSAGE + followup 関数を返すこと。custom_id のパースが正しいこと。
- ルーティング層のテストはカバー既存範囲に準じて追加。

## 代替案

### A. 状態を KV に保存

custom_id に短い ID だけ入れて、embed 本体を KV に保存する方式。

- 却下理由: 単純な再検索で済む処理にストレージ I/O を増やす必然性がない。TTL 管理も必要で複雑化。stateless で足りる。

### B. UPDATE_MESSAGE を使わず ChannelMessageWithSource で公開投稿

ボタン押下時に `ChannelMessageWithSource`（flags なし）を返して公開メッセージにし、ephemeral 側は放置する方式。

- 却下理由: ephemeral にボタンが残り続け、再押下で多重投稿が起きる。UX が悪い。

### C. Command 型拡張ではなく独立した ComponentHandler registry

`src/components/` ディレクトリに custom_id namespace ごとの handler を並べる方式。

- 却下の理由というより選択理由: pokeinfo の slash command と share ボタンは同一ドメインの機能。コマンド単位にまとまっている方が凝集度が高い。将来 namespace が増えて 3 つ以上のコマンドが components を持つようになったら再検討。

## リスク・未解決事項

- **followup 失敗時のハンドリング**: webhook 投稿が失敗した場合、ephemeral 側は既に「共有しました」に更新済みで、ユーザーには共有されたように見えるが実際には投稿されない状態になりうる。対策: followup を先に実行し、成功後に UPDATE_MESSAGE を送る——は Discord の 3 秒応答制限に抵触するため不可。採用案: followup 失敗時は Sentry に記録、ephemeral を再編集（PATCH original）して「共有に失敗しました」に差し戻す。実装コスト低いので初版から入れる。
- **Ephemeral メッセージの寿命**: Discord クライアント側の ephemeral は数分〜数十分で自動的にフェードするが、その間は API からは取得可能。UPDATE_MESSAGE 応答後すぐにボタンは消えるので、寿命による問題はない。
- **Discord の interaction_token 寿命**: 15 分。ユーザーがそれを超えてボタンを押すと followup に失敗する。この場合 Discord 側で「このインタラクションは失敗しました」と表示されるので Bot 側で検知不要。

## 実装計画

1. `src/discord/api.ts` に `postInteractionFollowup` を追加。
2. Command 型に `createComponentResponse` を追加し、`src/discord/interactions.ts` に MessageComponent 分岐を追加。
3. `src/commands/pokeinfo.ts` の `createResponse` を ephemeral + Button に変更、`createComponentResponse` を実装。
4. テスト追加。
5. 動作確認（wrangler dev + Discord 開発サーバー）。

コード変更はいずれも小さく、段階的にコミット可能。
