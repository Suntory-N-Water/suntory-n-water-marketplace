# Claude Code Marketplace

自分専用の Claude Code プラグインマーケットプレイス。

## セットアップ

### 1. GitHub にリポジトリを作成・push

```bash
cd suntory-n-water-marketplace
git init
git add .
git commit -m "Initial marketplace setup"
gh repo create suntory-n-water-marketplace --public --source=. --push
```

### 2. マーケットプレイスを登録

Claude Code 内で以下を実行:

```
/plugin marketplace add Suntory-N-Water/suntory-n-water-marketplace
```

### 3. プラグインをインストール

`/plugin` コマンドからカスタムマーケットプレイスのプラグインをインストール。

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
