# blog-writing-skills

sui-blog の記事を書くためのスキル集。ネタの判定、一次情報の調査と検証を含む初稿の執筆、構成と日本語の推敲、技術的な確認、一文の語順の点検を 5 つのスキルに分けている。分割の軸は執筆の工程ではなく役割で、文章の規範は `write-blog-article/references/sui-style.md` の 1 ファイルに集約してある。

## インストール

```bash
/plugin install blog-writing-skills@suntory-n-water-marketplace
```

## 収録スキル

| スキル | 役割 | 主な成果物 |
| --- | --- | --- |
| `pick-blog-topic` | 溜めた素材や作業の記録から、記事にできるかを判定する | 「今すぐ書く」「材料が足りない」「見送る」の判定。材料が足りない場合は `neta` ラベル付き GitHub Issue |
| `write-blog-article` | 一次情報を調べ、動かして確かめ、記事の初稿を書く | `contents/blog/<YYYY-MM-DD>_<slug>.md` |
| `article-review` | 構成と日本語を読み、指摘を返す | 重大度つきの指摘の一覧 |
| `tech-review` | 技術的な正しさ、証拠、再現できるかを確かめる | 重大度つきの指摘の一覧 |
| `japanese-sentence-order` | 一文の中の語順と読点だけを見る | 対象の文、理由、書き換えた文 |

## 使い分け

```
素材や作業ログがあるが書くか決めていない → pick-blog-topic
記事を書く、下書きを作る                  → write-blog-article
書いた記事の構成と日本語を見る            → article-review
書いた記事のコードと事実を確かめる        → tech-review
一文が読みにくい（ブログ以外でも）        → japanese-sentence-order
```

作業の流れは `pick-blog-topic` → `write-blog-article` → `article-review` / `tech-review` になる。`japanese-sentence-order` はブログ以外の日本語の文章にも使うため、どこからでも単独で起動できる。

編集の観点（構成、日本語、読者が追えるか）と技術の観点（一次情報の裏取り、コードが動くか、バージョンの記載）を同時に見ると片方が雑になるため、`article-review` と `tech-review` を分けている。両方とも規範は `write-blog-article/references/sui-style.md` を、レビュー結果の出力契約は `references/review-report.md` を読む。検証の記録は `examples/<slug>/` に残し、使い捨ての外部リポジトリは証拠を保存した後に削除する。

## 記事の型と検証

記事は 4 つの型（変更への追随、手を動かす解説、調査と比較、意見と経験）に分け、型ごとに導入と見出しの進行が決まる。型 1〜3 では動かして確かめる検証が必須で、検証用のプロジェクトは sui-blog 側の `examples/<slug>/` に作る。無い場合は最小限の環境を作り、workflow、実行 ID、ログの該当部分を検証記録に残す。このディレクトリは Git で管理しないため、sui-blog の `.gitignore` に `examples/` を入れておく。使い捨ての外部リポジトリは、証拠を保存した後に削除する。
