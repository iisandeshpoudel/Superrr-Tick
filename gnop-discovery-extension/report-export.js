(function initReportExporter() {
  const API_ORIGIN = "https://gnop.nebula.gogoro.com";
  const COMPANY_ID = "6MyzkQeJ";
  const DEFAULT_PER_PAGE = 10;
  const DEFAULT_TIMEZONE_HEADER = "+05:45";

  const BASE_HEADERS = {
    accept: "application/json, text/plain, */*",
    client: "gnop",
    "enop-sub": "gnop",
    language: "en-US"
  };

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

  function localEpochSeconds(dateText, endOfDay = false) {
    const { year, month, day } = parseDateOnly(dateText);
    const date = new Date(
      year,
      month - 1,
      day,
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0
    );
    return Math.floor(date.getTime() / 1000);
  }

  function addBucketDate(baseDate, timeScale, index) {
    const date = new Date(baseDate.getTime());
    if (timeScale === "hours") {
      date.setHours(date.getHours() + index);
      return date;
    }
    if (timeScale === "week") {
      date.setDate(date.getDate() + index * 7);
      return date;
    }
    if (timeScale === "month") {
      date.setMonth(date.getMonth() + index);
      return date;
    }
    date.setDate(date.getDate() + index);
    return date;
  }

  function formatBucketDate(date, timeScale) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    if (timeScale === "hours") {
      const h = String(date.getHours()).padStart(2, "0");
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

  function buildSheetRows({ countJson, summaryJson, startDate, timeScale }) {
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
      const bucketDate = addBucketDate(startDate, timeScale, i);
      rows.push({
        date: formatBucketDate(bucketDate, timeScale),
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
    const timeScale = selectedMode === "custom" || selectedMode === "month" ? "day" : selectedMode;
    const startDateText = settings?.startDate;
    const endDateText = settings?.endDate;
    const timezoneHeader = settings?.timezoneHeader || DEFAULT_TIMEZONE_HEADER;
    const onProgress = typeof settings?.onProgress === "function" ? settings.onProgress : async () => {};

    if (!startDateText || !endDateText) {
      throw new Error("Start date and end date are required");
    }

    await onProgress({ stage: "loading-sites", percent: 5, message: "Loading site list" });
    const startEpoch = parseRangeBoundary(startDateText, false);
    const endEpoch = parseRangeBoundary(endDateText, true);
    if (startEpoch > endEpoch) {
      throw new Error("Start date must be before end date");
    }

    const sites = await fetchSiteInventory(timezoneHeader);
    await onProgress({ stage: "sites-loaded", percent: 12, message: `Loaded ${sites.length} sites` });
    const sheets = [];
    const warnings = [];
    const usedNames = new Set();
    const startDate = new Date(startEpoch * 1000);

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
        buildSheetRows({ countJson: totalCountJson, summaryJson: totalSummaryJson, startDate, timeScale }),
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
            buildSheetRows({ countJson, summaryJson, startDate, timeScale }),
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
      startDate: startDateText,
      endDate: endDateText,
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
