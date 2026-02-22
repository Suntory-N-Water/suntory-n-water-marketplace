---
name: playwright-best-practices
description: WebスクレイピングおよびテストにおけるPlaywright自動化のベストプラクティス。Playwrightコードを記述・レビューするとき、特に要素操作(click、fill、select)、待機戦略(waitForSelector、waitForURL、waitForLoadState)、ナビゲーションパターン、ロケーターの使い方に関して使用する。不安定なテスト・レースコンディションへの対処、またはwaitForNavigationやnetworkidleといった非推奨パターンの回避ガイダンスが必要な場合に適用する。
---

# Playwright ベストプラクティス

## 概要

このスキルは、公式ベストプラクティスに基づいて信頼性が高くメンテナブルなPlaywright自動化コードを書くためのガイダンスを提供します。要素操作、待機戦略、ナビゲーションパターン、および避けるべきアンチパターンを網羅します。

## 基本原則

### 1. 自動待機付きロケーターを常に使用する

Playwrightのロケーターは、要素が操作可能になるまで自動的に待機・リトライします。

```typescript
// ✅ 推奨: 自動待機付きロケーター
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByLabel('Username').fill('john');

// ❌ 非推奨: 直接DOM操作
await page.evaluate(() => document.querySelector('button').click());
```

### 2. ユーザー向け属性を優先する

ユーザーがページをどのように認識するかに基づいたロケーターを優先します。

```typescript
// 優先順位:
// 1. ロールベース(アクセシビリティに最適)
await page.getByRole('button', { name: 'Sign in' });

// 2. ラベルベース(フォームに最適)
await page.getByLabel('Email address');

// 3. テキストベース
await page.getByText('Submit');

// 4. テストID
await page.getByTestId('submit-button');

// 5. CSS/XPath(最終手段)
await page.locator('.btn-primary');
```

### 3. 自動待機を信頼し、明示的な待機を最小限にする

ロケーターは操作前に自動的にアクション可能性を確認します。

```typescript
// ✅ 推奨: アクションに待機が含まれる
await page.getByRole('button').click();

// ⚠️ 通常は不要
await page.waitForSelector('button');
await page.locator('button').click();
```

## 一般的なワークフロー

### 要素操作

**クリック:**
```typescript
await page.getByRole('button', { name: 'Next' }).click();
```

**テキスト入力:**
```typescript
await page.getByLabel('Email').fill('user@example.com');
```

**オプション選択:**
```typescript
await page.getByLabel('Country').selectOption({ label: 'Japan' });
```

**チェック/チェック解除:**
```typescript
await page.getByLabel('I agree').check();
```

### ナビゲーションパターン

**同一ページ内ナビゲーション:**
```typescript
// ✅ 推奨: クリック後に次ページの要素を待機
await page.getByRole('link', { name: 'Next' }).click();
await page.waitForSelector('#next-page-element', { timeout: 30 * 1000 }); // 例: 待機時間

// または遷移先ページに応じた条件セレクターを使用
const waitSelector = condition === 'A'
  ? '#page-a-element'
  : '#page-b-element';
await page.waitForSelector(waitSelector, { timeout: 30 * 1000 }); // 例: 待機時間

// またはURLパターンが予測可能な場合はwaitForURLを使用
await page.click('button');
await page.waitForURL('**/next-page');
```

**新しいタブ/ウィンドウ:**
```typescript
const [newPage] = await Promise.all([
  page.context().waitForEvent('page'),
  page.getByRole('link', { name: 'Open in new tab' }).click()
]);
await newPage.waitForLoadState();
```

### フォーム操作

```typescript
// フォームの一連操作
await page.getByLabel('Username').fill('john');
await page.getByLabel('Password').fill('secret');
await page.getByRole('checkbox', { name: 'Remember me' }).check();
await page.getByLabel('Country').selectOption('Japan');
await page.getByRole('button', { name: 'Submit' }).click();

// 送信確認
await expect(page.getByText('Success')).toBeVisible();
```

## 避けるべきアンチパターン

### ❌ waitForNavigation(非推奨)
```typescript
// ❌ 非推奨: 廃止されたAPI
const navigationPromise = page.waitForNavigation();
await page.click('button');
await navigationPromise;

// ✅ 代替: waitForURL または waitForSelector を使用
await page.click('button');
await page.waitForURL('**/next-page');
// または
await page.waitForSelector('#next-page-element');
```

### ❌ networkidle(不安定)
```typescript
// ❌ 非推奨: ページが準備完了する前に終了する可能性がある
await page.waitForLoadState('networkidle');

// ✅ 代替: 特定の要素を待機
await page.waitForSelector('#content-loaded');
// または
await page.waitForLoadState('load');
```

### ❌ page.evaluate() によるクリック
```typescript
// ❌ 非推奨: アクション可能性チェックをバイパスする
await page.evaluate(() => document.querySelector('button').click());

// ✅ 代替: ロケーターのクリックを使用
await page.locator('button').click();
```

### ❌ 不要な Promise.all
```typescript
// ❌ 不要: Playwrightはナビゲーションを自動待機する
await Promise.all([
  page.waitForNavigation(),
  page.click('button')
]);

// ✅ シンプル: クリックするだけ
await page.click('button');
```

## アクション可能性チェック

Playwrightはアクション実行前にこれらの条件を自動的に検証します。

| アクション | 表示 | 安定 | イベント受信 | 有効 | 編集可 |
|--------|---------|--------|----------------|---------|----------|
| click() | ✓ | ✓ | ✓ | ✓ | - |
| fill() | ✓ | - | - | ✓ | ✓ |
| check() | ✓ | ✓ | ✓ | ✓ | - |
| selectOption() | ✓ | - | - | ✓ | - |
| hover() | ✓ | ✓ | ✓ | - | - |

**定義:**
- **表示 (Visible)**: バウンディングボックスがあり、`visibility:hidden` でない
- **安定 (Stable)**: 2フレーム以上同じ位置にある(アニメーション完了)
- **イベント受信 (Receives Events)**: 他の要素に覆われていない
- **有効 (Enabled)**: `disabled` 属性がない
- **編集可 (Editable)**: 有効かつ `readonly` でない

## 明示的な待機が必要な場合

以下のケースでは明示的な待機が必要です。

```typescript
// 1. locator.all() の前(自動待機しない)
await page.getByRole('listitem').first().waitFor();
const items = await page.getByRole('listitem').all();

// 2. 要素が消えるのを待つ
await page.locator('.loading').waitFor({ state: 'hidden' });

// 3. 要素がデタッチされるのを待つ
await page.locator('.modal').waitFor({ state: 'detached' });

// 4. 条件によって遷移先ページが異なる場合
const waitSelector = condition ? '#page-a' : '#page-b';
await page.waitForSelector(waitSelector, { timeout: 30 * 1000 }); // 例: 待機時間
```

## 詳細リファレンス

各トピックの詳細については以下を参照してください。

- **[anti-patterns.md](references/anti-patterns.md)**: 非推奨パターンとその理由の詳細説明
- **[locators.md](references/locators.md)**: ロケーター戦略と選択の包括的なガイド
- **[actions.md](references/actions.md)**: アクションメソッドとその動作の詳細


## 公式ドキュメント

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Actionability](https://playwright.dev/docs/actionability)
- [Locators](https://playwright.dev/docs/locators)
- [Navigations](https://playwright.dev/docs/navigations)
