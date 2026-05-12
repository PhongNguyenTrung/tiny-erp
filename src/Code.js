/**
 * Code.js — Apps Script entry points (doPost, doGet, bootstrap).
 *
 * Khi script load, Apps Script eval mọi file (top-level). Pattern:
 *   1. Mỗi module export 1 namespace IIFE (Config, Router, Quote*, …).
 *   2. doPost / doGet là ENTRY điểm duy nhất internet-facing.
 *   3. `bootstrap()` đăng ký các module với Router. Idempotent — gọi
 *      ở mọi entry point (doPost, debug helpers).
 *
 * Để add module mới:
 *   1. Tạo `src/modules/<name>/` với Repository + Commands
 *   2. Add `<Name>Commands.register()` vào `bootstrap()` bên dưới
 *   3. (Optional) update Config.js nếu module cần Script Properties mới
 *
 * Xem [ARCHITECTURE.md](../ARCHITECTURE.md) cho thiết kế chi tiết.
 */

let _bootstrapped = false;

function bootstrap() {
  if (_bootstrapped) return;
  _bootstrapped = true;

  // Core modules
  QuoteCommands.register();
  CustomerCommands.register();
  ProductCommands.register();

  // Thêm module ERP mới ở đây:
  // OrderCommands.register();
  // InvoiceCommands.register();
}

function doPost(e) {
  bootstrap();
  Log.info('doPost called');

  if (!e || !e.postData || !e.postData.contents) {
    Log.info('no postData');
    return _ok({ error: 'no postData' });
  }

  // Verify webhook secret (Apps Script Web App không nhận HTTP header,
  // workaround: embed secret trong webhook URL ?token=…)
  const expectedSecret = Config.get('TELEGRAM_WEBHOOK_SECRET');
  if (expectedSecret) {
    const provided = (e.parameter && e.parameter.token) || null;
    if (provided !== expectedSecret) {
      Log.info('webhook secret mismatch');
      return _ok({ error: 'unauthorized' });
    }
  }

  let event;
  try {
    event = JSON.parse(e.postData.contents);
  } catch (err) {
    Log.info('JSON parse failed');
    return _ok({ error: 'invalid json' });
  }

  // Auto-route theo payload shape
  if (event && event.update_id != null) {
    try { TelegramHandler.handle(event); }
    catch (err) { Log.error('Telegram doPost: ' + Log.safeErr(err)); }
    return _ok({ ok: true });
  }

  // Legacy Zalo path
  const eventName = event && event.event_name;
  if (eventName === 'user_send_text' || eventName === 'user_send_image') {
    try { ZaloHandler.handle(event); }
    catch (err) { Log.error('Zalo doPost: ' + Log.safeErr(err)); }
    return _ok({ ok: true });
  }

  Log.info('unknown payload shape');
  return _ok({ skipped: 'unknown payload' });
}

function doGet(e) {
  return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
}

function _ok(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
