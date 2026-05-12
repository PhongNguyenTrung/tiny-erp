/**
 * Selftest.js — diagnostic functions chạy từ editor để verify từng phần.
 *
 * Mỗi hàm self-contained, không touch internet thừa, log đầy đủ để
 * grep trên Cloud Logging khi debug deployment mới.
 */

function selftest_config() {
  const c = Config.load();
  Logger.log('Loaded keys: ' + Object.keys(c).filter((k) => c[k] != null).join(', '));
  if (!c.TEMPLATE_SPREADSHEET_ID) throw new Error('TEMPLATE_SPREADSHEET_ID missing');
  const ss = SpreadsheetApp.openById(c.TEMPLATE_SPREADSHEET_ID);
  Logger.log('Template OK: ' + ss.getName());
}

function selftest_listGeminiModels() {
  const models = AIClient.listModels();
  models
    .filter((m) => (m.supportedGenerationMethods || []).indexOf('generateContent') !== -1)
    .forEach((m) => Logger.log(m.name + '  — ' + (m.displayName || '')));
}

/**
 * Test riêng PDF export — verify DriveApp scope. Nếu fail ở editor → scope
 * chưa grant. Nếu OK ở editor nhưng fail trong webhook → redeploy.
 */
function selftest_pdfExport() {
  const id = Config.require('TEMPLATE_SPREADSHEET_ID');
  Logger.log('Exporting PDF from spreadsheet: ' + id);
  const pdf = PDFExporter.exportToDrive(id, Config.get('TEMPLATE_SHEET_NAME'), 'TEST_PDF_' + Date.now());
  Logger.log('Success! File: ' + pdf.file.getName());
  Logger.log('URL: ' + pdf.url);
}

/**
 * End-to-end test: sample text → AI extract → Sheet fill. Không gửi Telegram.
 */
function selftest_pipeline() {
  const sample = 'Báo giá cho anh Tuấn: 5 cửa gỗ sồi 90x220 đơn giá 4tr5, 1 tủ áo 3m2 gỗ công nghiệp giá 3tr2/m2.';
  const draft = QuoteExtractor.extract(sample, []);
  Logger.log('Draft: ' + JSON.stringify(draft, null, 2));
  const filled = QuoteSheet.fill(draft, 'TEST_' + Date.now());
  Logger.log('Filled URL: ' + filled.file.getUrl());
  Logger.log('Totals: ' + JSON.stringify(filled.totals));
}

/**
 * Test ERP DB: insert + query customer. Cần DB_SPREADSHEET_ID set trước.
 */
function selftest_db() {
  if (!Config.get('DB_SPREADSHEET_ID')) throw new Error('Run setup_createDatabase() first.');
  const c = Customer.create({ name: 'Test User', phone: '0900000000', address: 'Hanoi', note: 'self-test' });
  Logger.log('Inserted: ' + JSON.stringify(c));
  const found = Customer.findByPhone('0900000000');
  Logger.log('Found by phone: ' + JSON.stringify(found));
  Customer.delete(found.id);
  Logger.log('Deleted. OK.');
}

/**
 * Verify Router bindings — list registered commands.
 */
function selftest_routerCommands() {
  bootstrap();
  Router.listCommands().forEach((c) => Logger.log('/' + c.name + ' — ' + (c.description || '')));
}
