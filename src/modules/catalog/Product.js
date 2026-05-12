/**
 * Product — catalog repository.
 *
 * Lưu danh mục sản phẩm/dịch vụ cố định (gỗ, vật liệu, công lắp đặt, …)
 * để báo giá có thể auto-fill đơn giá thay vì AI đoán.
 *
 * Schema: sku | name | unit | default_price | category | active | created_at
 */

const Product = (() => {
  const SCHEMA = ['sku', 'name', 'unit', 'default_price', 'category', 'active', 'created_at'];

  function _table() {
    return DB.table('products', SCHEMA);
  }

  function create(fields) {
    return _table().insert({
      sku: String(fields.sku || '').trim().toUpperCase(),
      name: String(fields.name || '').trim(),
      unit: String(fields.unit || 'cái'),
      default_price: Number(fields.default_price) || 0,
      category: String(fields.category || ''),
      active: fields.active !== false,
    });
  }

  function findBySku(sku) {
    return _table().findOne('sku', String(sku || '').trim().toUpperCase());
  }

  function findByName(name) {
    return _table().findBy('name', String(name || '').trim());
  }

  function all() {
    return _table().all().filter((p) => p.active !== false);
  }

  function update(id, fields) {
    return _table().update(id, fields);
  }

  function remove(id) {
    return _table().delete(id);
  }

  return { create, findBySku, findByName, all, update, delete: remove };
})();
