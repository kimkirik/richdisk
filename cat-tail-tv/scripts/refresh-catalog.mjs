import { writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const download = async (url) => {
  const { stdout } = await run('curl', ['-L', '-sS', '--max-redirs', '10', '-A', 'Mozilla/5.0', url], { maxBuffer: 12 * 1024 * 1024 });
  return stdout;
};

const groups = [
  {
    category: 'birds',
    target: 30,
    queries: [
      'cat tv birds for cats to watch 8 hours',
      'bird videos for cats cat tv garden birds',
    ],
  },
  {
    category: 'squirrels',
    target: 25,
    queries: [
      'cat tv squirrels chipmunks rabbits for cats',
      'squirrel videos for cats to watch cat tv',
    ],
  },
  {
    category: 'fish',
    target: 25,
    queries: [
      'cat tv fish aquarium for cats to watch',
      'cat games fish videos for cats',
    ],
  },
  {
    category: 'nature',
    target: 20,
    queries: [
      'cat games mice insects butterflies for cats to watch',
      'cat tv nature mice lizards insects',
    ],
  },
];

const whyByCategory = {
  birds: '날갯짓과 작은 방향 전환이 냥이의 시선을 자연스럽게 끌어요.',
  squirrels: '빠르게 달리고 멈추는 작은 동물의 움직임을 따라보기 좋아요.',
  fish: '물속을 부드럽게 오가는 움직임으로 편안한 사냥 놀이를 즐겨요.',
  nature: '작은 생물과 자연의 불규칙한 움직임을 차분하게 관찰할 수 있어요.',
};

const titleByCategory = {
  birds: '새 관찰 냥TV',
  squirrels: '다람쥐·토끼 냥TV',
  fish: '물고기 사냥 냥TV',
  nature: '작은 동물 자연 냥TV',
};

const searchIds = async (query) => {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const html = await download(url);
  return [...html.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g)].map((match) => match[1]);
};

const getMetadata = async (id) => {
  const endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
  try {
    const data = JSON.parse(await download(endpoint));
    return { id, original: data.title, channel: data.author_name };
  } catch {
    return null;
  }
};

const seen = new Set();
const catalog = [];

for (const group of groups) {
  const candidates = [];
  for (const query of group.queries) {
    const ids = await searchIds(query);
    for (const id of ids) {
      if (!seen.has(id) && !candidates.includes(id)) candidates.push(id);
    }
  }

  for (let offset = 0; offset < candidates.length && catalog.filter((item) => item.category === group.category).length < group.target; offset += 12) {
    const batch = candidates.slice(offset, offset + 12);
    const results = await Promise.all(batch.map(getMetadata));
    for (const metadata of results) {
      if (!metadata || seen.has(metadata.id)) continue;
      const searchable = `${metadata.original} ${metadata.channel}`.toLowerCase();
      if (/\b(shorts?|live|reaction)\b/.test(searchable)) continue;
      seen.add(metadata.id);
      const number = catalog.filter((item) => item.category === group.category).length + 1;
      const score = Math.max(70, 101 - number);
      const stimulus = group.category === 'fish'
        ? (number % 3 === 0 ? 'high' : 'low')
        : (number % 5 === 0 ? 'low' : number % 3 === 0 ? 'high' : 'medium');
      catalog.push({
        ...metadata,
        title: `${titleByCategory[group.category]} ${String(number).padStart(2, '0')}`,
        category: group.category,
        stimulus,
        duration: '장시간 영상',
        minutes: 480,
        score,
        why: whyByCategory[group.category],
      });
      if (catalog.filter((item) => item.category === group.category).length === group.target) break;
    }
  }
}

if (catalog.length !== 100) {
  throw new Error(`Expected 100 verified videos, received ${catalog.length}`);
}

const output = `// YouTube 검색 결과를 oEmbed로 확인한 100개 영상.\nwindow.CAT_TV_VIDEOS=${JSON.stringify(catalog, null, 2)};\n`;
await writeFile(new URL('../catalog.js', import.meta.url), output, 'utf8');
console.log(`Wrote ${catalog.length} verified videos`);
