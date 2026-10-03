// 1 セルを上下 2 ピクセルに分けて描くので、ピクセルはほぼ正方形になる。
export const ICE_COLUMNS = 18;
export const ICE_ROWS = 6;

const WIDTH = ICE_COLUMNS;
const HEIGHT = ICE_ROWS * 2;
const MIN_SIDE = 3;
const MAX_SIDE = HEIGHT - 1;
const SMALL_CONVERSATION_TOKENS = 10_000;

const NONE = 0x01000000;
const HIGHLIGHT = 0xffffff;
const BODY = 0xbfe9ff;
const SHADE = 0x7fb8d8;
const WATER = 0x4a90d9;
const UPPER_HALF = 0x2580;
const LOWER_HALF = 0x2584;
const SPACE = 0x20;

// window が 100 万トークンのモデルでも普段の会話が最小の氷に潰れないよう、対数で割り振る。
export function fullSide(tokens: number, window: number): number {
  if (
    tokens <= SMALL_CONVERSATION_TOKENS ||
    window <= SMALL_CONVERSATION_TOKENS
  ) {
    return MIN_SIDE;
  }
  const ratio =
    Math.log(tokens / SMALL_CONVERSATION_TOKENS) /
    Math.log(window / SMALL_CONVERSATION_TOKENS);
  const clamped = Math.min(1, Math.max(0, ratio));
  return Math.round(MIN_SIDE + clamped * (MAX_SIDE - MIN_SIDE));
}

// remaining は残り時間の割合 (1 = 溶け始め、0 = 溶けきった)。
// 見た目の面積が残り時間に比例するよう、一辺は平方根で縮める。
export function drawIce(side: number, remaining: number): string {
  const r = Math.min(1, Math.max(0, remaining));
  const current = r === 0 ? 0 : Math.max(1, Math.round(side * Math.sqrt(r)));
  const puddle = Math.min(WIDTH, Math.round(side * 1.6 * (1 - r)));

  const pixels: number[][] = Array.from({ length: HEIGHT }, () =>
    new Array<number>(WIDTH).fill(NONE),
  );

  const floor = HEIGHT - 1;
  const puddleLeft = Math.floor((WIDTH - puddle) / 2);
  for (let x = puddleLeft; x < puddleLeft + puddle; x++) {
    setPixel(pixels, x, floor, WATER);
  }

  const left = Math.floor((WIDTH - current) / 2);
  const top = floor - current;
  for (let y = top; y < floor; y++) {
    for (let x = left; x < left + current; x++) {
      setPixel(pixels, x, y, iceColor(x - left, y - top, current));
    }
  }

  return pack(pixels);
}

function iceColor(x: number, y: number, side: number): number {
  if (y === 0 || x === 0 || (side >= 4 && x === 1 && y === 1)) {
    return HIGHLIGHT;
  }
  if (y === side - 1 || x === side - 1) {
    return SHADE;
  }
  return BODY;
}

function setPixel(pixels: number[][], x: number, y: number, color: number) {
  const row = pixels[y];
  if (row !== undefined && x >= 0 && x < WIDTH) {
    row[x] = color;
  }
}

function pack(pixels: number[][]): string {
  const words = new Uint32Array(ICE_COLUMNS * ICE_ROWS * 3);
  for (let row = 0; row < ICE_ROWS; row++) {
    for (let x = 0; x < WIDTH; x++) {
      const top = pixels[row * 2]?.[x] ?? NONE;
      const bottom = pixels[row * 2 + 1]?.[x] ?? NONE;
      const i = (row * WIDTH + x) * 3;
      if (top !== NONE) {
        words.set([UPPER_HALF, top, bottom], i);
      } else if (bottom !== NONE) {
        words.set([LOWER_HALF, bottom, NONE], i);
      } else {
        words.set([SPACE, NONE, NONE], i);
      }
    }
  }
  // Mod の実行環境には Uint8Array.prototype.toBase64 があるが、TypeScript の
  // lib (es2023) にはまだ型がない。
  const bytes = new Uint8Array(words.buffer) as Uint8Array & {
    toBase64(): string;
  };
  return bytes.toBase64();
}
