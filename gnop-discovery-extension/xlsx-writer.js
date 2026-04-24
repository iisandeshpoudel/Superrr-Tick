(function initWorkbookWriter() {
  const ZIP_LOCAL_FILE_HEADER = 0x04034b50;
  const ZIP_CENTRAL_DIR_HEADER = 0x02014b50;
  const ZIP_END_OF_CENTRAL_DIR = 0x06054b50;
  const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const textEncoder = new TextEncoder();

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

  function columnName(index) {
    let n = index;
    let name = "";
    while (n > 0) {
      const rem = (n - 1) % 26;
      name = String.fromCharCode(65 + rem) + name;
      n = Math.floor((n - 1) / 26);
    }
    return name;
  }

  function xmlCell(reference, value) {
    if (value == null || value === "") {
      return `    <c r="${reference}"/>`;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return `    <c r="${reference}"><v>${String(value)}</v></c>`;
    }

    const text = escapeXml(value);
    return `    <c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
  }

  function xmlCellWithStyle(reference, value, styleIndex) {
    const styleAttr = Number.isInteger(styleIndex) ? ` s="${styleIndex}"` : "";

    if (value == null || value === "") {
      return `    <c r="${reference}"${styleAttr}/>`;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return `    <c r="${reference}"${styleAttr}><v>${String(value)}</v></c>`;
    }

    const text = escapeXml(value);
    return `    <c r="${reference}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
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

  function escapeSheetText(text) {
    return escapeXml(text).replace(/"/g, '&quot;');
  }

  function buildColXml(columns) {
    const widths = columns.map((column) => Number(column?.width) || 12);
    const cols = widths.map((width, index) => {
      const min = index + 1;
      const max = index + 1;
      return `    <col min="${min}" max="${max}" width="${width}" customWidth="1"/>`;
    });
    return `  <cols>\n${cols.join("\n")}\n  </cols>`;
  }

  function buildSheetViewXml(isSelected) {
    const selectedAttr = isSelected ? ' tabSelected="1"' : "";
    return `  <sheetViews>\n    <sheetView workbookViewId="0"${selectedAttr}>\n      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>\n      <selection pane="bottomLeft" activeCell="A2" sqref="A2"/>\n    </sheetView>\n  </sheetViews>`;
  }

  function headerStyleForColumn(columnKey) {
    switch (columnKey) {
      case "date":
        return 2;
      case "swapCount":
        return 3;
      case "socBelowNinetyCount":
        return 4;
      case "socBelowEightyFiveCount":
        return 5;
      case "socBelowEightyCount":
        return 6;
      case "totalAh":
        return 7;
      default:
        return 2;
    }
  }

  function dataStyleForCell(value) {
    return typeof value === "number" && Number.isFinite(value) ? 1 : 0;
  }

  function buildWorksheetXml(sheet, isSelected = false) {
    const columns = sheet.columns || [];
    const rows = Array.isArray(sheet.rows) ? sheet.rows : [];
    const allRows = [];

    const header = {};
    columns.forEach((column, index) => {
      header[column.key] = column.label || column.key;
    });
    allRows.push(header);

    for (const row of rows) {
      allRows.push(row || {});
    }

    const rowXml = allRows.map((row, rowIndex) => {
      const isHeader = rowIndex === 0;
      const cells = columns.map((column, columnIndex) => {
        const reference = buildCellRef(columnIndex, rowIndex);
        const styleIndex = isHeader ? headerStyleForColumn(column.key) : dataStyleForCell(row[column.key]);
        return xmlCellWithStyle(reference, row[column.key], styleIndex);
      });
      const rowHeight = isHeader ? 24 : 20;
      return `  <row r="${rowIndex + 1}" ht="${rowHeight}" customHeight="1">
${cells.join("\n")}
  </row>`;
    });

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n  <sheetFormatPr defaultRowHeight="20" customHeight="1"/>\n${buildSheetViewXml(isSelected)}\n${buildColXml(columns)}\n  <sheetData>\n${rowXml.join("\n")}\n  </sheetData>\n</worksheet>`;
  }

  function buildWorkbookXml(sheets) {
    const sheetXml = sheets
      .map((sheet, index) => `    <sheet name="${escapeAttr(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n  <sheets>\n${sheetXml}\n  </sheets>\n</workbook>`;
  }

  function buildWorkbookRelsXml(sheetCount) {
    const rels = [];
    for (let i = 0; i < sheetCount; i += 1) {
      rels.push(
        `  <Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
      );
    }
    rels.push(
      `  <Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
    );

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

  function buildStylesXmlV2() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font>
      <sz val="11"/>
      <color rgb="FF111111"/>
      <name val="Calibri"/>
      <family val="2"/>
    </font>
    <font>
      <sz val="11"/>
      <color rgb="FFFFFFFF"/>
      <name val="Calibri"/>
      <family val="2"/>
      <b/>
    </font>
    <font>
      <sz val="11"/>
      <color rgb="FF111111"/>
      <name val="Calibri"/>
      <family val="2"/>
      <b/>
    </font>
  </fonts>
  <fills count="9">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF2358FF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDCE8F8"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF4D9D4"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE6EFE6"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE6E0FB"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF5E1A4"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FF111111"/></left><right style="thin"><color rgb="FF111111"/></right><top style="thin"><color rgb="FF111111"/></top><bottom style="thin"><color rgb="FF111111"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="8">
    <xf numFmtId="0" fontId="0" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;
  }

  function buildStylesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n  <fonts count="2">\n    <font>\n      <sz val="11"/>\n      <color rgb="FFFFFFFF"/>\n      <name val="Calibri"/>\n      <family val="2"/>\n      <b/>\n    </font>\n    <font>\n      <sz val="11"/>\n      <color rgb="FF111111"/>\n      <name val="Calibri"/>\n      <family val="2"/>\n    </font>\n  </fonts>\n  <fills count="5">\n    <fill><patternFill patternType="none"/></fill>\n    <fill><patternFill patternType="gray125"/></fill>\n    <fill><patternFill patternType="solid"><fgColor rgb="FFFF5D2D"/><bgColor indexed="64"/></patternFill></fill>\n    <fill><patternFill patternType="solid"><fgColor rgb="FFF7C948"/><bgColor indexed="64"/></patternFill></fill>\n    <fill><patternFill patternType="solid"><fgColor rgb="FF2358FF"/><bgColor indexed="64"/></patternFill></fill>\n  </fills>\n  <borders count="4">\n    <border><left/><right/><top/><bottom/><diagonal/></border>\n    <border><left style="thin"><color rgb="FF111111"/></left><right style="thin"><color rgb="FF111111"/></right><top style="thin"><color rgb="FF111111"/></top><bottom style="thin"><color rgb="FF111111"/></bottom><diagonal/></border>\n    <border><left style="medium"><color rgb="FF111111"/></left><right style="medium"><color rgb="FF111111"/></right><top style="medium"><color rgb="FF111111"/></top><bottom style="medium"><color rgb="FF111111"/></bottom><diagonal/></border>\n    <border><left style="thin"><color rgb="FF111111"/></left><right style="thin"><color rgb="FF111111"/></right><top style="thin"><color rgb="FF111111"/></top><bottom style="thin"><color rgb="FF111111"/></bottom><diagonal/></border>\n  </borders>\n  <cellStyleXfs count="1">\n    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>\n  </cellStyleXfs>\n  <cellXfs count="10">\n    <xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">\n      <alignment horizontal="center" vertical="center"/>\n    </xf>\n    <xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">\n      <alignment horizontal="left" vertical="center"/>\n    </xf>\n    <xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">\n      <alignment horizontal="right" vertical="center"/>\n    </xf>\n    <xf numFmtId="0" fontId="0" fillId="2" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">\n      <alignment horizontal="center" vertical="center"/>\n    </xf>\n    <xf numFmtId="0" fontId="0" fillId="2" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">\n      <alignment horizontal="left" vertical="center"/>\n    </xf>\n    <xf numFmtId="0" fontId="0" fillId="2" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">\n      <alignment horizontal="right" vertical="center"/>\n    </xf>\n    <xf numFmtId="0" fontId="1" fillId="3" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">\n      <alignment horizontal="center" vertical="center"/>\n    </xf>\n    <xf numFmtId="0" fontId="1" fillId="4" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">\n      <alignment horizontal="center" vertical="center"/>\n    </xf>\n    <xf numFmtId="0" fontId="1" fillId="0" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">\n      <alignment horizontal="center" vertical="center"/>\n    </xf>\n    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">\n      <alignment horizontal="left" vertical="center"/>\n    </xf>\n  </cellXfs>\n  <cellStyles count="1">\n    <cellStyle name="Normal" xfId="0" builtinId="0"/>\n  </cellStyles>\n</styleSheet>`;
  }

  function buildCoreXml({ title, creator, description, createdAt }) {
    const iso = (createdAt || new Date()).toISOString();
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n  <dc:creator>${escapeXml(creator || "OpenCode")}</dc:creator>\n  <cp:lastModifiedBy>${escapeXml(creator || "OpenCode")}</cp:lastModifiedBy>\n  <dc:title>${escapeXml(title || "GNOP Export")}</dc:title>\n  <dc:description>${escapeXml(description || "GNOP workbook export")}</dc:description>\n  <dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created>\n  <dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified>\n</cp:coreProperties>`;
  }

  function buildAppXml(sheets) {
    const namesXml = sheets.map((sheet) => `<vt:lpstr>${escapeXml(sheet.name)}</vt:lpstr>`).join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">\n  <Application>Microsoft Excel</Application>\n  <DocSecurity>0</DocSecurity>\n  <ScaleCrop>false</ScaleCrop>\n  <HeadingPairs>\n    <vt:vector size="2" baseType="variant">\n      <vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant>\n      <vt:variant><vt:i4>${sheets.length}</vt:i4></vt:variant>\n    </vt:vector>\n  </HeadingPairs>\n  <TitlesOfParts>\n    <vt:vector size="${sheets.length}" baseType="lpstr">${namesXml}</vt:vector>\n  </TitlesOfParts>\n  <Company></Company>\n  <LinksUpToDate>false</LinksUpToDate>\n  <SharedDoc>false</SharedDoc>\n  <HyperlinksChanged>false</HyperlinksChanged>\n  <AppVersion>16.0300</AppVersion>\n</Properties>`;
  }

  function buildZip(entries) {
    const fileParts = [];
    const centralParts = [];
    let offset = 0;

    for (const entry of entries) {
      const nameBytes = utf8Bytes(entry.name);
      const dataBytes = toBytes(entry.data);
      const crc = crc32(dataBytes);
      const localHeader = concatBytes([
        Uint8Array.from(u32(ZIP_LOCAL_FILE_HEADER)),
        Uint8Array.from(u16(20)),
        Uint8Array.from(u16(0)),
        Uint8Array.from(u16(0)),
        Uint8Array.from(u16(0)),
        Uint8Array.from(u16(0)),
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
        Uint8Array.from(u16(0)),
        Uint8Array.from(u16(0)),
        Uint8Array.from(u32(crc)),
        Uint8Array.from(u32(dataBytes.length)),
        Uint8Array.from(u32(dataBytes.length)),
        Uint8Array.from(u16(nameBytes.length)),
        Uint8Array.from(u16(0)),
        Uint8Array.from(u16(0)),
        Uint8Array.from(u16(0)),
        Uint8Array.from(u16(0)),
        Uint8Array.from(u32(0)),
        Uint8Array.from(u32(offset)),
        nameBytes
      ]);

      centralParts.push(centralHeader);
      offset += localHeader.length;
    }

    const centralDir = concatBytes(centralParts);
    const fileData = concatBytes(fileParts);
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

  function buildXlsxBlob({ sheets, creator, title, description, createdAt }) {
    const safeSheets = Array.isArray(sheets) ? sheets : [];
    const entries = [];

    entries.push({ name: "[Content_Types].xml", data: utf8Bytes(buildContentTypesXml(safeSheets.length)) });
    entries.push({ name: "_rels/.rels", data: utf8Bytes(buildRootRelsXml()) });
    entries.push({ name: "docProps/core.xml", data: utf8Bytes(buildCoreXml({ title, creator, description, createdAt })) });
    entries.push({ name: "docProps/app.xml", data: utf8Bytes(buildAppXml(safeSheets)) });
    entries.push({ name: "xl/workbook.xml", data: utf8Bytes(buildWorkbookXml(safeSheets)) });
    entries.push({ name: "xl/_rels/workbook.xml.rels", data: utf8Bytes(buildWorkbookRelsXml(safeSheets.length)) });
    entries.push({ name: "xl/styles.xml", data: utf8Bytes(buildStylesXmlV2()) });

    safeSheets.forEach((sheet, index) => {
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
