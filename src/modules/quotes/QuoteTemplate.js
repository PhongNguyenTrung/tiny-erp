/**
 * QuoteTemplate — sinh tab `BaoGia` theo TEMPLATE_LAYOUT, định dạng A4 dọc.
 *
 * Chạy 1 lần qua `setup_createTemplate()`. Tách khỏi SettlementTemplate vì
 * 2 tab có schema khác nhau và có thể đứng độc lập trong các deployment
 * không cần tính năng quyết toán.
 */

const QuoteTemplate = (() => {
  const COLOR_HEADER_BG = '#1f4e78';
  const COLOR_HEADER_FG = '#ffffff';
  const COLOR_TOTAL_BG = '#fff2cc';
  const COLOR_GRAND_TOTAL_BG = '#fce4d6';
  const COLOR_LABEL_BG = '#f2f2f2';

  const VND_FORMAT = '#,##0" ₫";[Red]-#,##0" ₫";""';
  const QTY_FORMAT = '0.##;-0.##;""';
  const DATE_FORMAT = 'dd/mm/yyyy';
  const PERCENT_FORMAT = '0%';

  /**
   * Build tab Báo giá theo TEMPLATE_LAYOUT.
   * @param {Sheet} sheet rỗng (sẽ bị clear nếu có dữ liệu cũ)
   */
  function build(sheet) {
    const L = TEMPLATE_LAYOUT;
    sheet.clear().clearFormats().clearNotes();
    sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).breakApart();

    // Column widths (A–I)
    [40, 200, 180, 100, 55, 55, 105, 120, 130].forEach((w, i) => sheet.setColumnWidth(i + 1, w));

    // ===== Header công ty =====
    sheet.getRange('A1:I1').merge()
      .setValue('XƯỞNG / DOANH NGHIỆP CỦA BẠN')
      .setFontSize(18).setFontWeight('bold').setFontColor(COLOR_HEADER_BG)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    sheet.setRowHeight(1, 32);

    sheet.getRange('A2:I2').merge()
      .setValue('Địa chỉ: ____________________  •  Hotline: ____________  •  MST: ____________')
      .setFontStyle('italic').setFontSize(10).setHorizontalAlignment('center');

    sheet.setRowHeight(3, 8);

    // ===== Title =====
    sheet.getRange('A4:I4').merge()
      .setValue('BÁO GIÁ')
      .setFontSize(22).setFontWeight('bold')
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    sheet.setRowHeight(4, 38);

    // ===== Block thông tin khách hàng =====
    [
      ['A5', 'Khách hàng:', 'B5:I5'],
      ['A6', 'Ngày báo giá:', 'B6:D6'],
      ['A7', 'Số báo giá:', 'B7:D7'],
      ['A8', 'Địa chỉ:', 'B8:I8'],
    ].forEach(([labelCell, text, valueRange]) => {
      sheet.getRange(labelCell).setValue(text).setFontWeight('bold').setBackground(COLOR_LABEL_BG);
      sheet.getRange(valueRange).merge()
        .setBorder(null, null, true, null, null, null, '#bfbfbf', SpreadsheetApp.BorderStyle.SOLID);
    });

    sheet.getRange('E6').setValue('SĐT KH:').setFontWeight('bold').setBackground(COLOR_LABEL_BG);
    sheet.getRange('F6:I6').merge()
      .setBorder(null, null, true, null, null, null, '#bfbfbf', SpreadsheetApp.BorderStyle.SOLID);

    sheet.getRange('E7').setValue('Công trình:').setFontWeight('bold').setBackground(COLOR_LABEL_BG);
    sheet.getRange('F7:I7').merge()
      .setBorder(null, null, true, null, null, null, '#bfbfbf', SpreadsheetApp.BorderStyle.SOLID);

    sheet.getRange('B6').setNumberFormat(DATE_FORMAT);

    // ===== Bảng hạng mục =====
    const headerRow = L.ITEMS_START_ROW - 1;
    const headers = ['STT', 'Tên hạng mục', 'Mô tả / Vật liệu', 'Kích thước', 'ĐVT', 'SL', 'Đơn giá', 'Thành tiền', 'Ghi chú'];
    sheet.getRange(headerRow, 1, 1, L.TOTAL_COLS).setValues([headers])
      .setFontWeight('bold').setFontColor(COLOR_HEADER_FG).setBackground(COLOR_HEADER_BG)
      .setHorizontalAlignment('center').setVerticalAlignment('middle')
      .setBorder(true, true, true, true, true, true);
    sheet.setRowHeight(headerRow, 32);

    sheet.getRange(L.ITEMS_START_ROW, 1, L.MAX_ITEMS, L.TOTAL_COLS)
      .setBorder(true, true, true, true, true, true, '#bfbfbf', SpreadsheetApp.BorderStyle.SOLID)
      .setVerticalAlignment('middle');
    sheet.setRowHeights(L.ITEMS_START_ROW, L.MAX_ITEMS, 22);

    sheet.getRange(L.ITEMS_START_ROW, L.COL_INDEX, L.MAX_ITEMS, 1).setHorizontalAlignment('center');
    sheet.getRange(L.ITEMS_START_ROW, L.COL_NAME, L.MAX_ITEMS, 2).setWrap(true);
    sheet.getRange(L.ITEMS_START_ROW, L.COL_DIMENSIONS, L.MAX_ITEMS, 2).setHorizontalAlignment('center');
    sheet.getRange(L.ITEMS_START_ROW, L.COL_QUANTITY, L.MAX_ITEMS, 1)
      .setHorizontalAlignment('center').setNumberFormat(QTY_FORMAT);
    sheet.getRange(L.ITEMS_START_ROW, L.COL_UNIT_PRICE, L.MAX_ITEMS, 1)
      .setHorizontalAlignment('right').setNumberFormat(VND_FORMAT);
    sheet.getRange(L.ITEMS_START_ROW, L.COL_NOTE, L.MAX_ITEMS, 1)
      .setWrap(true).setFontSize(10).setFontStyle('italic');

    // Cột Thành tiền: công thức = SL × Đơn giá
    const totalFormulas = [];
    for (let i = 0; i < L.MAX_ITEMS; i++) {
      const r = L.ITEMS_START_ROW + i;
      totalFormulas.push(['=IFERROR(IF(AND(ISNUMBER(F' + r + '),ISNUMBER(G' + r + ')),F' + r + '*G' + r + ',""),"")']);
    }
    sheet.getRange(L.ITEMS_START_ROW, L.COL_TOTAL, L.MAX_ITEMS, 1)
      .setFormulas(totalFormulas)
      .setHorizontalAlignment('right')
      .setNumberFormat(VND_FORMAT);

    // ===== Block tổng cộng =====
    const lastItemRow = L.ITEMS_START_ROW + L.MAX_ITEMS - 1;
    const subRow = L.SUBTOTAL_ROW;

    sheet.getRange(subRow, 5, 1, 3).merge()
      .setValue('Cộng tiền hàng').setFontWeight('bold').setHorizontalAlignment('right')
      .setBackground(COLOR_TOTAL_BG);
    sheet.getRange(subRow, 8)
      .setFormula('=SUM(H' + L.ITEMS_START_ROW + ':H' + lastItemRow + ')')
      .setNumberFormat(VND_FORMAT).setFontWeight('bold')
      .setBackground(COLOR_TOTAL_BG).setBorder(true, true, true, true, false, false);

    const vatRow = L.VAT_ROW;
    sheet.getRange(vatRow, 5, 1, 2).merge()
      .setValue('VAT').setFontWeight('bold').setHorizontalAlignment('right')
      .setBackground(COLOR_TOTAL_BG);
    sheet.getRange(vatRow, 7).setValue(0.08)
      .setNumberFormat(PERCENT_FORMAT).setHorizontalAlignment('center')
      .setBackground('#ffffff').setFontWeight('bold')
      .setBorder(true, true, true, true, false, false);
    sheet.getRange(vatRow, 8)
      .setFormula('=H' + subRow + '*G' + vatRow)
      .setNumberFormat(VND_FORMAT).setFontWeight('bold')
      .setBackground(COLOR_TOTAL_BG).setBorder(true, true, true, true, false, false);

    const totalRow = L.TOTAL_ROW;
    sheet.getRange(totalRow, 5, 1, 3).merge()
      .setValue('TỔNG CỘNG').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('right')
      .setBackground(COLOR_GRAND_TOTAL_BG);
    sheet.getRange(totalRow, 8)
      .setFormula('=H' + subRow + '+H' + vatRow)
      .setNumberFormat(VND_FORMAT).setFontWeight('bold').setFontSize(12)
      .setBackground(COLOR_GRAND_TOTAL_BG).setBorder(true, true, true, true, false, false);

    // Bằng chữ
    sheet.getRange(L.WORDS_ROW, 1).setValue('Bằng chữ:').setFontWeight('bold').setFontStyle('italic');
    sheet.getRange(L.WORDS_ROW, 2, 1, L.TOTAL_COLS - 1).merge()
      .setFontStyle('italic')
      .setBorder(null, null, true, null, null, null, '#bfbfbf', SpreadsheetApp.BorderStyle.SOLID);

    const generalNoteRow = L.WORDS_ROW + 1;
    sheet.getRange(generalNoteRow, 1).setValue('Ghi chú:').setFontWeight('bold');
    sheet.getRange(generalNoteRow, 2, 1, L.TOTAL_COLS - 1).merge()
      .setWrap(true).setFontStyle('italic').setVerticalAlignment('top')
      .setBorder(true, true, true, true, false, false, '#bfbfbf', SpreadsheetApp.BorderStyle.SOLID);
    sheet.setRowHeight(generalNoteRow, 50);

    // Điều khoản (tuỳ chỉnh theo loại hình kinh doanh — đây là default cho xưởng sản xuất)
    const termsStart = generalNoteRow + 2;
    sheet.getRange(termsStart, 1).setValue('Điều khoản & cam kết:').setFontWeight('bold');
    [
      '1. Báo giá có hiệu lực trong 15 ngày kể từ ngày phát hành.',
      '2. Đặt cọc 50% khi ký hợp đồng, 40% khi giao hàng, 10% sau bảo hành 7 ngày.',
      '3. Bảo hành sản phẩm 12 tháng cho lỗi kỹ thuật.',
      '4. Giá đã bao gồm vận chuyển nội thành và lắp đặt cơ bản.',
    ].forEach((line, i) => {
      sheet.getRange(termsStart + 1 + i, 1, 1, L.TOTAL_COLS).merge()
        .setValue(line).setFontSize(10);
    });

    // Chữ ký
    const sigRow = termsStart + 6;
    sheet.getRange(sigRow, 1, 1, 4).merge().setValue('KHÁCH HÀNG').setFontWeight('bold').setHorizontalAlignment('center');
    sheet.getRange(sigRow, 5, 1, 5).merge().setValue('NGƯỜI LẬP BÁO GIÁ').setFontWeight('bold').setHorizontalAlignment('center');
    sheet.getRange(sigRow + 1, 1, 1, 4).merge().setValue('(Ký, ghi rõ họ tên)').setFontStyle('italic').setHorizontalAlignment('center');
    sheet.getRange(sigRow + 1, 5, 1, 5).merge().setValue('(Ký, ghi rõ họ tên)').setFontStyle('italic').setHorizontalAlignment('center');
    sheet.setRowHeight(sigRow + 2, 70);

    sheet.setFrozenRows(headerRow);
    sheet.setHiddenGridlines(true);
  }

  return { build };
})();
