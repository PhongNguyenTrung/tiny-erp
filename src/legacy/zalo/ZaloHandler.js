/**
 * ZaloHandler — LEGACY stub.
 *
 * Channel pivot history: Zalo OA → Google Chat → Telegram (current).
 * Zalo OA verification requires ĐKKD (business registration) which
 * single-person workshops thường không có; abandoned.
 *
 * File này (cùng [ZaloAPI.js](./ZaloAPI.js)) giữ làm REFERENCE cho ai sau
 * này verify được Zalo OA và muốn revive — pattern adapter giống
 * [TelegramHandler](../../adapters/TelegramHandler.js): build Router ctx
 * từ Zalo payload rồi gọi Router.dispatch.
 *
 * Hiện tại: doPost vẫn auto-detect `event_name`, nhưng handler chỉ log
 * và bỏ qua. Implement đầy đủ khi cần — xem git history pre-refactor.
 */

const ZaloHandler = (() => {
  function handle(event) {
    Log.warn('[Zalo] Received event but channel is deprecated. Event keys: ' +
      Object.keys(event || {}).join(','));
    // Roadmap: rebuild adapter pattern giống TelegramHandler — build ctx
    // {adapter:'zalo', reply, replyWithDocument, …} rồi Router.dispatch(ctx).
  }

  return { handle };
})();
