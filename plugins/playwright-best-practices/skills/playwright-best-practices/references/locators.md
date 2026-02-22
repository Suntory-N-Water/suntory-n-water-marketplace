# ロケーター戦略

ロケーター戦略と選択の包括的なガイド。

## ロケーターの優先順位

テストの堅牢性を最大化するため、以下の優先順位でロケーターを選択します。

### 1. ロールベース(最優先)

アクセシビリティとセマンティックな意味に最適。

```typescript
// ✅ ボタン
await page.getByRole('button', { name: 'Submit' });
await page.getByRole('button', { name: /submit/i }); // 大文字小文字を区別しない正規表現

// ✅ リンク
await page.getByRole('link', { name: 'Home' });

// ✅ フォームコントロール
await page.getByRole('textbox', { name: 'Username' });
await page.getByRole('checkbox', { name: 'Remember me' });
await page.getByRole('radio', { name: 'Option A' });

// ✅ 見出し
await page.getByRole('heading', { name: 'Welcome' });
await page.getByRole('heading', { level: 1 }); // <h1>

// ✅ リスト
await page.getByRole('listitem').filter({ hasText: 'Item 2' });
```

**一般的なロール:**
- `button`、`link`、`textbox`、`checkbox`、`radio`、`combobox`
- `heading`、`listitem`、`row`、`cell`、`tab`、`dialog`
- [ARIAロール参照](https://www.w3.org/TR/wai-aria-1.2/#role_definitions) を参照

### 2. ラベルベース(フォーム要素)

関連するラベルがあるフォーム入力に最適。

```typescript
// ✅ 入力フィールド
await page.getByLabel('Email address');
await page.getByLabel('Password');
await page.getByLabel(/username/i); // 大文字小文字を区別しない

// ✅ チェックボックス
await page.getByLabel('I agree to terms');

// ✅ セレクト
await page.getByLabel('Country');
```

**仕組み:** `<label for="id">`、ラッピングラベル、または `aria-labelledby` でマッチします。

### 3. プレースホルダーベース

表示ラベルがない入力に使用。

```typescript
// ✅ ラベルが表示されていない場合
await page.getByPlaceholder('name@example.com');
await page.getByPlaceholder('Search...');
```

### 4. テキストベース

表示テキストを持つ要素に使用。

```typescript
// ✅ 完全一致
await page.getByText('Submit');

// ✅ 部分一致
await page.getByText('Sub', { exact: false });

// ✅ 正規表現マッチ
await page.getByText(/submit/i);

// ✅ 要素タイプ付き
await page.locator('button', { hasText: 'Submit' });
```

### 5. alt テキスト(画像)

画像やエリア要素に使用。

```typescript
// ✅ 画像
await page.getByAltText('Company logo');
await page.getByAltText(/logo/i);
```

### 6. title 属性

title属性を持つ要素に使用。

```typescript
// ✅ ツールチップやタイトル
await page.getByTitle('Close dialog');
```

### 7. テストID(data-testid)

テスト専用の安定した属性に使用。

```typescript
// ✅ カスタムテストID
await page.getByTestId('submit-button');
await page.getByTestId('user-profile');

// playwright.config.ts でカスタム属性を設定
use: {
  testIdAttribute: 'data-test-id' // または 'data-qa' など
}
```

**使いどき:** セマンティック属性が使えない場合や頻繁に変わる場合。

### 8. CSS/XPath(最終手段)

他の手段が使えない場合のみ。

```typescript
// ⚠️ DOM変更に弱い
await page.locator('.btn-primary');
await page.locator('#submit-button');
await page.locator('div.container > button:nth-child(2)');

// ⚠️ XPath
await page.locator('xpath=//button[@class="submit"]');
```

**デメリット:**
- CSSクラスが変わると壊れる
- DOM構造が変わると壊れる
- 可読性が低い
- ユーザーの認識を反映しない

## フィルタリングとチェーン

ロケーターを組み合わせて選択を絞り込む:

```typescript
// ✅ テキストでフィルター
const product = page.getByRole('listitem')
  .filter({ hasText: 'Product 2' });
await product.getByRole('button', { name: 'Add to cart' }).click();

// ✅ 別のロケーターでフィルター
const row = page.getByRole('row')
  .filter({ has: page.getByRole('cell', { name: 'Alice' }) });
await row.getByRole('button', { name: 'Edit' }).click();

// ✅ 複数フィルター
const item = page.getByRole('listitem')
  .filter({ hasText: 'Product' })
  .filter({ has: page.locator('.in-stock') });
```

## 親子関係でのロケート

```typescript
// ✅ 親を見つけてから子を操作
const form = page.locator('form.login');
await form.getByLabel('Username').fill('john');
await form.getByLabel('Password').fill('secret');
await form.getByRole('button', { name: 'Submit' }).click();

// ✅ 特定のリストアイテムを見つける
const products = page.locator('ul.products');
await products.getByText('Product 2').click();

// ✅ スコープを絞った操作
const dialog = page.locator('dialog.confirmation');
await dialog.getByRole('button', { name: 'Confirm' }).click();
```

## 複数要素の操作

```typescript
// 要素数をカウント
const count = await page.getByRole('listitem').count();

// すべての要素を取得(明示的な待機が必要)
await page.getByRole('listitem').first().waitFor();
const items = await page.getByRole('listitem').all();
for (const item of items) {
  console.log(await item.textContent());
}

// インデックスでアクセス
await page.getByRole('listitem').nth(2).click(); // 3番目(0始まり)
await page.getByRole('listitem').first().click();
await page.getByRole('listitem').last().click();

// フィルターして反復
const products = await page.getByRole('listitem')
  .filter({ hasText: 'On sale' })
  .all();
```

## フレームと iframe

```typescript
// ✅ フレームロケーター
const frame = page.frameLocator('iframe#payment');
await frame.getByLabel('Card number').fill('4242424242424242');
await frame.getByRole('button', { name: 'Pay' }).click();

// フレームのロード待機
await frame.locator('body').waitFor();

// ネストしたフレーム
const outerFrame = page.frameLocator('iframe#outer');
const innerFrame = outerFrame.frameLocator('iframe#inner');
await innerFrame.getByRole('button').click();
```

## Shadow DOM

```typescript
// ✅ Shadow DOMを透過する(デフォルトで有効)
await page.locator('my-component').getByRole('button').click();

// ✅ 明示的なシャドウルート
await page.locator('my-component')
  .locator('css=button') // 自動的にShadowを透過
  .click();
```

## 動的ロケーター

データに基づいて動的にロケーターを構築する:

```typescript
// ✅ 動的なロール名
async function clickButton(name: string) {
  await page.getByRole('button', { name }).click();
}

// ✅ 動的なセレクター
async function fillField(label: string, value: string) {
  await page.getByLabel(label).fill(value);
}

// ✅ 条件付き
const selector = condition === 'A' ? '#element-a' : '#element-b';
await page.locator(selector).click();
```

## ベストプラクティスまとめ

### すべきこと:
- ✅ role、label、text などユーザー向け属性を使用する
- ✅ できる限り `getByRole()` を使用する
- ✅ フォームフィールドには `getByLabel()` を使用する
- ✅ 精度を上げるためフィルターとチェーンを活用する
- ✅ セマンティックロケーターが安定しない場合は `getByTestId()` を使用する

### すべきでないこと:
- ❌ CSSクラスを主なロケーター戦略として使用する
- ❌ 複雑なXPath式を使用する
- ❌ 必要でない限り nth-child を使用する
- ❌ 避けられる場合にインデックスをハードコードする
- ❌ DOM構造(親/兄弟要素の関係)に依存する

## 例: CSSからセマンティックロケーターへの変換

```typescript
// ❌ CSSベース(壊れやすい)
await page.locator('.btn-primary').click();
await page.locator('#username-input').fill('john');
await page.locator('div.container > form > input:nth-child(2)').fill('secret');

// ✅ セマンティック(堅牢)
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByLabel('Username').fill('john');
await page.getByLabel('Password').fill('secret');
```

```typescript
// ❌ 複雑なCSS(メンテナンスが困難)
await page.locator('ul.products li:nth-child(2) button.add-to-cart').click();

// ✅ セマンティックチェーン(意図が明確)
const product = page.getByRole('listitem').filter({ hasText: 'Product 2' });
await product.getByRole('button', { name: 'Add to cart' }).click();
```

## 公式ドキュメント

- [Locators](https://playwright.dev/docs/locators)
- [Best Practices](https://playwright.dev/docs/best-practices#use-locators)
- [ARIA Roles](https://www.w3.org/TR/wai-aria-1.2/#role_definitions)
