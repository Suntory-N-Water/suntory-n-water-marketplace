# Claude Code / Codex Marketplace

自分専用の Claude Code / Codex プラグインマーケットプレイス。

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

```bash
/plugin marketplace add Suntory-N-Water/suntory-n-water-marketplace
```

### 3. プラグインをインストール

Claude Code 内で `/plugin install` を実行(例: ブログ・技術記事の執筆プラグイン):

```bash
# ブログ・技術記事の執筆
/plugin install blog-writing-skills@suntory-n-water-marketplace
```

## Codex で利用

Codex 用のリポジトリマーケットプレイスを登録し、利用するプラグインをインストールする。

```bash
cd suntory-n-water-marketplace
codex plugin marketplace add .
codex plugin add blog-writing-skills@suntory-n-water-marketplace
```

他のプラグインを利用する場合は、`blog-writing-skills` を
`playwright-best-practices` または `general-dev-skills` に置き換える。
インストール後は新しい Codex セッションを開始する。

## プラグインの追加方法

### 1. プラグインディレクトリを作成

```
plugins/
└── my-plugin/
    ├── .claude-plugin/
    │   └── plugin.json      # 必須: プラグインメタデータ
    ├── .codex-plugin/
    │   └── plugin.json      # 必須: Codex プラグインメタデータ
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

Claude Code 用のマーケットプレイスは `.claude-plugin/marketplace.json`、Codex 用の
リポジトリマーケットプレイスは `.agents/plugins/marketplace.json` で管理する。
両方の `plugin.json` から同じ `skills/` を参照する。

### 2. plugin.json を作成

Claude Code 用と Codex 用の両方の `plugin.json` を作成する。Codex 用では、同梱する
スキルの場所とインストール画面用のメタデータを指定する。

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

Codex 用の `.codex-plugin/plugin.json` には、少なくとも `skills` と `interface` を追加する。

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "プラグインの説明",
  "author": { "name": "作者名" },
  "skills": "./skills/",
  "interface": {
    "displayName": "My Plugin",
    "shortDescription": "プラグインの説明",
    "longDescription": "プラグインの詳細な説明",
    "developerName": "作者名",
    "category": "Development",
    "capabilities": ["Read", "Write"],
    "defaultPrompt": ["このプラグインを使って作業して"]
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

Codex 用は `.agents/plugins/marketplace.json` の `plugins` 配列に、
`source.path` を `./plugins/my-plugin` とするエントリを追加する。

### 4. コミット・push

```bash
git add .
git commit -m "Add my-plugin"
git push
```

## バージョン管理

プラグインのバージョンを semver 形式でバンプするスクリプトを用意している。

```bash
bun run version-bump <plugin-name> <major|minor|patch>
```

### 例

```bash
# パッチ: 1.0.0 -> 1.0.1
bun run version-bump playwright-best-practices patch

# マイナー: 1.0.0 -> 1.1.0
bun run version-bump blog-writing-skills minor

# メジャー: 1.0.0 -> 2.0.0
bun run version-bump general-dev-skills major
```
