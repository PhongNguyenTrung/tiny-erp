/**
 * Customer — CRM repository cho khách hàng.
 *
 * Wrap DB.table với schema cố định + helper tìm theo phone / name.
 * Phase 1 (hiện tại): chỉ CRUD cơ bản, dùng cho /khach add | /khach find.
 * Phase 2: integrate với QuoteCommands — auto-link customer khi báo giá có
 *   tên trùng, gợi ý customer cũ qua AI.
 */

const Customer = (() => {
  const SCHEMA = ['name', 'phone', 'address', 'note', 'tags', 'created_at'];

  function _table() {
    return DB.table('customers', SCHEMA);
  }

  function create(fields) {
    return _table().insert({
      name: String(fields.name || '').trim(),
      phone: String(fields.phone || '').replace(/\s+/g, ''),
      address: String(fields.address || '').trim(),
      note: String(fields.note || '').trim(),
      tags: Array.isArray(fields.tags) ? fields.tags.join(',') : String(fields.tags || ''),
    });
  }

  function findByPhone(phone) {
    return _table().findOne('phone', String(phone || '').replace(/\s+/g, ''));
  }

  function findByName(name) {
    return _table().findBy('name', String(name || '').trim());
  }

  function all() {
    return _table().all();
  }

  function update(id, fields) {
    return _table().update(id, fields);
  }

  function remove(id) {
    return _table().delete(id);
  }

  return { create, findByPhone, findByName, all, update, delete: remove };
})();
