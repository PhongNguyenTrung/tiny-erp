/**
 * Config — central reader of Script Properties (Apps Script's env store).
 *
 * Tất cả secret + tham số runtime đọc qua module này, cache per-execution
 * để giảm Properties RPC. Không file/module nào nên gọi
 * PropertiesService trực tiếp để đọc cấu hình — chỉ Config.
 *
 * Module-specific layout constants (TEMPLATE_LAYOUT, QUYETTOAN_LAYOUT, …)
 * sống cùng module dùng chúng, không phải ở đây.
 */

const Config = (() => {
  let cache = null;

  function load() {
    if (cache) return cache;
    const props = PropertiesService.getScriptProperties();
    cache = {
      // === Core ===
      GEMINI_API_KEY: props.getProperty('GEMINI_API_KEY'),
      GEMINI_MODEL: props.getProperty('GEMINI_MODEL') || 'gemini-2.5-flash',

      // === Telegram transport ===
      TELEGRAM_BOT_TOKEN: props.getProperty('TELEGRAM_BOT_TOKEN'),
      TELEGRAM_WEBHOOK_SECRET: props.getProperty('TELEGRAM_WEBHOOK_SECRET'),
      TELEGRAM_ALLOWED_USER_IDS: props.getProperty('TELEGRAM_ALLOWED_USER_IDS'),

      // === Quotes module ===
      TEMPLATE_SPREADSHEET_ID: props.getProperty('TEMPLATE_SPREADSHEET_ID'),
      TEMPLATE_SHEET_NAME: props.getProperty('TEMPLATE_SHEET_NAME') || 'BaoGia',
      OUTPUT_DRIVE_FOLDER_ID: props.getProperty('OUTPUT_DRIVE_FOLDER_ID'),
      VAT_RATE: parseFloat(props.getProperty('VAT_RATE') || '0.08'),

      // === ERP database ===
      DB_SPREADSHEET_ID: props.getProperty('DB_SPREADSHEET_ID'),

      // === Limits / safety ===
      MAX_INPUT_CHARS: parseInt(props.getProperty('MAX_INPUT_CHARS') || '4000', 10),
      PUBLIC_PDF_SHARING: props.getProperty('PUBLIC_PDF_SHARING') === 'true',

      // === Zalo (legacy) ===
      ZALO_OA_ACCESS_TOKEN: props.getProperty('ZALO_OA_ACCESS_TOKEN'),
      ZALO_OA_REFRESH_TOKEN: props.getProperty('ZALO_OA_REFRESH_TOKEN'),
      ZALO_APP_ID: props.getProperty('ZALO_APP_ID'),
      ZALO_APP_SECRET: props.getProperty('ZALO_APP_SECRET'),
    };
    return cache;
  }

  function require(key) {
    const v = load()[key];
    if (!v) throw new Error('Missing Script Property: ' + key);
    return v;
  }

  function get(key) {
    return load()[key];
  }

  function set(key, value) {
    PropertiesService.getScriptProperties().setProperty(key, String(value));
    cache = null;
  }

  function clearCache() {
    cache = null;
  }

  /**
   * @returns {Object|null} map of allowed Telegram user IDs, or null if not configured.
   */
  function allowedUserIds() {
    const raw = load().TELEGRAM_ALLOWED_USER_IDS;
    if (!raw) return null;
    const set = {};
    String(raw).split(/[,\s]+/).filter(Boolean).forEach((id) => { set[String(id)] = true; });
    return set;
  }

  function isUserAllowed(userId) {
    const allow = allowedUserIds();
    if (allow === null) return true;  // unset → backward compat (warn elsewhere)
    return !!allow[String(userId)];
  }

  return { load, get, set, require, clearCache, isUserAllowed, allowedUserIds };
})();
