/**
 * QuoteCommands — Quote module's binding to Router.
 *
 * Đăng ký:
 *   /baogia | /quote     — start fresh quote session
 *   /huy | /cancel       — cancel any active session (module-agnostic, ở Core nên reasonable
 *                            để Quote module own vì là module có session)
 *   /reset               — clear session bất chấp state (recover khi stuck)
 *   /start | /help       — onboarding message
 *
 * Callback prefixes:
 *   quote:confirm        — export PDF
 *   quote:cancel         — clear session
 *
 * Default intent:
 *   free text (không slash command) → treat as new quote, extract + confirm
 *
 * State machine (lives in session.state, namespaced under module='quotes'):
 *   AWAITING_CONFIRM     — draft built, waiting for OK
 *   EXPORTING            — PDF in progress (lock to prevent double-fire)
 */

const QuoteCommands = (() => {
  const MODULE = 'quotes';
  const STATES = Object.freeze({
    AWAITING_CONFIRM: 'AWAITING_CONFIRM',
    EXPORTING: 'EXPORTING',
  });

  const CONFIRM_REGEX = /^(\/?ok|oki|okay|đúng( rồi)?|dung( roi)?|chốt|chot|xác nhận|xac nhan|yes|y)\b/i;
  const CANCEL_REGEX = /^(\/?cancel|\/huy|hủy|huy|bỏ|bo|reset|làm lại|lam lai)\b/i;

  function register() {
    Router.registerCommand('start', _help, { description: 'Hướng dẫn sử dụng bot' });
    Router.registerCommand('help', _help, { description: 'Hướng dẫn sử dụng bot' });
    Router.registerCommand('baogia', _newQuote, { description: 'Bắt đầu báo giá mới' });
    Router.registerCommand('quote', _newQuote, { description: 'Bắt đầu báo giá mới' });
    Router.registerCommand('huy', _cancel, { description: 'Huỷ phiên hiện tại' });
    Router.registerCommand('cancel', _cancel, { description: 'Huỷ phiên hiện tại' });
    Router.registerCommand('reset', _reset, { description: 'Reset bất chấp state' });

    Router.registerCallback('quote', _onCallback);

    // Free-text fallback: nếu user đang trong AWAITING_CONFIRM gõ OK → export.
    // Nếu không có session → coi như báo giá mới. Priority cao để chạy trước
    // các module khác sau này.
    Router.registerIntent('quotes', _intent, 10);

    // Default intent: free text với module=null → treat as new quote.
    Router.setDefaultIntent(_intent);
  }

  function _help(ctx) {
    const name = (ctx.from && ctx.from.first_name) || 'anh';
    ctx.reply(
      '👋 Xin chào <b>' + _esc(name) + '</b>! Em là bot báo giá.\n\n' +
      '• Gõ nội dung báo giá (kèm ảnh đơn hàng nếu có) — em sẽ tóm tắt và xin xác nhận.\n' +
      '• Bấm <b>OK – Xuất PDF</b> để em xuất file.\n' +
      '• Gõ /huy để huỷ phiên, /reset nếu bị stuck.\n\n' +
      'Thử: <i>Báo giá cho anh Tuấn: 5 cửa gỗ sồi 90x220 đơn giá 4tr5</i>',
      { html: true }
    );
  }

  function _cancel(ctx) {
    StateManager.clear(ctx.userId);
    ctx.reply('Em đã huỷ phiên báo giá. Anh nhắn lại từ đầu khi cần ạ.');
  }

  function _reset(ctx) {
    StateManager.clear(ctx.userId);
    ctx.reply('🔄 Đã reset. Anh nhắn nội dung báo giá để bắt đầu lại nhé.');
  }

  function _newQuote(ctx) {
    // /baogia với arg → treat arg như nội dung báo giá
    const text = (ctx.commandArgs || []).join(' ');
    if (!text && (!ctx.photo || !ctx.photo.length)) {
      ctx.reply('Anh gõ nội dung báo giá sau /baogia, hoặc gửi luôn nội dung (không cần lệnh) ạ.');
      return;
    }
    _extractAndConfirm(ctx, text);
  }

  /**
   * Intent handler — chạy cho mọi free text (không slash command).
   * Returns truthy nếu đã handle event.
   */
  function _intent(ctx) {
    const text = (ctx.text || '').trim();
    const session = StateManager.get(ctx.userId);

    if (CANCEL_REGEX.test(text)) {
      _cancel(ctx);
      return true;
    }

    if (session.module === MODULE && session.state === STATES.AWAITING_CONFIRM && CONFIRM_REGEX.test(text)) {
      _exportAndReply(ctx, session);
      return true;
    }

    if (session.module === MODULE && session.state === STATES.EXPORTING) {
      ctx.reply('Em đang xuất file, anh chờ chút ạ...');
      return true;
    }

    // Free text + có content → coi như báo giá mới
    if (text || (ctx.photo && ctx.photo.length)) {
      _extractAndConfirm(ctx, text);
      return true;
    }

    return false;
  }

  function _onCallback(ctx, rest) {
    const session = StateManager.get(ctx.userId);
    if (rest === 'confirm') return _exportAndReply(ctx, session);
    if (rest === 'cancel') return _cancel(ctx);
    Log.warn('[quotes] unknown callback rest=' + rest);
  }

  function _extractAndConfirm(ctx, text) {
    Log.info('[quotes] extract textLen=' + (text || '').length + ' photos=' + (ctx.photo ? ctx.photo.length : 0));
    // Gửi 1 message placeholder, sau đó edit in-place → tránh spam chat.
    try { ctx.reply('⏳ Em đang xử lý...'); } catch (_) {}

    const blobs = [];
    const photo = ctx.downloadPhoto();
    if (photo) blobs.push(photo);

    const draft = QuoteExtractor.extract(text, blobs);
    Log.info('[quotes] AI draft items=' + (draft.items ? draft.items.length : 0));

    if (!draft.items || draft.items.length === 0) {
      ctx.editLast('Đoạn này em chưa rõ, anh nhắn kỹ lại tên hạng mục, kích thước, đơn giá giúp em ạ.');
      return;
    }

    const quoteId = 'BG' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMddHHmmss');
    const filled = QuoteSheet.fill(draft, quoteId);

    StateManager.set(ctx.userId, {
      module: MODULE,
      state: STATES.AWAITING_CONFIRM,
      draft,
      spreadsheetId: filled.spreadsheet.getId(),
      fileId: filled.file.getId(),
      quoteId,
    });

    // Edit message placeholder thành summary + buttons. Auto-escape handles
    // `<>&` trong AI-generated content (parse_mode=HTML).
    ctx.editLast(QuoteSheet.summarize(draft, filled.totals), {
      buttons: [
        [
          { text: '✅ OK – Xuất PDF', callback_data: 'quote:confirm' },
          { text: '✏️ Mở Sheet để sửa', url: filled.file.getUrl() },
        ],
        [
          { text: '❌ Huỷ', callback_data: 'quote:cancel' },
        ],
      ],
    });
  }

  function _exportAndReply(ctx, session) {
    if (!session || session.module !== MODULE || session.state !== STATES.AWAITING_CONFIRM) {
      ctx.reply('Em chưa có báo giá nào đang chờ xác nhận ạ. Anh nhắn lại nội dung báo giá nhé.');
      return;
    }
    StateManager.patch(ctx.userId, { state: STATES.EXPORTING });
    ctx.reply('⏳ Em đang xuất PDF, chờ em chút...');

    try {
      const filename = 'BaoGia_' + (session.quoteId || Date.now());
      const pdf = PDFExporter.exportToDrive(
        session.spreadsheetId,
        Config.get('TEMPLATE_SHEET_NAME'),
        filename
      );
      const blob = pdf.file.getBlob().setName(filename + '.pdf');
      try { ctx.editLast('✅ Đã xuất xong. File đang gửi cho anh...'); } catch (_) {}
      ctx.replyWithDocument(blob, '📄 Báo giá ' + (session.quoteId || ''));
      StateManager.clear(ctx.userId);
    } catch (err) {
      Log.error('[quotes] PDF export failed: ' + Log.safeErr(err));
      StateManager.patch(ctx.userId, { state: STATES.AWAITING_CONFIRM });
      ctx.editLast('❌ Lỗi xuất PDF. Anh có thể bấm lại OK để thử lại, hoặc gõ /huy để bỏ.');
    }
  }

  function _esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return { register, STATES };
})();
