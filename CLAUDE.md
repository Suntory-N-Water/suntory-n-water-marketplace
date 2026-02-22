## リポジトリ概要

自分専用のClaude Codeプラグインマーケットプレイス。Claude Codeの `/plugin` コマンドから利用できるカスタムプラグイン群を管理するリポジトリ。

### マーケットプレイス構成

- `.claude-plugin/marketplace.json` - マーケットプレイスのプラグインレジストリ(全プラグインのエントリを管理)
- `.claude-plugin/plugin.json` - マーケットプレイス自体のメタデータ

### プラグイン構成

各プラグインは `plugins/<plugin-name>/` に配置される。共通構造:

```
plugins/<plugin-name>/
├── .claude-plugin/plugin.json   # プラグインメタデータ(必須)
└── skills/<skill-name>/
    ├── SKILL.md                 # スキル定義(メイン)
    └── references/              # 参照ドキュメント群
```

### 現在のプラグイン一覧

`.claude-plugin/marketplace.json` の `plugins` 配列に記載されたプラグインが利用可能

## スクリプト

- `bun run check` - Biome によるリント・フォーマット (`--write`)
- `bun run check:fix` - Biome による自動修正 (`--fix`)
- `bun run version-bump <plugin-name> <major|minor|patch>` - プラグインのバージョンバンプ

## プラグイン追加手順

1. `plugins/<plugin-name>/` ディレクトリを作成
2. `.claude-plugin/plugin.json` にメタデータを記述
3. `skills/<skill-name>/SKILL.md` にスキル定義を記述
4. `.claude-plugin/marketplace.json` の `plugins` 配列にエントリを追加
5. コミット・push
