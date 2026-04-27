(function initWorkbookWriter() {
  const ZIP_LOCAL_FILE_HEADER = 0x04034b50;
  const ZIP_CENTRAL_DIR_HEADER = 0x02014b50;
  const ZIP_END_OF_CENTRAL_DIR = 0x06054b50;
  const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const textEncoder = new TextEncoder();
  const textCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

  const RAW_COLUMNS = Object.freeze([
    { key: "site", label: "site", type: "text", width: 18, headerStyleKey: "site" },
    { key: "date", label: "date", type: "text", width: 14, headerStyleKey: "date" },
    { key: "swapCount", label: "swapCount", type: "int", width: 14, headerStyleKey: "swapCount" },
    { key: "socBelow90Count", label: "socBelow90Count", type: "int", width: 14, headerStyleKey: "socBelow90Count" },
    { key: "socBelow85Count", label: "socBelow85Count", type: "int", width: 14, headerStyleKey: "socBelow85Count" },
    { key: "socBelow80Count", label: "socBelow80Count", type: "int", width: 14, headerStyleKey: "socBelow80Count" },
    { key: "totalAh", label: "totalAh", type: "decimal", width: 14, headerStyleKey: "totalAh" }
  ]);

  const SUMMARY_COLUMNS = Object.freeze([
    { key: "site", label: "site", type: "text", width: 18, headerStyleKey: "site" },
    { key: "totalSwaps", label: "totalSwaps", type: "int", width: 14, headerStyleKey: "swapCount" },
    { key: "avgSwapsPerDay", label: "avgSwapsPerDay", type: "decimal", width: 14, headerStyleKey: "swapCount" },
    { key: "totalAh", label: "totalAh", type: "decimal", width: 14, headerStyleKey: "totalAh" },
    { key: "avgAhPerDay", label: "avgAhPerDay", type: "decimal", width: 14, headerStyleKey: "totalAh" },
    { key: "totalSOCBelow90", label: "totalSOCBelow90", type: "int", width: 14, headerStyleKey: "socBelow90Count" },
    { key: "totalSOCBelow85", label: "totalSOCBelow85", type: "int", width: 14, headerStyleKey: "socBelow85Count" },
    { key: "totalSOCBelow80", label: "totalSOCBelow80", type: "int", width: 14, headerStyleKey: "socBelow80Count" },
    { key: "daysRecorded", label: "daysRecorded", type: "int", width: 14, headerStyleKey: "site" }
  ]);

  const HEADER_STYLE_INDEX = Object.freeze({
    site: 0,
    date: 1,
    swapCount: 2,
    socBelow90Count: 3,
    socBelow85Count: 4,
    socBelow80Count: 5,
    totalAh: 6
  });

  const DATA_STYLE_INDEX = Object.freeze({
    white: { text: 7, int: 8, decimal: 9 },
    gray: { text: 10, int: 11, decimal: 12 }
  });

  const RAW_FIELD_ALIASES = Object.freeze({
    site: ["site"],
    date: ["date"],
    swapCount: ["swapCount"],
    socBelow90Count: ["socBelow90Count", "socBelowNinetyCount"],
    socBelow85Count: ["socBelow85Count", "socBelowEightyFiveCount"],
    socBelow80Count: ["socBelow80Count", "socBelowEightyCount"],
    totalAh: ["totalAh"]
  });

  function u16(value) {
    return [value & 0xff, (value >>> 8) & 0xff];
  }

  function u32(value) {
    return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
  }

  function concatBytes(chunks) {
    let total = 0;
    for (const chunk of chunks) {
      total += chunk.length;
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }

  function utf8Bytes(text) {
    return textEncoder.encode(String(text));
  }

  function toBytes(value) {
    if (value == null) {
      return new Uint8Array(0);
    }

    if (typeof value === "string") {
      return utf8Bytes(value);
    }

    if (value instanceof ArrayBuffer) {
      return new Uint8Array(value);
    }

    if (ArrayBuffer.isView(value)) {
      return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }

    if (Array.isArray(value)) {
      return Uint8Array.from(value);
    }

    return utf8Bytes(String(value));
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i += 1) {
      crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let crc = i;
      for (let j = 0; j < 8; j += 1) {
        crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
      }
      table[i] = crc >>> 0;
    }
    return table;
  })();

  function escapeXml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function escapeAttr(text) {
    return escapeXml(text).replace(/\r?\n/g, "&#10;");
  }

  function columnLetter(index) {
    let n = index;
    let name = "";
    while (n > 0) {
      const rem = (n - 1) % 26;
      name = String.fromCharCode(65 + rem) + name;
      n = Math.floor((n - 1) / 26);
    }
    return name;
  }

  function buildCellRef(colIndex, rowIndex) {
    return `${columnLetter(colIndex + 1)}${rowIndex + 1}`;
  }

  function normalizeColumnKey(key) {
    switch (String(key || "")) {
      case "socBelowNinetyCount":
        return "socBelow90Count";
      case "socBelowEightyFiveCount":
        return "socBelow85Count";
      case "socBelowEightyCount":
        return "socBelow80Count";
      default:
        return String(key || "");
    }
  }

  function inferColumnType(columnKey) {
    const key = normalizeColumnKey(columnKey);
    if (key === "site" || key === "date") {
      return "text";
    }
    if (key === "totalAh" || key === "avgSwapsPerDay" || key === "avgAhPerDay") {
      return "decimal";
    }
    return "int";
  }

  function headerStyleIndexForColumn(column) {
    const key = normalizeColumnKey(column?.headerStyleKey || column?.key);
    return HEADER_STYLE_INDEX[key] ?? HEADER_STYLE_INDEX.site;
  }

  function dataStyleIndexForColumn(column, isEvenDataRow) {
    const band = isEvenDataRow ? "gray" : "white";
    const type = column?.type || inferColumnType(column?.key);
    if (type === "decimal") {
      return DATA_STYLE_INDEX[band].decimal;
    }
    if (type === "text") {
      return DATA_STYLE_INDEX[band].text;
    }
    return DATA_STYLE_INDEX[band].int;
  }

  function coerceNumeric(value) {
    if (value == null || value === "") {
      return null;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    const text = String(value).trim();
    if (!text) {
      return null;
    }
    const num = Number(text);
    return Number.isFinite(num) ? num : null;
  }

  function formatWidthText(value, type) {
    if (value == null || value === "") {
      return "";
    }

    if (type === "decimal") {
      const num = coerceNumeric(value);
      if (num != null) {
        return num.toFixed(1);
      }
    }

    if (type === "int") {
      const num = coerceNumeric(value);
      if (num != null) {
        return String(Math.trunc(num));
      }
    }

    return String(value);
  }

  function estimateColumnWidth(column, rows) {
    const key = normalizeColumnKey(column?.key);
    const type = column?.type || inferColumnType(key);
    const headerText = String(column?.label ?? column?.key ?? "");
    const baseWidth = Number(column?.width) || 14;
    let maxLength = headerText.length;

    for (const row of rows) {
      const value = row && row[key] != null ? row[key] : row?.[column?.key];
      const text = formatWidthText(value, type);
      if (text.length > maxLength) {
        maxLength = text.length;
      }
    }

    const padding = type === "text" ? 3 : 2;
    const width = Math.ceil(maxLength + padding);
    return Math.min(60, Math.max(baseWidth, width));
  }

  function autoSizeColumns(columns, rows) {
    return columns.map((column) => ({
      ...column,
      width: estimateColumnWidth(column, rows)
    }));
  }

  function xmlCellWithStyle(reference, value, styleIndex, type) {
    const styleAttr = Number.isInteger(styleIndex) ? ` s="${styleIndex}"` : "";

    if (value == null || value === "") {
      return `    <c r="${reference}"${styleAttr}/>`;
    }

    if (type === "decimal" || type === "int") {
      const numericValue = coerceNumeric(value);
      if (numericValue != null) {
        return `    <c r="${reference}"${styleAttr}><v>${String(numericValue)}</v></c>`;
      }
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return `    <c r="${reference}"${styleAttr}><v>${String(value)}</v></c>`;
    }

    const text = escapeXml(value);
    return `    <c r="${reference}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
  }

  function buildColXml(columns) {
    const cols = columns.map((column, index) => {
      const width = Number(column?.width) || 14;
      const min = index + 1;
      const max = index + 1;
      return `    <col min="${min}" max="${max}" width="${width}" bestFit="1" customWidth="1"/>`;
    });
    return `  <cols>\n${cols.join("\n")}\n  </cols>`;
  }

  function buildSheetViewXml(isSelected) {
    const selectedAttr = isSelected ? ' tabSelected="1"' : "";
    return `  <sheetViews>\n    <sheetView workbookViewId="0"${selectedAttr}>\n      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>\n      <selection pane="bottomLeft" activeCell="A2" sqref="A2"/>\n    </sheetView>\n  </sheetViews>`;
  }

  function buildDefinedNameId(sheetName) {
    const safe = String(sheetName || "Sheet")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "SHEET";
    return `${safe}_TABLE`;
  }

  function buildDefinedNamesXml(sheets) {
    const names = [];
    for (const sheet of sheets) {
      const sheetName = String(sheet?.name || "Sheet");
      const columnCount = Array.isArray(sheet?.columns) ? sheet.columns.length : 0;
      if (!columnCount) {
        continue;
      }
      const rowCount = Array.isArray(sheet?.rows) ? sheet.rows.length : 0;
      const lastColumn = columnLetter(columnCount);
      const lastRow = Math.max(1, rowCount + 1);
      const escapedSheetName = sheetName.replace(/'/g, "''");
      const formula = `'${escapedSheetName}'!$A$1:$${lastColumn}$${lastRow}`;
      names.push(`    <definedName name="${escapeAttr(buildDefinedNameId(sheetName))}">${escapeXml(formula)}</definedName>`);
    }

    if (!names.length) {
      return "";
    }

    return `  <definedNames>\n${names.join("\n")}\n  </definedNames>`;
  }

  function buildWorkbookXml(sheets) {
    const sheetXml = sheets
      .map((sheet, index) => `    <sheet name="${escapeAttr(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
      .join("\n");
    const definedNamesXml = buildDefinedNamesXml(sheets);

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n  <sheets>\n${sheetXml}\n  </sheets>${definedNamesXml ? `\n${definedNamesXml}` : ""}\n</workbook>`;
  }

  function buildWorkbookRelsXml(sheetCount) {
    const rels = [];
    for (let i = 0; i < sheetCount; i += 1) {
      rels.push(`  <Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`);
    }
    rels.push(`  <Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`);

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n${rels.join("\n")}\n</Relationships>`;
  }

  function buildRootRelsXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>\n  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>\n  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>\n</Relationships>`;
  }

  function buildContentTypesXml(sheetCount) {
    const overrides = [];
    for (let i = 0; i < sheetCount; i += 1) {
      overrides.push(`  <Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
    }

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n  <Default Extension="xml" ContentType="application/xml"/>\n  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>\n  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>\n  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>\n  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>\n${overrides.join("\n")}\n</Types>`;
  }

  function buildStylesXml() {
    const fonts = [
      `<font><sz val="11"/><color rgb="FF34495E"/><name val="Segoe UI"/><family val="2"/></font>`,
      `<font><sz val="11"/><color rgb="FF34495E"/><name val="Segoe UI"/><family val="2"/><b/></font>`
    ];

    const fills = [
      `<fill><patternFill patternType="none"/></fill>`,
      `<fill><patternFill patternType="gray125"/></fill>`,
      `<fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill>`,
      `<fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill>`,
      `<fill><patternFill patternType="solid"><fgColor rgb="FFEAF0F6"/><bgColor indexed="64"/></patternFill></fill>`,
      `<fill><patternFill patternType="solid"><fgColor rgb="FFEAF4FB"/><bgColor indexed="64"/></patternFill></fill>`,
      `<fill><patternFill patternType="solid"><fgColor rgb="FFEAF7EE"/><bgColor indexed="64"/></patternFill></fill>`,
      `<fill><patternFill patternType="solid"><fgColor rgb="FFFFF7E6"/><bgColor indexed="64"/></patternFill></fill>`,
      `<fill><patternFill patternType="solid"><fgColor rgb="FFFFF1E7"/><bgColor indexed="64"/></patternFill></fill>`,
      `<fill><patternFill patternType="solid"><fgColor rgb="FFFDEDEF"/><bgColor indexed="64"/></patternFill></fill>`,
      `<fill><patternFill patternType="solid"><fgColor rgb="FFF3EDFA"/><bgColor indexed="64"/></patternFill></fill>`
    ];

    const borders = [
      `<border><left/><right/><top/><bottom/><diagonal/></border>`,
      `<border><left style="thin"><color rgb="FFCCCCCC"/></left><right style="thin"><color rgb="FFCCCCCC"/></right><top style="thin"><color rgb="FFCCCCCC"/></top><bottom style="thin"><color rgb="FFCCCCCC"/></bottom><diagonal/></border>`
    ];

    const cellXfs = [
      `<xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`,
      `<xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`,
      `<xf numFmtId="0" fontId="1" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`,
      `<xf numFmtId="0" fontId="1" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`,
      `<xf numFmtId="0" fontId="1" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`,
      `<xf numFmtId="0" fontId="1" fillId="9" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`,
      `<xf numFmtId="0" fontId="1" fillId="10" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`,
      `<xf numFmtId="0" fontId="0" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>`,
      `<xf numFmtId="1" fontId="0" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`,
      `<xf numFmtId="164" fontId="0" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`,
      `<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>`,
      `<xf numFmtId="1" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`,
      `<xf numFmtId="164" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`
    ];

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n  <numFmts count="1">\n    <numFmt numFmtId="164" formatCode="0.0"/>\n  </numFmts>\n  <fonts count="${fonts.length}">\n    ${fonts.join("\n    ")}\n  </fonts>\n  <fills count="${fills.length}">\n    ${fills.join("\n    ")}\n  </fills>\n  <borders count="${borders.length}">\n    ${borders.join("\n    ")}\n  </borders>\n  <cellStyleXfs count="1">\n    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>\n  </cellStyleXfs>\n  <cellXfs count="${cellXfs.length}">\n    ${cellXfs.join("\n    ")}\n  </cellXfs>\n  <cellStyles count="1">\n    <cellStyle name="Normal" xfId="0" builtinId="0"/>\n  </cellStyles>\n</styleSheet>`;
  }

  function buildCoreXml({ title, creator, description, createdAt }) {
    const created = new Date(createdAt || Date.now());
    const iso = Number.isNaN(created.getTime()) ? new Date().toISOString() : created.toISOString();
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n  <dc:creator>${escapeXml(creator || "OpenCode")}</dc:creator>\n  <cp:lastModifiedBy>${escapeXml(creator || "OpenCode")}</cp:lastModifiedBy>\n  <dc:title>${escapeXml(title || "GNOP Export")}</dc:title>\n  <dc:description>${escapeXml(description || "GNOP workbook export")}</dc:description>\n  <dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created>\n  <dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified>\n</cp:coreProperties>`;
  }

  function buildAppXml(sheets) {
    const namesXml = sheets.map((sheet) => `<vt:lpstr>${escapeXml(sheet.name)}</vt:lpstr>`).join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">\n  <Application>Microsoft Excel</Application>\n  <DocSecurity>0</DocSecurity>\n  <ScaleCrop>false</ScaleCrop>\n  <HeadingPairs>\n    <vt:vector size="2" baseType="variant">\n      <vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant>\n      <vt:variant><vt:i4>${sheets.length}</vt:i4></vt:variant>\n    </vt:vector>\n  </HeadingPairs>\n  <TitlesOfParts>\n    <vt:vector size="${sheets.length}" baseType="lpstr">${namesXml}</vt:vector>\n  </TitlesOfParts>\n  <Company></Company>\n  <LinksUpToDate>false</LinksUpToDate>\n  <SharedDoc>false</SharedDoc>\n  <HyperlinksChanged>false</HyperlinksChanged>\n  <AppVersion>16.0300</AppVersion>\n</Properties>`;
  }

  function dosDateTime(date) {
    const d = date || new Date();
    const year = d.getUTCFullYear() - 1980;
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    const hours = d.getUTCHours();
    const minutes = d.getUTCMinutes();
    const seconds = Math.floor(d.getUTCSeconds() / 2);
    const dateVal = ((year & 0x7f) << 9) | ((month & 0x0f) << 5) | (day & 0x1f);
    const timeVal = ((hours & 0x1f) << 11) | ((minutes & 0x3f) << 5) | (seconds & 0x1f);
    return [timeVal & 0xff, (timeVal >>> 8) & 0xff, dateVal & 0xff, (dateVal >>> 8) & 0xff];
  }

  function buildZip(entries) {
    const fileParts = [];
    const centralParts = [];
    let offset = 0;

    for (const entry of entries) {
      const nameBytes = utf8Bytes(entry.name);
      const dataBytes = toBytes(entry.data);
      const crc = crc32(dataBytes);
      const timeDate = dosDateTime(entry.date || new Date());

      const localHeader = concatBytes([
        Uint8Array.from(u32(ZIP_LOCAL_FILE_HEADER)),
        Uint8Array.from(u16(20)),
        Uint8Array.from(u16(0)),
        Uint8Array.from(u16(0)),
        Uint8Array.from(timeDate),
        Uint8Array.from(u32(crc)),
        Uint8Array.from(u32(dataBytes.length)),
        Uint8Array.from(u32(dataBytes.length)),
        Uint8Array.from(u16(nameBytes.length)),
        Uint8Array.from(u16(0)),
        nameBytes,
        dataBytes
      ]);

      fileParts.push(localHeader);

      const centralHeader = concatBytes([
        Uint8Array.from(u32(ZIP_CENTRAL_DIR_HEADER)),
        Uint8Array.from(u16(20)),
        Uint8Array.from(u16(20)),
        Uint8Array.from(u16(0)),
        Uint8Array.from(u16(0)),
        Uint8Array.from(timeDate),
        Uint8Array.from(u32(crc)),
        Uint8Array.from(u32(dataBytes.length)),
        Uint8Array.from(u32(dataBytes.length)),
        Uint8Array.from(u16(nameBytes.length)),
        Uint8Array.from(u16(0)),
        Uint8Array.from(u16(0)),
        Uint8Array.from(u16(0)),
        Uint8Array.from(u16(0)),
        Uint8Array.from(u32(0x20)),
        Uint8Array.from(u32(offset)),
        nameBytes
      ]);

      centralParts.push(centralHeader);
      offset += localHeader.length;
    }

    const fileData = concatBytes(fileParts);
    const centralDir = concatBytes(centralParts);
    const endRecord = concatBytes([
      Uint8Array.from(u32(ZIP_END_OF_CENTRAL_DIR)),
      Uint8Array.from(u16(0)),
      Uint8Array.from(u16(0)),
      Uint8Array.from(u16(entries.length)),
      Uint8Array.from(u16(entries.length)),
      Uint8Array.from(u32(centralDir.length)),
      Uint8Array.from(u32(fileData.length)),
      Uint8Array.from(u16(0))
    ]);

    return concatBytes([fileData, centralDir, endRecord]);
  }

  function isTotalSheet(sheet) {
    if (!sheet || typeof sheet !== "object") {
      return false;
    }

    if (String(sheet.kind || "").toLowerCase() === "total") {
      return true;
    }

    const name = String(sheet.name || "").trim().toLowerCase();
    return name === "total";
  }

  function normalizeSiteName(sheet, index) {
    const name = String(sheet?.name || "").trim();
    return name || `Sheet ${index + 1}`;
  }

  function getRowValue(row, key) {
    const aliases = RAW_FIELD_ALIASES[key] || [key];
    for (const alias of aliases) {
      if (row && row[alias] != null) {
        return row[alias];
      }
    }
    return null;
  }

  function numberOrZero(value) {
    const num = coerceNumeric(value);
    return num == null ? 0 : num;
  }

  function createSummaryAccumulator(site) {
    return {
      site,
      totalSwaps: 0,
      totalAh: 0,
      totalSOCBelow90: 0,
      totalSOCBelow85: 0,
      totalSOCBelow80: 0,
      daysRecorded: 0
    };
  }

  function accumulateSummary(accumulator, row) {
    accumulator.totalSwaps += numberOrZero(row.swapCount);
    accumulator.totalAh += numberOrZero(row.totalAh);
    accumulator.totalSOCBelow90 += numberOrZero(row.socBelow90Count);
    accumulator.totalSOCBelow85 += numberOrZero(row.socBelow85Count);
    accumulator.totalSOCBelow80 += numberOrZero(row.socBelow80Count);
    accumulator.daysRecorded += 1;
  }

  function finalizeSummary(accumulator) {
    const daysRecorded = accumulator.daysRecorded;
    return {
      site: accumulator.site,
      totalSwaps: accumulator.totalSwaps,
      avgSwapsPerDay: daysRecorded ? accumulator.totalSwaps / daysRecorded : 0,
      totalAh: accumulator.totalAh,
      avgAhPerDay: daysRecorded ? accumulator.totalAh / daysRecorded : 0,
      totalSOCBelow90: accumulator.totalSOCBelow90,
      totalSOCBelow85: accumulator.totalSOCBelow85,
      totalSOCBelow80: accumulator.totalSOCBelow80,
      daysRecorded
    };
  }

  function compareRowsBySiteAndDate(a, b) {
    const siteCompare = textCollator.compare(String(a.site || ""), String(b.site || ""));
    if (siteCompare !== 0) {
      return siteCompare;
    }

    const dateCompare = textCollator.compare(String(a.date || ""), String(b.date || ""));
    if (dateCompare !== 0) {
      return dateCompare;
    }

    return a.__order - b.__order;
  }

  function compareSites(a, b) {
    return textCollator.compare(String(a.site || ""), String(b.site || ""));
  }

  function buildNormalizedData(sheets) {
    const rawRows = [];
    const summaryMap = new Map();
    let order = 0;

    for (let index = 0; index < sheets.length; index += 1) {
      const sheet = sheets[index];
      if (!sheet || typeof sheet !== "object" || isTotalSheet(sheet)) {
        continue;
      }

      const site = normalizeSiteName(sheet, index);
      if (!summaryMap.has(site)) {
        summaryMap.set(site, createSummaryAccumulator(site));
      }

      const rows = Array.isArray(sheet.rows) ? sheet.rows : [];
      for (const row of rows) {
        const normalizedRow = {
          site,
          date: getRowValue(row, "date"),
          swapCount: getRowValue(row, "swapCount"),
          socBelow90Count: getRowValue(row, "socBelow90Count"),
          socBelow85Count: getRowValue(row, "socBelow85Count"),
          socBelow80Count: getRowValue(row, "socBelow80Count"),
          totalAh: getRowValue(row, "totalAh"),
          __order: order += 1
        };

        rawRows.push(normalizedRow);
        accumulateSummary(summaryMap.get(site), normalizedRow);
      }
    }

    rawRows.sort(compareRowsBySiteAndDate);

    const summaryRows = Array.from(summaryMap.values())
      .map(finalizeSummary)
      .sort(compareSites);

    return {
      rawRows,
      summaryRows
    };
  }

  function buildWorksheetXml(sheet, isSelected = false) {
    const columns = Array.isArray(sheet?.columns) ? sheet.columns : [];
    const rows = Array.isArray(sheet?.rows) ? sheet.rows : [];
    const resolvedColumns = autoSizeColumns(columns, rows);

    const headerCells = resolvedColumns.map((column, columnIndex) => {
      const reference = buildCellRef(columnIndex, 0);
      const styleIndex = headerStyleIndexForColumn(column);
      const label = column?.label != null ? column.label : column?.key;
      return xmlCellWithStyle(reference, label, styleIndex, "text");
    });

    const rowXml = rows.map((row, rowIndex) => {
      const dataRowNumber = rowIndex + 2;
      const isEvenDataRow = rowIndex % 2 === 1;
      const cells = resolvedColumns.map((column, columnIndex) => {
        const reference = buildCellRef(columnIndex, rowIndex + 1);
        const key = normalizeColumnKey(column?.key);
        const styleIndex = dataStyleIndexForColumn(column, isEvenDataRow);
        const value = row && row[key] != null ? row[key] : row?.[column?.key];
        return xmlCellWithStyle(reference, value, styleIndex, column?.type || inferColumnType(key));
      });

      return `  <row r="${dataRowNumber}" ht="20" customHeight="1">\n${cells.join("\n")}\n  </row>`;
    });

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n${buildSheetViewXml(isSelected)}\n  <sheetFormatPr defaultRowHeight="20" customHeight="1"/>\n${buildColXml(resolvedColumns)}\n  <sheetData>\n    <row r="1" ht="24" customHeight="1">\n${headerCells.join("\n")}\n    </row>${rowXml.length ? `\n${rowXml.join("\n")}` : ""}\n  </sheetData>\n</worksheet>`;
  }

  function buildSheetDefinitions(sheets) {
    const siteSheets = Array.isArray(sheets) ? sheets.filter((sheet) => sheet && !isTotalSheet(sheet)) : [];

    if (siteSheets.length === 0) {
      return [
        {
          name: "RAW",
          columns: RAW_COLUMNS,
          rows: []
        }
      ];
    }

    const { rawRows, summaryRows } = buildNormalizedData(siteSheets);

    return [
      {
        name: "RAW",
        columns: RAW_COLUMNS,
        rows: rawRows
      },
      {
        name: "SUMMARY",
        columns: SUMMARY_COLUMNS,
        rows: summaryRows
      }
    ];
  }

  function buildXlsxBlob({ sheets, creator, title, description, createdAt }) {
    const sheetDefinitions = buildSheetDefinitions(sheets);
    const entries = [];
    const sheetCount = sheetDefinitions.length;

    entries.push({ name: "[Content_Types].xml", data: utf8Bytes(buildContentTypesXml(sheetCount)) });
    entries.push({ name: "_rels/.rels", data: utf8Bytes(buildRootRelsXml()) });
    entries.push({ name: "docProps/core.xml", data: utf8Bytes(buildCoreXml({ title, creator, description, createdAt })) });
    entries.push({ name: "docProps/app.xml", data: utf8Bytes(buildAppXml(sheetDefinitions)) });
    entries.push({ name: "xl/workbook.xml", data: utf8Bytes(buildWorkbookXml(sheetDefinitions)) });
    entries.push({ name: "xl/_rels/workbook.xml.rels", data: utf8Bytes(buildWorkbookRelsXml(sheetCount)) });
    entries.push({ name: "xl/styles.xml", data: utf8Bytes(buildStylesXml()) });

    sheetDefinitions.forEach((sheet, index) => {
      entries.push({
        name: `xl/worksheets/sheet${index + 1}.xml`,
        data: utf8Bytes(buildWorksheetXml(sheet, index === 0))
      });
    });

    const bytes = buildZip(entries);
    return new Blob([bytes], { type: XLSX_MIME });
  }

  globalThis.GNOPWorkbookWriter = {
    buildXlsxBlob,
    buildWorksheetXml,
    buildWorkbookXml,
    buildWorkbookRelsXml,
    buildContentTypesXml,
    buildRootRelsXml,
    buildStylesXml
  };
})();
