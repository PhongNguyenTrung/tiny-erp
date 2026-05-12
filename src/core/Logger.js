/**
 * Logger — structural debug log with secret-redaction.
 *
 * Apps Script's `console.log` ghi vào Stackdriver (chỉ admin xem được).
 * `Logger.log` ghi vào editor execution log (cần mở editor để xem).
 * Cả hai đều không hữu ích để debug webhook flow chạy 1–2s rồi mất.
 *
 * Module này append ring buffer ~30 dòng vào Script Properties để xem qua
 * `debug_dumpLog()`. KHÔNG log raw payload / message content — chỉ
 * structural info (counts, ids, durations) để tránh lưu PII vào Properties.
 *
 * `safeErr(err)` redact common credential patterns trước khi stringify.
 */

const Log = (() => {
  const PROP_KEY = 'DEBUG_LOG';
  const MAX_LINES = 30;
  const MAX_LINE_LEN = 200;

  function info(line) {
    try {
      const props = PropertiesService.getScriptProperties();
      const stamp = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'HH:mm:ss');
      const entry = stamp + '  ' + String(line).substring(0, MAX_LINE_LEN);
      const buf = (props.getProperty(PROP_KEY) || '').split('\n').filter(Boolean);
      buf.push(entry);
      while (buf.length > MAX_LINES) buf.shift();
      props.setProperty(PROP_KEY, buf.join('\n'));
    } catch (_) { /* best effort */ }
    try { console.log(line); } catch (_) {}
  }

  function warn(line) { info('WARN ' + line); }
  function error(line) { info('ERROR ' + line); }

  /**
   * Strip sensitive fragments (API keys, tokens, refresh tokens) before logging.
   * Cẩn thận: Gemini error body có thể echo URL với `key=AIza…`.
   */
  function safeErr(err) {
    const msg = String(err && (err.stack || err.message) || err);
    return msg
      .replace(/key=[A-Za-z0-9_\-]+/g, 'key=***')
      .replace(/bot[0-9]+:[A-Za-z0-9_\-]+/g, 'bot***:***')
      .replace(/access_token[=:][^&"\s]+/gi, 'access_token=***')
      .replace(/refresh_token[=:][^&"\s]+/gi, 'refresh_token=***')
      .substring(0, 400);
  }

  function dump() {
    return PropertiesService.getScriptProperties().getProperty(PROP_KEY) || '(empty)';
  }

  function clear() {
    PropertiesService.getScriptProperties().deleteProperty(PROP_KEY);
  }

  return { info, warn, error, safeErr, dump, clear };
})();

// Convenience top-level helpers — re-exported as globals for callers that
// don't want to type `Log.info(...)` everywhere.
function debug_dumpLog() {
  Logger.log(Log.dump());
}
function debug_clearLog() {
  Log.clear();
  Logger.log('Cleared.');
}
