import fs from "node:fs";

const dataDir = new URL("../data/", import.meta.url);
const catalog = JSON.parse(
  fs.readFileSync(new URL("channels.json", dataDir), "utf8"),
);
const countries = ["KR", "US", "GB", "JP"];
const maxArchiveSize = 1200;
const hourMs = 60 * 60 * 1000;
const dayMs = 24 * hourMs;

const decodeXml = (value = "") =>
  value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();

function tagValue(xml, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return decodeXml(
    xml.match(
      new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"),
    )?.[1] ?? "",
  );
}

function attributeValue(xml, tag, attribute) {
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedAttribute = attribute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(
    new RegExp(
      `<${escapedTag}\\b[^>]*\\b${escapedAttribute}=(?:"([^"]*)"|'([^']*)')`,
      "i",
    ),
  );
  return decodeXml(match?.[1] ?? match?.[2] ?? "");
}

function safeCounter(value) {
  if (!/^\d+$/.test(value)) return 0;
  const parsed = BigInt(value);
  return parsed > BigInt(Number.MAX_SAFE_INTEGER)
    ? Number.MAX_SAFE_INTEGER
    : Number(parsed);
}

function classifyVideo(channel, title) {
  if (/레전드|오분순삭|옛능|옛날|다시\s*보는|명장면|무한도전|모음집|classic|throwback|archive/i.test(title)) return "classic";
  if (/개그콘서트|개콘|코미디|스케치|SNL|개그|웃찾사|상황극|패러디|comedy|sketch|parody|stand[ -]?up|コント|漫才|お笑い/i.test(title)) return "sketch";
  if (/토크|인터뷰|핑계고|짠한형|유퀴즈|라디오스타|살롱드립|대화|썰|interview|late night|tonight show|talk|chat|トーク|インタビュー/i.test(title)) return "talk";
  return channel.defaultCategory;
}

async function fetchChannelFeed(channel) {
  const url = new URL("https://www.youtube.com/feeds/videos.xml");
  url.searchParams.set("channel_id", channel.id);
  const response = await fetch(url, {
    headers: {
      accept: "application/atom+xml, application/xml;q=0.9, text/xml;q=0.8",
      "user-agent": "SmileComedyHub/1.0",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`${channel.name}: HTTP ${response.status}`);

  const xml = await response.text();
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) ?? [];
  return entries.flatMap((entry) => {
    const youtubeId = tagValue(entry, "yt:videoId");
    const title = tagValue(entry, "media:title") || tagValue(entry, "title");
    const publishedAt = tagValue(entry, "published");
    if (!youtubeId || !title || !publishedAt) return [];
    return [{
      id: `yt-${youtubeId}`,
      youtubeId,
      title,
      channel: channel.name,
      channelHandle: channel.handle,
      country: channel.country,
      source: channel.source,
      category: classifyVideo(channel, title),
      views: safeCounter(attributeValue(entry, "media:statistics", "views")),
      likes: null,
      comments: null,
      publishedAt,
      durationSeconds: 0,
      sourceUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
      rank: 0,
    }];
  });
}

const validTime = (value) => {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
};

function publishedTime(value, now) {
  const parsed = validTime(value);
  return parsed === null || parsed > now + 6 * hourMs ? 0 : parsed;
}

function estimateDailyViews(views, publishedAt, now) {
  const published = publishedTime(publishedAt, now);
  if (!published || views <= 0) return 0;
  const ageHours = Math.max(6, (now - published) / hourMs);
  return ((views * 24) / ageHours) * 0.5;
}

function trendScore(dailyViews, publishedAt, now) {
  const published = publishedTime(publishedAt, now);
  if (!published || dailyViews <= 0) return 0;
  const ageDays = Math.max(0, (now - published) / dayMs);
  const recencyWeight = 0.35 + 0.65 * Math.exp(-ageDays / 30);
  return Math.round(dailyViews * recencyWeight * 1000) / 1000;
}

function sortVideos(videos, mode, now) {
  return [...videos].sort((a, b) => {
    if (mode === "new") {
      return (
        publishedTime(b.publishedAt, now) - publishedTime(a.publishedAt, now) ||
        b.views - a.views ||
        a.youtubeId.localeCompare(b.youtubeId)
      );
    }
    return (
      (b.trendScore ?? 0) - (a.trendScore ?? 0) ||
      publishedTime(b.publishedAt, now) - publishedTime(a.publishedAt, now) ||
      b.views - a.views ||
      a.youtubeId.localeCompare(b.youtubeId)
    );
  });
}

function mergeArchive(fresh, previous, previousUpdatedAt, now) {
  const observedAt = new Date(now).toISOString();
  const previousUpdatedTime = validTime(previousUpdatedAt);
  const byId = new Map();

  for (const video of previous) {
    byId.set(video.youtubeId, {
      ...video,
      inCurrentFeed: false,
      trendScore: 0,
    });
  }

  for (const video of fresh) {
    const old = byId.get(video.youtubeId);
    const currentViews = video.views > 0 ? video.views : (old?.views ?? 0);
    const oldObservedTime = validTime(old?.observedAt) ?? previousUpdatedTime;
    let gain24h = estimateDailyViews(currentViews, video.publishedAt, now);

    if (old && oldObservedTime !== null) {
      const elapsedHours = Math.max(0.25, (now - oldObservedTime) / hourMs);
      const measuredGain24h = (Math.max(0, currentViews - old.views) * 24) / elapsedHours;
      gain24h = Number.isFinite(old.viewGain24h)
        ? Math.max(0, old.viewGain24h ?? 0) * 0.6 + measuredGain24h * 0.4
        : measuredGain24h;
    }

    const normalizedGain = Math.round(Math.max(0, gain24h));
    byId.set(video.youtubeId, {
      ...old,
      ...video,
      views: currentViews,
      inCurrentFeed: true,
      observedAt,
      viewGain24h: normalizedGain,
      trendScore: trendScore(normalizedGain, video.publishedAt, now),
    });
  }

  const newest = sortVideos([...byId.values()], "new", now).slice(0, maxArchiveSize);
  const ranked = sortVideos(newest, "trend", now);
  ranked.forEach((video, index) => {
    video.rank = index + 1;
  });
  return ranked;
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function collectCountry(country) {
  const channels = catalog.channels.filter((channel) => channel.country === country);
  const successfulChannels = new Set();
  const videos = [];

  for (let index = 0; index < channels.length; index += 4) {
    const batch = channels.slice(index, index + 4);
    const results = await Promise.allSettled(batch.map(fetchChannelFeed));
    results.forEach((result, itemIndex) => {
      if (result.status === "fulfilled") {
        videos.push(...result.value);
        successfulChannels.add(batch[itemIndex].id);
      } else {
        console.warn(result.reason?.message ?? String(result.reason));
      }
    });
    if (index + 4 < channels.length) await sleep(350);
  }

  const missing = channels.filter((channel) => !successfulChannels.has(channel.id));
  for (const channel of missing) {
    try {
      await sleep(250);
      videos.push(...(await fetchChannelFeed(channel)));
      successfulChannels.add(channel.id);
    } catch (error) {
      console.warn(`Retry failed for ${channel.name}: ${error.message}`);
    }
  }

  return { videos, channelCount: successfulChannels.size };
}

let updatedCountries = 0;
for (const country of countries) {
  const file = new URL(`${country.toLowerCase()}.json`, dataDir);
  const previous = JSON.parse(fs.readFileSync(file, "utf8"));
  const fresh = await collectCountry(country);
  if (!fresh.videos.length) {
    console.warn(`${country}: no fresh videos; keeping the previous snapshot`);
    continue;
  }

  const now = Date.now();
  const payload = {
    videos: mergeArchive(fresh.videos, previous.videos ?? [], previous.updatedAt, now),
    country,
    updatedAt: new Date(now).toISOString(),
    nextRefreshAt: new Date(now + 3 * hourMs).toISOString(),
    channelCount: fresh.channelCount,
    connected: true,
    stale: false,
    provider: "youtube-rss",
  };
  const temporaryFile = new URL(`${country.toLowerCase()}.json.tmp`, dataDir);
  fs.writeFileSync(temporaryFile, `${JSON.stringify(payload)}\n`);
  fs.renameSync(temporaryFile, file);
  updatedCountries += 1;
  console.log(`${country}: ${payload.videos.length} videos from ${fresh.channelCount} channels`);
}

if (!updatedCountries) throw new Error("No country catalog could be refreshed");
