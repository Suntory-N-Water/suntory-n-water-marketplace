# HTML図解パターン

HTMLを作る前に、内容を「読ませるもの」ではなく「見て理解できるもの」に分解する。

## まず作るもの

ほとんどの出力で、次の3つを入れると読みやすい。

1. 冒頭の結論
2. 主要ポイントのカード
3. 詳細を整理する表または図

## カード

重要な判断、数値、状態を短く見せる。

```html
<section class="cards" aria-label="主要ポイント">
  <article class="card">
    <div class="label">結論</div>
    <strong>B案を推奨</strong>
    <p>初期構築は重いが、長期運用の負荷が低い。</p>
  </article>
</section>
```

## 比較表

選択肢の違いを伝えるときに使う。長文を詰め込まず、判断軸を列にする。

```html
<table>
  <thead>
    <tr><th>観点</th><th>A案</th><th>B案</th></tr>
  </thead>
  <tbody>
    <tr><th>初期構築</th><td>軽い</td><td>重い</td></tr>
    <tr><th>運用</th><td>重い</td><td>軽い</td></tr>
  </tbody>
</table>
```

## フロー図

手順や状態遷移はinline SVGかHTML/CSSで表す。CDNは使わない。

```html
<figure>
  <svg viewBox="0 0 640 120" role="img" aria-labelledby="flow-title">
    <title id="flow-title">公開までの流れ</title>
    <rect x="20" y="30" width="140" height="56" rx="8"></rect>
    <text x="90" y="64" text-anchor="middle">HTML生成</text>
    <path d="M170 58 H240" marker-end="url(#arrow)"></path>
  </svg>
  <figcaption>公開までの主要ステップ。</figcaption>
</figure>
```

## リスクカード

注意点は本文の段落に埋めず、色付きのカードにする。

```html
<aside class="risk">
  <strong>未確認</strong>
  <p>Accessの許可メールが意図したアカウントだけになっているか確認する。</p>
</aside>
```

## CSSの基本

- `max-width` を設定して読み幅を制限する。
- `.cards` は `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));` を使う。
- 表は `overflow-x: auto` の親要素で包む。
- 色は意味に使う。装飾だけの派手なグラデーションは避ける。

