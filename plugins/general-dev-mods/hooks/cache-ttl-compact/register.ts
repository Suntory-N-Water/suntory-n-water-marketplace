import type { EngineInterface, On, PluginOptions, Timer } from 'claude-code';

const MINUTE = 60_000;

export function register(on: On, options: PluginOptions): void {
  const idleMs = Number(options.cacheTtlCompactIdleMinutes ?? 55) * MINUTE;
  const tickMs = Number(options.cacheTtlCompactTickMinutes ?? 1) * MINUTE;

  let timer: Timer | undefined;
  let lastTurnEndedAt = 0;
  let tokensAtTurnEnd: number | undefined;
  let done = false;

  // breakdown: 'summary' は token-count API を呼ばずに手元で見積もる。
  // 見積もれない環境では undefined を返し、compact 済みの判定を諦めて compact する。
  const estimateTokens = async (
    $: EngineInterface,
  ): Promise<number | undefined> => {
    try {
      const { context } = await $.session.usage({ breakdown: 'summary' });
      return context.breakdown?.totalTokens;
    } catch {
      return undefined;
    }
  };

  on('session.start', async ($, e, next) => {
    // $.clock.now() は host を通るので、claude-code/testing の mock.clock で
    // 差し替えられる。Date.now() だと 1 時間待たないとテストできない。
    lastTurnEndedAt = await $.clock.now();
    $.ui.log(
      `cache-ttl-compact: ${idleMs / MINUTE} 分の無操作で compact します ` +
        `(確認の間隔は ${tickMs / MINUTE} 分)`,
    );

    timer?.cancel();
    timer = $.clock.every(tickMs, async () => {
      if (done) {
        return;
      }

      const elapsed = (await $.clock.now()) - lastTurnEndedAt;
      if (elapsed < idleMs) {
        return;
      }

      done = true;
      // ターンが無い間に会話のトークン数が減るのは、/compact などで compact された場合。
      const tokensNow = await estimateTokens($);
      if (
        tokensAtTurnEnd !== undefined &&
        tokensNow !== undefined &&
        tokensNow < tokensAtTurnEnd
      ) {
        $.ui.log(
          `cache-ttl-compact: 最後のターンの後に compact 済みのため compact しません ` +
            `(${tokensAtTurnEnd} → ${tokensNow} トークン)`,
          { to: 'debug' },
        );
        return;
      }
      try {
        const result = await $.session.compact();
        // skip は boolean ではなく理由の文字列。空文字も string に含まれるため、
        // if (result.skip) では compact 済みの型まで絞り込めない。
        if (result.skip !== undefined) {
          $.ui.log(
            `cache-ttl-compact: 他の Hook が compact を拒否しました (${result.skip})`,
          );
          return;
        }
        $.ui.log(
          `cache-ttl-compact: ${Math.round(elapsed / MINUTE)} 分の離席を検知し、` +
            `${result.tokensBefore ?? '?'} → ${result.tokensAfter ?? '?'} トークンに compact しました`,
        );
      } catch (error) {
        // $.session.compact() はターンの実行中だと reject される。
        // タイマーの周期とターンの開始がぶつかった場合なので、次の周期に回す。
        done = false;
        $.ui.log(`cache-ttl-compact: compact できませんでした (${error})`, {
          to: 'debug',
        });
      }
    });

    return next(e);
  });

  // この mod 以外の compact (/compact や閾値での自動 compact) は、session.compact や
  // session.append の hook では検知できない。Team・Enterprise の組織では、Claude Code に
  // 同梱の cc-plugin-sec-default がどのプラグインより先に hook を実行し、会話の内容を含むイベントを
  // 個人が入れたプラグインの hook に渡さないため。代わりにトークン数の減少で検知する。

  // turn.start はサブエージェントでは発火しないので agentId を見なくてよい。
  on('turn.start', (_$, e, next) => {
    done = false;
    return next(e);
  });

  on('turn.complete', async ($, e, next) => {
    // agentId があるのはサブエージェントのターン。サブエージェントのリクエストは
    // メインの conversation のキャッシュを読まないので、TTL の起点にならない。
    if (e.agentId !== undefined) {
      return next(e);
    }

    lastTurnEndedAt = await $.clock.now();
    tokensAtTurnEnd = await estimateTokens($);
    return next(e);
  });

  on('session.end', async ($, e, next) => {
    // /clear・/resume・/branch でも session.end は発火するが、プロセスは終了せず
    // session.start も再発火しない。ここでタイマーを止めると再開されないので、
    // 起点だけ新しい会話に合わせ直す。/branch の reason は resume になる。
    if (e.reason === 'clear' || e.reason === 'resume') {
      lastTurnEndedAt = await $.clock.now();
      tokensAtTurnEnd = undefined;
      // /clear 直後の会話は空なので、次のターンが始まるまで compact しない。
      done = e.reason === 'clear';
      return next(e);
    }

    timer?.cancel();
    timer = undefined;
    return next(e);
  });
}
