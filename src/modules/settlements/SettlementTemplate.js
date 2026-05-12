/**
 * SettlementTemplate — sinh tab `QuyetToan` (13 cột, BG vs TT + tạm ứng).
 *
 * Phase 1 (hiện tại): chỉ phục vụ in/quản trị thủ công — chủ DN tự fill
 * sau khi thi công xong.
 *
 * Phase 2 (roadmap): bot auto-fill từ một báo giá đã có + chứng từ thực tế.
 */

const SettlementTemplate = (() => {
  const COLOR_HEADER_BG = '#1f4e78';
  const COLOR_HEADER_FG = '#ffffff';
  const COLOR_SUBHEADER_BG = '#d9e1f2';
  const COLOR_TOTAL_BG = '#fff2cc';
  const COLOR_GRAND_TOTAL_BG = '#fce4d6';
  const COLOR_LABEL_BG = '#f2f2f2';

  const VND_FORMAT = '#,##0" ₫";[Red]-#,##0" ₫";""';
  const QTY_FORMAT = '0.##;-0.##;""';
  const DATE_FORMAT = 'dd/mm/yyyy';
  const PERCENT_FORMAT = '0%';

  /**
   * Build tab Quyết toán theo QUYETTOAN_LAYOUT.
   * @param {Sheet} sheet rỗng (sẽ bị clear nếu có dữ liệu cũ)
   */
  function build(sheet) {
    const Q = QUYETTOAN_LAYOUT;
    sheet.clear().clearFormats().clearNotes();
    sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).breakApart();

    [35, 160, 140, 80, 50, 50, 90, 100, 50, 90, 100, 100, 130]
      .forEach((w, i) => sheet.setColumnWidth(i + 1, w));

    sheet.getRange('A1:M1').merge()
      .setValue('XƯỞNG / DOANH NGHIỆP CỦA BẠN')
      .setFontSize(18).setFontWeight('bold').setFontColor(COLOR_HEADER_BG)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    sheet.setRowHeight(1, 32);

    sheet.getRange('A2:M2').merge()
      .setValue('Địa chỉ: ____________________  •  Hotline: ____________  •  MST: ____________')
      .setFontStyle('italic').setFontSize(10).setHorizontalAlignment('center');
    sheet.setRowHeight(3, 8);

    sheet.getRange('A4:M4').merge()
      .setValue('BẢNG QUYẾT TOÁN CÔNG TRÌNH')
      .setFontSize(20).setFontWeight('bold').setHorizontalAlignment('center');
    sheet.setRowHeight(4, 38);

    [
      ['A5', 'Khách hàng:', 'B5:F5'],
      ['G5', 'Công trình:', 'H5:M5'],
      ['A6', 'Ngày quyết toán:', 'B6:D6'],
      ['A7', 'Số quyết toán:', 'B7:D7'],
      ['A8', 'Tham chiếu báo giá:', 'B8:D8'],
      ['E6', 'SĐT KH:', 'F6:H6'],
      ['E7', 'Địa chỉ:', 'F7:M7'],
      ['E8', 'Người lập:', 'F8:H8'],
    ].forEach(([labelCell, text, valueRange]) => {
      sheet.getRange(labelCell).setValue(text).setFontWeight('bold').setBackground(COLOR_LABEL_BG);
      sheet.getRange(valueRange).merge()
        .setBorder(null, null, true, null, null, null, '#bfbfbf', SpreadsheetApp.BorderStyle.SOLID);
    });
    sheet.getRange('B6').setNumberFormat(DATE_FORMAT);

    const groupRow = 9;
    const headRow = 10;

    sheet.getRange(groupRow, 1, 2, 1).merge().setValue('STT');
    sheet.getRange(groupRow, 2, 2, 1).merge().setValue('Tên hạng mục');
    sheet.getRange(groupRow, 3, 2, 1).merge().setValue('Mô tả / Vật liệu');
    sheet.getRange(groupRow, 4, 2, 1).merge().setValue('Kích thước');
    sheet.getRange(groupRow, 5, 2, 1).merge().setValue('ĐVT');

    sheet.getRange(groupRow, 6, 1, 3).merge().setValue('THEO BÁO GIÁ');
    sheet.getRange(groupRow, 9, 1, 3).merge().setValue('THỰC TẾ THI CÔNG');
    sheet.getRange(groupRow, 12, 2, 1).merge().setValue('Chênh lệch');
    sheet.getRange(groupRow, 13, 2, 1).merge().setValue('Ghi chú');

    sheet.getRange(headRow, 6, 1, 6).setValues([['SL', 'Đơn giá', 'Thành tiền', 'SL', 'Đơn giá', 'Thành tiền']]);

    sheet.getRange(groupRow, 1, 2, Q.TOTAL_COLS)
      .setFontWeight('bold').setFontColor(COLOR_HEADER_FG).setBackground(COLOR_HEADER_BG)
      .setHorizontalAlignment('center').setVerticalAlignment('middle')
      .setBorder(true, true, true, true, true, true);
    sheet.setRowHeight(groupRow, 26);
    sheet.setRowHeight(headRow, 26);

    sheet.getRange(Q.ITEMS_START_ROW, 1, Q.MAX_ITEMS, Q.TOTAL_COLS)
      .setBorder(true, true, true, true, true, true, '#bfbfbf', SpreadsheetApp.BorderStyle.SOLID)
      .setVerticalAlignment('middle');
    sheet.setRowHeights(Q.ITEMS_START_ROW, Q.MAX_ITEMS, 22);

    sheet.getRange(Q.ITEMS_START_ROW, Q.COL_INDEX, Q.MAX_ITEMS, 1).setHorizontalAlignment('center');
    sheet.getRange(Q.ITEMS_START_ROW, Q.COL_NAME, Q.MAX_ITEMS, 2).setWrap(true);
    sheet.getRange(Q.ITEMS_START_ROW, Q.COL_DIMENSIONS, Q.MAX_ITEMS, 2).setHorizontalAlignment('center');
    sheet.getRange(Q.ITEMS_START_ROW, Q.COL_QTY_BG, Q.MAX_ITEMS, 1).setHorizontalAlignment('center').setNumberFormat(QTY_FORMAT);
    sheet.getRange(Q.ITEMS_START_ROW, Q.COL_PRICE_BG, Q.MAX_ITEMS, 1).setHorizontalAlignment('right').setNumberFormat(VND_FORMAT);
    sheet.getRange(Q.ITEMS_START_ROW, Q.COL_QTY_TT, Q.MAX_ITEMS, 1).setHorizontalAlignment('center').setNumberFormat(QTY_FORMAT);
    sheet.getRange(Q.ITEMS_START_ROW, Q.COL_PRICE_TT, Q.MAX_ITEMS, 1).setHorizontalAlignment('right').setNumberFormat(VND_FORMAT);
    sheet.getRange(Q.ITEMS_START_ROW, Q.COL_NOTE, Q.MAX_ITEMS, 1)
      .setWrap(true).setFontSize(10).setFontStyle('italic');

    const fBG = [], fTT = [], fDiff = [];
    for (let i = 0; i < Q.MAX_ITEMS; i++) {
      const r = Q.ITEMS_START_ROW + i;
      fBG.push(['=IFERROR(IF(AND(ISNUMBER(F' + r + '),ISNUMBER(G' + r + ')),F' + r + '*G' + r + ',""),"")']);
      fTT.push(['=IFERROR(IF(AND(ISNUMBER(I' + r + '),ISNUMBER(J' + r + ')),I' + r + '*J' + r + ',""),"")']);
      fDiff.push(['=IFERROR(IF(ISNUMBER(K' + r + '),K' + r + '-IFERROR(H' + r + ',0),""),"")']);
    }
    sheet.getRange(Q.ITEMS_START_ROW, Q.COL_TOTAL_BG, Q.MAX_ITEMS, 1).setFormulas(fBG)
      .setHorizontalAlignment('right').setNumberFormat(VND_FORMAT);
    sheet.getRange(Q.ITEMS_START_ROW, Q.COL_TOTAL_TT, Q.MAX_ITEMS, 1).setFormulas(fTT)
      .setHorizontalAlignment('right').setNumberFormat(VND_FORMAT);
    sheet.getRange(Q.ITEMS_START_ROW, Q.COL_DIFF, Q.MAX_ITEMS, 1).setFormulas(fDiff)
      .setHorizontalAlignment('right').setNumberFormat(VND_FORMAT);

    const lastItemRow = Q.ITEMS_START_ROW + Q.MAX_ITEMS - 1;
    const subRow = Q.SUBTOTAL_ROW;
    const vatRow = Q.VAT_ROW;
    const totalRow = Q.TOTAL_ROW;

    sheet.getRange(subRow, 1, 1, 5).merge()
      .setValue('Cộng tiền hàng').setFontWeight('bold').setHorizontalAlignment('right')
      .setBackground(COLOR_TOTAL_BG);
    [Q.COL_TOTAL_BG, Q.COL_TOTAL_TT, Q.COL_DIFF].forEach((col) => {
      const colLetter = String.fromCharCode(64 + col);
      sheet.getRange(subRow, col)
        .setFormula('=SUM(' + colLetter + Q.ITEMS_START_ROW + ':' + colLetter + lastItemRow + ')')
        .setNumberFormat(VND_FORMAT).setFontWeight('bold')
        .setBackground(COLOR_TOTAL_BG)
        .setBorder(true, true, true, true, false, false);
    });

    sheet.getRange(vatRow, 1, 1, 5).merge()
      .setValue('VAT').setFontWeight('bold').setHorizontalAlignment('right')
      .setBackground(COLOR_TOTAL_BG);
    sheet.getRange(vatRow, Q.COL_PRICE_BG).setValue(0.08)
      .setNumberFormat(PERCENT_FORMAT).setHorizontalAlignment('center').setFontWeight('bold')
      .setBorder(true, true, true, true, false, false);
    sheet.getRange(vatRow, Q.COL_TOTAL_BG)
      .setFormula('=H' + subRow + '*G' + vatRow)
      .setNumberFormat(VND_FORMAT).setFontWeight('bold').setBackground(COLOR_TOTAL_BG)
      .setBorder(true, true, true, true, false, false);
    sheet.getRange(vatRow, Q.COL_TOTAL_TT)
      .setFormula('=K' + subRow + '*G' + vatRow)
      .setNumberFormat(VND_FORMAT).setFontWeight('bold').setBackground(COLOR_TOTAL_BG)
      .setBorder(true, true, true, true, false, false);

    sheet.getRange(totalRow, 1, 1, 5).merge()
      .setValue('TỔNG CỘNG').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('right')
      .setBackground(COLOR_GRAND_TOTAL_BG);
    sheet.getRange(totalRow, Q.COL_TOTAL_BG)
      .setFormula('=H' + subRow + '+H' + vatRow)
      .setNumberFormat(VND_FORMAT).setFontWeight('bold').setFontSize(12)
      .setBackground(COLOR_GRAND_TOTAL_BG).setBorder(true, true, true, true, false, false);
    sheet.getRange(totalRow, Q.COL_TOTAL_TT)
      .setFormula('=K' + subRow + '+K' + vatRow)
      .setNumberFormat(VND_FORMAT).setFontWeight('bold').setFontSize(12)
      .setBackground(COLOR_GRAND_TOTAL_BG).setBorder(true, true, true, true, false, false);
    sheet.getRange(totalRow, Q.COL_DIFF)
      .setFormula('=K' + totalRow + '-H' + totalRow)
      .setNumberFormat(VND_FORMAT).setFontWeight('bold').setFontSize(12)
      .setBackground(COLOR_GRAND_TOTAL_BG).setBorder(true, true, true, true, false, false);

    sheet.getRange(Q.ADVANCE_HEADER_ROW, 1, 1, Q.TOTAL_COLS).merge()
      .setValue('CÁC ĐỢT TẠM ỨNG / THANH TOÁN')
      .setFontWeight('bold').setBackground(COLOR_SUBHEADER_BG)
      .setHorizontalAlignment('center');

    Q.ADVANCE_ROWS.forEach((r, i) => {
      sheet.getRange(r, 1).setValue('Đợt ' + (i + 1)).setFontWeight('bold').setHorizontalAlignment('center');
      sheet.getRange(r, 2).setValue('Ngày:').setFontWeight('bold').setBackground(COLOR_LABEL_BG);
      sheet.getRange(r, 3).setNumberFormat(DATE_FORMAT);
      sheet.getRange(r, 4, 1, 5).merge().setValue('Nội dung / chứng từ:');
      sheet.getRange(r, 9).setValue('Số tiền:').setFontWeight('bold').setBackground(COLOR_LABEL_BG)
        .setHorizontalAlignment('right');
      sheet.getRange(r, 10, 1, 2).merge().setNumberFormat(VND_FORMAT).setHorizontalAlignment('right')
        .setBorder(true, true, true, true, false, false);
      sheet.getRange(r, 12).setValue('Ghi chú:').setFontWeight('bold').setBackground(COLOR_LABEL_BG)
        .setHorizontalAlignment('right');
      sheet.getRange(r, 13).setFontStyle('italic')
        .setBorder(null, null, true, null, null, null, '#bfbfbf', SpreadsheetApp.BorderStyle.SOLID);
    });

    const remainRow = Q.REMAINING_ROW;
    sheet.getRange(remainRow, 1, 1, 9).merge()
      .setValue('CÒN PHẢI THANH TOÁN')
      .setFontWeight('bold').setFontSize(12).setHorizontalAlignment('right')
      .setBackground(COLOR_GRAND_TOTAL_BG);
    const advCells = Q.ADVANCE_ROWS.map((r) => 'IFERROR(J' + r + ',0)').join('+');
    sheet.getRange(remainRow, 10, 1, 2).merge()
      .setFormula('=K' + totalRow + '-(' + advCells + ')')
      .setNumberFormat(VND_FORMAT).setFontWeight('bold').setFontSize(12)
      .setBackground(COLOR_GRAND_TOTAL_BG).setHorizontalAlignment('right');

    sheet.getRange(Q.WORDS_ROW, 1).setValue('Bằng chữ:').setFontWeight('bold').setFontStyle('italic');
    sheet.getRange(Q.WORDS_ROW, 2, 1, Q.TOTAL_COLS - 1).merge().setFontStyle('italic')
      .setBorder(null, null, true, null, null, null, '#bfbfbf', SpreadsheetApp.BorderStyle.SOLID);

    const generalNoteRow = Q.WORDS_ROW + 1;
    sheet.getRange(generalNoteRow, 1).setValue('Ghi chú:').setFontWeight('bold');
    sheet.getRange(generalNoteRow, 2, 1, Q.TOTAL_COLS - 1).merge()
      .setWrap(true).setFontStyle('italic').setVerticalAlignment('top')
      .setBorder(true, true, true, true, false, false, '#bfbfbf', SpreadsheetApp.BorderStyle.SOLID);
    sheet.setRowHeight(generalNoteRow, 50);

    const sigRow = generalNoteRow + 2;
    sheet.getRange(sigRow, 1, 1, 5).merge().setValue('KHÁCH HÀNG').setFontWeight('bold').setHorizontalAlignment('center');
    sheet.getRange(sigRow, 6, 1, 4).merge().setValue('KẾ TOÁN').setFontWeight('bold').setHorizontalAlignment('center');
    sheet.getRange(sigRow, 10, 1, 4).merge().setValue('GIÁM ĐỐC / CHỦ DN').setFontWeight('bold').setHorizontalAlignment('center');
    sheet.getRange(sigRow + 1, 1, 1, 5).merge().setValue('(Ký, ghi rõ họ tên)').setFontStyle('italic').setHorizontalAlignment('center');
    sheet.getRange(sigRow + 1, 6, 1, 4).merge().setValue('(Ký, ghi rõ họ tên)').setFontStyle('italic').setHorizontalAlignment('center');
    sheet.getRange(sigRow + 1, 10, 1, 4).merge().setValue('(Ký, ghi rõ họ tên)').setFontStyle('italic').setHorizontalAlignment('center');
    sheet.setRowHeight(sigRow + 2, 70);

    sheet.setFrozenRows(headRow);
    sheet.setHiddenGridlines(true);
  }

  return { build };
})();
