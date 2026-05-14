/**
 * ProductCommands — Telegram binding cho Catalog module.
 *
 * Slash commands:
 *   /sp add SKU | Tên | ĐVT | Đơn giá | Category
 *   /sp find <SKU hoặc tên>
 *   /sp list
 */

const ProductCommands = (() => {
  function register() {
    Router.registerCommand('sp', _dispatch, { description: 'Quản lý sản phẩm (add/find/list)' });
    Router.registerCommand('product', _dispatch, { description: 'Product catalog management' });
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
          '/sp add SKU | Tên | ĐVT | Đơn giá | Category\n' +
          '/sp find <SKU hoặc tên>\n' +
          '/sp list [limit] [page]'
        );
    }
  }

  function _add(ctx, rest) {
    if (!rest) return ctx.reply('Cú pháp: /sp add SKU | Tên | ĐVT | Đơn giá | Category');
    const [sku, name, unit, price, category] = rest.split('|').map((s) => (s || '').trim());
    if (!sku || !name) return ctx.reply('Cần ít nhất SKU và Tên, anh ạ.');

    const exists = Product.findBySku(sku);
    if (exists) return ctx.reply('SKU ' + sku + ' đã tồn tại: ' + exists.name);

    const p = Product.create({ sku, name, unit, default_price: Number(price) || 0, category });
    ctx.reply('✅ Đã thêm sản phẩm:\n' + _format(p));
  }

  function _find(ctx, rest) {
    if (!rest) return ctx.reply('Cú pháp: /sp find <SKU hoặc tên>');
    const bySku = Product.findBySku(rest);
    if (bySku) return ctx.reply(_format(bySku));
    const byName = Product.findByName(rest);
    if (byName.length === 0) return ctx.reply('Không tìm thấy sản phẩm khớp với "' + rest + '"');
    ctx.reply(byName.map(_format).join('\n\n'));
  }

  function _list(ctx, rest) {
    // Cú pháp: `/sp list [limit] [page]` — đối xứng với `/khach list`.
    const tokens = (rest || '').split(/\s+/).filter(Boolean);
    const limit = Math.min(Math.max(parseInt(tokens[0], 10) || 20, 1), 50);
    const page = Math.max(parseInt(tokens[1], 10) || 1, 1);

    const rows = Product.all();
    const total = rows.length;
    if (total === 0) return ctx.reply('Catalog rỗng. Dùng /sp add để thêm.');

    const start = (page - 1) * limit;
    const slice = rows.slice(start, start + limit);
    if (slice.length === 0) {
      const totalPages = Math.max(Math.ceil(total / limit), 1);
      return ctx.reply('Trang ' + page + ' rỗng. Tối đa ' + totalPages + ' trang.');
    }
    const totalPages = Math.ceil(total / limit);
    const header = 'Sản phẩm (trang ' + page + '/' + totalPages + ', tổng ' + total + '):';
    const body = slice.map((p) => p.sku + ' — ' + p.name + ' (' + p.unit + ') @ ' + p.default_price).join('\n');
    const footer = page < totalPages
      ? '\nTrang sau: /sp list ' + limit + ' ' + (page + 1)
      : '';
    ctx.reply(header + '\n' + body + footer);
  }

  function _format(p) {
    return [
      'SKU: ' + p.sku,
      'Tên: ' + p.name,
      'ĐVT: ' + p.unit,
      'Đơn giá: ' + p.default_price,
      p.category ? 'Category: ' + p.category : '',
    ].filter(Boolean).join('\n');
  }

  return { register };
})();
