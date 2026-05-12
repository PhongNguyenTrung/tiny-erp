/**
 * Router — dispatcher trung tâm cho mọi inbound event (text/photo/callback).
 *
 * Mỗi module ERP đăng ký 3 loại handler với Router:
 *   1. slash commands       — text bắt đầu bằng "/" (vd "/baogia", "/khach add")
 *   2. callback prefixes    — inline-keyboard callback_data dạng "prefix:..." (vd "quote:confirm:123")
 *   3. intent fallback      — handler cho free-text khi không match command nào
 *
 * Context truyền cho handler:
 *   {
 *     adapter: 'telegram' | 'zalo' | ...,
 *     reply(text, opts?)             — gửi message
 *     replyWithButtons(text, rows)   — gửi message + inline keyboard
 *     replyWithDocument(blob, caption?) — gửi file
 *     userId, chatId,
 *     text, photo,                   — message-only
 *     callbackId, callbackData,      — callback-only
 *     type: 'message' | 'callback'
 *   }
 *
 * Slot order:
 *   - callback → handler matching longest prefix
 *   - message starting with "/" → command lookup (case-insensitive)
 *   - else → loop through registered intents; first that returns truthy wins
 *   - else → default intent (if any)
 */

const Router = (() => {
  const commands = {};
  const callbacks = {};
  const intents = [];  // [{ name, handler, priority }]
  let defaultIntent = null;

  /**
   * @param {string} name slash command without "/" (e.g. "baogia")
   * @param {(ctx) => void} handler
   * @param {Object} [opts] { description, help }
   */
  function registerCommand(name, handler, opts) {
    if (!name || typeof handler !== 'function') return;
    commands[String(name).toLowerCase()] = { handler, ...(opts || {}) };
  }

  /**
   * @param {string} prefix callback_data prefix before ":" (e.g. "quote")
   * @param {(ctx, rest) => void} handler  rest = string after first ":"
   */
  function registerCallback(prefix, handler) {
    if (!prefix || typeof handler !== 'function') return;
    callbacks[String(prefix)] = handler;
  }

  /**
   * @param {string} name module name (e.g. "quotes")
   * @param {(ctx) => boolean} handler  return truthy if it handled the event
   * @param {number} [priority] higher runs first, default 0
   */
  function registerIntent(name, handler, priority) {
    intents.push({ name, handler, priority: priority || 0 });
    intents.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Đặt intent default (gọi khi không intent nào claim event).
   * Thường là module quotes (quote extraction) — backward-compat behavior.
   */
  function setDefaultIntent(handler) {
    defaultIntent = handler;
  }

  function listCommands() {
    return Object.keys(commands).map((k) => ({ name: k, ...commands[k] }));
  }

  function dispatch(ctx) {
    try {
      if (ctx.type === 'callback') return _dispatchCallback(ctx);
      if (ctx.type === 'message') return _dispatchMessage(ctx);
    } catch (err) {
      Log.error('Router.dispatch failed: ' + Log.safeErr(err));
      try { ctx.reply('❌ Em gặp lỗi nội bộ, anh thử lại sau giúp em ạ.'); } catch (_) {}
    }
  }

  function _dispatchCallback(ctx) {
    const data = ctx.callbackData || '';
    const colonAt = data.indexOf(':');
    const prefix = colonAt >= 0 ? data.substring(0, colonAt) : data;
    const rest = colonAt >= 0 ? data.substring(colonAt + 1) : '';
    const handler = callbacks[prefix];
    if (handler) return handler(ctx, rest);
    Log.warn('no callback handler for prefix=' + prefix);
  }

  function _dispatchMessage(ctx) {
    const text = (ctx.text || '').trim();
    if (text.startsWith('/')) {
      const tokens = text.substring(1).split(/\s+/);
      const cmd = tokens[0].toLowerCase();
      const entry = commands[cmd];
      if (entry) {
        ctx.commandArgs = tokens.slice(1);
        return entry.handler(ctx);
      }
      // unknown slash command — fall through to intents (some modules want
      // to catch e.g. "/baogia abc" if "baogia" is unregistered).
    }

    for (let i = 0; i < intents.length; i++) {
      if (intents[i].handler(ctx)) return;
    }
    if (defaultIntent) return defaultIntent(ctx);
  }

  function reset() {
    for (const k in commands) delete commands[k];
    for (const k in callbacks) delete callbacks[k];
    intents.length = 0;
    defaultIntent = null;
  }

  return {
    registerCommand,
    registerCallback,
    registerIntent,
    setDefaultIntent,
    listCommands,
    dispatch,
    reset,
  };
})();
