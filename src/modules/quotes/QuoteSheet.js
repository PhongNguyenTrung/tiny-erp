/**
 * QuoteSheet — clone quote template + fill cells với draft đã extract.
 *
 * Sheet formulas (=F*G, SUM, VAT) handle tính toán; module này chỉ ghi inputs.
 * Tách rời với QuoteExtractor để có thể fill template từ source khác
 * (form web, API import, …) — không bị couple với AI.
 */

const QuoteSheet = (() => {
  /**
   * Clone template → ghi data → return file + totals.
   * @param {Object} draft  output của QuoteExtractor.extract (hoặc tương đương)
   * @param {string} [quoteId]  human-readable id, ghi vào ô B7
   */
  function fill(draft, quoteId) {
    const templateId = Config.require('TEMPLATE_SPREADSHEET_ID');
    const folderId = Config.get('OUTPUT_DRIVE_FOLDER_ID');
    const folder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();

    const customer = (draft.customer_name || 'KhachHang').replace(/[^\p{L}\p{N}_-]+/gu, '_');
    const stamp = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd_HHmm');
    const newName = ['BaoGia', customer, stamp].join('_');

    const newFile = DriveApp.getFileById(templateId).makeCopy(newName, folder);
    const ss = SpreadsheetApp.openById(newFile.getId());
    const sheet = ss.getSheetByName(Config.get('TEMPLATE_SHEET_NAME')) || ss.getSheets()[0];

    sheet.getRange(TEMPLATE_LAYOUT.CUSTOMER_NAME_CELL).setValue(draft.customer_name || '');
    sheet.getRange(TEMPLATE_LAYOUT.QUOTE_DATE_CELL).setValue(new Date());
    if (quoteId) sheet.getRange(TEMPLATE_LAYOUT.QUOTE_NUMBER_CELL).setValue(quoteId);

    _writeItems(sheet, draft.items || []);
    SpreadsheetApp.flush();

    return { spreadsheet: ss, file: newFile, totals: _readTotals(sheet, draft.items.length) };
  }

  function _writeItems(sheet, items) {
    if (items.length > TEMPLATE_LAYOUT.MAX_ITEMS) {
      throw new Error('Vượt quá ' + TEMPLATE_LAYOUT.MAX_ITEMS + ' hạng mục, không fit template');
    }
    const startRow = TEMPLATE_LAYOUT.ITEMS_START_ROW;

    items.forEach((item, i) => {
      const row = startRow + i;
      sheet.getRange(row, TEMPLATE_LAYOUT.COL_INDEX).setValue(i + 1);
      sheet.getRange(row, TEMPLATE_LAYOUT.COL_NAME).setValue(item.name || '');
      sheet.getRange(row, TEMPLATE_LAYOUT.COL_DESCRIPTION).setValue(item.description || '');
      sheet.getRange(row, TEMPLATE_LAYOUT.COL_DIMENSIONS).setValue(item.dimensions || '');
      sheet.getRange(row, TEMPLATE_LAYOUT.COL_UNIT).setValue(item.unit || '');
      sheet.getRange(row, TEMPLATE_LAYOUT.COL_QUANTITY).setValue(item.quantity);
      sheet.getRange(row, TEMPLATE_LAYOUT.COL_UNIT_PRICE).setValue(item.unit_price);
      sheet.getRange(row, TEMPLATE_LAYOUT.COL_NOTE).setValue(item.note || '');
    });
  }

  function _readTotals(sheet, itemCount) {
    let subtotal = 0;
    const startRow = TEMPLATE_LAYOUT.ITEMS_START_ROW;
    for (let i = 0; i < itemCount; i++) {
      const v = sheet.getRange(startRow + i, TEMPLATE_LAYOUT.COL_TOTAL).getValue();
      if (typeof v === 'number') subtotal += v;
    }
    const vat = Math.round(subtotal * Config.get('VAT_RATE'));
    return { subtotal, vat, total: subtotal + vat };
  }

  /**
   * Human-readable Vietnamese summary của draft + totals, dùng cho confirmation message.
   */
  function summarize(draft, totals) {
    const lines = [];
    lines.push('Em đã nhận báo giá cho: ' + (draft.customer_name || '(chưa rõ tên)'));
    lines.push('');
    (draft.items || []).forEach((it, i) => {
      const qty = it.quantity != null ? it.quantity : '?';
      const unit = it.unit || '';
      const price = it.unit_price != null ? formatVND(it.unit_price) : '?';
      const dim = it.dimensions ? ' ' + it.dimensions : '';
      lines.push((i + 1) + '. ' + (it.name || '?') + dim + ' — ' + qty + ' ' + unit + ' × ' + price);
      if (it.note) lines.push('   (Ghi chú: ' + it.note + ')');
    });
    if (totals) {
      lines.push('');
      lines.push('Tạm tính: ' + formatVND(totals.subtotal));
      lines.push('VAT: ' + formatVND(totals.vat));
      lines.push('Tổng: ' + formatVND(totals.total));
    }
    if (draft.missing_fields && draft.missing_fields.length) {
      lines.push('');
      lines.push('⚠ Thiếu: ' + draft.missing_fields.join(', '));
    }
    lines.push('');
    lines.push('Anh xác nhận "OK" để em xuất file PDF, hoặc nhắn lại phần cần sửa.');
    return lines.join('\n');
  }

  function formatVND(n) {
    if (n == null || isNaN(n)) return '?';
    return Math.round(n).toLocaleString('vi-VN') + 'đ';
  }

  return { fill, summarize, formatVND };
})();
