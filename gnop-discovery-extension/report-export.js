(function initReportExporter() {
  const API_ORIGIN = "https://gnop.nebula.gogoro.com";
  const COMPANY_ID = "6MyzkQeJ";
  const DEFAULT_PER_PAGE = 10;
  const DEFAULT_TIMEZONE_HEADER = "+05:45";
  const NEPAL_TIMEZONE_OFFSET_MINUTES = 5 * 60 + 45;
  const NEPAL_TIMEZONE_OFFSET_MS = NEPAL_TIMEZONE_OFFSET_MINUTES * 60 * 1000;

  const BASE_HEADERS = {
    accept: "application/json, text/plain, */*",
    client: "gnop",
    "enop-sub": "gnop",
    language: "en-US"
  };

  const EXCLUDED_SITE_IDS = new Set(["530b7nMO"]);
  const EXCLUDED_SITE_NAMES = new Set(["bafal testing centre 2"]);

  const INVALID_SHEET_CHARS = /[\\/?*\[\]:]/g;

  function normalizeSheetBaseName(name) {
    return String(name || "")
      .replace(INVALID_SHEET_CHARS, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function sanitizeSheetName(name, usedNames, fallback) {
    const baseText = normalizeSheetBaseName(name || fallback || "Sheet") || (fallback || "Sheet");
    const base = baseText.slice(0, 31);
    let candidate = base || (fallback || "Sheet").slice(0, 31);
    let suffix = 2;

    while (usedNames.has(candidate.toLowerCase())) {
      const suffixText = ` ${suffix}`;
      const available = Math.max(1, 31 - suffixText.length);
      candidate = `${base.slice(0, available).trimEnd()}${suffixText}`;
      suffix += 1;
    }

    usedNames.add(candidate.toLowerCase());
    return candidate;
  }

  function parseDateOnly(dateText) {
    if (typeof dateText !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
      throw new Error(`Invalid date: ${String(dateText)}`);
    }
    const [year, month, day] = dateText.split("-").map((part) => Number(part));
    if (!year || !month || !day) {
      throw new Error(`Invalid date: ${String(dateText)}`);
    }
    return { year, month, day };
  }

  function normalizeDateText(value) {
    if (value == null || value === "") {
      throw new Error(`Invalid date: ${String(value)}`);
    }

    const text = String(value).trim();
    if (/^\d{10,13}$/.test(text)) {
      const numeric = Number(text);
      const ms = text.length >= 13 ? numeric : numeric * 1000;
      const date = new Date(ms + NEPAL_TIMEZONE_OFFSET_MS);
      if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid date: ${String(value)}`);
      }
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      const day = String(date.getUTCDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }

    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      const date = new Date(parsed.getTime() + NEPAL_TIMEZONE_OFFSET_MS);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      const day = String(date.getUTCDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    throw new Error(`Invalid date: ${String(value)}`);
  }

  function parseRangeBoundary(value, endOfDay = false) {
    if (value == null || value === "") {
      throw new Error(`Invalid date: ${String(value)}`);
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return value > 1e12 ? Math.floor(value / 1000) : Math.floor(value);
    }

    const text = String(value).trim();
    if (/^\d{10,13}$/.test(text)) {
      const numeric = Number(text);
      return text.length >= 13 ? Math.floor(numeric / 1000) : Math.floor(numeric);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return localEpochSeconds(text, endOfDay);
    }

    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      return Math.floor(parsed.getTime() / 1000);
    }

    throw new Error(`Invalid date: ${String(value)}`);
  }

  function isExcludedSite(site) {
    const siteId = String(site?.siteId || "").trim();
    if (siteId && EXCLUDED_SITE_IDS.has(siteId)) {
      return true;
    }

    const siteName = String(site?.siteName?.local || site?.siteName?.["en-US"] || site?.siteName || "")
      .trim()
      .toLowerCase();
    return siteName ? EXCLUDED_SITE_NAMES.has(siteName) : false;
  }

  function localEpochSeconds(dateText, endOfDay = false) {
    const { year, month, day } = parseDateOnly(dateText);
    const utcMs = Date.UTC(
      year,
      month - 1,
      day,
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0
    );
    return Math.floor((utcMs - NEPAL_TIMEZONE_OFFSET_MS) / 1000);
  }

  function addBucketEpoch(baseEpochSeconds, timeScale, index) {
    const bucketSeconds = timeScale === "hours" ? 3600 : 86400;
    return baseEpochSeconds + bucketSeconds * index;
  }

  function formatBucketDate(epochSeconds, timeScale) {
    const date = new Date(epochSeconds * 1000 + NEPAL_TIMEZONE_OFFSET_MS);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    if (timeScale === "hours") {
      const h = String(date.getUTCHours()).padStart(2, "0");
      return `${y}-${m}-${d} ${h}:00`;
    }
    return `${y}-${m}-${d}`;
  }

  function buildRequestHeaders(timezoneHeader, isJson = false) {
    const headers = {
      ...BASE_HEADERS,
      timezone: timezoneHeader || DEFAULT_TIMEZONE_HEADER
    };

    if (isJson) {
      headers["content-type"] = "application/json";
    }

    return headers;
  }

  async function fetchJson(url, init = {}, timezoneHeader) {
    const response = await fetch(url, {
      credentials: "include",
      mode: "cors",
      cache: "no-store",
      ...init,
      headers: buildRequestHeaders(timezoneHeader, init.method === "POST"),
    });

    const text = await response.text();
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch (_error) {
        json = null;
      }
    }

    if (!response.ok) {
      const trimmed = text.length > 300 ? `${text.slice(0, 300)}...` : text;
      throw new Error(`HTTP ${response.status} for ${url}: ${trimmed}`);
    }

    return {
      status: response.status,
      headers: response.headers,
      json,
      text
    };
  }

  async function fetchSiteInventory(timezoneHeader) {
    const sites = [];
    const seen = new Set();
    let totalCount = null;
    let page = 1;

    while (true) {
      const url = new URL(`${API_ORIGIN}/api/v1/gostation/site/search`);
      url.searchParams.set("companyId", COMPANY_ID);
      url.searchParams.set("hasInverter", "");
      url.searchParams.set("page", String(page));
      url.searchParams.set("perPage", String(DEFAULT_PER_PAGE));
      url.searchParams.set("photoIncluded", "");
      url.searchParams.set("siteName", "");
      url.searchParams.set("siteRid", "");

      const result = await fetchJson(url.toString(), { method: "GET" }, timezoneHeader);
      const rows = Array.isArray(result.json) ? result.json : [];
      const headerCount = Number(result.headers.get("x-total-count") || 0);
      if (!Number.isNaN(headerCount) && headerCount > 0 && totalCount === null) {
        totalCount = headerCount;
      }

      for (const site of rows) {
        if (!site || typeof site !== "object" || !site.siteId) {
          continue;
        }
        // Bafal Testing centre 2 is a test site, so keep it out of exports.
        if (isExcludedSite(site)) {
          continue;
        }
        if (seen.has(site.siteId)) {
          continue;
        }
        seen.add(site.siteId);
        sites.push(site);
      }

      if (rows.length < DEFAULT_PER_PAGE) {
        break;
      }
      if (totalCount !== null && sites.length >= totalCount) {
        break;
      }

      page += 1;
      if (page > 20) {
        break;
      }
    }

    return sites;
  }

  async function fetchReport(endpoint, body, timezoneHeader) {
    const url = `${API_ORIGIN}/api/v1/reports/gs-statistic/${endpoint}`;
    const result = await fetchJson(
      url,
      {
        method: "POST",
        body: JSON.stringify(body)
      },
      timezoneHeader
    );
    return result.json || {};
  }

  function buildReportBody(dimension, fromDate, endDate, timeScale, siteId) {
    const body = {
      reportSetting: {
        fromDate,
        endDate,
        timeScale
      }
    };

    if (dimension != null) {
      body.dimension = dimension;
    }

    if (siteId) {
      body.siteIds = [siteId];
    }

    return body;
  }

  function sumSeriesValues(seriesList, key) {
    const list = Array.isArray(seriesList) ? seriesList : [];
    let maxLength = 0;
    for (const series of list) {
      const values = Array.isArray(series?.[key]) ? series[key] : [];
      if (values.length > maxLength) {
        maxLength = values.length;
      }
    }

    const out = new Array(maxLength).fill(0);
    for (const series of list) {
      const values = Array.isArray(series?.[key]) ? series[key] : [];
      for (let i = 0; i < values.length; i += 1) {
        const num = Number(values[i] ?? 0);
        out[i] += Number.isFinite(num) ? num : 0;
      }
    }

    return out;
  }

  function buildSheetRows({ countJson, summaryJson, startEpoch, timeScale }) {
    const countSeries = Array.isArray(countJson?.series) ? countJson.series : [];
    const summarySeries = Array.isArray(summaryJson?.series) ? summaryJson.series : [];
    const swapCount = sumSeriesValues(countSeries, "swapCount");
    const socBelowNinetyCount = sumSeriesValues(summarySeries, "socBelowNinetyCount");
    const socBelowEightyFiveCount = sumSeriesValues(summarySeries, "socBelowEightyFiveCount");
    const socBelowEightyCount = sumSeriesValues(summarySeries, "socBelowEightyCount");
    const totalAh = sumSeriesValues(summarySeries, "totalAh");

    const rowCount = Math.max(
      swapCount.length,
      socBelowNinetyCount.length,
      socBelowEightyFiveCount.length,
      socBelowEightyCount.length,
      totalAh.length
    );

    const rows = [];
    for (let i = 0; i < rowCount; i += 1) {
      const bucketEpoch = addBucketEpoch(startEpoch, timeScale, i);
      rows.push({
        date: formatBucketDate(bucketEpoch, timeScale),
        swapCount: swapCount[i] ?? null,
        socBelowNinetyCount: socBelowNinetyCount[i] ?? null,
        socBelowEightyFiveCount: socBelowEightyFiveCount[i] ?? null,
        socBelowEightyCount: socBelowEightyCount[i] ?? null,
        totalAh: totalAh[i] ?? null
      });
    }

    return rows;
  }

  function createSheet(name, rows, options = {}) {
    return {
      name,
      kind: options.kind || "site",
      columns: [
        { key: "date", label: "Date", width: 14 },
        { key: "swapCount", label: "Swap Count", width: 12 },
        { key: "socBelowNinetyCount", label: "SOC < 90%", width: 14 },
        { key: "socBelowEightyFiveCount", label: "SOC < 85%", width: 14 },
        { key: "socBelowEightyCount", label: "SOC < 80%", width: 14 },
        { key: "totalAh", label: "Total Ah", width: 14 }
      ],
      rows
    };
  }

  async function buildWorkbookModel(settings) {
    const selectedMode = String(settings?.timeScale || "day");
    const timeScale = "day";
    const startDateText = settings?.startDate;
    const endDateText = settings?.endDate;
    const timezoneHeader = settings?.timezoneHeader || DEFAULT_TIMEZONE_HEADER;
    const onProgress = typeof settings?.onProgress === "function" ? settings.onProgress : async () => {};

    if (!startDateText || !endDateText) {
      throw new Error("Start date and end date are required");
    }

    function shiftDateText(dateText, deltaDays) {
      const { year, month, day } = parseDateOnly(normalizeDateText(dateText));
      const utc = Date.UTC(year, month - 1, day);
      const shifted = new Date(utc + deltaDays * 86400000);
      const y = shifted.getUTCFullYear();
      const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
      const d = String(shifted.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    let effectiveStartDateText = startDateText;
    let effectiveEndDateText = endDateText;
    if (selectedMode === "day") {
      effectiveStartDateText = endDateText;
      effectiveEndDateText = endDateText;
    } else if (selectedMode === "week") {
      effectiveStartDateText = shiftDateText(endDateText, -6);
      effectiveEndDateText = endDateText;
    } else if (selectedMode === "month") {
      effectiveStartDateText = shiftDateText(endDateText, -29);
      effectiveEndDateText = endDateText;
    }

    await onProgress({ stage: "loading-sites", percent: 5, message: "Loading site list" });
    const startEpoch = parseRangeBoundary(effectiveStartDateText, false);
    const endEpoch = parseRangeBoundary(effectiveEndDateText, true);
    if (startEpoch > endEpoch) {
      throw new Error("Start date must be before end date");
    }

    const sites = await fetchSiteInventory(timezoneHeader);
    await onProgress({ stage: "sites-loaded", percent: 12, message: `Loaded ${sites.length} sites` });
    const sheets = [];
    const warnings = [];
    const usedNames = new Set();
    await onProgress({ stage: "fetch-total", percent: 18, message: "Fetching total summary" });
    const totalCountJson = await fetchReport(
      "swap-count",
      buildReportBody(4, startEpoch, endEpoch, timeScale),
      timezoneHeader
    );
    const totalSummaryJson = await fetchReport(
      "swap-summary",
      buildReportBody(4, startEpoch, endEpoch, timeScale),
      timezoneHeader
    );
    await onProgress({ stage: "total-fetched", percent: 22, message: "Total summary fetched" });

    sheets.push(
      createSheet(
        sanitizeSheetName("Total", usedNames, "Total"),
        buildSheetRows({ countJson: totalCountJson, summaryJson: totalSummaryJson, startEpoch, timeScale }),
        { kind: "total" }
      )
    );

    for (let index = 0; index < sites.length; index += 1) {
      const site = sites[index];
      const siteId = site.siteId;
      const siteName = site.siteName?.local || site.siteName?.["en-US"] || site.siteId;
      try {
        const progressPercent = 22 + Math.floor(((index + 0.25) / Math.max(1, sites.length)) * 70);
        await onProgress({
          stage: "fetch-site",
          percent: progressPercent,
          message: `Fetching ${siteName} (${index + 1}/${sites.length})`,
          current: index + 1,
          total: sites.length,
          siteName
        });

        const [countJson, summaryJson] = await Promise.all([
          fetchReport(
            "swap-count",
            buildReportBody(2, startEpoch, endEpoch, timeScale, siteId),
            timezoneHeader
          ),
          fetchReport(
            "swap-summary",
            buildReportBody(4, startEpoch, endEpoch, timeScale, siteId),
            timezoneHeader
          )
        ]);

        sheets.push(
          createSheet(
            sanitizeSheetName(siteName, usedNames, siteId),
            buildSheetRows({ countJson, summaryJson, startEpoch, timeScale }),
            { kind: "site" }
          )
        );

        await onProgress({
          stage: "site-fetched",
          percent: 22 + Math.floor(((index + 1) / Math.max(1, sites.length)) * 70),
          message: `Completed ${siteName} (${index + 1}/${sites.length})`,
          current: index + 1,
          total: sites.length,
          siteName
        });
      } catch (error) {
        warnings.push(`${siteName}: ${String(error.message || error)}`);
        sheets.push(
          createSheet(
            sanitizeSheetName(siteName, usedNames, siteId),
            [],
            { kind: "site" }
          )
        );
        await onProgress({
          stage: "site-error",
          percent: 22 + Math.floor(((index + 1) / Math.max(1, sites.length)) * 70),
          message: `Failed ${siteName} (${index + 1}/${sites.length})`,
          current: index + 1,
          total: sites.length,
          siteName,
          error: String(error.message || error)
        });
      }
    }

    await onProgress({ stage: "model-ready", percent: 96, message: "Workbook data prepared" });

    return {
      generatedAt: new Date().toISOString(),
      timeScale: selectedMode,
      apiTimeScale: timeScale,
      uiTimeZone: "Asia/Kathmandu",
      timezoneHeader,
      startDate: effectiveStartDateText,
      endDate: effectiveEndDateText,
      siteCount: sites.length,
      sheetCount: sheets.length,
      warnings,
      sheets
    };
  }

  globalThis.GNOPReportExporter = {
    buildWorkbookModel,
    fetchSiteInventory,
    fetchReport,
    buildReportBody,
    localEpochSeconds,
    sanitizeSheetName
  };
})();
