/**
 * DB — Sheet-as-database cho ERP modules.
 *
 * Mỗi entity = 1 tab trong DB_SPREADSHEET_ID. Hàng 1 = headers (schema).
 * Đơn giản, đủ cho 10k–50k rows / table — quá size đó nên chuyển sang
 * Cloud SQL / Firestore qua UrlFetch.
 *
 * Pattern:
 *   const Customers = DB.table('customers', ['id', 'name', 'phone', 'created_at']);
 *   Customers.insert({ name: 'Tuan', phone: '0901...' });
 *   Customers.findBy('phone', '0901...');
 *   Customers.all();
 *   Customers.update(id, { name: 'Tuấn Anh' });
 *   Customers.delete(id);
 *
 * `id` mặc định = ULID-ish string (timestamp + random). Schema array
 * không cần chứa "id" — auto-thêm là cột đầu nếu thiếu.
 *
 * Cache: lock-aware. Mỗi mutation acquire LockService 5s để tránh race
 * giữa concurrent webhook invocations.
 */

const DB = (() => {
  function _ss() {
    const id = Config.get('DB_SPREADSHEET_ID');
    if (!id) throw new Error('DB_SPREADSHEET_ID Script Property chưa set. Chạy setup_createDatabase() trước.');
    return SpreadsheetApp.openById(id);
  }

  function _genId() {
    const ts = Date.now().toString(36);
    const rnd = Math.floor(Math.random() * 1e9).toString(36);
    return ts + '_' + rnd;
  }

  function _withLock(fn) {
    const lock = LockService.getScriptLock();
    lock.waitLock(5000);
    try { return fn(); }
    finally { try { lock.releaseLock(); } catch (_) {} }
  }

  /**
   * @param {string} name sheet/tab name
   * @param {string[]} schema column names (excluding "id" — auto-injected)
   */
  function table(name, schema) {
    const cols = ['id'].concat(schema.filter((c) => c !== 'id'));

    function _sheet() {
      const ss = _ss();
      let sh = ss.getSheetByName(name);
      if (!sh) {
        sh = ss.insertSheet(name);
        sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
        sh.setFrozenRows(1);
      }
      return sh;
    }

    function _rowToObj(row, header) {
      const obj = {};
      header.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    }

    function _readHeader(sh) {
      return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    }

    function all() {
      const sh = _sheet();
      const last = sh.getLastRow();
      if (last < 2) return [];
      const header = _readHeader(sh);
      const data = sh.getRange(2, 1, last - 1, header.length).getValues();
      return data.map((r) => _rowToObj(r, header));
    }

    function findBy(field, value) {
      return all().filter((r) => r[field] === value);
    }

    function findOne(field, value) {
      const sh = _sheet();
      const last = sh.getLastRow();
      if (last < 2) return null;
      const header = _readHeader(sh);
      const colIdx = header.indexOf(field);
      if (colIdx < 0) throw new Error('Unknown column: ' + field);
      const data = sh.getRange(2, 1, last - 1, header.length).getValues();
      for (let i = 0; i < data.length; i++) {
        if (data[i][colIdx] === value) return _rowToObj(data[i], header);
      }
      return null;
    }

    function insert(record) {
      return _withLock(() => {
        const sh = _sheet();
        const header = _readHeader(sh);
        const obj = Object.assign({ id: _genId(), created_at: new Date() }, record);
        const row = header.map((h) => obj[h] != null ? obj[h] : '');
        sh.appendRow(row);
        return obj;
      });
    }

    function update(id, fields) {
      return _withLock(() => {
        const sh = _sheet();
        const last = sh.getLastRow();
        if (last < 2) return null;
        const header = _readHeader(sh);
        const data = sh.getRange(2, 1, last - 1, header.length).getValues();
        const idCol = header.indexOf('id');
        for (let i = 0; i < data.length; i++) {
          if (data[i][idCol] === id) {
            const updated = _rowToObj(data[i], header);
            Object.assign(updated, fields);
            const newRow = header.map((h) => updated[h] != null ? updated[h] : '');
            sh.getRange(i + 2, 1, 1, header.length).setValues([newRow]);
            return updated;
          }
        }
        return null;
      });
    }

    function remove(id) {
      return _withLock(() => {
        const sh = _sheet();
        const last = sh.getLastRow();
        if (last < 2) return false;
        const header = _readHeader(sh);
        const idCol = header.indexOf('id');
        const ids = sh.getRange(2, idCol + 1, last - 1, 1).getValues();
        for (let i = 0; i < ids.length; i++) {
          if (ids[i][0] === id) {
            sh.deleteRow(i + 2);
            return true;
          }
        }
        return false;
      });
    }

    return { all, findBy, findOne, insert, update, delete: remove, schema: cols, name };
  }

  /**
   * Create DB spreadsheet if missing, save ID into Script Property.
   * Returns the spreadsheet URL.
   */
  function ensureSpreadsheet(title) {
    let id = Config.get('DB_SPREADSHEET_ID');
    if (id) {
      try { return SpreadsheetApp.openById(id); } catch (_) { /* recreate */ }
    }
    const ss = SpreadsheetApp.create(title || 'tiny-erp DB');
    const folderId = Config.get('OUTPUT_DRIVE_FOLDER_ID');
    if (folderId) {
      try {
        const file = DriveApp.getFileById(ss.getId());
        DriveApp.getFolderById(folderId).addFile(file);
        DriveApp.getRootFolder().removeFile(file);
      } catch (_) { /* ignore */ }
    }
    Config.set('DB_SPREADSHEET_ID', ss.getId());
    return ss;
  }

  return { table, ensureSpreadsheet };
})();
