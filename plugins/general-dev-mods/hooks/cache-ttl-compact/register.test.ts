import type { On } from 'claude-code';
import type { TestBody } from 'claude-code/testing';
import { expect, mock, test } from 'claude-code/testing';

const MINUTE = 60_000;

const ABOVE_PROMPT = {
  plugin: 'general-dev-mods',
  component: 'AbovePrompt',
  requestId: 'above-prompt',
  surface: 'terminal',
  viewport: { columns: 100, rows: 40 },
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 20,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 19 },
    view: {},
  },
} as const;

function stubEngine(on: On) {
  const compacts: number[] = [];
  // register.ts は lastTurnEndedAt の 0 を「未記録」として扱うので、0 から始めない。
  const clock = mock.clock(on, { now: Date.UTC(2026, 9, 3) });
  on('session.start', () => ({ cwd: '/work' }));
  on('turn.complete', () => ({ text: '' }));
  on('ui.log', () => ({ value: undefined }));
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['engine'] }));
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { tokens: 120_000, window: 200_000, percent: 60 },
      rateLimits: [],
    },
  }));
  on('session.compact', () => {
    compacts.push(clock.now());
    return {
      messages: [{ role: 'user', text: '要約', toolUses: [] }],
      tokensBefore: 120_000,
      tokensAfter: 15_000,
    };
  });
  return { clock, compacts };
}

async function startAndFinishTurn($: Parameters<TestBody>[0]) {
  await $.session.start({
    surface: 'terminal',
    isInteractive: true,
    cwd: '/work',
  });
  await $.turn.complete({
    turnId: 't1',
    answer: 'ok',
    durationMs: 1,
    isAborted: false,
    reason: 'answer',
  });
}

test('最後のターンから 30 分後は氷と残り時間を表示する', async ($, on) => {
  const { clock } = stubEngine(on);
  await startAndFinishTurn($);
  await clock.advance(30 * MINUTE);

  const ui = await $.ui.mount(ABOVE_PROMPT);
  expect(await ui.find({ type: 'Raster', key: 'ice' })).toBeDefined();
  expect(await ui.find({ type: 'Text', text: '残り 25 分' })).toBeDefined();
});

test('55 分を過ぎると compact し、作り直した氷を表示する', async ($, on) => {
  const { clock, compacts } = stubEngine(on);
  await startAndFinishTurn($);
  await clock.advance(56 * MINUTE);

  expect(compacts).toHaveLength(1);
  const ui = await $.ui.mount(ABOVE_PROMPT);
  expect(await ui.find({ type: 'Text', text: 'compact 済み' })).toBeDefined();
});

// スリープ中は $.clock のタイマーが停止する。確認の間隔を 61 分にして、
// 復帰後の最初の確認が 60 分を過ぎてから来る状況を作る。
const SLEEP = { options: { cacheTtlCompactTickMinutes: 61 } };

test(
  'スリープ明けに 60 分を過ぎていたら compact せず、溶けた氷を表示する',
  SLEEP,
  async ($, on) => {
    const { clock, compacts } = stubEngine(on);
    await startAndFinishTurn($);
    await clock.advance(61 * MINUTE);

    expect(compacts).toHaveLength(0);
    const ui = await $.ui.mount(ABOVE_PROMPT);
    expect(await ui.find({ type: 'Text', text: '溶けました' })).toBeDefined();
  },
);
