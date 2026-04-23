const REPORT_ENDPOINTS = new Set(["swap-count", "swap-summary"]);

function formatDateParts(epochSeconds, timeZone) {
  const date = new Date(epochSeconds * 1000);
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    });
    const parts = formatter.formatToParts(date);
    const map = {};
    for (const part of parts) {
      map[part.type] = part.value;
    }
    return {
      year: map.year || String(date.getUTCFullYear()),
      month: map.month || String(date.getUTCMonth() + 1).padStart(2, "0"),
      day: map.day || String(date.getUTCDate()).padStart(2, "0"),
      hour: map.hour || String(date.getUTCHours()).padStart(2, "0")
    };
  } catch (_error) {
    return {
      year: String(date.getUTCFullYear()),
      month: String(date.getUTCMonth() + 1).padStart(2, "0"),
      day: String(date.getUTCDate()).padStart(2, "0"),
      hour: String(date.getUTCHours()).padStart(2, "0")
    };
  }
}

function formatBucketLabel(epochSeconds, bucketSeconds, timeScale, timeZone) {
  const parts = formatDateParts(epochSeconds + bucketSeconds, timeZone);
  if (timeScale === "hours") {
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:00`;
  }
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getBucketSeconds(timeScale, sampleLength) {
  if (timeScale === "hours" || sampleLength === 24) {
    return 3600;
  }
  return 86400;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function detectRequestScope(event) {
  const body = event?.request?.bodyJson || {};
  const siteIds = asArray(body.siteIds).filter(Boolean).map((id) => String(id));

  if (siteIds.length > 0) {
    return {
      scopeType: "site",
      siteId: siteIds[0],
      siteIds,
      siteRid: "",
      siteName: ""
    };
  }

  return {
    scopeType: "total",
    siteId: "",
    siteIds: [],
    siteRid: "",
    siteName: "ALL_SITES"
  };
}

function buildSiteLookup(events) {
  const lookup = {};

  for (const event of events || []) {
    if (event?.endpoint?.key !== "site-search") {
      continue;
    }

    const sites = asArray(event?.response?.bodyJson);
    for (const site of sites) {
      if (!site || typeof site !== "object" || !site.siteId) {
        continue;
      }

      const siteId = String(site.siteId);
      const gs0 = asArray(site.gsList)[0] || {};
      lookup[siteId] = {
        siteId,
        siteRid: site.siteRid || "",
        siteName: site.siteName?.local || site.siteName?.["en-US"] || "",
        gsId: gs0.gsId || "",
        gsName: gs0.gsName || ""
      };
    }
  }

  return lookup;
}

function getGroupKey(event) {
  const scope = detectRequestScope(event);
  const reportSetting = event?.response?.bodyJson?.reportSetting || event?.request?.bodyJson?.reportSetting || {};
  const scopeToken = scope.scopeType === "site" ? scope.siteIds.join(",") : "TOTAL";
  return [
    scope.scopeType,
    scopeToken,
    reportSetting.timeScale || "",
    String(reportSetting.fromDate ?? ""),
    String(reportSetting.endDate ?? "")
  ].join("|");
}

function buildReportGroups(events) {
  const groups = [];
  const groupMap = new Map();

  for (const event of events || []) {
    const endpoint = event?.endpoint?.key;
    if (!REPORT_ENDPOINTS.has(endpoint)) {
      continue;
    }

    const key = getGroupKey(event);
    let group = groupMap.get(key);
    if (!group) {
      const reportSetting = event?.response?.bodyJson?.reportSetting || event?.request?.bodyJson?.reportSetting || {};
      group = {
        key,
        scope: detectRequestScope(event),
        reportSetting: {
          fromDate: Number(reportSetting.fromDate ?? 0),
          endDate: Number(reportSetting.endDate ?? 0),
          timeScale: reportSetting.timeScale || ""
        },
        eventsByEndpoint: {}
      };
      groupMap.set(key, group);
      groups.push(group);
    }

    group.eventsByEndpoint[endpoint] = event;
  }

  return groups;
}

function getSeriesLength(series, fields) {
  const lengths = [];
  for (const field of fields) {
    const value = series?.[field];
    if (Array.isArray(value)) {
      lengths.push(value.length);
    }
  }
  return lengths.length > 0 ? Math.max(...lengths) : 0;
}

function valueAt(series, field, index) {
  const value = series?.[field];
  if (!Array.isArray(value)) {
    return null;
  }
  return index < value.length ? value[index] : null;
}

function resolveSiteMeta(scope, siteLookup) {
  const siteMeta = siteLookup[scope.siteId] || {};
  return {
    siteId: scope.scopeType === "total" ? "" : (siteMeta.siteId || scope.siteId || ""),
    siteName: scope.scopeType === "total" ? "ALL_SITES" : (siteMeta.siteName || scope.siteName || ""),
    siteRid: scope.scopeType === "total" ? "" : (siteMeta.siteRid || scope.siteRid || ""),
    gsId: siteMeta.gsId || "",
    gsName: siteMeta.gsName || ""
  };
}

function buildRowsForGroup(group, siteLookup, timeZone, warnings) {
  const countEvent = group.eventsByEndpoint["swap-count"] || null;
  const summaryEvent = group.eventsByEndpoint["swap-summary"] || null;
  const baseReportSetting = group.reportSetting || {};
  const scope = group.scope || { scopeType: "total", siteId: "", siteName: "ALL_SITES", siteRid: "" };
  const siteMeta = resolveSiteMeta(scope, siteLookup);
  const countSeriesList = asArray(countEvent?.response?.bodyJson?.series);
  const summarySeriesList = asArray(summaryEvent?.response?.bodyJson?.series);

  if (scope.siteIds && scope.siteIds.length > 1) {
    warnings.push(`Multi-site request captured for siteIds=[${scope.siteIds.join(", ")}]`);
  }

  const rows = [];
  const seriesCount = Math.max(countSeriesList.length, summarySeriesList.length);

  for (let seriesIndex = 0; seriesIndex < seriesCount; seriesIndex += 1) {
    const countSeries = countSeriesList[seriesIndex] || null;
    const summarySeries = summarySeriesList[seriesIndex] || null;
    const primarySeries = countSeries || summarySeries || {};
    const rowCount = Math.max(
      getSeriesLength(countSeries, ["swapCount"]),
      getSeriesLength(summarySeries, ["socBelowNinetyCount", "socBelowEightyFiveCount", "socBelowEightyCount", "totalAh"])
    );

    const bucketSeconds = getBucketSeconds(baseReportSetting.timeScale, rowCount);
    for (let index = 0; index < rowCount; index += 1) {
      rows.push({
        scopeType: scope.scopeType,
        siteId: siteMeta.siteId,
        siteName: siteMeta.siteName,
        siteRid: siteMeta.siteRid,
        gsId: primarySeries.gsId || siteMeta.gsId || "",
        date: formatBucketLabel(baseReportSetting.fromDate || 0, bucketSeconds * index, baseReportSetting.timeScale, timeZone),
        swapCount: valueAt(countSeries, "swapCount", index),
        socBelowNinetyCount: valueAt(summarySeries, "socBelowNinetyCount", index),
        socBelowEightyFiveCount: valueAt(summarySeries, "socBelowEightyFiveCount", index),
        socBelowEightyCount: valueAt(summarySeries, "socBelowEightyCount", index),
        totalAh: valueAt(summarySeries, "totalAh", index),
        timeScale: baseReportSetting.timeScale || "",
        sourceFromDate: baseReportSetting.fromDate || null,
        sourceEndDate: baseReportSetting.endDate || null
      });
    }
  }

  return rows;
}

function rowsToCsv(rows) {
  const headers = [
    "scopeType",
    "siteId",
    "siteName",
    "siteRid",
    "gsId",
    "date",
    "swapCount",
    "socBelowNinetyCount",
    "socBelowEightyFiveCount",
    "socBelowEightyCount",
    "totalAh",
    "timeScale",
    "sourceFromDate",
    "sourceEndDate"
  ];

  const escapeCell = (value) => {
    if (value == null) return "";
    const text = String(value);
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCell(row[header])).join(","));
  }
  return lines.join("\r\n");
}

function buildRequestScopeSummary(events) {
  const byScopeType = {};
  const bySiteId = {};

  for (const event of events || []) {
    const scope = detectRequestScope(event);
    byScopeType[scope.scopeType] = (byScopeType[scope.scopeType] || 0) + 1;
    const siteKey = scope.scopeType === "total" ? "TOTAL" : scope.siteId || "UNKNOWN";
    bySiteId[siteKey] = (bySiteId[siteKey] || 0) + 1;
  }

  return { byScopeType, bySiteId };
}

function buildExportBundle(events, siteLookup = {}, context = {}) {
  const warnings = [];
  const groups = buildReportGroups(events);
  const timeZone = context?.latestPageMeta?.timezone || "Asia/Katmandu";
  const normalizedRows = [];

  for (const group of groups) {
    normalizedRows.push(...buildRowsForGroup(group, siteLookup, timeZone, warnings));
  }

  normalizedRows.sort((a, b) => {
    const aScope = a.scopeType === "total" ? 0 : 1;
    const bScope = b.scopeType === "total" ? 0 : 1;
    if (aScope !== bScope) return aScope - bScope;
    if (a.siteId !== b.siteId) return String(a.siteId).localeCompare(String(b.siteId));
    if (a.sourceFromDate !== b.sourceFromDate) return Number(a.sourceFromDate || 0) - Number(b.sourceFromDate || 0);
    if (a.gsId !== b.gsId) return String(a.gsId).localeCompare(String(b.gsId));
    return String(a.date).localeCompare(String(b.date));
  });

  return {
    exportedAt: new Date().toISOString(),
    rowCount: normalizedRows.length,
    groupCount: groups.length,
    warnings,
    siteLookup,
    requestScopeSummary: buildRequestScopeSummary(events),
    normalizedRows,
    csv: rowsToCsv(normalizedRows),
    latestPageMeta: context?.latestPageMeta || null,
    pageMetaByTabId: context?.pageMetaByTabId || {}
  };
}

globalThis.GNOPDiscoveryExtractor = {
  buildExportBundle,
  buildSiteLookup,
  buildRequestScopeSummary,
  detectRequestScope,
  rowsToCsv,
  formatBucketLabel
};
