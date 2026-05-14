/**
 * TelegramHandler — adapter Telegram → Router.
 *
 * Trách nhiệm DUY NHẤT:
 *   - Verify allowlist + dedupe update_id
 *   - Build Router context với reply helpers ràng buộc với chatId
 *   - Gọi Router.dispatch(ctx)
 *
 * KHÔNG chứa domain logic (quote extraction, /baogia handling, …) — đó là
 * việc của các module trong `modules/`. Chuyển provider (Zalo, Messenger,
 * WhatsApp, …) chỉ cần viết adapter mới build ctx tương đương.
 */

const TelegramHandler = (() => {
  // Sliding-window rate limit: max RATE_MAX events / RATE_WINDOW_SEC per user.
  // Bảo vệ Gemini quota + Apps Script trigger budget khi client bug spam updates.
  const RATE_MAX = 12;
  const RATE_WINDOW_SEC = 60;

  function handle(update) {
    if (!update) return;
    if (_alreadyProcessed(update.update_id)) {
      Log.info('[TG] duplicate update_id ' + update.update_id);
      return;
    }
    _markProcessed(update.update_id);

    if (update.message) return _handleMessage(update.message);
    if (update.callback_query) return _handleCallback(update.callback_query);
    Log.info('[TG] no handler for update shape');
  }

  function _handleMessage(msg) {
    if (!msg.chat || !msg.from) return;
    const chatId = msg.chat.id;
    const userId = String(msg.from.id);
    if (!_checkAllowed(chatId, userId)) return;
    if (!_checkRate(chatId, userId)) return;

    const maxLen = Config.get('MAX_INPUT_CHARS') || 4000;
    const text = String(msg.text || msg.caption || '').trim();
    if (text.length > maxLen) {
      TelegramAPI.sendMessage(chatId, 'Tin nhắn quá dài (giới hạn ' + maxLen + ' ký tự). Anh chia nhỏ giúp em ạ.');
      return;
    }

    const ctx = _buildCtx({
      type: 'message',
      chatId, userId,
      text, photo: msg.photo,
      from: msg.from,
      messageId: msg.message_id,
    });

    Router.dispatch(ctx);
  }

  function _handleCallback(cb) {
    if (!cb.message || !cb.from) return;
    const chatId = cb.message.chat.id;
    const userId = String(cb.from.id);
    if (!_checkAllowed(chatId, userId)) return;
    if (!_checkRate(chatId, userId)) return;

    // Ack ngay để Telegram clear loading spinner
    try { TelegramAPI.answerCallback(cb.id, ''); } catch (_) {}
    // Xoá inline buttons để không bấm 2 lần
    try { TelegramAPI.editMessageReplyMarkup(chatId, cb.message.message_id, []); } catch (_) {}

    const ctx = _buildCtx({
      type: 'callback',
      chatId, userId,
      callbackId: cb.id,
      callbackData: cb.data || '',
      messageId: cb.message.message_id,
    });

    Router.dispatch(ctx);
  }

  function _buildCtx(base) {
    const state = { lastMessageId: null };
    function _track(res) {
      if (res && res.message_id != null) state.lastMessageId = res.message_id;
      return res;
    }
    function _sendFresh(text, opts, buttons) {
      const safe = _escapeIfHtml(text, opts);
      return _track(buttons
        ? TelegramAPI.sendWithButtons(base.chatId, safe, buttons)
        : TelegramAPI.sendMessage(base.chatId, safe, opts));
    }
    return Object.assign({
      adapter: 'telegram',
      reply: (text, opts) => _track(TelegramAPI.sendMessage(base.chatId, _escapeIfHtml(text, opts), opts)),
      replyWithButtons: (text, rows, opts) => _track(TelegramAPI.sendWithButtons(base.chatId, _escapeIfHtml(text, opts), rows)),
      replyWithDocument: (blob, caption) => TelegramAPI.sendDocumentBlob(base.chatId, blob, caption),
      // Edit message vừa gửi qua reply/replyWithButtons. Truyền `buttons` qua
      // opts để gắn inline keyboard mới (Bot API: editMessageText hỗ trợ reply_markup).
      // Fallback sang send mới nếu chưa có lastMessageId hoặc edit fail.
      editLast: (text, opts) => {
        const o = Object.assign({}, opts || {});
        const buttons = o.buttons || (o.reply_markup && o.reply_markup.inline_keyboard) || null;
        if (o.buttons) {
          o.reply_markup = { inline_keyboard: o.buttons };
          delete o.buttons;
        }
        if (state.lastMessageId == null) return _sendFresh(text, opts, buttons);
        try {
          return TelegramAPI.editMessageText(base.chatId, state.lastMessageId, _escapeIfHtml(text, opts), o);
        } catch (err) {
          Log.warn('editLast fallback: ' + Log.safeErr(err));
          return _sendFresh(text, opts, buttons);
        }
      },
      downloadPhoto: () => base.photo ? TelegramAPI.downloadPhoto(base.photo) : null,
    }, base);
  }

  // TelegramAPI.sendMessage defaults to parse_mode=HTML. Module có thể truyền
  // opts.parse_mode='HTML' và tự chèn tag, hoặc default → escape mọi `<>&`.
  function _escapeIfHtml(text, opts) {
    if (opts && opts.html === true) return String(text); // module đã tự build HTML
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function _checkAllowed(chatId, userId) {
    const allow = Config.allowedUserIds();
    if (allow === null) {
      Log.warn('TELEGRAM_ALLOWED_USER_IDS not set — bot open to anyone');
      return true;
    }
    if (allow[String(userId)]) return true;
    Log.info('[TG] blocked user ' + userId);
    try {
      TelegramAPI.sendMessage(chatId, 'Em chưa được cấp quyền nói chuyện với anh/chị. Vui lòng liên hệ chủ xưởng.');
    } catch (_) {}
    return false;
  }

  // Approximate sliding window: bump a counter in Script cache. CacheService
  // không guarantee atomic increment — race có thể cho qua 1–2 event vượt
  // ngưỡng, chấp nhận được cho rate-limit ngữ cảnh single-tenant.
  function _checkRate(chatId, userId) {
    try {
      const cache = CacheService.getScriptCache();
      const key = 'tgrate:' + userId;
      const cur = parseInt(cache.get(key) || '0', 10);
      if (cur >= RATE_MAX) {
        Log.info('[TG] rate-limited user=' + userId + ' count=' + cur);
        if (cur === RATE_MAX) {
          try { TelegramAPI.sendMessage(chatId, '🚦 Anh nhắn quá nhanh, em xin nghỉ ' + RATE_WINDOW_SEC + 's rồi nói tiếp ạ.'); } catch (_) {}
        }
        cache.put(key, String(cur + 1), RATE_WINDOW_SEC);
        return false;
      }
      cache.put(key, String(cur + 1), RATE_WINDOW_SEC);
      return true;
    } catch (_) {
      return true; // cache fail → fail-open (don't block user on infra hiccup)
    }
  }

  function _alreadyProcessed(updateId) {
    if (updateId == null) return false;
    return CacheService.getScriptCache().get('tg:' + updateId) === '1';
  }
  function _markProcessed(updateId) {
    if (updateId == null) return;
    CacheService.getScriptCache().put('tg:' + updateId, '1', 60 * 30);
  }

  return { handle };
})();
