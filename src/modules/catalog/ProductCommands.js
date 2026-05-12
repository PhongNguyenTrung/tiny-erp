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
      case 'list': return _list(ctx);
      default:
        ctx.reply(
          'Cú pháp:\n' +
          '/sp add SKU | Tên | ĐVT | Đơn giá | Category\n' +
          '/sp find <SKU hoặc tên>\n' +
          '/sp list'
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

  function _list(ctx) {
    const rows = Product.all();
    if (rows.length === 0) return ctx.reply('Catalog rỗng. Dùng /sp add để thêm.');
    ctx.reply(rows.map((p) => p.sku + ' — ' + p.name + ' (' + p.unit + ') @ ' + p.default_price).join('\n'));
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
