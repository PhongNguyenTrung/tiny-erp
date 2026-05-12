/**
 * QuoteLayout — hằng số layout cho tab `BaoGia` trong Google Sheet template.
 *
 * Quote module dùng layout này để:
 *   - QuoteTemplate.build()  → vẽ template lần đầu
 *   - QuoteSheet.fill()      → ghi dữ liệu vào template clone
 *
 * Khi sửa layout (thêm cột, dời row), update ở đây + cả 2 callers.
 */

const TEMPLATE_LAYOUT = {
  SHEET_NAME: 'BaoGia',
  CUSTOMER_NAME_CELL: 'B5',
  QUOTE_DATE_CELL: 'B6',
  QUOTE_NUMBER_CELL: 'B7',
  CUSTOMER_PHONE_CELL: 'F7',
  CUSTOMER_ADDRESS_CELL: 'B8',
  ITEMS_START_ROW: 10,
  COL_INDEX: 1,        // A — STT
  COL_NAME: 2,         // B — Tên hạng mục
  COL_DESCRIPTION: 3,  // C — Mô tả / Vật liệu
  COL_DIMENSIONS: 4,   // D — Kích thước
  COL_UNIT: 5,         // E — ĐVT
  COL_QUANTITY: 6,     // F — Số lượng
  COL_UNIT_PRICE: 7,   // G — Đơn giá
  COL_TOTAL: 8,        // H — Thành tiền (formula)
  COL_NOTE: 9,         // I — Ghi chú
  TOTAL_COLS: 9,
  MAX_ITEMS: 50,
  SUBTOTAL_ROW: 61,
  VAT_ROW: 62,
  TOTAL_ROW: 63,
  WORDS_ROW: 64,
};
