# deprecated

使うのをやめたスキルの置き場。履歴と記述を残したいだけなので、削除せずここへ移す。

無効化のされ方は Claude Code と Codex で違う。

- Claude Code は `skills/` 直下の 1 階層しか見ないので、1 つ深いここへ移すだけで読み込まれなくなる
- Codex は `skills/` 配下を再帰的に探すため、移すだけでは読み込まれたままになる。`.codex-plugin/plugin.json` の `skills` をディレクトリ指定から有効なスキルの明示列挙へ変えてある

したがってスキルをここへ移すときは、`.codex-plugin/plugin.json` の `skills` 配列からも外す。戻すときは `skills/` 直下へ移して配列へ加え、バージョンを上げる。

## 一覧

| スキル | やめた理由 | 後継 |
| --- | --- | --- |
| `style-rule-add` | `~/.claude/scripts/typescript/style-rules/` の自作正規表現エンジンに依存していた。参照している `word-check.ts` は既に存在しない | `ai-words-add`（textlint の `preset-ai-words-ja` 辞書へ登録する） |
