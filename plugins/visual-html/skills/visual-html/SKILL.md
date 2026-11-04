---
name: visual-html
description: 会話、Markdown、仕様書、調査メモ、比較表、記事、レポートを、デジタル庁デザインシステムに沿った図解・カード・表つきの読みやすい単一HTMLにして、ブラウザで開くスキル。ユーザーが「HTML化」「図解して」「視覚的に整理して」「ブラウザで見たい」「仕様書を読みやすくして」と依頼したら、このスキルを使う。ローカルで見る前提で、共有URLの発行や公開はしない。
---

# Visual HTML

会話やファイルの内容を、デジタル庁デザインシステム(DADS)に沿った図解つきの単一HTMLにして、完成したらその場で開く。

AIが毎回違う図解を書くと表示が崩れ、出力トークンも増える。そのため、AIが書くのは内容を表すJSON(spec)だけにする。CSSとHTMLタグは `scripts/build_html.py` が組み立てるので、毎回同じデザインになり、HTMLエスケープもスクリプトが行う。

## 作業手順

1. 入力を決める。ファイルがあれば読む。なければ会話の直近内容を使う。URLなら、取得した内容がMarkdownとして保存された場所を確認する。
2. 内容を整理する。
   - 仕様書は、要約、要件、API、リスク、未決事項に分ける。
   - 比較は、結論、選択肢、判断理由、注意点に分ける。
   - 調査メモや記事は、結論、根拠、次のアクションに分ける。
3. 図解方針を決める。カード、表、流れ、グラフのどれかで、最低1つは視覚化する(下の「ブロックの選び方」)。
4. specを `~/.cache/visual-html/{slug}.json` に書く(ディレクトリがなければ作る)。書式の見本は `assets/example-spec.json`。保存先をスキルのディレクトリにしないのは、プラグインの更新でスキルのディレクトリが置き換わり、生成物が消えるため。呼び出し元リポジトリ直下にも置かない。
5. 1コマンドでHTMLにして開く。

   ```bash
   python3 <skill-dir>/scripts/build_html.py ~/.cache/visual-html/{slug}.json ~/.cache/visual-html/{slug}.html --open
   ```

   `--open` は、macOSでは `open`、WSLでは `explorer.exe`、その他のLinuxでは `xdg-open` を呼ぶ。

   入力がMarkdownファイルのときは `--source <原文.md>` を付ける。付けると次の2つをスクリプトが行う。
   - specに `title` と `source_url` がなければ、原文のfrontmatter(`title`、`source`、`url` など)から補う。AIが写し間違えないようにするため。
   - specに書いた数値と `` `識別子` `` のうち、原文にないものを `warning:` に出す。写し間違いに気づくため。集計して作った値も出るので、原文と見比べて判断する。

   原文は `raw_markdown` ブロックで添付する。AIが書き写すと誤記が入るため、`path` にファイルを指定してスクリプトに読ませる。frontmatterは原文表示から除かれる。`raw_markdown` は折りたたみ表示を自前で持つので、`details` で包まない(`details` は `text` だけを取り、`blocks` を入れられない)。

   specの形式が多少ずれていても、スクリプトは停止せず補正してHTMLを出力する(表の列数の不一致、数値の誤り、未対応の種別など)。補正した内容は標準エラー出力の `warning:` に出る。形式が合っているかをユーザーに確認しない。スクリプトが停止してエラーになるのはJSONとして読めない場合だけで、その場合はJSONの構文を直して再実行する。

6. `warning:` が出たときだけ、内容がずれていないかを見て、必要ならspecを直して再実行する。`warning:` がなければ、次の手順へ進む。
7. HTMLのパスをコードブロックで返す。返答は短くする。

   ~~~text
   作成しました。

   ```text
   /Users/<user>/.cache/visual-html/{slug}.html
   ```
   ~~~

## 見た目の確認

出力は機械的に生成されるので、確認は最小にする。次のどちらかに当てはまるときだけ、`agent-browser` で幅1280pxのスクリーンショットを1枚撮って見る。

- 手書きのSVGを使う `figure` ブロックを入れたとき
- `warning:` を直した後に、見た目が変わったか不安なとき

```bash
agent-browser open file://$HOME/.cache/visual-html/{slug}.html
agent-browser set viewport 1280 800
agent-browser screenshot --full ~/.cache/visual-html/{slug}.png
```

スマホ幅の確認はしない。崩れが見つかったら、生成したHTMLを手で直さず、specか `assets/dads.css`、`scripts/build_html.py` を直す。

## specの書き方

トップレベルのキー:

| キー | 必須 | 内容 |
| --- | --- | --- |
| `title` | 必須 | 資料の題名 |
| `sections` | 必須 | `heading` と `blocks` を持つセクションの配列 |
| `lead` | 任意 | 1〜2文の要約 |
| `eyebrow` | 任意 | 題名の上に出す資料の種類(「比較メモ」など) |
| `organization`, `meta` | 任意 | ヘッダーの左(組織名や資料種別)と右(日付やバージョン) |
| `meta_list` | 任意 | `[["対象", "…"], ["読者", "…"]]` の組。題名の下に並ぶ |
| `toc` | 任意 | 目次の有無。省略するとセクションが5つ以上のときだけ出る |
| `source_url` | 任意 | 出典URL。あるときだけフッターに出る |
| `lang` | 任意 | 既定は `ja`。英語入力なら `en` |

文字列中では `` `コード` `` と `**強調**` が使える。それ以外のHTMLタグは文字として表示される(実行されない)。

## ブロックの選び方

内容を読んで、最も理解が早くなる表現を選ぶ。

| 内容 | ブロック `type` |
| --- | --- |
| 結論、重要な判断 | `summary`(`items` に文の配列) |
| 結論、重要数値、選択肢、ステータス | `cards`(`label` `value` `unit` `tag` `note` `emphasis`) |
| 比較、API、要件、データ項目 | `table`(`headers` `rows`、数値列は `num_columns`、先頭列を見出しにするなら `row_headers`) |
| 手順、業務フロー、タイムライン、進捗 | `flow`(`items` に `label` `title` `text`。進捗は `state`、現在地は `current: true`、横並びは `orientation: "horizontal"`) |
| 数値の大小比較 | `bars`(`items` に `label` `value` `display`、基準を下回るものは `tone: "low"`) |
| リスク、未決事項、前提、注意 | `banner`(`kind` は `success` `warning` `error` `info`) |
| 段落 | `text`(注記は `note: true`) |
| 項目の列挙、手順の列挙 | `list`(`items` に文字列、または `text` と入れ子の `items`。番号付きは `ordered: true`) |
| 用語と説明、項目名と値のペア | `description_list`(`items` に `term` と `text`) |
| 原文や発言の引用 | `quote`(`text` に文字列または配列、出典は `source`) |
| 主題の区切り | `divider` |
| 参考資料、成果物、関連ドキュメントの一覧 | `resources`(`items` に `title` `url` `tag` `text` `sub`。`style` は `list` か `frame`) |
| 補足の折りたたみ(1件) | `details` |
| 同種の項目が並ぶ折りたたみ(FAQ、案ごとの詳細) | `accordion`(`items` に `title` と、`text` または `blocks`。最初から開くなら `open: true`) |
| 入力Markdownの原文 | `raw_markdown`(`path`) |
| 上のどれでも表せない構成図 | `figure`(`html` にinline SVG、`title` `caption`) |

`flow` の `state` は `completed`(完了)、`reached`(到達済み)、`editing`(編集中)、`error`(エラー)、`skipped`(スキップ)のいずれかで、番号の下に文字でも表示される。進捗のない単なる手順には付けない。

表のセルなど文字列の中にラベルを置くときは `[[kind|文字]]` と書く(`kind` は `success` `info` `warning` `error` `gray`)。`gray` は「未着手」「対象外」のように良し悪しを伴わない状態に使う。`cards` の `tag.kind` と `resources` の `tag.kind` も同じ値を取る。

`resources` の `url` は `http(s)` かページ内リンクだけがリンクになる。それ以外はリンクにせず `warning:` を出す。

`figure` の `html` は、AIが書いたSVGをそのまま入れる口になっている。`flow`、`cards`、`bars`、`table` で表せる内容は、これらのブロックを使う。表せない構成図だけ `figure` にする。ユーザーの入力文字列をここへ入れない。色と文字の大きさは `references/dads-design.md` の「手書きSVG」に従い、`<title>` と `<desc>` を付ける。

迷ったら `references/html-patterns.md` を読む。

## 表現の方針

MarkdownをそのままHTMLタグに置き換えただけのものにしない。読む人が短時間で全体像を掴める形にする。

- 冒頭に題名、要約、結論を置く。
- 重要な数値、判断、ステータスはカードや表で見せる。
- 比較は並んだカードか比較表にする。推奨案だけ `emphasis: true` にする。
- 色や記号だけで意味を伝えず、`tag` の文字や `banner` の見出しで「注意」「未確認」と書く。
- 絵文字を使わない。ユーザーが明示的に求めた場合のみ可。
- 入力が日本語なら日本語で出す。英語入力なら英語で出す。
- APIパス、フィールド名、コマンド、ID、エラーコード、MUST/SHOULDなどは正確に残す。識別子は `` `…` `` で書く。
- 推測した内容は「推測」「前提」「未確認」と分かるように書く。
- 空のセクションは作らない。

## デザイン

デジタル庁デザインシステムの色、文字、余白、コンポーネントを使う。具体的な値と規則は `references/dads-design.md`、実装は `assets/dads.css`。

`assets/dads.css` を変えると全ての出力に反映される。見た目を直したいときは、生成したHTMLを手で直さず、`dads.css` かスクリプトを直す。

## HTMLの最低条件

- `<!DOCTYPE html>` から始まる完全なHTMLにする(スクリプトが満たす)。
- 外部CDN、Webフォント、画像に依存しない。スクリプトはCSSをHTML内に埋め込む。外部CDNを使わないため、Mermaidも使わない。

## 完了前チェック

- HTMLを `~/.cache/visual-html/` に保存したか(呼び出し元リポジトリ直下やスキルのディレクトリに保存していないか)。
- 結論が冒頭で分かるか。
- 図解や表が少なくとも1つあり、本文より理解しやすくなっているか。
- ステータスや重要度が、色だけでなく文字でも示されているか。
- 仕様やコード識別子を勝手に変えていないか。秘密情報を書いていないか。
- `--source` を付けたとき、原文にない数値や識別子の `warning:` を確認したか。
- フッターの出典は、入力のfrontmatterにURLがあるときだけ `source_url` に書く。URLがなければ `source_url` を書かない。
