/**
 * Setup.js — one-time / admin-only functions chạy từ Apps Script editor.
 *
 * Tách khỏi Code.js để giữ doPost siêu mỏng. Các hàm này không bao giờ
 * được gọi qua webhook — chỉ qua editor (Run button).
 *
 * Flow setup chuẩn cho user mới:
 *   1. setup_generateWebhookSecret()    — tạo random secret
 *   2. setup_createTemplate()           — tạo Sheet template báo giá
 *   3. setup_createDatabase()           — tạo Sheet làm ERP DB (CRM/Catalog)
 *   4. setup_telegramWebhook()          — register Telegram webhook
 *   5. (set TELEGRAM_ALLOWED_USER_IDS trong Script Properties)
 */

// ============================================================
// Telegram webhook setup
// ============================================================

function setup_telegramWebhook(urlOverride) {
  const baseUrl = urlOverride || ScriptApp.getService().getUrl();
  if (!baseUrl) throw new Error('Chưa deploy Web App. Deploy trước, rồi paste URL /exec vào hàm này.');
  const secret = Config.get('TELEGRAM_WEBHOOK_SECRET');
  const webhookUrl = secret
    ? baseUrl + (baseUrl.indexOf('?') >= 0 ? '&' : '?') + 'token=' + encodeURIComponent(secret)
    : baseUrl;
  const result = TelegramAPI.setWebhook(webhookUrl);
  Logger.log('Webhook base URL: ' + baseUrl);
  Logger.log('Secret: ' + (secret ? 'configured (embedded in URL)' : 'NOT set (run setup_generateWebhookSecret first)'));
  Logger.log('Telegram response: ' + JSON.stringify(result));
  Logger.log('Bot info: ' + JSON.stringify(TelegramAPI.getMe()));
}

function setup_telegramWebhookInfo() {
  Logger.log(JSON.stringify(TelegramAPI.getWebhookInfo(), null, 2));
}

function setup_telegramDeleteWebhook() {
  Logger.log(JSON.stringify(TelegramAPI.deleteWebhook(), null, 2));
}

/**
 * Reset Telegram queue + clear debug log. Dùng khi Telegram stuck retry update cũ.
 */
function setup_telegramResetWebhook(url) {
  if (!url) throw new Error('Pass the Web App /exec URL as argument.');
  Logger.log('1/3 deleteWebhook with drop_pending_updates=true');
  Logger.log(JSON.stringify(TelegramAPI.deleteWebhook(true)));
  Logger.log('2/3 Clearing debug log');
  Log.clear();
  const secret = Config.get('TELEGRAM_WEBHOOK_SECRET');
  const webhookUrl = secret
    ? url + (url.indexOf('?') >= 0 ? '&' : '?') + 'token=' + encodeURIComponent(secret)
    : url;
  Logger.log('3/3 setWebhook (secret ' + (secret ? 'attached' : 'NOT set') + ')');
  Logger.log(JSON.stringify(TelegramAPI.setWebhook(webhookUrl)));
}

/**
 * Sinh random webhook secret, save vào Script Properties. Chạy 1 lần.
 */
function setup_generateWebhookSecret() {
  const bytes = [];
  for (let i = 0; i < 32; i++) bytes.push(Math.floor(Math.random() * 256));
  const secret = Utilities.base64EncodeWebSafe(bytes).replace(/=/g, '').substring(0, 48);
  Config.set('TELEGRAM_WEBHOOK_SECRET', secret);
  Logger.log('TELEGRAM_WEBHOOK_SECRET generated. Length=' + secret.length);
  Logger.log('Next: setup_telegramWebhook() để register với Telegram.');
}

// ============================================================
// Quote module setup (template Sheet)
// ============================================================

/**
 * Tạo Spreadsheet template gồm 2 tab "BaoGia" + "QuyetToan", lưu ID vào
 * Script Property `TEMPLATE_SPREADSHEET_ID`.
 */
function setup_createTemplate() {
  const stamp = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd_HHmm');
  const ss = SpreadsheetApp.create('Template Bao gia - Quyet toan ' + stamp);
  const first = ss.getSheets()[0];
  first.setName(TEMPLATE_LAYOUT.SHEET_NAME);
  QuoteTemplate.build(first);

  const qt = ss.insertSheet(QUYETTOAN_LAYOUT.SHEET_NAME);
  SettlementTemplate.build(qt);

  ss.setActiveSheet(first);

  const folderId = Config.get('OUTPUT_DRIVE_FOLDER_ID');
  if (folderId) {
    try {
      const file = DriveApp.getFileById(ss.getId());
      DriveApp.getFolderById(folderId).addFile(file);
      DriveApp.getRootFolder().removeFile(file);
    } catch (e) {
      console.warn('Could not move template to folder: ' + e);
    }
  }

  Config.set('TEMPLATE_SPREADSHEET_ID', ss.getId());
  Config.set('TEMPLATE_SHEET_NAME', TEMPLATE_LAYOUT.SHEET_NAME);
  Logger.log('Template created:');
  Logger.log('  ID:  ' + ss.getId());
  Logger.log('  URL: ' + ss.getUrl());
  return ss.getUrl();
}

/**
 * Rebuild 2 tab template trong Spreadsheet đã tồn tại (giữ file ID).
 */
function setup_rebuildTemplateInPlace() {
  const id = Config.require('TEMPLATE_SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(id);
  const bg = ss.getSheetByName(TEMPLATE_LAYOUT.SHEET_NAME) || ss.insertSheet(TEMPLATE_LAYOUT.SHEET_NAME);
  QuoteTemplate.build(bg);
  const qt = ss.getSheetByName(QUYETTOAN_LAYOUT.SHEET_NAME) || ss.insertSheet(QUYETTOAN_LAYOUT.SHEET_NAME);
  SettlementTemplate.build(qt);
  Logger.log('Rebuilt: ' + ss.getUrl());
}

// ============================================================
// ERP DB setup (CRM, Catalog, …)
// ============================================================

/**
 * Tạo Spreadsheet làm ERP DB cho CRM/Catalog/… modules. Schema tables sinh
 * tự động lúc module insert lần đầu.
 */
function setup_createDatabase() {
  const ss = DB.ensureSpreadsheet('tiny-erp DB');
  Logger.log('DB created/linked:');
  Logger.log('  ID:  ' + ss.getId());
  Logger.log('  URL: ' + ss.getUrl());
  // Seed empty tables để user thấy schema sẵn
  DB.table('customers', ['name', 'phone', 'address', 'note', 'tags', 'created_at']);
  DB.table('products', ['sku', 'name', 'unit', 'default_price', 'category', 'active', 'created_at']);
  Logger.log('Seeded empty tables: customers, products');
  return ss.getUrl();
}
