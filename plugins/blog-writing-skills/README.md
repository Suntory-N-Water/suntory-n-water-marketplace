# blog-writing-skills

ブログ・技術記事を書くためのスキル集。執筆前の構成設計から初稿、推敲、日本語規範の点検までを 5 つのスキルに分けている。

## インストール

```bash
/plugin install blog-writing-skills@suntory-n-water-marketplace
```

## 収録スキル

| スキル | 役割 |
| --- | --- |
| `blog-prewriting` | テーマ探索、伝えたいメッセージと想定読者の整理、構成設計・構成レビュー |
| `blog-drafting` | 構成案からの初稿執筆と文体寄せ。AI っぽさの除去 |
| `blog-revision` | アテンションライティングと日本語作文技術の 2 軸での推敲・本文生成 |
| `japanese-tech-writing` | 日本語技術文書の文章規範による点検 |
| `cognitive-rhythm-writing` | 説明的な文章に認知モードの切替(緩急)を設計する |

## 使い分け

執筆フェーズで選ぶ。

```
テーマが曖昧 / 構成を決めたい   → blog-prewriting
構成案から本文を書く            → blog-drafting
草稿を読まれる文章に直す        → blog-revision
日本語の読みやすさを点検する    → japanese-tech-writing
密度はあるが平坦な文章を直す    → cognitive-rhythm-writing
```

各スキルは相互に参照し合う。`cognitive-rhythm-writing` は `japanese-tech-writing` を併用し、`blog-revision` は構成設計の詳細を `blog-prewriting` に委ねる。
