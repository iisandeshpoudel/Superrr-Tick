const STORAGE_KEY = "gnopDiscoveryState";
const MAX_EVENTS = 2500;
const MAX_TEXT_LENGTH = 80000;

importScripts("extractor.js");
importScripts("report-export.js");
importScripts("xlsx-writer.js");

function nowIso() {
  return new Date().toISOString();
}

function createInitialState() {
  return {
    version: 1,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ignoredCount: 0,
    pageMetaByTabId: {},
    events: []
  };
}

async function loadState() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const existing = data[STORAGE_KEY];
  if (existing && typeof existing === "object") {
    return existing;
  }
  const initial = createInitialState();
  await chrome.storage.local.set({ [STORAGE_KEY]: initial });
  return initial;
}

async function saveState(state) {
  state.updatedAt = Date.now();
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

function trimText(value, maxLen = MAX_TEXT_LENGTH) {
  if (typeof value !== "string") {
    return value;
  }
  if (value.length <= maxLen) {
    return value;
  }
  return value.slice(0, maxLen) + "\n...[TRUNCATED]";
}

function normalizeUrl(rawUrl, pageUrl) {
  const urlValue = typeof rawUrl === "string" ? rawUrl : "";
  if (!urlValue) {
    return "";
  }

  try {
    if (pageUrl) {
      return new URL(urlValue, pageUrl).toString();
    }
    return new URL(urlValue).toString();
  } catch (_error) {
    return urlValue;
  }
}

function shouldCaptureUrl(urlText) {
  if (!urlText) {
    return false;
  }

  try {
    const url = new URL(urlText);
    if (url.hostname !== "gnop.nebula.gogoro.com") {
      return false;
    }
    const path = url.pathname || "";
    return (
      path.includes("/api/v1/reports/gs-statistic/") ||
      path.includes("/api/v1/gostation/site/search")
    );
  } catch (_error) {
    return false;
  }
}

function endpointKeyFromUrl(urlText) {
  try {
    const url = new URL(urlText);
    const path = url.pathname || "";

    if (path.includes("/api/v1/gostation/site/search")) {
      return "site-search";
    }
    if (path.includes("swap-count")) {
      return "swap-count";
    }
    if (path.includes("swap-summary")) {
      return "swap-summary";
    }
    if (path.includes("swap-memory")) {
      return "swap-memory";
    }

    const idx = path.indexOf("/api/v1/reports/gs-statistic/");
    if (idx >= 0) {
      const suffix = path.slice(idx + "/api/v1/reports/gs-statistic/".length);
      return suffix || "gs-statistic-unknown";
    }

    return path || "unknown";
  } catch (_error) {
    return "unknown";
  }
}

function parseSiteListToken(siteListToken) {
  if (!siteListToken) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(siteListToken);
    const parts = decoded.split("^");
    if (parts.length < 3) {
      return null;
    }

    const siteRid = parts[0] || "";
    const siteNameJson = parts[1] || "";
    const siteId = parts[2] || "";

    let siteName = "";
    try {
      const parsedName = JSON.parse(siteNameJson);
      siteName = parsedName.local || parsedName["en-US"] || "";
    } catch (_error) {
      siteName = "";
    }

    return {
      siteId,
      siteRid,
      siteName
    };
  } catch (_error) {
    return null;
  }
}

function scopeFromPageUrl(pageUrl) {
  if (!pageUrl) {
    return {
      scopeType: "unknown",
      siteId: "",
      siteRid: "",
      siteName: ""
    };
  }

  try {
    const url = new URL(pageUrl);
    const token = url.searchParams.get("_siteList");
    const parsed = parseSiteListToken(token);
    if (parsed) {
      return {
        scopeType: "site",
        siteId: parsed.siteId,
        siteRid: parsed.siteRid,
        siteName: parsed.siteName
      };
    }
    return {
      scopeType: "total",
      siteId: "",
      siteRid: "",
      siteName: "ALL_SITES"
    };
  } catch (_error) {
    return {
      scopeType: "unknown",
      siteId: "",
      siteRid: "",
      siteName: ""
    };
  }
}

function scopeFromRequestBody(bodyJson, fallbackScope = {}) {
  const siteIds = Array.isArray(bodyJson?.siteIds) ? bodyJson.siteIds.filter(Boolean) : [];
  if (siteIds.length > 0) {
    const siteId = String(siteIds[0]);
    const fallbackSiteId = fallbackScope.siteId || "";
    const matchesFallback = fallbackSiteId && fallbackSiteId === siteId;
    return {
      scopeType: "site",
      siteId,
      siteRid: matchesFallback ? fallbackScope.siteRid || "" : "",
      siteName: matchesFallback ? fallbackScope.siteName || "" : ""
    };
  }

  return {
    scopeType: "total",
    siteId: "",
    siteRid: "",
    siteName: "ALL_SITES"
  };
}

function tryParseJson(value) {
  if (typeof value !== "string") {
    return null;
  }
  const text = value.trim();
  if (!text) {
    return null;
  }
  const first = text[0];
  if (first !== "{" && first !== "[") {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (_error) {
    return null;
  }
}

function normalizeRequestBody(body) {
  if (body == null) {
    return { json: null, text: null };
  }

  if (typeof body === "string") {
    const parsed = tryParseJson(body);
    if (parsed !== null) {
      return { json: parsed, text: null };
    }
    return { json: null, text: trimText(body) };
  }

  if (typeof body === "object") {
    return { json: body, text: null };
  }

  return { json: null, text: trimText(String(body)) };
}

function normalizeResponse(payloadResponse) {
  const source = payloadResponse || {};
  const jsonBody = source.json && typeof source.json === "object" ? source.json : null;
  const textBody = jsonBody ? null : trimText(source.text || null);

  return {
    status: Number.isFinite(source.status) ? source.status : null,
    ok: typeof source.ok === "boolean" ? source.ok : null,
    headers: source.headers && typeof source.headers === "object" ? source.headers : {},
    bodyJson: jsonBody,
    bodyText: textBody
  };
}

function summarizeEvents(events) {
  const byEndpoint = {};
  const byScopeType = {};

  for (const event of events) {
    const endpointKey = event.endpoint.key || "unknown";
    const scopeType = event.requestScope?.scopeType || event.page.scope.scopeType || "unknown";
    byEndpoint[endpointKey] = (byEndpoint[endpointKey] || 0) + 1;
    byScopeType[scopeType] = (byScopeType[scopeType] || 0) + 1;
  }

  return {
    totalEvents: events.length,
    byEndpoint,
    byScopeType
  };
}

function summarizeRequestScopes(events) {
  const byScopeType = {};
  const bySiteId = {};

  for (const event of events) {
    const scope = event.requestScope || event.page.scope || {};
    const scopeType = scope.scopeType || "unknown";
    const siteId = scope.siteId || "";
    byScopeType[scopeType] = (byScopeType[scopeType] || 0) + 1;
    const siteKey = siteId || "TOTAL";
    bySiteId[siteKey] = (bySiteId[siteKey] || 0) + 1;
  }

  return {
    byScopeType,
    bySiteId
  };
}

function getLatestPageMeta(pageMetaByTabId) {
  const metas = Object.entries(pageMetaByTabId || {}).map(([tabId, meta]) => ({
    tabId,
    ...meta
  }));
  if (metas.length === 0) {
    return null;
  }
  metas.sort((a, b) => {
    const aTime = new Date(a.seenAt || 0).getTime();
    const bTime = new Date(b.seenAt || 0).getTime();
    return bTime - aTime;
  });
  return metas[0];
}

function pickSample(events, endpointKey, scopeType) {
  return (
    events.find((event) => {
      if (event.endpoint.key !== endpointKey) {
        return false;
      }
      if ((event.requestScope?.scopeType || event.page.scope.scopeType) !== scopeType) {
        return false;
      }
      return event.response && (event.response.bodyJson || event.response.bodyText);
    }) || null
  );
}

function buildExportPayload(state) {
  const events = state.events || [];
  const summary = summarizeEvents(events);
  const endpointKeys = Array.from(new Set(events.map((e) => e.endpoint.key))).sort();
  const samples = {};
  const requestScopeSummary = {};

  for (const event of events) {
    const scopeType = event.requestScope?.scopeType || event.page.scope.scopeType || "unknown";
    requestScopeSummary[scopeType] = (requestScopeSummary[scopeType] || 0) + 1;
  }

  for (const endpointKey of endpointKeys) {
    samples[endpointKey] = {
      total: pickSample(events, endpointKey, "total"),
      site: pickSample(events, endpointKey, "site")
    };
  }

  return {
    exportedAt: nowIso(),
    exportedAtEpochMs: Date.now(),
    extension: {
      name: chrome.runtime.getManifest().name,
      version: chrome.runtime.getManifest().version
    },
    captureConfig: {
      enabled: state.enabled,
      maxEvents: MAX_EVENTS,
      onlyDashboardDefaultDate: true,
      totalMeansNoSiteSelection: true
    },
    summary,
    requestScopeSummary,
    samples,
    pageMetaByTabId: state.pageMetaByTabId || {},
    events
  };
}

async function getNormalizedExport() {
  const state = await loadState();
  const extractor = globalThis.GNOPDiscoveryExtractor;
  if (!extractor) {
    return { ok: false, error: "Normalization helpers are unavailable" };
  }

  const events = state.events || [];
  const siteLookup = extractor.buildSiteLookup(events);
  const latestPageMeta = getLatestPageMeta(state.pageMetaByTabId || {});
  const exportData = extractor.buildExportBundle(events, siteLookup, {
    latestPageMeta,
    pageMetaByTabId: state.pageMetaByTabId || {}
  });

  return {
    ok: true,
    exportData
  };
}

async function buildWorkbook(message) {
  const payload = message.payload || {};
  const exporter = globalThis.GNOPReportExporter;
  if (!exporter) {
    return { ok: false, error: "Report exporter is unavailable" };
  }

  const notifyProgress = async (progress) => {
    try {
      await chrome.runtime.sendMessage({ type: "GNOP_EXPORT_PROGRESS", payload: progress });
    } catch (_error) {
      void _error;
    }
  };

  const workbookModel = await exporter.buildWorkbookModel({
    timeScale: payload.timeScale,
    startDate: payload.startDate,
    endDate: payload.endDate,
    timezoneHeader: payload.timezoneHeader,
    onProgress: notifyProgress
  });

  return { ok: true, workbookModel };
}

async function downloadWorkbook(message) {
  return buildWorkbook(message);
}

async function handleCapture(message, sender) {
  const payload = message.payload || {};
  const pageUrl = payload.pageUrl || sender?.tab?.url || "";
  const request = payload.request || {};
  const normalizedUrl = normalizeUrl(request.url || "", pageUrl);

  const state = await loadState();
  if (!state.enabled) {
    return { ok: true, captured: false, reason: "paused" };
  }

  if (!shouldCaptureUrl(normalizedUrl)) {
    state.ignoredCount = (state.ignoredCount || 0) + 1;
    await saveState(state);
    return { ok: true, captured: false, reason: "filtered-out" };
  }

  const body = normalizeRequestBody(request.body);
  const requestScope = scopeFromRequestBody(body.json, scopeFromPageUrl(pageUrl));
  const event = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    capturedAt: nowIso(),
    capturedAtEpochMs: Date.now(),
    transport: payload.transport || "unknown",
    timing: {
      startedAtEpochMs: Number.isFinite(payload.startedAt) ? payload.startedAt : null,
      finishedAtEpochMs: Number.isFinite(payload.finishedAt) ? payload.finishedAt : null
    },
    page: {
      url: pageUrl,
      title: payload.documentTitle || "",
      scope: scopeFromPageUrl(pageUrl)
    },
    requestScope,
    endpoint: {
      key: endpointKeyFromUrl(normalizedUrl),
      url: normalizedUrl,
      method: (request.method || "GET").toUpperCase()
    },
    request: {
      headers: request.headers && typeof request.headers === "object" ? request.headers : {},
      bodyJson: body.json,
      bodyText: body.text
    },
    response: normalizeResponse(payload.response),
    error: payload.error || null
  };

  state.events.push(event);
  if (state.events.length > MAX_EVENTS) {
    const removeCount = state.events.length - MAX_EVENTS;
    state.events.splice(0, removeCount);
  }

  await saveState(state);
  return { ok: true, captured: true, eventId: event.id };
}

async function handlePageMeta(message, sender) {
  const payload = message.payload || {};
  const state = await loadState();
  const tabId = sender?.tab?.id != null ? String(sender.tab.id) : "unknown";

  state.pageMetaByTabId[tabId] = {
    seenAt: nowIso(),
    pageUrl: payload.pageUrl || sender?.tab?.url || "",
    title: payload.documentTitle || "",
    timezone: payload.timezone || "",
    timezoneOffsetMinutes:
      Number.isFinite(payload.timezoneOffsetMinutes) ? payload.timezoneOffsetMinutes : null
  };

  await saveState(state);
  return { ok: true };
}

async function setEnabled(enabled) {
  const state = await loadState();
  state.enabled = Boolean(enabled);
  await saveState(state);
  return { ok: true, enabled: state.enabled };
}

async function clearCaptures() {
  const state = await loadState();
  state.events = [];
  state.ignoredCount = 0;
  await saveState(state);
  return { ok: true };
}

async function getStatus() {
  const state = await loadState();
  const summary = summarizeEvents(state.events || []);
  const requestScopeSummary = summarizeRequestScopes(state.events || []);
  const latestEvent = state.events && state.events.length > 0 ? state.events[state.events.length - 1] : null;
  const latestPageMeta = getLatestPageMeta(state.pageMetaByTabId || {});
  return {
    ok: true,
    status: {
      enabled: state.enabled,
      createdAtEpochMs: state.createdAt,
      updatedAtEpochMs: state.updatedAt,
      ignoredCount: state.ignoredCount || 0,
      totalEvents: summary.totalEvents,
      byEndpoint: summary.byEndpoint,
      byScopeType: summary.byScopeType,
      requestScopeSummary,
      lastCapturedAt: latestEvent ? latestEvent.capturedAt : null,
      lastRequestScope: latestEvent ? latestEvent.requestScope || latestEvent.page.scope : null,
      latestPageMeta,
      knownTabs: Object.keys(state.pageMetaByTabId || {}).length
    }
  };
}

async function getExportData() {
  const state = await loadState();
  return {
    ok: true,
    exportData: buildExportPayload(state)
  };
}

chrome.runtime.onInstalled.addListener(async () => {
  await loadState();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    const type = message && message.type;
    switch (type) {
      case "GNOP_DISCOVERY_CAPTURE":
        return handleCapture(message, sender);
      case "GNOP_DISCOVERY_PAGE_META":
        return handlePageMeta(message, sender);
      case "GNOP_DISCOVERY_SET_ENABLED":
        return setEnabled(message.enabled);
      case "GNOP_DISCOVERY_CLEAR":
        return clearCaptures();
      case "GNOP_DISCOVERY_GET_STATUS":
        return getStatus();
      case "GNOP_DISCOVERY_GET_EXPORT":
        return getExportData();
      case "GNOP_DISCOVERY_GET_NORMALIZED_EXPORT":
        return getNormalizedExport();
      case "GNOP_DISCOVERY_BUILD_WORKBOOK":
        return buildWorkbook(message);
      case "GNOP_DISCOVERY_DOWNLOAD_WORKBOOK":
        return downloadWorkbook(message);
      default:
        return { ok: false, error: "Unknown message type" };
    }
  })()
    .then((result) => sendResponse(result))
    .catch((error) => {
      sendResponse({ ok: false, error: String(error) });
    });

  return true;
});
