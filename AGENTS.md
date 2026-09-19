## リポジトリ概要

自分専用のClaude Code / Codexプラグインマーケットプレイス。Claude Codeの `/plugin` コマンドとCodexのプラグインマーケットプレイスから利用できるカスタムプラグイン群を管理するリポジトリ。

### マーケットプレイス構成

- `.claude-plugin/marketplace.json` - マーケットプレイスのプラグインレジストリ(全プラグインのエントリを管理)
- `.claude-plugin/plugin.json` - マーケットプレイス自体のメタデータ
- `.agents/plugins/marketplace.json` - Codex用のリポジトリマーケットプレイス

### プラグイン構成

各プラグインは `plugins/<plugin-name>/` に配置される。共通構造:

```
plugins/<plugin-name>/
├── .claude-plugin/plugin.json   # プラグインメタデータ(必須)
├── .codex-plugin/plugin.json    # Codex用プラグインメタデータ(必須)
├── skills/<skill-name>/
│   ├── SKILL.md                 # スキル定義(メイン)
│   └── references/              # 参照ドキュメント群
└── skills/deprecated/           # 使うのをやめたスキルの置き場(任意)
    ├── README.md                # やめた理由と後継を記録
    └── <skill-name>/
```

### スキルを廃止する

削除せず `skills/deprecated/<skill-name>/` へ移し、`skills/deprecated/README.md` にやめた理由と後継を書く。Claude Code は `skills/` 直下の 1 階層しか見ないので、移した時点で読み込まれなくなる。

Codex は `skills/` 配下を再帰的に探すため、移すだけでは読み込まれたままになる。`.codex-plugin/plugin.json` の `skills` を `"./skills/"` ではなく有効なスキルの明示列挙にしておき、廃止時にその配列からも外す。

### 現在のプラグイン一覧

`.claude-plugin/marketplace.json` と `.agents/plugins/marketplace.json` の `plugins` 配列に記載されたプラグインが利用可能

## スクリプト

- `bun run check` - Biome によるリント・フォーマット (`--write`)
- `bun run check:fix` - Biome による自動修正 (`--fix`)
- `bun run version-bump <plugin-name> <major|minor|patch>` - プラグインのバージョンバンプ

## プラグイン追加手順

1. `plugins/<plugin-name>/` ディレクトリを作成
2. `.claude-plugin/plugin.json` にメタデータを記述
3. `.codex-plugin/plugin.json` に同じスキルを参照するメタデータを記述。`skills` はディレクトリ指定ではなくスキルごとのパスの配列にする
4. `skills/<skill-name>/SKILL.md` にスキル定義を記述
5. `.claude-plugin/marketplace.json` と `.agents/plugins/marketplace.json` の `plugins` 配列にエントリを追加
6. コミット・push
