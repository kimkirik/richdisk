import fs from "node:fs";

const dataDir = new URL("../data/", import.meta.url);
const countries = ["KR", "US", "GB", "JP"];
const lowRelevanceTitle = /official\s+(music\s+)?video|music\s+video|뮤직\s*비디오|\bM\/?V\b|티저|teaser|trailer|예고|선공개|preview|coming\s+soon|힌트캠|hint\s*cam/i;
const errors = [];

for (const country of countries) {
  const payload = JSON.parse(
    fs.readFileSync(new URL(`${country.toLowerCase()}.json`, dataDir), "utf8"),
  );
  const videos = Array.isArray(payload.videos) ? payload.videos : [];
  const active = videos.filter((video) => video.inCurrentFeed);
  const top = [...active]
    .sort((a, b) => (b.trendScore ?? 0) - (a.trendScore ?? 0))
    .slice(0, 20);
  const ids = new Set();
  const channelCounts = new Map();

  for (const video of videos) {
    if (!video.youtubeId || ids.has(video.youtubeId)) {
      errors.push(`${country}: duplicate or missing video id ${video.youtubeId ?? "<missing>"}`);
    }
    ids.add(video.youtubeId);
  }

  for (const video of active) {
    if ((video.viewGain24h ?? 0) > (video.views ?? 0)) {
      errors.push(`${country}: 24h gain exceeds lifetime views for ${video.youtubeId}`);
    }
  }

  for (const video of top) {
    channelCounts.set(video.channel, (channelCounts.get(video.channel) ?? 0) + 1);
    if (lowRelevanceTitle.test(video.title)) {
      errors.push(`${country}: low-relevance title reached the top 20: ${video.title}`);
    }
  }

  const mostFrequent = [...channelCounts.entries()]
    .sort((a, b) => b[1] - a[1])[0];
  if ((mostFrequent?.[1] ?? 0) > 5) {
    errors.push(`${country}: ${mostFrequent[0]} occupies ${mostFrequent[1]} of the top 20`);
  }

  console.log(
    `${country}: ${active.length} active candidates; top channel ${mostFrequent?.[0] ?? "none"} (${mostFrequent?.[1] ?? 0}/20)`,
  );
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Smile Comedy Hub ranking data passed validation.");
}
