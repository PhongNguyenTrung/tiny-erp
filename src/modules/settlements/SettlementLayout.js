/**
 * SettlementLayout — hằng số cho tab `QuyetToan` (13 cột A–M).
 *
 * Khác BaoGia: tách cột "theo báo giá" và "thực tế thi công", thêm cột
 * chênh lệch + 3 đợt tạm ứng. Phục vụ workflow quyết toán hậu thi công.
 */

const QUYETTOAN_LAYOUT = {
  SHEET_NAME: 'QuyetToan',
  CUSTOMER_NAME_CELL: 'B5',
  QT_DATE_CELL: 'B6',
  QT_NUMBER_CELL: 'B7',
  REF_QUOTE_CELL: 'B8',
  ITEMS_START_ROW: 11,
  COL_INDEX: 1,         // A
  COL_NAME: 2,          // B
  COL_DESCRIPTION: 3,   // C
  COL_DIMENSIONS: 4,    // D
  COL_UNIT: 5,          // E
  COL_QTY_BG: 6,        // F — SL theo báo giá
  COL_PRICE_BG: 7,      // G — Đơn giá báo giá
  COL_TOTAL_BG: 8,      // H — Thành tiền báo giá (=F*G)
  COL_QTY_TT: 9,        // I — SL thực tế thi công
  COL_PRICE_TT: 10,     // J — Đơn giá thực tế
  COL_TOTAL_TT: 11,     // K — Thành tiền thực tế (=I*J)
  COL_DIFF: 12,         // L — Chênh lệch (K-H)
  COL_NOTE: 13,         // M — Ghi chú
  TOTAL_COLS: 13,
  MAX_ITEMS: 50,
  SUBTOTAL_ROW: 62,
  VAT_ROW: 63,
  TOTAL_ROW: 64,
  ADVANCE_HEADER_ROW: 66,
  ADVANCE_ROWS: [67, 68, 69],
  REMAINING_ROW: 70,
  WORDS_ROW: 71,
};
