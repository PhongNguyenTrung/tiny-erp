/**
 * StateManager — generic per-user session KV store, module-agnostic.
 *
 * Persistence: CacheService (fast) với PropertiesService backstop (durable
 * khi cache evict). Mỗi module ERP có thể dùng session để giữ multi-turn
 * conversation state — Router truyền session vào handler, module quyết định
 * ý nghĩa của `state` + payload fields.
 *
 * Convention: session shape
 *   {
 *     module: string,      // module owns the session (e.g. "quotes", "crm")
 *     state: string,       // module-specific state name (e.g. "AWAITING_CONFIRM")
 *     ...payload,          // module-specific data
 *     updatedAt: number
 *   }
 */

const StateManager = (() => {
  const CACHE_TTL_SEC = 60 * 60 * 6; // 6h
  const PROP_PREFIX = 'session:';

  function _key(userId) {
    return PROP_PREFIX + String(userId);
  }

  function get(userId) {
    const k = _key(userId);
    const cache = CacheService.getScriptCache();
    let raw = cache.get(k);
    if (!raw) {
      raw = PropertiesService.getScriptProperties().getProperty(k);
      if (raw) cache.put(k, raw, CACHE_TTL_SEC);
    }
    if (!raw) return { module: null, state: null };
    try { return JSON.parse(raw); } catch (_) { return { module: null, state: null }; }
  }

  function set(userId, session) {
    session.updatedAt = Date.now();
    const raw = JSON.stringify(session);
    CacheService.getScriptCache().put(_key(userId), raw, CACHE_TTL_SEC);
    PropertiesService.getScriptProperties().setProperty(_key(userId), raw);
  }

  function clear(userId) {
    CacheService.getScriptCache().remove(_key(userId));
    PropertiesService.getScriptProperties().deleteProperty(_key(userId));
  }

  /**
   * Update fields without overwriting the whole session.
   */
  function patch(userId, fields) {
    const cur = get(userId);
    set(userId, Object.assign(cur, fields));
  }

  return { get, set, patch, clear };
})();
