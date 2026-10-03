import type { EngineInterface, On, PluginOptions, Timer } from 'claude-code';
import { atom, read, update } from 'claude-code';
import { drawIce, fullSide, ICE_COLUMNS, ICE_ROWS } from './ice';

const MINUTE = 60_000;

// $.state はホットリロードを越えて残るので、保存中に起点が今に戻らない。
// /clear・/resume・/branch では既定値に戻る。
const lastTurnEndedAt = atom(
  { plugin: 'general-dev-mods', key: 'lastTurnEndedAt' } as const,
  0,
);
const phase = atom(
  { plugin: 'general-dev-mods', key: 'phase' } as const,
  'ice',
);
const iceTokens = atom(
  { plugin: 'general-dev-mods', key: 'iceTokens' } as const,
  0,
);
const contextWindow = atom(
  { plugin: 'general-dev-mods', key: 'contextWindow' } as const,
  0,
);

export function register(on: On, options: PluginOptions): void {
  const idleMs = Number(options.cacheTtlCompactIdleMinutes ?? 55) * MINUTE;
  const tickMs = Number(options.cacheTtlCompactTickMinutes ?? 1) * MINUTE;
  const ttlMs = Number(options.cacheTtlCompactCacheTtlMinutes ?? 60) * MINUTE;

  let timer: Timer | undefined;
  let done = false;

  on('session.start', async ($, e, next) => {
    // $.clock.now() は host を通るので、claude-code/testing の mock.clock で
    // 差し替えられる。Date.now() だと 1 時間待たないとテストできない。
    if ((await read($, lastTurnEndedAt)) === 0) {
      await restart($);
    }
    $.ui.log(
      `cache-ttl-compact: ${idleMs / MINUTE} 分の無操作で compact します ` +
        `(確認の間隔は ${tickMs / MINUTE} 分)`,
    );

    timer?.cancel();
    timer = $.clock.every(tickMs, async () => {
      $.ui.invalidate('ui.render');
      if (done) {
        return;
      }

      const startedAt = await read($, lastTurnEndedAt);
      const elapsed = (await $.clock.now()) - startedAt; // スリープから復帰した時点でキャッシュが切れていたら、compact しても
      // 会話全体を読み直すので使用量はほとんど減らない。
      if (startedAt === 0 || elapsed < idleMs || elapsed >= ttlMs) {
        return;
      }

      done = true;
      // $.session.compact() は呼び出した hook 自身の session.compact を通らないので、
      // 表示の状態はここで切り替える。
      await update($, phase, () => 'compacting');
      try {
        const result = await $.session.compact();
        // skip は boolean ではなく理由の文字列。空文字も string に含まれるため、
        // if (result.skip) では compact 済みの型まで絞り込めない。
        if (result.skip !== undefined) {
          await update($, phase, () => 'ice');
          $.ui.log(
            `cache-ttl-compact: 他の Hook が compact を拒否しました (${result.skip})`,
          );
          return;
        }
        await rebuild($, result.tokensAfter);
        $.ui.log(
          `cache-ttl-compact: ${Math.round(elapsed / MINUTE)} 分の離席を検知し、` +
            `${result.tokensBefore ?? '?'} → ${result.tokensAfter ?? '?'} トークンに compact しました`,
        );
      } catch (error) {
        // $.session.compact() はターンの実行中だと reject される。
        // タイマーの周期とターンの開始がぶつかった場合なので、次の周期に回す。
        done = false;
        await update($, phase, () => 'ice');
        $.ui.log(`cache-ttl-compact: compact できませんでした (${error})`, {
          to: 'debug',
        });
      }
    });

    return next(e);
  });

  // この mod 以外の compact (/compact や閾値での自動 compact) の後も、
  // 次のターンが始まるまでは compact 済みの会話なので compact し直さない。
  on('session.compact', async ($, e, next) => {
    const isMain = e.agentId === undefined && e.trigger !== 'precompute';
    if (isMain) {
      await update($, phase, () => 'compacting');
    }
    const result = await next(e);
    if (!isMain) {
      return result;
    }
    if (result.skip === undefined) {
      done = true;
      await rebuild($, result.tokensAfter);
    } else {
      await update($, phase, () => 'ice');
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

    await restart($);
    return next(e);
  });

  on('session.end', async (_$, e, next) => {
    // /clear・/resume・/branch でも session.end は発火するが、プロセスは終了せず
    // session.start も再発火しない。ここでタイマーを止めると再開されないので、
    // 起点の合わせ直しは classic.SessionStart に任せる。/branch の reason は resume になる。
    if (e.reason === 'clear' || e.reason === 'resume') {
      // /clear 直後の会話は空なので、次のターンが始まるまで compact しない。
      done = e.reason === 'clear';
      return next(e);
    }

    timer?.cancel();
    timer = undefined;
    return next(e);
  });

  // /clear・/resume・/branch は $.state を既定値に戻すので、session.end ではなく
  // その後に発火する classic.SessionStart で起点を書き直す。
  on(
    'classic.SessionStart',
    { source: ['clear', 'resume', 'fork'] },
    async ($, e, next) => {
      await restart($);
      return next(e);
    },
  );

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // Raster はターミナルにしかなく、Desktop では何も描かれない。
    if (e.surface !== 'terminal' || e.props.hasSurvey) {
      return next(e);
    }
    const tokens = await read($, iceTokens);
    const window = await read($, contextWindow);
    if (tokens === 0) {
      return next(e);
    }

    const state = await read($, phase);
    const side = fullSide(tokens, window);
    let remaining = 1;
    let label: string;
    if (e.props.isWorking) {
      label = '';
    } else if (state === 'compacting') {
      label = 'compact 中';
    } else if (state === 'rebuilt') {
      label = 'compact 済み';
    } else {
      const elapsed = (await $.clock.now()) - (await read($, lastTurnEndedAt));
      if (elapsed >= ttlMs) {
        remaining = 0;
        label = '溶けました';
      } else {
        remaining = Math.max(0, 1 - elapsed / idleMs);
        label = `残り ${Math.max(0, Math.ceil((idleMs - elapsed) / MINUTE))} 分`;
      }
    }

    const { Box, Raster, Text } = $.ui.resolve(e);
    return Box({
      flexDirection: 'row',
      alignItems: 'flex-end',
      columnGap: 1,
      children: [
        Raster({
          key: 'ice',
          columns: ICE_COLUMNS,
          rows: ICE_ROWS,
          cells: drawIce(side, remaining),
        }),
        Text({ dimColor: true, children: [label] }),
      ],
    });
  });
}

async function restart($: EngineInterface) {
  const { context } = await $.session.usage();
  const now = await $.clock.now();
  await update($, lastTurnEndedAt, () => now);
  await update($, phase, () => 'ice');
  await update($, iceTokens, () => context.tokens ?? 0);
  await update($, contextWindow, () => context.window);
}

async function rebuild($: EngineInterface, tokensAfter: number | undefined) {
  // compact の直後は、次の応答を受け取るまで $.session.usage() の tokens が空になる。
  await update($, iceTokens, (current) => tokensAfter ?? current);
  await update($, phase, () => 'rebuilt');
}
