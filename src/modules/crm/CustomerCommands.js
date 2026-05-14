/**
 * CustomerCommands — Telegram binding cho CRM module.
 *
 * Slash commands:
 *   /khach add <name> | <phone> | <address> | <note>
 *   /khach find <phone>            — tra cứu nhanh
 *   /khach list [limit]            — N khách gần nhất
 *
 * Đăng ký qua Router.registerCommand. Module này demo cho contributor cách
 * add một module ERP đơn giản — pattern:
 *   1. Repository (Customer.js) — pure CRUD, không phụ thuộc adapter
 *   2. Commands (CustomerCommands.js) — bind Router với command + intent
 *   3. (optional) Extractor — nếu cần AI bóc tách từ free text
 */

const CustomerCommands = (() => {
  function register() {
    Router.registerCommand('khach', _dispatch, { description: 'Quản lý khách hàng (add/find/list)' });
    Router.registerCommand('customer', _dispatch, { description: 'Customer management' });
  }

  function _dispatch(ctx) {
    const args = ctx.commandArgs || [];
    const sub = (args[0] || '').toLowerCase();
    const rest = args.slice(1).join(' ');

    switch (sub) {
      case 'add': return _add(ctx, rest);
      case 'find': return _find(ctx, rest);
      case 'list': return _list(ctx, rest);
      default:
        ctx.reply(
          'Cú pháp:\n' +
          '/khach add Tên | SĐT | Địa chỉ | Ghi chú\n' +
          '/khach find <SĐT>\n' +
          '/khach list [số lượng]'
        );
    }
  }

  function _add(ctx, rest) {
    if (!rest) return ctx.reply('Cú pháp: /khach add Tên | SĐT | Địa chỉ | Ghi chú');
    const [name, phone, address, note] = rest.split('|').map((s) => (s || '').trim());
    if (!name || !phone) return ctx.reply('Cần ít nhất Tên và SĐT, anh ạ.');

    const exists = Customer.findByPhone(phone);
    if (exists) return ctx.reply('Khách có SĐT ' + phone + ' đã tồn tại: ' + exists.name);

    const c = Customer.create({ name, phone, address, note });
    ctx.reply('✅ Đã thêm khách hàng:\n' + _format(c));
  }

  function _find(ctx, rest) {
    if (!rest) return ctx.reply('Cú pháp: /khach find <SĐT>');
    const c = Customer.findByPhone(rest);
    if (!c) return ctx.reply('Không tìm thấy khách với SĐT ' + rest);
    ctx.reply(_format(c));
  }

  function _list(ctx, rest) {
    // Cú pháp: `/khach list [limit] [page]`
    //   limit default 10, max 50 — giữ message dưới giới hạn Telegram 4096 ký tự.
    //   page  default 1 (1-indexed); xem các trang sâu hơn bằng `/khach list 20 2`.
    const tokens = (rest || '').split(/\s+/).filter(Boolean);
    const limit = Math.min(Math.max(parseInt(tokens[0], 10) || 10, 1), 50);
    const page = Math.max(parseInt(tokens[1], 10) || 1, 1);

    const all = Customer.all();
    const total = all.length;
    if (total === 0) return ctx.reply('Chưa có khách hàng nào trong DB.');

    // Newest first
    const reversed = all.slice().reverse();
    const start = (page - 1) * limit;
    const slice = reversed.slice(start, start + limit);
    if (slice.length === 0) {
      const totalPages = Math.max(Math.ceil(total / limit), 1);
      return ctx.reply('Trang ' + page + ' rỗng. Tối đa ' + totalPages + ' trang.');
    }

    const totalPages = Math.ceil(total / limit);
    const header = 'Khách hàng (trang ' + page + '/' + totalPages + ', tổng ' + total + '):';
    const body = slice.map((c, i) => (start + i + 1) + '. ' + c.name + ' — ' + c.phone).join('\n');
    const footer = page < totalPages
      ? '\nTrang sau: /khach list ' + limit + ' ' + (page + 1)
      : '';
    ctx.reply(header + '\n' + body + footer);
  }

  function _format(c) {
    return [
      'Tên: ' + c.name,
      'SĐT: ' + c.phone,
      c.address ? 'Địa chỉ: ' + c.address : '',
      c.note ? 'Ghi chú: ' + c.note : '',
    ].filter(Boolean).join('\n');
  }

  return { register };
})();
