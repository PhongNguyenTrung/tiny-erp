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
    return Object.assign({
      adapter: 'telegram',
      reply: (text, opts) => TelegramAPI.sendMessage(base.chatId, _escapeIfHtml(text, opts), opts),
      replyWithButtons: (text, rows, opts) => TelegramAPI.sendWithButtons(base.chatId, _escapeIfHtml(text, opts), rows),
      replyWithDocument: (blob, caption) => TelegramAPI.sendDocumentBlob(base.chatId, blob, caption),
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
