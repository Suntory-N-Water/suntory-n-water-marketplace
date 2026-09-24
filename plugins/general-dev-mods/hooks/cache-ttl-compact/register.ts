import type { On, PluginOptions, Timer } from 'claude-code';

const MINUTE = 60_000;

export function register(on: On, options: PluginOptions): void {
  const idleMs = Number(options.cacheTtlCompactIdleMinutes ?? 55) * MINUTE;
  const tickMs = Number(options.cacheTtlCompactTickMinutes ?? 1) * MINUTE;

  let timer: Timer | undefined;
  let lastTurnEndedAt = 0;
  let done = false;

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

  // この mod 以外の compact (/compact や閾値での自動 compact) の後も、
  // 次のターンが始まるまでは compact 済みの会話なので compact し直さない。
  on('session.compact', async (_$, e, next) => {
    const result = await next(e);
    if (
      e.agentId === undefined &&
      e.trigger !== 'precompute' &&
      result.skip === undefined
    ) {
      done = true;
    }
    return result;
  });

  // done を戻すのは turn.complete ではなく turn.start。ターンの途中で
  // 自動 compact が実行された場合、turn.complete で戻すと compact 済みの印が消える。
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
    return next(e);
  });

  on('session.end', (_$, e, next) => {
    timer?.cancel();
    timer = undefined;
    return next(e);
  });
}
