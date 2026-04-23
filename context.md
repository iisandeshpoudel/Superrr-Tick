# Nebula Gogoro Data Extraction Context

## Goal
Build a reliable bulk extractor for daily report metrics from GNOP portal, for:
1. One aggregated run for all sites (total)
2. One sequential run for each individual site (46 sites)

Target use case: export clean data to Excel without manual copy/paste from browser network tab.

## Operational Constraints
- Login is through SSO: `https://sso.nebula.gogoro.com/login?client=c107624ab2a8cc6247194ea8e3153ee0cb92df3d`
- 2FA/auth code is required
- Only one active session is allowed (new login logs out old session)

Implication: browser-session-based extraction (extension/content script running in already logged-in browser) is safer than standalone CLI login automation.

## Portal Behavior Observed

### Report UI page (daily)
- Base report page used:
  `https://gnop.nebula.gogoro.com/report/gs-statistic/swap-summary/daily?dimension=4&endDate=1776685885&fromDate=1774093885&gsIds&page=1&searchOption=site&siteIds&timeScale=day`
- `searchOption=site` is used
- `timeScale=day` is used
- `dimension=4` appears in the report URL for this flow

### Report UI page (today/hourly observed in discovery)
- Captured route in latest discovery:
  `https://gnop.nebula.gogoro.com/report/gs-statistic/swap-summary/today?...&timeScale=hours`
- Current dashboard default in captured session produced hourly arrays (`timeScale=hours`, 24 points)
- Extractor must read `reportSetting.timeScale` from API response and adapt, instead of hardcoding daily

### Report UI page (daily with selectable range)
- Captured route with selectable range:
  `https://gnop.nebula.gogoro.com/report/gs-statistic/swap-summary/daily?...&timeScale=day|week|month`
- This route exposes the time-range controls the user needs
- Extension should let the user choose `day`, `week`, `month`, or `custom` date range
- For `custom`, use day buckets under the hood

### Total scope behavior (confirmed)
- When no site is selected in UI, backend returns total aggregated data by default
- No custom "total" selector logic is required on client side
- Discovery/build should treat "no `_siteList` in URL" as total scope

### Date behavior for discovery/build (confirmed)
- User does not manually choose date range in UI for this workflow
- Extractor should use whatever default date/range dashboard currently shows
- During discovery, do not add extra date-selection automation

### Site-specific report URL behavior
When a specific site is selected, URL contains encoded `_siteList` value in this pattern:
- `<siteRid>^<siteNameJson>^<siteId>` (URL encoded)

Example (Naxal):
`_siteList=NP446000042%5E%7B%22local%22%3A%22Naxal%20Showroom%20GoStation%22%2C%22en-US%22%3A%22Naxal%20Showroom%20GoStation%22%7D%5EZ3Rv7J3d`

### Scope detection nuance from live capture
- URL alone is not always reliable for selected scope
- In one capture, page URL looked total (no `_siteList`) but request payload contained `siteIds: ["Z3Rv7J3d"]` and response was site-specific
- Canonical scope signal should be request body:
  - if `siteIds` exists and has at least one ID => site-scoped request
  - if `siteIds` missing/empty => total-scoped request
- Multi-site selection exists in UI, but it is not needed for this workflow

## Network APIs Identified

### 0) Dashboard API (observed, not part of required output)
- Endpoint:
  `https://gnop.nebula.gogoro.com/api/v1/reports/gs-statistic/dashboard`
- Returns snapshot metrics (single aggregate values, not arrays)
- Not needed for required per-time-bucket output, but appears in capture stream

### 1) Site master list API
- Endpoint:
  `https://gnop.nebula.gogoro.com/api/v1/gostation/site/search?companyId=6MyzkQeJ&hasInverter&page=<n>&perPage=10&photoIncluded&siteName=&siteRid=`
- Response contains site metadata including:
  - `siteId`
  - `siteRid`
  - `siteName.local` / `siteName.en-US`
  - `gsList[]` with `gsId`, `gsName`, etc.
- Confirmed total sites: 46 (pages 1-5 with `perPage=10`)

### 2) Swap count API
- Endpoint:
  `https://gnop.nebula.gogoro.com/api/v1/reports/gs-statistic/swap-count`
- Observed request body pattern:
```json
{
  "dimension": 2,
  "reportSetting": {
    "fromDate": 1774030500,
    "endDate": 1776708899,
    "timeScale": "day"
  },
  "siteIds": ["<optional siteId>"]
}
```
- In captured total requests, `siteIds` can be absent
- In captured site requests, `siteIds` contains one site ID
- Observed response shape:
```json
{
  "reportSetting": { "fromDate": 1774030500, "endDate": 1776708899, "timeScale": "day" },
  "series": [
    {
      "swapCount": [...],
      "averageSwapCount": [...]
    }
  ]
}
```
- Site-level response example includes `gsId` and `gsName`:
```json
{
  "series": [
    {
      "gsId": "6My6npeJ",
      "gsName": { "en-US": "Naxal Showroom Gostation" },
      "swapCount": [...]
    }
  ]
}
```
- Required field: `swapCount`

### 3) Swap summary API
- Endpoint:
  `https://gnop.nebula.gogoro.com/api/v1/reports/gs-statistic/swap-summary`
- Observed request body pattern:
```json
{
  "dimension": 4,
  "reportSetting": {
    "fromDate": 1776834900,
    "endDate": 1776917700,
    "timeScale": "hours"
  },
  "siteIds": ["<optional siteId>"]
}
```
- In captured total requests, `siteIds` can be absent
- In captured site requests, `siteIds` contains one site ID
- Observed response shape includes:
  - `socBelowNinetyCount[]`
  - `socBelowEightyFiveCount[]`
  - `socBelowEightyCount[]`
  - `totalAh[]`
  - other fields (not needed): `totalKm[]`, etc.
- Required fields:
  - `socBelowNinetyCount`
  - `socBelowEightyFiveCount`
  - `socBelowEightyCount`
  - `totalAh`

### 4) Swap memory API (mentioned, not yet captured)
- User note: "similarly for swap memory too"
- Endpoint and exact schema still need explicit network capture confirmation

## Data Shape and Mapping Rules (Current Understanding)
- Each metric is returned as day-level array(s)
- For selected range, all arrays align by index (index 0 = first bucket)
- Array length depends on selected `timeScale`/view:
  - captured today/hourly example: 24 points
  - earlier daily example: 31 points
- `reportSetting.fromDate/endDate/timeScale` in response should be used as canonical range metadata
- URL date params and API payload date params are not identical in sample (must not assume they are the same source)
  - URL sample: `fromDate=1774093885`, `endDate=1776685885`
  - API sample: `fromDate=1774030500`, `endDate=1776708899`
- Request headers include timezone (captured: `timezone: +05:45`), and browser timezone observed as `Asia/Katmandu`

## Required Extraction Output (Distilled)
Per day, per scope (total or site), capture these columns:
- `scopeType` (`total` or `site`)
- `siteId` (blank for total)
- `siteName` (blank or `ALL_SITES` for total)
- `siteRid` (blank for total)
- `gsId` (if present in series)
- `date` (derived from index + response date range)
- `swapCount`
- `socBelowNinetyCount`
- `socBelowEightyFiveCount`
- `socBelowEightyCount`
- `totalAh`
- `timeScale`
- `sourceFromDate`
- `sourceEndDate`

Important: the actual export should normalize `swap-count` and `swap-summary` into one combined row set per scope/time bucket, using request-body `siteIds` as the canonical site selector.
Final output should be a single Excel workbook with one `Total` sheet and one sheet per site, with rows by date and the four required metrics.

Note: use one total + one site at a time (sequential single-site requests). Multi-site selection exists in UI but is not required for this workflow.

## Site Inventory (46)
1. Bafal Testing centre 2 | `530b7nMO`
2. Balkhu GoStation | `4eE2pB3v`
3. Swayambhu Pump GoStation | `6MyVxPeJ`
4. Pepsicola Metro Market GoStation | `d3Dgjoeg`
5. Kapan MetroMarket GoStation | `zMWA6732`
6. Naxal Showroom GoStation | `Z3Rv7J3d`
7. Chyasal Corridor GoStation | `DeZLw18w`
8. Ekantakuna Pump GoStation | `530bjvMO`
9. Kalimati Pump GoStation | `D31gnKMj`
10. Banepa Pump GoStation | `Y3B7pL8a`
11. Pulchowk GoStation | `G8LpW78r`
12. Gokarneshwor BigMart GoStation | `JeGKgde2`
13. Tilganga Pump GoStation | `k8JgZWMp`
14. Tinkune GoStation | `b8gdboMm`
15. Gatthaghar GoStation | `0ebgZK3K`
16. Kumaripati GoStation | `d3PKWLe1`
17. New Baneshwor Pump GoStation | `qMOjR98Z`
18. Gongabu Pump GoStation | `V34AOP8Y`
19. Thaiba BigMart GoStation | `LMo4qbeV`
20. Maitighar GoStation | `93nNZn3r`
21. Kamalpokhari BigMart GoStation | `ZM5OVw3k`
22. Sallaghari GoStation | `18YqVA8j`
23. Palanse Resort GoStation | `d39jzV8A`
24. Italitar Bigmart GoStation | `K32NOy3q`
25. Khusibu BigMart GoStation | `W8dxWk8l`
26. Boudhha BigMart GoStation | `28Q7yweZ`
27. Thali BigMart GoStation | `zMk4dZeL`
28. Bhaisepati BigMart GoStation | `P8pkW030`
29. Sanepa BigMart GoStation | `Yel14l3g`
30. Taudaha Banquet GoStation | `z8wXVBMn`
31. Sunakothi BigMart GoStation | `gMa0g08E`
32. Maharajgunj GoStation | `zMvO77ev`
33. Maitidevi Pump GoStation | `WeqDnXMK`
34. Baluwatar Bigmart GoStation | `mej25Xew`
35. Tokha Bigmart GoStation | `BMzw7qer`
36. Tyanglaphat BigMart GoStation | `1MX7qO8A`
37. Imadole Angan GoStation | `XeVqAPML`
38. Gwarko Pump GoStation | `ze7Axb8k`
39. Thankot Bigmart GoStation | `786j4y8g`
40. Tinthana Bigmart GoStation | `4eE2wB3v`
41. Chabahil GoStation | `530bYvMO`
42. Balaju Chowk GoStation | `D31gqKMj`
43. Sitapaila GoStation | `1MX7q68A`
44. Jorpati Metro Market GoStation | `ZM5VlOek`
45. Tripureshwor Pump GoStation | `qMKgG9M2`
46. Lainchaur GoStation | `530jp7MO`

## Why Extension-first Is Preferred
- Reuses active authenticated browser session and avoids repeated 2FA challenges
- Avoids triggering session replacement/logout from separate automation login
- Can call the same in-browser APIs and cookies as manual network-tab workflow
- Can execute total + per-site sequence in one run and export directly to CSV/Excel

## Discovery Tooling Status
- A Chrome extension scaffold was created at `gnop-discovery-extension/`
- Purpose: capture real request/response payloads for GNOP report APIs from active logged-in session
- Current capture coverage:
  - `api/v1/gostation/site/search`
  - `api/v1/reports/gs-statistic/*` (including `swap-count`, `swap-summary`, and any `swap-memory` calls if present)
- Capture export includes:
  - Request body, response body, endpoint key, page URL, inferred scope (`total` vs `site`)
  - Sample pairs per endpoint/scope for faster schema finalization
- Install and usage notes are documented in `gnop-discovery-extension/README.md`

### Discovery capture status from latest run
- Captures were found in Downloads as:
  - `C:\Users\Anil Mani Gajurel\Downloads\gnop-discovery-capture-2026-04-23T05-10-59-614Z.json`
  - `C:\Users\Anil Mani Gajurel\Downloads\gnop-discovery-capture-2026-04-23T05-12-44-562Z.json`
  - `C:\Users\Anil Mani Gajurel\Downloads\gnop-discovery-capture-2026-04-23T05-13-20-029Z.json`
  - `C:\Users\Anil Mani Gajurel\Downloads\gnop-discovery-capture-2026-04-23T05-14-16-355Z.json`
- Confirmed in captures:
  - total and site examples for `swap-count`
  - total and site examples for `swap-summary`
  - `site-search` endpoint behavior and `x-total-count: 46`
- Confirmed via latest capture:
  - request-body `siteIds` is the canonical scope signal
  - page URL can be stale relative to current selected site
  - multi-site selection is not required for the workflow
- Not yet captured:
  - any `swap-memory` request/response

## Open Items To Confirm In Discovery (before build phase)
1. Exact `swap-memory` endpoint path and required output fields
2. Exact timezone/date expansion rule for converting index -> timestamp/date label rows
3. Whether any site returns multiple `series` entries and aggregation rule if yes (single series seen so far)
4. Confirm final production view (`daily/day` vs `today/hours`) for extraction run profile
5. Error/timeout/rate-limit behavior for long sequential runs (46 sites)

## Discovery Completion Criteria
- Capture and document one complete request/response pair for total and one for site-level for each required endpoint
- Finalize schema mapping for required fields only
- Lock canonical site list (46 IDs) and site-name mapping
- Confirm extraction order: total first, then all sites sequentially
