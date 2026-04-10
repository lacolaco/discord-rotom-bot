---
name: update-yakkun-map
description: "yakkun-map.json内のnullエントリにyakkun URLを補完する。generate-pokemon-data.tsがyakkun未対応を警告した時、yakkun-mapのnull補完を依頼された時、新ポケモンデータ追加後のURL補完時に使用する。「yakkun」「URL補完」「マッピング更新」といったキーワードでも発動する。"
---

# update-yakkun-map

`src/pokeinfo/yakkun-map.json` 内の値が `null` のエントリに yakkun URL を補完するスキル。

## 背景

yakkun-map.json は towakey/pokedex のポケモン表示名をキーとし、対応する yakkun.com の URL を値として持つ照合テーブル。URL が未定のエントリは `null` で埋められている。このスキルはそれらを補完する。

yakkun URL の形式: `https://yakkun.com/{zukanKey}/zukan/{pokemonKey}`
- `zukanKey` はポケモンごとに異なる。新しいゲームが優先される
- `pokemonKey` は yakkun 独自 ID で、全国図鑑番号とは一致しない

zukanKey の優先順（新しい方が優先、掲載がなければ次にフォールバック）:
1. `ch` (ポケチャン)
2. `za` (Legends Z-A)
3. `sv` (Scarlet/Violet)
4. `swsh` (Sword/Shield)
5. `legends_arceus`
6. `bdsp` (Brilliant Diamond/Shining Pearl)
7. `sm` (Sun/Moon)

## 手順

### 1. null エントリの列挙と全国図鑑番号の取得

yakkun-map.json の各エントリの全国図鑑番号は `data.generated.json` の `index` フィールド、または `vendor/pokedex/pokedex/pokedex.json` から取得できる。

```python
import json

with open('src/pokeinfo/yakkun-map.json') as f:
    yakkun_map = json.load(f)

with open('src/pokeinfo/data.generated.json') as f:
    generated = json.load(f)

nulls = {k: v for k, v in yakkun_map.items() if v is None}
print(f'null entries: {len(nulls)}')
for name in nulls:
    index = generated.get(name, {}).get('index', '?')
    print(f'  #{index}: {name}')
```

### 2. 全国図鑑番号で yakkun URL を検索

各nullエントリの全国図鑑番号 N を使い、zukanKeyの優先順で検索する。最初に見つかったURLを採用する。

**検索方法**: `search=1&min=N&max=N&{zukanKey}=0` で全国図鑑番号Nのポケモンを検索する。`{zukanKey}=0` フラグは「そのzukanKeyの全ポケモンを対象にする」フラグ。検索APIは一部のポケモンを返さない場合があるが、このフラグにより網羅性が向上する。

```python
import subprocess, re

ZUKANKEY_PRIORITY = ['ch', 'za', 'sv', 'swsh', 'legends_arceus', 'bdsp', 'sm']

def search_yakkun(nat_num):
    """全国図鑑番号で yakkun を検索し、見つかったURL一覧を返す"""
    results = []  # [(name, url, zukanKey)]
    for zukan in ZUKANKEY_PRIORITY:
        raw = subprocess.run(
            ['curl', '-sL', '-A', 'Mozilla/5.0',
             f'https://yakkun.com/{zukan}/zukan/search/?search=1&min={nat_num}&max={nat_num}&{zukan}=0'],
            capture_output=True
        ).stdout
        html = raw.decode('euc-jp', errors='replace')
        pattern = r'<a[^>]*href="/(\w+)/zukan/(n\d+\w*)"[^>]*class="b"[^>]*>(.*?)</a>'
        for zk, pk, content in re.findall(pattern, html, re.DOTALL):
            clean = re.sub(r'<[^>]+>', '', content).strip()
            if clean:
                results.append((clean, f'https://yakkun.com/{zk}/zukan/{pk}', zk))
        if results:
            break  # 最も新しいzukanKeyで見つかったので終了
    return results

# 使用例
for name in nulls:
    index = generated.get(name, {}).get('index')
    if index is None:
        continue
    results = search_yakkun(index)
    print(f'#{index} {name}:')
    for rname, url, zk in results:
        print(f'  {rname} -> {url}')
```

### 3. yakkun-map.json の更新

検索結果から適切なURLを選び、nullエントリを更新する。yakkun側の名前とtowakey側の名前が異なる場合があるため、結果を目視で確認してから代入すること。

- `null` だったエントリを特定した URL で更新する
- 既存の非null エントリは絶対に変更しない
- エントリの順序（全国図鑑No順）を維持する

```python
with open('src/pokeinfo/yakkun-map.json', 'w') as f:
    json.dump(yakkun_map, f, ensure_ascii=False, indent=2)
    f.write('\n')
```

### 4. pokemonKey 重複バリデーション

更新後、yakkun-map.json 内で pokemonKey（URLの末尾パス）が重複していないか必ず検証する。重複は異常であり、以下のいずれかを意味する:
- コスチューム違いフォームが除外されていない → `generate-pokemon-data.ts` の `COSMETIC_ONLY_BASE_NAMES` に追加
- 本来別URLがあるのに同じURLが割り当てられている → 正しいURLに修正

```python
from collections import defaultdict
key_to_names = defaultdict(list)
for name, url in yakkun_map.items():
    if url:
        key_to_names[url.split('/')[-1]].append(name)
dupes = {k: n for k, n in key_to_names.items() if len(n) > 1}
if dupes:
    print(f'DUPLICATE DETECTED: {len(dupes)}')
    for k, n in sorted(dupes.items()):
        print(f'  {k}: {n}')
    raise Exception('Duplicate pokemonKeys found. Fix before proceeding.')
else:
    print('No duplicates. OK.')
```

重複が検出された場合、解消するまで次のステップに進まないこと。

### 5. data.generated.json の再生成

```bash
npx tsx scripts/generate-pokemon-data.ts
```

更新結果のサマリー（解決数/残りのnull数）を報告する。
