# 避けるべきアンチパターン

非推奨パターンとその理由の詳細説明。

## waitForNavigation(非推奨)

### 非推奨の理由

`waitForNavigation()` は以下の理由でPlaywrightにて公式に非推奨とされています。

1. **レースコンディション**: ナビゲーションをトリガーするアクションより前にセットアップする必要がある
2. **複雑な連携**: 適切なタイミングのために Promise.all() が必要
3. **より良い代替手段がある**: `waitForURL()` と自動待機の方が信頼性が高い

### 例

```typescript
// ❌ 非推奨: レースコンディションリスクのある waitForNavigation
const navigationPromise = page.waitForNavigation();
await page.click('button');
await navigationPromise;

// ✅ 代替: waitForURL(推奨される置き換え)
await page.click('button');
await page.waitForURL('**/next-page');

// ✅ または次ページの要素を待機(最も安定)
await page.click('button');
await page.waitForSelector('#next-page-element', { timeout: 30 * 1000 });
```

### 移行方法

`waitForNavigation()` のすべての箇所を以下に置き換える:
- URLパターンが予測可能な場合は `waitForURL()`
- 次ページの固有要素を待つ `waitForSelector()`(最も信頼性が高い)
- ロケーターアクションを使用する場合は自動待機を信頼する

## networkidle(不安定)

### 不安定な理由

`networkidle` はネットワーク活動が500ms間ない状態を待機しますが、以下の問題があります。

1. **誤検知**: ページが準備完了する前に一時的にネットワークが静かになる
2. **予測不能**: ネットワークのタイミングに依存し、ページの状態に依存しない
3. **テストには非推奨**: 公式ドキュメントでもテストでの使用は推奨されていない

### 例

```typescript
// ❌ 不安定: networkidleが早期に完了する可能性がある
await page.waitForLoadState('networkidle', { timeout: 30 * 1000 });

// ✅ 代替: 特定の要素を待機
await page.waitForSelector('#content-loaded', { timeout: 30 * 1000 });

// ✅ または 'load' 状態を使用(より信頼性が高い)
await page.waitForLoadState('load', { timeout: 30 * 1000 });
```

### 実際の問題例

```typescript
// ❌ 問題: 次のページが準備完了する前にナビゲーションが完了する
const currentUrl = page.url();
await page.waitForURL((url) => url.toString() !== currentUrl);
await page.waitForLoadState('networkidle'); // ❌ 早期に終了する可能性がある！

// 次の操作が予測不能に失敗する
await page.locator('select#year').selectOption('2024'); // ❌ 要素が未準備

// ✅ 解決策: 特定の要素を待機
const currentUrl = page.url();
await page.waitForURL((url) => url.toString() !== currentUrl);
await page.waitForSelector('select#year', { timeout: 30 * 1000 }); // ✅ 実際の要素が出るまで待機
await page.locator('select#year').selectOption('2024'); // ✅ 確実に動作する
```

## 要素操作での page.evaluate()

### 避けるべき理由

クリック/インタラクションに `page.evaluate()` を使うと重要な安全チェックがバイパスされます。

1. **自動待機なし**: 要素の存在を待機しない
2. **アクション可能性チェックなし**: 要素がクリック可能か検証しない
3. **オーバーレイを無視**: 要素が隠れていてもクリックする
4. **デバッグ困難**: トレースに適切に記録されない
5. **ユーザー操作を再現しない**: 実際のユーザーインタラクションをシミュレートしない

### バイパスされるアクション可能性チェック

| チェック | Locator.click() | page.evaluate() |
|-------|----------------|-----------------|
| 要素が存在する | ✓ 自動待機 | ❌ なければ例外 |
| 要素が表示されている | ✓ チェックする | ❌ 構わずクリック |
| 要素が安定している | ✓ 待機する | ❌ チェックなし |
| 隠れていない | ✓ チェックする | ❌ 構わずクリック |
| 要素が有効 | ✓ チェックする | ❌ 構わずクリック |

### 例

```typescript
// ❌ 非推奨: 直接DOM操作
await page.evaluate(() => {
  document.querySelector('button').click();
});

// 問題点:
// - ボタンが非表示でもクリックする
// - ボタンが無効でもクリックする
// - ボタンがモーダルに覆われていてもクリックする
// - ボタンがまだ存在しない場合にリトライしない

// ✅ 代替: 自動待機付きロケーター
await page.locator('button').click();

// メリット:
// - ボタンが存在するまで待機
// - ボタンが表示されているか検証
// - ボタンが有効か検証
// - ボタンが隠れていないか検証
// - タイムアウトまで自動リトライ
```

### page.evaluate() が適切な場合

`page.evaluate()` を使用するのは以下の場合のみ:

```typescript
// ✅ 適切: 状態の読み取り
const isChecked = await page.evaluate(() => {
  return document.querySelector('input').checked;
});

// ✅ 適切: 複雑な計算
const totalHeight = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('.item'))
    .reduce((sum, el) => sum + el.offsetHeight, 0);
});

// ❌ 不適切: 要素インタラクション
// ロケーターメソッドを使用すること
```

## ナビゲーションとの不要な Promise.all

### Playwrightで不要な理由

Playwrightのロケーターメソッドはナビゲーションを自動的に待機します。

```typescript
// ❌ 不要: Playwrightはナビゲーションを自動待機する
await Promise.all([
  page.waitForNavigation(),
  page.click('button')
]);

// ✅ シンプル: クリックするだけ(自動待機)
await page.click('button');
```

### Promise.all が必要な場合

自動待機しないイベントにのみ `Promise.all()` を使用:

```typescript
// ✅ 必要: 新しいタブ/ウィンドウは自動待機しない
const [newPage] = await Promise.all([
  page.context().waitForEvent('page'),
  page.click('a[target="_blank"]')
]);

// ✅ 必要: ダイアログ処理
const [dialog] = await Promise.all([
  page.waitForEvent('dialog'),
  page.click('button.delete')
]);
await dialog.accept();

// ✅ 必要: ダウンロード処理
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.click('a.download')
]);
```

## 過剰な waitForSelector

### 多くの場合に不要な理由

ロケーターアクションにはすでに待機が含まれています。

```typescript
// ❌ 冗長: 二重待機
await page.waitForSelector('button');
await page.locator('button').click();

// ✅ 十分: クリックに待機が含まれる
await page.locator('button').click();

// ❌ 冗長: 二重待機
await page.waitForSelector('input');
await page.locator('input').fill('text');

// ✅ 十分: fillに待機が含まれる
await page.locator('input').fill('text');
```

### waitForSelector が必要な場合

`waitForSelector()` を使うのは以下の場合のみ:

```typescript
// ✅ 遷移先ページが条件によって異なる場合
await page.click('.next-button');
const waitSelector = condition === 'A'
  ? '#page-a-element'
  : '#page-b-element';
await page.waitForSelector(waitSelector, { timeout: 30 * 1000 });

// ✅ locator.all() の前(自動待機しない)
await page.locator('.item').first().waitFor();
const items = await page.locator('.item').all();

// ✅ 要素が消えるのを待つ
await page.locator('.loading').waitFor({ state: 'hidden' });
```

## waitForURL と networkidle の組み合わせ

### 問題

この組み合わせにより不安定なテストが生まれます。

```typescript
// ❌ 不安定な組み合わせ
const currentUrl = page.url();
await page.waitForURL((url) => url.toString() !== currentUrl);
await page.waitForLoadState('networkidle'); // ❌ ページ準備完了前に終了する可能性

// 次の操作が予測不能に失敗する
await page.locator('select#year').selectOption('2024'); // ❌ 要素が未準備
```

### 解決策

特定の要素を待機する:

```typescript
// ✅ 安定したアプローチ
await page.click('.next-button');
await page.waitForSelector('select#year', { timeout: 30 * 1000 });

// 要素が確実に準備完了
await page.locator('select#year').selectOption('2024'); // ✅ 確実に動作する
```

## まとめ: 移行ガイド

| 旧パターン | 新パターン | 理由 |
|------------|------------|---------|
| `waitForNavigation()` | `waitForURL()` または `waitForSelector()` | 非推奨、レースコンディション |
| `networkidle` | `waitForSelector()` または `load` | 不安定、早期終了の可能性 |
| `page.evaluate(() => el.click())` | `locator.click()` | 安全チェックをバイパス |
| `Promise.all([waitForNavigation, click])` | `click()` のみ | ナビゲーションを自動待機 |
| `waitForSelector()` + `locator.action()` | `locator.action()` のみ | 冗長な待機 |
