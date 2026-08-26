---
name: ddd-layering
description: TypeScript の関数主体プロジェクトで、DDD の業務モデルと application/usecase・infrastructure・entry point の責務、依存方向、port/DI の要否を設計・レビューする。domain、usecase(s)、infrastructure、業務ルールを含む route・queue・cron・workflow、aggregate、repository、value object、entity、domain service、port、DI、レイヤー分離の話が出たら積極的に使う。既存コードのDDDレビュー、過剰抽象化の削減、必要な抽象化の追加、DTOやテスト境界の判断にも使う。DDDを理由にinterfaceやusecaseを機械的に増やさず、最小限のルールで再現可能な設計を選ぶ。業務判断のない単純な型修正・設定変更・CRUD/readや、一般的なDI解説だけには使わない。
---

# 選択的な Functional DDD 層設計

このスキルの目的は、DDDらしい名前のファイルを増やすことではない。業務上の判断を技術から守り、変更理由の異なる処理を分離しながら、読みにくい儀式的な抽象化を避けることである。

ここでいうFunctional DDDは正式な固有流派ではなく、DDDの業務モデルを型と純粋関数中心で実装する方針を指す。DDD、Hexagonal Architecture、port/adapter、DIは別の概念であり、必ず同時に導入するものではない。

- DDD: 業務の用語、モデル、不変条件、判断を設計する考え方
- Hexagonal Architecture: 内側のコードと外側の技術の依存方向を設計する考え方
- port / adapter: 内側が必要とする能力の契約と、その技術実装
- DI: 具体的な依存をcomposition rootで組み立て、関数やオブジェクトへ渡す方法

## 0. 最初に行うこと

このスキルは単独で読んでも判断できるように定義している。起動したら次の順に現在のコードと要求から判断する。

1. プロジェクトのREADME、AGENTS.md/CLAUDE.md、ADR、ディレクトリ構成、既存テストを読む。既存の命名・配置規約があればそれを優先する。
2. 対象処理の入力、出力、業務上の判断、外部依存、整合性・再試行・冪等性を短く整理する。
3. 依頼が実装かレビューかを判定する。単なる説明・診断ではファイルを変更しない。
4. DDDの導入自体が目的でなく、単純なCRUDや読み取り処理であれば、DDDの層を無理に増やさない。

業務ルールと進行管理の境界が、コードと要求から決められず結果を大きく左右する場合だけ、確認質問を一つに絞る。それ以外は合理的な前提を明示して進める。

### 用語

- application / usecase: applicationは層、usecaseはその層に属する一つの利用目的を完了させる手順と外部能力の調整
- port: 内側が必要とする、技術名を含まない能力の契約。inbound portとoutbound portがある
- adapter: portまたはruntimeの契約を、DB/API/SDKなどへ接続する実装
- composition root: 具体的なadapterを生成し、依存を組み立てる場所。entry pointと同じファイルにあってもよい
- aggregate root: 集約の外部操作を受ける代表オブジェクト
- repository: 集約の保存・復元を表す契約。読み取り用queryを自動的にRepositoryとは呼ばない
- read model: 読み取り用途に最適化した投影。集約そのものとは限らない
- durable workflow: 中断・再開・再試行をruntimeが保持する処理基盤
- Replay: durable workflowが過去のstepを再現すること
- retry: 失敗した操作を再実行すること。業務上の再試行とruntimeの再試行は分けて考える
- 冪等性: 同じ処理を複数回実行しても結果を壊さない性質
- snapshot: ある時点のdomain状態を表す値。保存用DTOと同一とは限らない
- collaborator: usecaseやdomain関数へ渡す、役割のある関数またはport。interfaceである必要はない
- test double: テスト時に依存を置き換える実装。fakeは動作を持つ代替実装、mockは呼び出し記録を主目的とする
- raw外部データ: provider responseや保存形式など、内部の業務型へ変換する前の技術依存データ

## 1. 層の役割と依存方向

層は「ファイルの種類」ではなく、変更理由と責務で決める。図では「call」は実行時の呼び出し、「depends on」はソースコード上の依存、「wiring」は具体実装の組み立てを表す。

```text
call:       entry point → application/usecase → domain
depends on: application/usecase → outbound port ← infrastructure adapter
wiring:     composition root → application/usecase + concrete adapter

```

### domain

入力形式や保存先が変わっても残る、業務上の判断を置く。

- 値オブジェクト、エンティティ、集約、状態遷移、不変条件、分類、優先順位、重複判定
- 外部I/O、DB、HTTP、SDK、ログ基盤を直接呼ばない
- 既定は純粋な関数と型。クラスは状態遷移や複雑な不変条件を明確にする場合だけ使う
- domain port は置いてよいが、domainがその意味を所有し、境界として役立つ場合に限る

### application / usecase

一つの利用目的を達成するための進行管理を置く。

- port を呼ぶ順序、複数の外部資源の調整、retry、transaction、冪等性、部分失敗の扱い
- domain の判断を呼び出し、外部結果を次の処理へ渡す
- ユースケース固有の入力・出力DTOを持ってよい
- 技術的な純粋関数を呼んでもよい。純粋関数をすべてportに変換する必要はない
- 具体的なadapterは生成せず、composition rootからportまたはcollaboratorとして受け取る。
  - application portはprovider responseやDB rowを返さず、adapterで内部型または意味のある結果へ変換する

applicationがtransactionの境界やretryの方針を決めても、transactionやSDK retryの仕組みはadapter/runtimeが実装する。applicationのretryは業務プロセスが再試行する方針、runtimeのretryはstep実行の技術方針である。両方を使う場合は、回数と重複制御をどちらが所有するかを明記し、二重retryを避ける。

### infrastructure / adapter

技術や外部契約に依存する実装を置く。

- DB、外部API、SDK、Queue、メール、AI provider、ファイル、暗号、外部形式のparser/serializer
- application/domain が所有するportの実装
- DBスキーマに依存するread modelや、外部契約から内部型への変換

### entry point と composition root

実行環境とアプリケーションを接続する。

- HTTP、Queue、Cron、tool protocol、CLI、Workflow のpayload・env・ack/retry・response
- 認証、入力検証、HTTP/Queue用DTOの小さな変換、結果のシリアライズ、具体実装の組み立て
- 単純な読み取りendpointがread model adapterを直接呼ぶことは許容する
- route固有のhelperを別routeへ流用しない。複数箇所で同じ意味を持つ一般的なhelperは、共通モジュールへ移して共有してよい

entry pointはruntimeの入力と出力を扱い、composition rootは具体的な依存を組み立てる。小規模な処理では同じファイルに置いてよいが、概念上は別の責務である。

Workflowは通常の薄いentry pointとは別扱いにする。durableな `step.do` の名前、runtimeによる再試行・中断・再開、永続化、実行単位が重要な責務であり、step内でportや意味のあるapplication関数を直接呼んでよい。

## 2. 層を決める判定手順

### Step 1: 業務判断か、技術処理か

「その業務に詳しい人が、技術名なしで説明できる判断」ならdomain候補である。次のようなものが該当する。

- 状態遷移、公開可否、重複判定、分類、優先順位、業務上の失敗回数による停止
- 複数の候補から正データを選ぶ、特定のソースを優先する

単なる順序制御、batch分割、待機時間、runtimeのretry、transaction、外部エラー処理はapplication候補である。
snake_case変換、JSON整形、provider応答のparse、DB行への変換はadapter候補である。ただし「3回失敗したら業務上停止する」はdomain、「一時的なAPIエラーを3回再試行する」はapplication/runtimeの実行ポリシーである。同じ数値でも意味で分ける。

### Step 2: 変更理由を分ける

次の問いをそれぞれ別に答える。

- 業務ルールが変わるときだけ変更されるか
- provider、DB、SDK、外部フォーマットが変わるときだけ変更されるか
- HTTP/Queue/Workflowの実行環境が変わるときだけ変更されるか
- retry、transaction、冪等性、Replayの要件が変わるときだけ変更されるか

同じ理由で変わる処理は近くに置き、異なる理由で変わる処理の間に境界を作る。層名だけを理由に分割しない。

### Step 3: port/DI の必要性を判定する

次の観点を順に確認し、具体的な変更理由と境界の名前を一文で説明できる場合に、意味のあるportまたは注入可能な依存を作る。
少なくとも「技術依存の隔離」「実装交換」「retry・transaction・冪等性などの実行境界」「依存方向の保護」のいずれかを、現実の変更リスクとして説明できることが条件である。

1. DB、外部API、Queue、メール、AI、ファイルなどの外部境界を隠す
2. providerや保存先を交換する、または複数実装を扱う
3. retry、transaction、冪等性、durable stepなどの境界を明示する
4. application/domainの依存方向を守る
5. 外部境界をテストで実装差し替えする価値がある。これは上記の実益を確かめる材料であり、「mockしたい」だけでは理由にしない

一メソッドのportも、`BuildTrigger`、`Notifier`、`BackupStore` のように意味のある能力を表すなら妥当である。禁止するのは一メソッドであることではなく、意味のない汎用抽象化である。

次の場合は原則として直接の関数呼び出しにする。

- 一度しか使わない単純なmapやformat処理
- 純粋な関数をmockすることだけが目的
- 一つの関数を呼ぶだけで、変換・ポリシー・エラー処理・境界を追加しないwrapper
- `execute`、`run`、`handle` のように業務上の意味を表さないinterface

純粋なparserやconverterを注入することは常に誤りではない。usecaseからprovider固有モジュールを隔離する、テストを高速に保つ、実装差し替えが現実にある、という理由があれば許容する。その場合は「port」と大げさに呼ばず、関数型または技術的collaboratorとして表現する方が読みやすいことがある。

位置引数では依存の役割が読みにくい場合は、次のような名前付き依存オブジェクトを使う。依存数を機械的な閾値にしない。ただしservice locatorや汎用DI containerは導入しない。

```ts
execute({ repository, notifier }, input)
```

### Step 4: portの宣言場所を決める

portの場所は、引数にどの型が含まれるかだけで決めない。次の優先順位で決める。

1. その契約の意味を誰が所有するか
2. どの変更理由を隔離するか
3. どの利用者が必要な操作だけを見ればよいか

原則として、outbound portはそれを必要とするapplication側が所有する。domain portにするのは、domainの用語として契約自体が意味を持ち、domainの判断がその抽象に依存する場合である。引数にdomain型が含まれるかだけでは決めない。

目安は次のとおりである。

- 集約のライフサイクルを保存・復元するRepositoryは、domainのモデルとして扱う規約があるならdomain、特定のusecaseだけが必要とするならapplicationに置く
- usecase固有のraw外部データ、検索、AI、通知、失敗報告、Workflow起動はapplication portになりやすい
- domainが呼び出さない外部通知portを、引数にdomain型があるという理由だけでdomainへ置かない
- 一つのportに異なる変更理由の操作を詰め込まない。テーブル単位ではなく、能力・整合性・変更理由で分ける

### Step 5: read sideを別に考える

一覧、集計、公開用projection、tool protocol経由の検索などは、集約を復元して変更する処理とは別物である。

- 複数テーブルを読むread model/query adapterをinfrastructureに置いてよい
- 単純なread endpointに、集約RepositoryとUsecaseを一枚ずつ足さない
- read modelをportにするのは、複数の利用者、provider交換、複雑なポリシー、独立したテスト境界がある場合に限る
- 認可、利用者ごとのfilter、複数read modelの組み合わせ、業務上のpagination/sort、再利用可能なapplication処理があるならquery usecaseを検討する

### Step 6: Workflowの境界を確認する

durable workflow runtime（例: Cloudflare Workflow）では、次をWorkflow側に残す。

- step名、再試行回数、step間のデータ、Replayの決定性
- 大きな処理の分割、外部副作用の再実行単位
- runtime retry、pause/resume、step間データはWorkflowが持ち、業務上の順序・業務エラー・複数portの調整はapplicationが持つ
- runtime retryで外部副作用が再実行されるなら、portまたはadapter側で冪等性キー・重複排除・安全な再実行を設計する

Workflowを「すべてusecase関数からしか呼べない」と制限しない。`step.do(() => port.call())` が意味のある境界なら、それ自体が設計である。

## 3. モデリングの最小ルール

### 値オブジェクト・エンティティ・集約

- 値オブジェクト: 等価性で扱い、生成時に検証できる不変の値
- エンティティ: 同一性を持ち、状態が変化しても同じものとして追跡するもの。履歴は必須ではない
- 集約: ひとまとまりの不変条件を守る整合性境界。Aggregate rootが外部操作を受ける
- transaction: その整合性を守るために採用する実装手段。Aggregateそのものと同義ではない

「一つのusecaseは一つの集約だけ」「一つのDBテーブルは一つのRepository」とは決めない。複数資源を更新する処理は、transactionで一緒に守るのか、結果整合性で許容するのかを明示すればよい。

### ファクトリ

ID採番、複数フィールドの検証、初期不変条件、複数オブジェクトの組み立てがある場合にdomain factoryを使う。単なるobject literalのwrapperは作らない。

### Domain service

一つの型に自然に置けない、複数のdomainオブジェクトを横断する純粋な判断に限る。Repositoryや外部APIを呼ぶ処理はdomain serviceではなくapplicationへ置く。

### 時刻・乱数

`Date.now()` やUUID生成はI/Oとは別の「非決定性」である。業務判断、Workflow Replay、再現性のあるテストに影響する場合だけClock/IdGeneratorを注入する。非決定性が業務上意味を持たないのに、機械的にportを増やさない。

## 4. DTO・変換・共有契約

DTOの場所は「誰との契約か」で決める。

| DTO/変換 | 置き場所 |
|---|---|
| HTTP/Queueの入力をapplication入力へ変換する小さな処理 | entry point |
| 複雑・再利用・provider固有のserializer | infrastructure |
| usecaseの入力・出力 | application/usecase |
| 業務上の不変条件を持つsnapshot | domain |
| 複数アプリが読む公開契約 | shared/contract package |
| provider response、DB row、保存JSONの内部形式 | infrastructure |

entry pointの小さなsnake_case変換や値オブジェクト生成を、規則だけでinfrastructureへ追い出さない。大きさ、再利用性、契約の独立性、provider依存の有無で判断する。

## 5. テストを設計判断に使う

テストは層を決める理由ではなく、守るべき振る舞いと境界を発見する材料である。

- domain: 不変条件・状態遷移・分類の高速な純粋関数テスト
- application: 意味のあるportだけfakeにし、結果、順序、失敗時の扱いを検証
- DB/Queue/HTTP/Workflow/read model: 実際の境界を使う統合テスト
- 外部形式parser/serializer: 入力形式の境界を直接テスト

次の兆候は、portまたはwrapperが過剰である可能性が高い。

- テストが「このmethodを呼んだ」しか確認していない
- 実装を少し変えるだけでmock設定が大量に壊れる
- 本来純粋な変換のためにfakeクラスを作っている

逆に、統合テストがあることは抽象化不足の証拠ではない。DBのunique制約・transaction、Queueのack/retry、Workflowの再試行とReplay、外部APIの契約変換、read modelのschema/paginationを守るなら統合テストは適切である。

## 6. アンチパターン照合表

| 兆候 | 問題 | 推奨する考え方 |
|---|---|---|
| 外部依存だから必ずport | interfaceが量産される | 交換・隠蔽・依存方向・再試行のどれが必要か説明する |
| `await`、Date、乱数があるからport | I/Oと非決定性を混同する | 業務判断やReplayへの影響で決める |
| 純粋関数だから全部domain | provider DTOや技術形式がdomainへ入る | 業務判断か、外部形式変換かを見る |
| 純粋converterを必ず直接import | applicationが具体adapterへ依存する | 関数注入・collaborator注入で依存方向を守る選択肢を残す |
| 一つのportに全機能を集約 | 利用者が不要な操作に依存する | 能力と変更理由で分ける |
| 集約型を引数に取るportは必ずdomain | portの意味の所有者を誤る | 引数型ではなく契約の所有者で決める |
| すべてのHTTP処理をUsecase経由にする | 単純なread/CRUDが儀式化する | read modelや単純adapterの直接利用を許可する |
| entry pointは配線だけ | 認証・DTO変換・response処理まで散らばる | runtime adapterの責務をentry pointに残す |
| field mappingは必ずinfrastructure | HTTP契約の理解が分散する | 小さな境界変換はentry point、複雑・再利用ならadapterへ |
| 一つのusecaseは一つの集約だけ | 実際の業務プロセスを不自然に分割する | transactionか結果整合性かを明示する |
| DBテーブルごとにRepository | schemaがdomainを支配する | aggregate/store/read modelの境界で決める |
| Workflowの各呼び出しをwrapperで包む | durable stepの境界が読めなくなる | `step.do`内の直接呼び出しを許可する |
| 一回呼ぶだけのwrapper | 関数名だけが増え、意味が増えない | 変換・判断・エラー処理・境界がなければinlineする |
| 汎用DI container/service locator | 依存関係が隠れる | 明示的な依存オブジェクトを渡す |
| mockテストを増やすためにportを作る | テストが実装詳細に固定される | 結果・境界・失敗時の振る舞いをテストする |
| domain型をデータ保持専用にする | 判断がusecaseへ漏れる | まず値オブジェクト・状態遷移・純粋なdomain関数を検討する |

## 7. 実装・レビューの進め方

### レビューモード

既存コードを勝手に変更せず、次の形式で報告する。

```text
[レビュー結果]
- 全体講評: <設計の要約と最大の論点>
- 維持: <現在のまま妥当な抽象化と理由>
- 簡素化: <削除・inline・直接呼び出しの候補>
- 抽象化/移動: <port、関数、adapter、domain ruleの追加・移動候補>
- テスト: <既存テストが守っている契約と不足する観点>
- 優先順位: <今すぐ / 次回変更時 / 保留>
- 確信度: <高 / 中 / 低。未確認の前提があれば明記>
```

各指摘には、対象ファイル、観測事実、壊れるもの、最小の修正案、確信度を添える。「DDD的に悪い」だけで終わらせず、可読性、変更容易性、テスト価値、障害時の挙動で説明する。広範囲レビューでは、維持すべき設計も必ず示す。

### 実装モード

変更を求められた場合は、必要な範囲だけ実装する。まず次の配置案を短く提示し、要求が設計相談だけならコードを書かない。

```text
## [配置案]
- domain: <業務ルール・型>
- application/usecase: <進行管理・port・DTO>
- infrastructure: <外部実装・serializer・read model>
- entry point: <入力検証・変換・組み立て・出力>
- 残課題: <要確認事項。なければ「なし」>
```

実装後は、変更に対応する純粋関数テストまたは統合テストを追加・更新し、型検査と既存の関連テストを実行する。失敗した場合は、失敗したテスト、原因の仮説、未検証の範囲を報告する。テスト追加だけを目的に新しい層やportを作らない。

## 8. 最小例

「ユーザーが通知先を登録する。既存の有効な宛先は拒否し、無効化理由がsystemなら再有効化する」という処理を、配置が分かる最小の概念コードで示す。実際のHTTP DTOや暗号化などは省略している。

```ts
type ChannelStatus = 'active' | 'system-deactivated' | 'user-deactivated';
type Channel = {
  address: string;
  frequency: string;
  status: ChannelStatus;
};
type SubscribeInput = { address: string; frequency: string };
type SubscribeResult =
  | { ok: true; channel: Channel }
  | { ok: false; error: 'already_registered' | 'invalid_notification_destination' };

// application-owned outbound ports (implementations belong to infrastructure)
type ChannelRepository = {
  findByAddress(address: string): Promise<Channel | null>;
  save(channel: Channel): Promise<void>;
};
type ChannelNotifier = {
  sendTestNotification(channel: Channel): Promise<{ ok: boolean }>;
};

// domain: pure decisions and state construction
const isActive = (channel: Channel) => channel.status === 'active';
const createChannel = (input: SubscribeInput): Channel => ({
  ...input,
  status: 'active',
});
const reactivate = (channel: Channel): Channel => ({
  ...channel,
  status: 'active',
});

// application: ordering, external calls, and persistence
async function subscribe(
  { channels, notifier }: { channels: ChannelRepository; notifier: ChannelNotifier },
  input: SubscribeInput,
): Promise<SubscribeResult> {
  const existing = await channels.findByAddress(input.address);
  if (
    existing !== null &&
    (isActive(existing) || existing.status === 'user-deactivated')
  ) {
    return { ok: false, error: 'already_registered' };
  }

  const channel = existing === null
    ? createChannel(input)
    : reactivate(existing); // ここに来るのはsystem-deactivatedだけ
  const test = await notifier.sendTestNotification(channel);
  if (!test.ok) return { ok: false, error: 'invalid_notification_destination' };

  await channels.save(channel);
  return { ok: true, channel };
}
```

この例では、DBと通知は差し替え可能な意味のある境界なのでportを使う。
一方、HTTPのsnake_case変換、単純なread query、UUID生成のために別のUsecaseやinterfaceを追加する必要はない。
entry pointは`SubscribeResult`をHTTP応答へ変換する。実装時は、宛先のunique制約による競合、通知後の保存失敗、runtime retryによる通知重複をtransactionまたは冪等性キーで明示する。
業務ルールが複雑になったらdomainの純粋関数へ切り出し、処理の順序・retry・保存はapplication/runtimeに残す。
