# blog-writing-skills

ブログ・技術記事を書くためのスキル集。執筆前の思考深化と構成設計から初稿、推敲、日本語規範の点検までを 6 つのスキルに分けている。

## インストール

```bash
/plugin install blog-writing-skills@suntory-n-water-marketplace
```

## 収録スキル

| スキル | 役割 |
| --- | --- |
| `blog-thinking` | 対話でテーマを深掘りし、記事メッセージ・想定読者・切り口を言語化する |
| `blog-structuring` | 言語化済みの素材から構成設計プランを作る。下書きの構成レビュー・再構成 |
| `blog-drafting` | 構成案からの初稿執筆と文体寄せ。AI っぽさの除去 |
| `blog-revision` | アテンションライティングと日本語作文技術の 2 軸での推敲・本文生成 |
| `japanese-tech-writing` | 日本語技術文書の文章規範による点検 |
| `cognitive-rhythm-writing` | 説明的な文章に認知モードの切替(緩急)を設計する |

## 使い分け

執筆フェーズで選ぶ。

```
テーマが曖昧 / Why を深めたい   → blog-thinking
伝えたいことは決まった / 構成へ → blog-structuring
構成案から本文を書く            → blog-drafting
草稿を読まれる文章に直す        → blog-revision
日本語の読みやすさを点検する    → japanese-tech-writing
密度はあるが平坦な文章を直す    → cognitive-rhythm-writing
```

`blog-thinking` と `blog-structuring` は並列の選択肢ではなく直列の関係。`blog-structuring` は冒頭で入力条件(記事メッセージ、想定読者、読者の Before / After、書き手固有の切り口)を検査し、Why が言語化されていなければ `blog-thinking` へ差し戻す。分類を間違えても復帰できるようにしてある。

各スキルは相互に参照し合う。`cognitive-rhythm-writing` は `japanese-tech-writing` を併用し、`blog-revision` は構成設計の詳細を `blog-structuring` に委ねる。
