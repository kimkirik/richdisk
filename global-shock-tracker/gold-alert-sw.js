const CACHE_NAME = "global-shock-tracker-market-alert-v3"
const SIGNAL_KINDS = ["gold", "btc", "cash"]
const BTC_ALERT_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000
const PUBLIC_API_ORIGIN = "https://global-shock-tracker.kimkirik.chatgpt.site"

function appUrl(path) {
  return new URL(path, self.registration.scope).toString()
}

function marketSignalUrl() {
  if (self.location.hostname.endsWith(".chatgpt.site")) {
    return appUrl("api/market-signals")
  }
  return `${PUBLIC_API_ORIGIN}/api/market-signals?client=github-pages-v1`
}

function stateUrl(kind) {
  return appUrl(`__market_signal_alert_state__/${kind}`)
}

function cooldownUrl(kind) {
  return appUrl(`__market_signal_alert_cooldown__/${kind}`)
}

function signalDetails(kind, payload) {
  if (kind === "cash") {
    return {
      triggered: ["high", "cash-first"].includes(payload?.cash?.level),
      key: payload?.cash?.level,
      title: `긴급 시장 경보 · ${payload?.cash?.label}`,
      body: payload?.cash?.summary,
    }
  }

  const signal = payload?.[kind]
  return {
    triggered: ["buy", "strong-buy"].includes(signal?.level),
    key: signal?.level,
    title: `${kind === "gold" ? "금" : "BTC"} 신호 · ${signal?.label}`,
    body: `${signal?.strength}점 — ${signal?.summary}`,
  }
}

async function checkMarketSignal(kind) {
  if (!SIGNAL_KINDS.includes(kind)) return
  const response = await fetch(marketSignalUrl(), { headers: { Accept: "application/json" } })
  if (!response.ok) return
  const payload = await response.json()
  if (payload?.status !== "ok") return

  const details = signalDetails(kind, payload)
  const cache = await caches.open(CACHE_NAME)
  if (!details.triggered) {
    await cache.delete(stateUrl(kind))
    return
  }
  if (kind === "btc") {
    const cooldown = await cache.match(cooldownUrl(kind))
    const lastAlertAt = cooldown ? Number(await cooldown.text()) : 0
    if (lastAlertAt > 0 && Date.now() - lastAlertAt < BTC_ALERT_COOLDOWN_MS) return
  }
  const previous = await cache.match(stateUrl(kind))
  const previousKey = previous ? await previous.text() : ""
  if (previousKey === details.key) return

  await self.registration.showNotification(details.title, {
    body: details.body,
    icon: appUrl("shockwave-app-icon-192.png"),
    badge: appUrl("shockwave-app-icon-192.png"),
    tag: `market-${kind}-signal`,
    data: { url: appUrl("#gold-signal") },
  })
  await cache.put(stateUrl(kind), new Response(details.key, { headers: { "Content-Type": "text/plain" } }))
  if (kind === "btc") {
    await cache.put(cooldownUrl(kind), new Response(String(Date.now()), { headers: { "Content-Type": "text/plain" } }))
  }
}

self.addEventListener("periodicsync", (event) => {
  const legacyKind = event.tag === "gold-signal-check" ? "gold" : null
  const kind = legacyKind ?? event.tag.replace("market-signal-", "")
  if (SIGNAL_KINDS.includes(kind)) event.waitUntil(checkMarketSignal(kind))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const targetUrl = new URL(event.notification.data?.url || "#gold-signal", self.registration.scope).toString()
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.startsWith(self.registration.scope))
      if (existing) return existing.focus().then(() => existing.navigate(targetUrl))
      return self.clients.openWindow(targetUrl)
    }),
  )
})
