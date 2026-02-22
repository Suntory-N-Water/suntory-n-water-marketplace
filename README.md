# Claude Code Marketplace

自分専用の Claude Code プラグインマーケットプレイス。

## セットアップ

### 1. GitHub にリポジトリを作成・push

```bash
cd claude-code-marketplace
git init
git add .
git commit -m "Initial marketplace setup"
gh repo create claude-code-marketplace --public --source=. --push
```

### 2. マーケットプレイスを登録

`~/.claude/plugins/known_marketplaces.json` に以下を追加:

```json
{
  "claude-code-marketplace": {
    "source": {
      "source": "github",
      "repo": "Suntory-N-Water/claude-code-marketplace"
    }
  }
}
```

### 3. プラグインをインストール

Claude Code を再起動して `/plugin` コマンドを実行し、カスタムマーケットプレイスからプラグインをインストール。

## プラグインの追加方法

### 1. プラグインディレクトリを作成

```
plugins/
└── my-plugin/
    ├── .claude-plugin/
    │   └── plugin.json      # 必須: プラグインメタデータ
    ├── commands/             # スラッシュコマンド (任意)
    │   └── my-command.md
    ├── agents/               # エージェント定義 (任意)
    │   └── my-agent.md
    ├── skills/               # スキル定義 (任意)
    │   └── my-skill/
    │       └── SKILL.md
    ├── hooks/                # フック定義 (任意)
    │   └── hooks.json
    ├── .mcp.json             # MCP サーバー設定 (任意)
    └── README.md
```

### 2. plugin.json を作成

```json
{
  "name": "my-plugin",
  "description": "プラグインの説明",
  "version": "1.0.0",
  "author": {
    "name": "作者名"
  }
}
```

### 3. marketplace.json にエントリを追加

`.claude-plugin/marketplace.json` の `plugins` 配列に追加:

```json
{
  "name": "my-plugin",
  "description": "プラグインの説明",
  "version": "1.0.0",
  "author": { "name": "作者名" },
  "source": "./plugins/my-plugin",
  "category": "development"
}
```

### 4. コミット・push

```bash
git add .
git commit -m "Add my-plugin"
git push
```

## 同梱プラグイン

| プラグイン  | 説明                                 | カテゴリ |
| ----------- | ------------------------------------ | -------- |
| hello-world | マーケットプレイス動作確認用サンプル | utility  |

## カテゴリ一覧

| カテゴリ     | 用途             |
| ------------ | ---------------- |
| development  | 開発支援ツール   |
| deployment   | デプロイ・CI/CD  |
| database     | データベース連携 |
| productivity | 生産性向上       |
| monitoring   | 監視・ロギング   |
| security     | セキュリティ     |
| utility      | ユーティリティ   |
