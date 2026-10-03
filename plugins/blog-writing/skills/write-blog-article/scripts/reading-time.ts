// sui-blog の src/utils/reading-time.ts と同じ数え方にそろえる。表とコードブロックはブログ側の計算に入らないため、件数を別に出す。
const CHARS_PER_MINUTE_JA = 650;

const path = Bun.argv[2];
if (!path) {
  console.error('usage: bun reading-time.ts <article.md>');
  process.exit(1);
}

const source = await Bun.file(path).text();
const body = source.replace(/^---\n[\s\S]*?\n---\n/u, '');
const codeBlocks = body.match(/^```[\s\S]*?^```/gmu) ?? [];
const lines = body.replace(/^```[\s\S]*?^```/gmu, '').split('\n');

const tableCount = lines.filter(
  (line, i) => line.startsWith('|') && !lines[i - 1]?.startsWith('|'),
).length;
const proseChars = lines
  .filter(
    (line) =>
      !line.startsWith('|') && !/^\[\^[^\]]+\]:/u.test(line.trimStart()),
  )
  .map((line) =>
    line
      .replace(/^#+\s*/u, '')
      .replace(/^\s*[-*]\s+/u, '')
      .replace(/\[\^[^\]]+\]/gu, '')
      .replace(/`[^`]*`/gu, '')
      .replace(/!?\[([^\]]*)\]\([^)]*\)/gu, '$1')
      .replace(/\*\*/gu, ''),
  )
  .join('\n')
  .trim().length;

const minutes = Math.max(1, Math.round(proseChars / CHARS_PER_MINUTE_JA));
console.log(
  `本文: ${proseChars} 字 / 読了 ${minutes} 分 / 表 ${tableCount} 個 / コードブロック ${codeBlocks.length} 個`,
);
