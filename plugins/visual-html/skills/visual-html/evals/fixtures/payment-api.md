# Payment API 仕様メモ

## 目的

ユーザーが注文の支払いを作成し、決済状態を確認できるようにする。

## エンドポイント

### POST /api/payments

支払いを作成する。`amount`、`currency`、`orderId` は必須。

成功時は `paymentId` と `status` を返す。`status` は `requires_action`、`succeeded`、`failed` のいずれか。

### GET /api/payments/{paymentId}

支払い状態を取得する。存在しない `paymentId` の場合は `404 PAYMENT_NOT_FOUND` を返す。

## 要件

- MUST: `amount` は1以上の整数にする。
- MUST: `currency` は `JPY` のみ対応する。
- SHOULD: 同じ `orderId` の二重作成を防ぐ。
- SHOULD: 外部決済プロバイダー障害時は再試行可能なエラーを返す。

## 未決事項

- 返金APIを初期リリースに含めるか未定。
- Webhook署名の方式が未確定。

## リスク

- 決済プロバイダーの障害で注文状態と支払い状態がずれる可能性がある。
- 二重送信対策が弱いと重複請求につながる。
