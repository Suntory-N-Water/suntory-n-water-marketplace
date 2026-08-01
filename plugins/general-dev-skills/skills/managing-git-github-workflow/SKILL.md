---
name: managing-git-github-workflow
description: Git操作(add, commit, switch, push)とGitHub CLI(PR作成・編集、Issue作成、コメント取得)を実行。コミット作成、ブランチ管理、プルリクエスト作成・編集、Issue管理が必要な場合に使用。「コミットして」「PRを作成」「Issueを作成」「ブランチを切って」などのリクエストで起動。
allowed-tools: Bash, Read, Grep, Glob
---

# Git & GitHub ワークフロー

## 基本ワークフロー

1. ブランチ作成
2. 変更のコミット
3. リモートへプッシュ
4. PR作成
5. レビュー対応・確認

## コミット規約

日本語で簡潔に。タイプ例: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

```bash
git commit -m "feat: 新機能の概要"
```

詳細なテンプレートは [references/commit-templates.md](references/commit-templates.md) を参照。

## ブランチ作成とコミット

```bash
# mainは保護されているため新ブランチで作業
git switch -c feature-<機能名>

git add .
git commit -m "feat: 変更内容"

# コミット後の確認
git log -1

git push -u origin feature-<機能名>

# プッシュ後の確認
git status
```

## PR作成

HEREDOCで複数行のボディを作成:

```bash
gh pr create --title "feat: 機能追加" --body "$(cat <<'EOF'
## 概要
変更の概要

## 変更内容
- 詳細1
- 詳細2

EOF
)"
```

詳細なPRテンプレートは [references/pr-templates.md](references/pr-templates.md) を参照。

## PR編集・確認

```bash
# PR確認
gh pr view <PR番号>
gh pr view <PR番号> --comments

# ボディ編集
gh pr edit <PR番号> --body "$(cat <<'EOF'
更新内容
EOF
)"

# コメント詳細取得
gh api repos/{owner}/{repo}/pulls/<PR番号>/comments
```

## Issue作成

```bash
gh issue create --title "タイトル" --body "$(cat <<'EOF'
## 問題の説明
詳細

## 再現手順
1. ステップ1
2. ステップ2
EOF
)"
```

詳細なIssueテンプレートは [references/issue-templates.md](references/issue-templates.md) を参照。

## コミットメッセージ・イシュー・プルリクエストの文体ルール

- 過剰な形容詞・感嘆・誇張表現は削除する
- 「〜できます」「〜しましょう」は使わず、「〜する」と断定する
- 推敲済みのライター文体で書く
- 生成と編集を分ける前提で、書いた後に不要な表現を削る
- 強調記号(絵文字・過剰な太字・感嘆符)は使わない
- 情報量より読みやすさを優先する
- 同じ内容を繰り返さない
- 概要から各論へ展開する
- 最初に全体像を一文で示し、その後に詳細を書く
- 要約を繰り返さない
- 「重要なのは〜である」「本章では〜を扱う」「まとめると」「正面から扱う」「不可欠」「核心的」「鍵となる」「包括的」「掘り下げる」「言語化する」「触れる」は使わない
- 悪い例: 「本節では認証フローを正面から扱う。重要なのは整合性である」
- 良い例: 「認証フローを扱う。整合性が崩れる条件を特定する」

## 注意事項

- mainブランチでは直接作業しない(ユーザーから許可がある場合を除く)
- コミットメッセージは日本語
- Co-Authored-By等の作成者情報は不要
- コミットは常に適切な粒度で作成する
  - 1つのコミットに複数の機能を含めない
