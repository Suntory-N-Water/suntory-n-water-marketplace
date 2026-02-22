# 要素アクション

要素アクションメソッドとその動作の詳細ガイド。

## クリック操作

### 基本クリック

```typescript
// 標準クリック
await page.getByRole('button', { name: 'Submit' }).click();

// オプション付き
await page.getByRole('button').click({
  timeout: 5 * 1000,           // カスタムタイムアウト
  force: false,            // アクション可能性チェックをスキップ(非推奨)
  noWaitAfter: false,      // クリック後のナビゲーションを待機
  trial: false,            // ドライラン - クリックせずにチェックのみ
  clickCount: 1,           // クリック回数
  delay: 0,                // mousedown と mouseup の間の遅延
  button: 'left',          // 'left'、'right'、'middle'
  modifiers: [],           // ['Alt', 'Control', 'Meta', 'Shift']
  position: undefined      // { x: number, y: number }
});
```

### クリックのバリエーション

```typescript
// ダブルクリック
await page.getByText('Item').dblclick();

// 右クリック(コンテキストメニュー)
await page.getByText('File').click({ button: 'right' });

// 中ボタンクリック
await page.getByRole('link').click({ button: 'middle' });

// 修飾キー付きクリック
await page.getByText('Item').click({ modifiers: ['Shift'] });
await page.getByText('Link').click({ modifiers: ['ControlOrMeta'] }); // Windows/LinuxはCtrl、MacはCmd

// 特定位置でクリック(要素からの相対座標)
await page.getByRole('canvas').click({ position: { x: 100, y: 200 } });
```

### クリックのアクション可能性チェック

クリック前にPlaywrightが検証する内容:

1. **表示 (Visible)**: 要素にバウンディングボックスがあり、`visibility: hidden` でない
2. **安定 (Stable)**: 2フレーム連続で要素の位置が変化しない
3. **イベント受信 (Receives Events)**: 他の要素に隠れていない
4. **有効 (Enabled)**: `disabled` 属性がない

```typescript
// ✅ これらのチェックはすべて自動的に実行される
await page.getByRole('button').click();

// ⚠️ 強制クリック(チェックをスキップ - ほとんど不要)
await page.getByRole('button').click({ force: true });
```

### force: true を使う場合

`force: true` を使用するのは以下の場合のみ:
- 要素が意図的に隠れているがクリック可能な場合
- オーバーレイや複雑なUI状態をテストする場合
- 安全チェックのバイパスリスクを理解している場合

```typescript
// ⚠️ 例: オーバーレイの背後にある要素をクリック(まれなケース)
await page.locator('.hidden-button').click({ force: true });
```

## テキスト入力操作

### fill() - 標準テキスト入力

ほとんどのテキスト入力シナリオに推奨。

```typescript
// 基本的な使い方
await page.getByLabel('Email').fill('user@example.com');

// オプション付き
await page.getByLabel('Email').fill('user@example.com', {
  timeout: 5 * 1000,
  noWaitAfter: false,
  force: false
});
```

**fill() の動作:**
1. 要素にフォーカスを当てる
2. 既存の内容をクリア
3. 新しい内容を入力
4. `input` イベントを発火

**アクション可能性チェック:**
- 表示
- 有効
- 編集可(`readonly` でない)

**対応要素:**
- `<input>`(type=file 以外)
- `<textarea>`
- `[contenteditable]` 要素

### pressSequentially() - 1文字ずつ入力

個別のキーイベントが必要な場合のみ使用。

```typescript
// 遅延付きで1文字ずつタイプ
await page.locator('input').pressSequentially('Hello World', { delay: 100 });

// 使用ケース:
// - keydownイベントが必要なオートコンプリートフィールド
// - 文字単位でのバリデーションが必要なフィールド
// - ゆっくりとしたタイピングのシミュレーション
```

### type() - 非推奨、fill() または pressSequentially() を使用

```typescript
// ❌ 非推奨
await page.locator('input').type('text');

// ✅ fill() を使用
await page.getByLabel('Username').fill('text');

// ✅ またはキーイベントが必要な場合は pressSequentially() を使用
await page.getByLabel('Search').pressSequentially('text', { delay: 100 });
```

### clear() - 入力フィールドをクリア

```typescript
// 内容をクリア
await page.getByLabel('Email').clear();

// fill() は自動的に最初にクリアする
await page.getByLabel('Email').fill('new@example.com'); // クリアしてから入力
```

## チェックボックスとラジオボタンの操作

### check() と uncheck()

```typescript
// チェックボックスをチェック
await page.getByLabel('I agree').check();

// チェックを外す
await page.getByLabel('Subscribe').uncheck();

// ラジオボタン(checkを使用)
await page.getByLabel('Option A').check();

// オプション付き
await page.getByLabel('I agree').check({
  timeout: 5 * 1000,
  force: false,
  noWaitAfter: false,
  trial: false,
  position: undefined
});
```

**アクション可能性チェック:**
- 表示
- 安定
- イベント受信
- 有効

**対応要素:**
- `<input type="checkbox">`
- `<input type="radio">`
- `[role="checkbox"]`
- `[role="radio"]`

### setChecked() - 特定の状態を確定させる

```typescript
// チェック状態にする(冪等性あり)
await page.getByLabel('Remember me').setChecked(true);

// チェックなし状態にする(冪等性あり)
await page.getByLabel('Remember me').setChecked(false);

// 現在の状態が不明な場合に便利
const shouldCheck = userPreference === 'remember';
await page.getByLabel('Remember me').setChecked(shouldCheck);
```

## セレクト操作

### selectOption() - ドロップダウン選択

```typescript
// ラベル(表示テキスト)で選択
await page.getByLabel('Country').selectOption({ label: 'Japan' });

// value属性で選択
await page.getByLabel('Country').selectOption({ value: 'jp' });

// インデックスで選択(0始まり)
await page.getByLabel('Country').selectOption({ index: 1 });

// 複数オプションを選択
await page.locator('select[multiple]').selectOption(['option1', 'option2']);

// 要素ハンドルで選択
const option = await page.locator('option').nth(2).elementHandle();
await page.locator('select').selectOption(option);
```

**アクション可能性チェック:**
- 表示
- 有効

**対応要素:**
- `<select>` 要素のみ
- カスタムドロップダウンには click() とフィルター操作を使用

### カスタムドロップダウン(`<select>` 以外)

```typescript
// ドロップダウンを開く
await page.getByRole('button', { name: 'Select country' }).click();

// オプションを選択
await page.getByRole('option', { name: 'Japan' }).click();

// またはlistboxロールを使用
await page.getByRole('listbox').getByText('Japan').click();
```

## ホバー操作

### hover() - マウスオーバー

```typescript
// 基本ホバー
await page.getByRole('button', { name: 'Menu' }).hover();

// オプション付き
await page.getByRole('button').hover({
  timeout: 5 * 1000,
  force: false,
  noWaitAfter: false,
  trial: false,
  position: { x: 10, y: 10 },
  modifiers: ['Shift']
});
```

**アクション可能性チェック:**
- 表示
- 安定
- イベント受信

**使用ケース:**
- ツールチップを表示する
- ドロップダウンメニューを表示する
- クリック前にホバーエフェクトをトリガーする

## フォーカス操作

```typescript
// フォーカスをセット
await page.getByLabel('Username').focus();

// フォーカスを外す(blur)
await page.getByLabel('Username').blur();

// フォーカスして入力
await page.getByLabel('Username').focus();
await page.keyboard.type('john');
```

## キーボード操作

### press() - 単一キー入力

```typescript
// 単一キーを押す
await page.getByLabel('Search').press('Enter');
await page.press('body', 'Control+S'); // 保存ショートカット

// よく使うキー:
// 'Enter', 'Escape', 'Tab', 'Backspace', 'Delete'
// 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
// 'Home', 'End', 'PageUp', 'PageDown'
// 'F1' ～ 'F12'

// 修飾キー付き:
await page.press('body', 'Control+A'); // 全選択
await page.press('body', 'Meta+C');    // Macでコピー
await page.press('body', 'Shift+Tab'); // 逆方向タブ
```

### キーボードナビゲーション

```typescript
// キーボードでナビゲート
await page.keyboard.press('Tab');         // 次のフィールド
await page.keyboard.press('Shift+Tab');   // 前のフィールド
await page.keyboard.press('Enter');       // 送信
await page.keyboard.press('Escape');      // ダイアログを閉じる

// リスト/ドロップダウンの矢印キー
await page.keyboard.press('ArrowDown');
await page.keyboard.press('ArrowUp');
```

## ドラッグアンドドロップ

```typescript
// ドラッグアンドドロップ
await page.getByRole('listitem', { name: 'Item 1' }).dragTo(
  page.getByRole('listitem', { name: 'Item 3' })
);

// 座標付き
await page.locator('.draggable').dragTo(page.locator('.drop-zone'), {
  sourcePosition: { x: 0, y: 0 },
  targetPosition: { x: 100, y: 100 }
});
```

## ファイルアップロード

```typescript
// 単一ファイルをアップロード
await page.getByLabel('Upload file').setInputFiles('path/to/file.pdf');

// 複数ファイルをアップロード
await page.getByLabel('Upload files').setInputFiles([
  'file1.pdf',
  'file2.pdf'
]);

// ファイル入力をクリア
await page.getByLabel('Upload file').setInputFiles([]);

// バッファからアップロード
await page.getByLabel('Upload file').setInputFiles({
  name: 'file.txt',
  mimeType: 'text/plain',
  buffer: Buffer.from('file content')
});
```

## スクロール操作

```typescript
// 要素をビューにスクロール(アクション前に自動実行される)
await page.getByRole('button').scrollIntoViewIfNeeded();

// ピクセル単位でスクロール
await page.evaluate(() => window.scrollBy(0, 100));

// ページ最下部にスクロール
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

// 特定の要素をスクロール
await page.locator('.scrollable').evaluate(el => el.scrollTop = 100);
```

## スクリーンショット

```typescript
// 特定の要素のスクリーンショット
await page.getByRole('dialog').screenshot({ path: 'dialog.png' });

// オプション付き
await page.locator('.component').screenshot({
  path: 'component.png',
  type: 'png',          // 'png' または 'jpeg'
  quality: 80,          // JPEGのみ
  omitBackground: true, // 透明背景
  animations: 'disabled' // 'disabled' または 'allow'
});
```

## アクション可能性参照テーブル

| アクション      | 表示 | 安定 | イベント受信 | 有効 | 編集可 |
| --------------- | ---- | ---- | ------------ | ---- | ------ |
| click()         | ✓    | ✓    | ✓            | ✓    | -      |
| dblclick()      | ✓    | ✓    | ✓            | ✓    | -      |
| fill()          | ✓    | -    | -            | ✓    | ✓      |
| clear()         | ✓    | -    | -            | ✓    | ✓      |
| check()         | ✓    | ✓    | ✓            | ✓    | -      |
| uncheck()       | ✓    | ✓    | ✓            | ✓    | -      |
| selectOption()  | ✓    | -    | -            | ✓    | -      |
| hover()         | ✓    | ✓    | ✓            | -    | -      |
| focus()         | -    | -    | -            | -    | -      |
| press()         | -    | -    | -            | -    | -      |
| setInputFiles() | ✓    | -    | -            | ✓    | -      |

## 公式ドキュメント

- [Actions](https://playwright.dev/docs/input)
- [Actionability](https://playwright.dev/docs/actionability)
- [Keyboard](https://playwright.dev/docs/api/class-keyboard)
