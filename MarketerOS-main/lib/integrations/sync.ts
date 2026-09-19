export type NormalizedMetric = {
  externalId: string
  date: string
  impressions: number
  clicks: number
  conversions: number
  spend: number
  revenue: number
}

export type SyncResult = {
  metrics: NormalizedMetric[]
  summary: Record<string, unknown>
}

type SyncParams = {
  platform: string
  accountId: string
  apiKey: string
  metadata?: Record<string, unknown>
  from: Date
  to: Date
}

type ValidateAndSyncParams = SyncParams

const FETCH_TIMEOUT = 12_000

const manualSyncPlatforms = [
  "META_ADS",
  "INSTAGRAM",
  "FACEBOOK",
  "MESSENGER",
  "WHATSAPP",
  "YOUTUBE",
  "SHOPIFY",
  "TIKTOK",
  "LINKEDIN",
] as const

const oauthRequiredPlatforms = [
  "GOOGLE_ADS",
  "GOOGLE_ANALYTICS",
  "GOOGLE_SEARCH_CONSOLE",
  "GOOGLE_BUSINESS_PROFILE",
  "FIREBASE_ADMOB",
] as const

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0]
}

function formatISO(d: Date): string {
  return d.toISOString()
}

function emptyResult(error?: string): SyncResult {
  return {
    metrics: [],
    summary: error ? { error } : {},
  }
}

function emptyMetricForDate(date: string): NormalizedMetric {
  return {
    externalId: "",
    date,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    spend: 0,
    revenue: 0,
  }
}

function generateDateRange(from: Date, to: Date): string[] {
  const dates: string[] = []
  const current = new Date(from)
  while (current <= to) {
    dates.push(formatDate(current))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

function fetchWithTimeout(
  url: string | URL,
  init?: RequestInit,
  timeoutMs: number = FETCH_TIMEOUT
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  )
}

async function syncMetaAds(params: SyncParams): Promise<SyncResult> {
  const { accountId, apiKey, from, to } = params
  const url = new URL(
    `https://graph.facebook.com/v20.0/${accountId}/insights`
  )
  url.searchParams.set(
    "fields",
    "ad_id,ad_name,impressions,clicks,actions,spend,action_values,cpc,ctr,cpm"
  )
  url.searchParams.set("time_range[since]", formatDate(from))
  url.searchParams.set("time_range[until]", formatDate(to))
  url.searchParams.set("level", "day")
  url.searchParams.set("access_token", apiKey)

  const res = await fetchWithTimeout(url.toString())
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)

  const metrics: NormalizedMetric[] = (json.data || []).map(
    (row: Record<string, unknown>) => {
      const actions = (row.actions || []) as Array<{
        action_type: string
        value: string
      }>
      const actionValues = (row.action_values || []) as Array<{
        action_type: string
        value: string
      }>

      const conversions =
        actions
          .filter(
            (a) => a.action_type === "purchase" || a.action_type === "lead"
          )
          .reduce((sum, a) => sum + Number(a.value || 0), 0)

      const revenue = actionValues
        .filter((a) => a.action_type === "purchase")
        .reduce((sum, a) => sum + Number(a.value || 0), 0)

      return {
        externalId: String(row.ad_id || ""),
        date: String(row.date_start || formatDate(from)),
        impressions: Number(row.impressions || 0),
        clicks: Number(row.clicks || 0),
        conversions,
        spend: Number(row.spend || 0),
        revenue,
      }
    }
  )

  return { metrics, summary: { rowCount: metrics.length } }
}

async function syncInstagram(params: SyncParams): Promise<SyncResult> {
  const { accountId, apiKey, from, to } = params

  const igRes = await fetchWithTimeout(
    `https://graph.facebook.com/v20.0/${accountId}?fields=instagram_business_account&access_token=${apiKey}`
  )
  const igJson = await igRes.json()
  if (igJson.error) throw new Error(igJson.error.message)

  const igUserId = igJson.instagram_business_account?.id
  if (!igUserId) throw new Error("No Instagram business account linked")

  const insightsRes = await fetchWithTimeout(
    `https://graph.facebook.com/v20.0/${igUserId}/insights?metric=impressions,reach,engagement,profile_views&period=day&since=${formatDate(from)}&until=${formatDate(to)}&access_token=${apiKey}`
  )
  const insightsJson = await insightsRes.json()
  if (insightsJson.error) throw new Error(insightsJson.error.message)

  const dateMap = new Map<string, NormalizedMetric>()
  for (const d of generateDateRange(from, to)) {
    dateMap.set(d, {
      externalId: igUserId,
      date: d,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: 0,
      revenue: 0,
    })
  }

  for (const metric of insightsJson.data || []) {
    for (const val of metric.values || []) {
      const date = val.end_time?.split("T")[0]
      const entry = dateMap.get(date)
      if (!entry) continue
      if (metric.name === "impressions") entry.impressions = Number(val.value || 0)
      if (metric.name === "profile_views") entry.clicks = Number(val.value || 0)
      if (metric.name === "engagement")
        entry.clicks = entry.clicks || Number(val.value || 0)
    }
  }

  return {
    metrics: Array.from(dateMap.values()),
    summary: { igUserId },
  }
}

async function syncFacebook(params: SyncParams): Promise<SyncResult> {
  const { accountId, apiKey, from, to } = params
  const url = new URL(
    `https://graph.facebook.com/v20.0/${accountId}/insights`
  )
  url.searchParams.set(
    "fields",
    "page_impressions,page_views_total,page_post_engagements,page_fan_adds"
  )
  url.searchParams.set("period", "day")
  url.searchParams.set("since", formatDate(from))
  url.searchParams.set("until", formatDate(to))
  url.searchParams.set("access_token", apiKey)

  const res = await fetchWithTimeout(url.toString())
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)

  const dateMap = new Map<string, NormalizedMetric>()
  for (const d of generateDateRange(from, to)) {
    dateMap.set(d, emptyMetricForDate(d))
  }

  for (const metric of json.data || []) {
    for (const val of metric.values || []) {
      const date = val.end_time?.split("T")[0]
      const entry = dateMap.get(date)
      if (!entry) continue
      if (metric.name === "page_impressions")
        entry.impressions = Number(val.value || 0)
      if (metric.name === "page_views_total")
        entry.clicks = Number(val.value || 0)
      if (metric.name === "page_post_engagements")
        entry.clicks = entry.clicks || Number(val.value || 0)
      if (metric.name === "page_fan_adds")
        entry.conversions = Number(val.value || 0)
    }
  }

  return { metrics: Array.from(dateMap.values()), summary: {} }
}

async function syncMessenger(params: SyncParams): Promise<SyncResult> {
  const { accountId, apiKey, from, to } = params
  const url = new URL(
    `https://graph.facebook.com/v20.0/${accountId}/insights`
  )
  url.searchParams.set("fields", "page_messages_active_threads_unique")
  url.searchParams.set("period", "day")
  url.searchParams.set("since", formatDate(from))
  url.searchParams.set("until", formatDate(to))
  url.searchParams.set("access_token", apiKey)

  const res = await fetchWithTimeout(url.toString())
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)

  const dateMap = new Map<string, NormalizedMetric>()
  for (const d of generateDateRange(from, to)) {
    dateMap.set(d, emptyMetricForDate(d))
  }

  for (const metric of json.data || []) {
    for (const val of metric.values || []) {
      const date = val.end_time?.split("T")[0]
      const entry = dateMap.get(date)
      if (!entry) continue
      entry.impressions = Number(val.value || 0)
    }
  }

  return { metrics: Array.from(dateMap.values()), summary: {} }
}

async function syncWhatsApp(params: SyncParams): Promise<SyncResult> {
  const { accountId, apiKey, from, to } = params
  const url = new URL(
    `https://graph.facebook.com/v20.0/${accountId}/insights`
  )
  url.searchParams.set("fields", "messages_sent,messages_received,conversations")
  url.searchParams.set("period", "day")
  url.searchParams.set("since", formatDate(from))
  url.searchParams.set("until", formatDate(to))
  url.searchParams.set("access_token", apiKey)

  const res = await fetchWithTimeout(url.toString())
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)

  const dateMap = new Map<string, NormalizedMetric>()
  for (const d of generateDateRange(from, to)) {
    dateMap.set(d, emptyMetricForDate(d))
  }

  for (const metric of json.data || []) {
    for (const val of metric.values || []) {
      const date = val.end_time?.split("T")[0]
      const entry = dateMap.get(date)
      if (!entry) continue
      if (metric.name === "messages_sent")
        entry.impressions = Number(val.value || 0)
      if (metric.name === "messages_received")
        entry.clicks = Number(val.value || 0)
    }
  }

  return { metrics: Array.from(dateMap.values()), summary: {} }
}

async function syncYoutube(params: SyncParams): Promise<SyncResult> {
  const { accountId, apiKey, from, to } = params

  const [statsRes, searchRes] = await Promise.allSettled([
    fetchWithTimeout(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${accountId}&key=${apiKey}`
    ),
    fetchWithTimeout(
      `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${accountId}&publishedAfter=${formatISO(from)}&publishedBefore=${formatISO(to)}&maxResults=0&type=video&key=${apiKey}`
    ),
  ])

  const statsJson =
    statsRes.status === "fulfilled" ? await statsRes.value.json() : null
  const searchJson =
    searchRes.status === "fulfilled" ? await searchRes.value.json() : null

  if (statsJson?.error) throw new Error(statsJson.error.message)

  const channelStats = statsJson?.items?.[0]?.statistics
  const videoCount = searchJson?.pageInfo?.totalResults || 0
  const viewCount = Number(channelStats?.viewCount || 0)

  const metric: NormalizedMetric = {
    externalId: accountId,
    date: formatDate(from),
    impressions: viewCount,
    clicks: videoCount,
    conversions: 0,
    spend: 0,
    revenue: 0,
  }

  return {
    metrics: [metric],
    summary: {
      videoCount,
      subscriberCount: channelStats?.subscriberCount,
      totalViews: viewCount,
      note: "YouTube API key access provides aggregate stats, not daily breakdown",
    },
  }
}

async function syncShopify(params: SyncParams): Promise<SyncResult> {
  const { accountId, apiKey, from, to } = params
  const headers = { "X-Shopify-Access-Token": apiKey }
  const fromISO = formatISO(from)
  const toISO = formatISO(to)

  const [countRes, ordersRes] = await Promise.allSettled([
    fetchWithTimeout(
      `https://${accountId}/admin/api/2024-10/orders/count.json?status=any&created_at_min=${fromISO}&created_at_max=${toISO}`,
      { headers }
    ),
    fetchWithTimeout(
      `https://${accountId}/admin/api/2024-10/orders.json?status=any&created_at_min=${fromISO}&created_at_max=${toISO}&fields=id,total_price,total_discounts,created_at,line_items`,
      { headers }
    ),
  ])

  const countJson =
    countRes.status === "fulfilled" ? await countRes.value.json() : null
  const ordersJson =
    ordersRes.status === "fulfilled" ? await ordersRes.value.json() : null

  if (countJson?.errors) throw new Error(JSON.stringify(countJson.errors))
  if (ordersJson?.errors) throw new Error(JSON.stringify(ordersJson.errors))

  const orders = ordersJson?.orders || []
  const dateMap = new Map<string, NormalizedMetric>()
  for (const d of generateDateRange(from, to)) {
    dateMap.set(d, emptyMetricForDate(d))
  }

  for (const order of orders) {
    const date = order.created_at?.split("T")[0]
    const entry = dateMap.get(date)
    if (!entry) continue
    entry.impressions += 1
    entry.conversions += 1
    entry.spend += Number(order.total_discounts || 0)
    entry.revenue += Number(order.total_price || 0)
    const lineItemCount = (order.line_items || []).length
    entry.clicks += lineItemCount
  }

  return {
    metrics: Array.from(dateMap.values()),
    summary: {
      orderCount: countJson?.count ?? orders.length,
      fetchedOrders: orders.length,
    },
  }
}

async function syncTiktok(params: SyncParams): Promise<SyncResult> {
  const { accountId, apiKey, from, to } = params
  const body = {
    advertiser_ids: [accountId],
    report_type: "BASIC",
    data_level: "AUCTION_ADVERTISER",
    dimensions: ["stat_time_day"],
    metrics: [
      "spend",
      "impressions",
      "clicks",
      "conversion",
      "conversion_rate",
      "cost_per_conversion",
      "campaign_name",
    ],
    start_date: formatDate(from),
    end_date: formatDate(to),
    page: 1,
    page_size: 100,
  }

  const res = await fetchWithTimeout(
    "https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": apiKey,
      },
      body: JSON.stringify(body),
    }
  )
  const json = await res.json()
  if (json.code !== 0) throw new Error(json.message || "TikTok API error")

  const metrics: NormalizedMetric[] = (
    json.data?.list || []
  ).map((row: Record<string, unknown>) => {
    const dims = (row.dimensions || {}) as Record<string, string>
    const mets = (row.metrics || {}) as Record<string, number>
    return {
      externalId: String(dims.advertiser_id || accountId),
      date: String(dims.stat_time_day || formatDate(from)),
      impressions: Number(mets.impressions || 0),
      clicks: Number(mets.clicks || 0),
      conversions: Number(mets.conversion || 0),
      spend: Number(mets.spend || 0),
      revenue: 0,
    }
  })

  return {
    metrics,
    summary: { rowCount: metrics.length },
  }
}

async function syncLinkedin(params: SyncParams): Promise<SyncResult> {
  const { accountId, apiKey, from, to } = params
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "LinkedIn-Version": "202401",
    "X-Restli-Protocol-Version": "2.0.0",
  }

  try {
    const analyticsUrl = new URL(
      "https://api.linkedin.com/v2/adAnalyticsV2"
    )
    analyticsUrl.searchParams.set("q", "analyticsByCampaign")
    analyticsUrl.searchParams.set(
      "dateRange",
      `(start:(day:${from.getDate()},month:${from.getMonth() + 1},year:${from.getFullYear()}),end:(day:${to.getDate()},month:${to.getMonth() + 1},year:${to.getFullYear()}))`
    )
    analyticsUrl.searchParams.set("pivotsBy", "TIME_PERIOD")
    analyticsUrl.searchParams.set("timeGranularity", "DAY")
    analyticsUrl.searchParams.set(
      "accounts",
      `urn:li:sponsoredAccount:${accountId}`
    )
    analyticsUrl.searchParams.set(
      "columns",
      "impressions,clicks,conversions,costInLocalCurrency"
    )

    const res = await fetchWithTimeout(analyticsUrl.toString(), { headers })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message || "LinkedIn API error")

    const dateMap = new Map<string, NormalizedMetric>()
    for (const d of generateDateRange(from, to)) {
      dateMap.set(d, emptyMetricForDate(d))
    }

    for (const row of json.elements || []) {
      const dateRange = row.dateRange?.start
        ? `${row.dateRange.start.year}-${String(row.dateRange.start.month).padStart(2, "0")}-${String(row.dateRange.start.day).padStart(2, "0")}`
        : formatDate(from)
      const entry = dateMap.get(dateRange)
      if (!entry) continue
      entry.impressions = Number(row.impressions || 0)
      entry.clicks = Number(row.clicks || 0)
      entry.conversions = Number(row.conversions || 0)
      entry.spend = Number(row.costInLocalCurrency || 0)
    }

    return { metrics: Array.from(dateMap.values()), summary: {} }
  } catch {
    return emptyResult("LinkedIn analytics sync failed. Falling back to empty metrics.")
  }
}

const syncers: Record<string, (params: SyncParams) => Promise<SyncResult>> = {
  META_ADS: syncMetaAds,
  INSTAGRAM: syncInstagram,
  FACEBOOK: syncFacebook,
  MESSENGER: syncMessenger,
  WHATSAPP: syncWhatsApp,
  YOUTUBE: syncYoutube,
  SHOPIFY: syncShopify,
  TIKTOK: syncTiktok,
  LINKEDIN: syncLinkedin,
}

const oauthMessages: Record<string, string> = {
  GOOGLE_ADS:
    "Google Ads sync requires OAuth. Please reconnect via Google OAuth for real data sync.",
  GOOGLE_ANALYTICS:
    "Google Analytics sync requires OAuth. Please reconnect via Google OAuth for real data sync.",
  GOOGLE_SEARCH_CONSOLE:
    "Google Search Console sync requires OAuth. Please reconnect via Google OAuth for real data sync.",
  GOOGLE_BUSINESS_PROFILE:
    "Google Business Profile sync requires OAuth. Please reconnect via Google OAuth for real data sync.",
  FIREBASE_ADMOB:
    "Firebase & AdMob sync requires a service account. Please reconnect via service account for real data sync.",
}

export async function syncPlatformMetrics(
  params: SyncParams
): Promise<SyncResult> {
  try {
    if (oauthRequiredPlatforms.includes(params.platform as typeof oauthRequiredPlatforms[number])) {
      return emptyResult(oauthMessages[params.platform] || "OAuth required")
    }

    const syncer = syncers[params.platform]
    if (!syncer) {
      return emptyResult(`Unknown platform: ${params.platform}`)
    }

    return await syncer(params)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown sync error"
    return emptyResult(message)
  }
}

export async function validateAndSync(
  params: ValidateAndSyncParams
): Promise<SyncResult> {
  if (!params.apiKey) {
    return emptyResult("API key is required")
  }
  if (!params.accountId) {
    return emptyResult("Account ID is required")
  }
  if (params.from > params.to) {
    return emptyResult("Start date must be before end date")
  }

  return syncPlatformMetrics(params)
}
