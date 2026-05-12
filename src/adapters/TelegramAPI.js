/**
 * TelegramAPI — thin client cho Bot API (https://core.telegram.org/bots/api).
 *
 * Cấp:
 *   sendMessage(chatId, text, opts)        text + inline keyboard
 *   sendDocumentBlob(chatId, blob, caption) upload PDF blob trực tiếp
 *   answerCallback(callbackId, text)        clear loading spinner cho button
 *   downloadPhoto(photoArray)               nhận message.photo[], trả Blob (size lớn nhất)
 *   setWebhook(url) / deleteWebhook() / getWebhookInfo()
 *
 * Token lấy từ @BotFather, lưu Script Property `TELEGRAM_BOT_TOKEN`.
 */

const TelegramAPI = (() => {
  const BASE = 'https://api.telegram.org/bot';

  function _call(method, payload, opts) {
    const token = Config.require('TELEGRAM_BOT_TOKEN');
    const url = BASE + token + '/' + method;
    const res = UrlFetchApp.fetch(url, Object.assign({
      method: 'post',
      muteHttpExceptions: true,
    }, opts || {
      contentType: 'application/json',
      payload: JSON.stringify(payload),
    }));
    const code = res.getResponseCode();
    const body = res.getContentText();
    let parsed = {};
    try { parsed = JSON.parse(body); } catch (_) {}
    if (code < 200 || code >= 300 || !parsed.ok) {
      throw new Error('Telegram ' + method + ' (' + code + '): ' + body.substring(0, 400));
    }
    return parsed.result;
  }

  function sendMessage(chatId, text, opts) {
    return _call('sendMessage', Object.assign({
      chat_id: chatId,
      text: String(text).substring(0, 4096),
      parse_mode: 'HTML',
    }, opts || {}));
  }

  /**
   * Inline keyboard helper. rows = [[{text, callback_data|url}, ...], ...]
   */
  function sendWithButtons(chatId, text, rows) {
    return sendMessage(chatId, text, {
      reply_markup: { inline_keyboard: rows },
    });
  }

  /**
   * Upload PDF blob (multipart). Reliable hơn sendDocument(url) vì
   * Google Drive share-link không trả binary trực tiếp.
   */
  function sendDocumentBlob(chatId, blob, caption) {
    return _call('sendDocument', null, {
      method: 'post',
      payload: {
        chat_id: String(chatId),
        caption: (caption || '').substring(0, 1024),
        document: blob,
      },
      muteHttpExceptions: true,
    });
  }

  function answerCallback(callbackId, text) {
    return _call('answerCallbackQuery', {
      callback_query_id: callbackId,
      text: (text || '').substring(0, 200),
    });
  }

  function editMessageReplyMarkup(chatId, messageId, rows) {
    return _call('editMessageReplyMarkup', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: rows || [] },
    });
  }

  /**
   * Nhận `message.photo` (array of PhotoSize) → tải Blob của bản size lớn nhất.
   */
  function downloadPhoto(photoArray) {
    if (!photoArray || !photoArray.length) return null;
    const largest = photoArray[photoArray.length - 1];
    return downloadFile(largest.file_id);
  }

  /**
   * Generic file download. Telegram trả `file_path` qua getFile, rồi mới fetch raw.
   */
  function downloadFile(fileId) {
    const info = _call('getFile', { file_id: fileId });
    if (!info || !info.file_path) return null;
    const token = Config.require('TELEGRAM_BOT_TOKEN');
    const url = 'https://api.telegram.org/file/bot' + token + '/' + info.file_path;
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) {
      console.warn('Telegram file fetch failed: ' + res.getResponseCode());
      return null;
    }
    return res.getBlob();
  }

  /**
   * Đăng ký webhook URL. Apps Script không expose HTTP headers cho doPost
   * nên không dùng được Telegram `secret_token` (header-based) — workaround:
   * caller phải embed secret trong URL dưới dạng query param `?token=...`.
   */
  function setWebhook(url) {
    return _call('setWebhook', {
      url: url,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: false,
    });
  }
  function deleteWebhook(dropPending) {
    return _call('deleteWebhook', { drop_pending_updates: dropPending === true });
  }
  function getWebhookInfo() {
    return _call('getWebhookInfo', {});
  }
  function getMe() {
    return _call('getMe', {});
  }

  return {
    sendMessage,
    sendWithButtons,
    sendDocumentBlob,
    answerCallback,
    editMessageReplyMarkup,
    downloadPhoto,
    downloadFile,
    setWebhook,
    deleteWebhook,
    getWebhookInfo,
    getMe,
  };
})();
