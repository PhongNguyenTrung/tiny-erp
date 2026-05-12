/**
 * PDFExporter — render a quote spreadsheet to PDF, save to Drive,
 * return a publicly viewable URL.
 *
 * Uses the undocumented but stable Google Sheets export endpoint
 * (the same one File → Download → PDF uses under the hood).
 */

const PDFExporter = (() => {
  /**
   * @param {string} spreadsheetId
   * @param {string} sheetName     name of tab to export
   * @param {string} filename      output filename (without .pdf)
   * @returns {{file: File, url: string}}
   */
  function exportToDrive(spreadsheetId, sheetName, filename) {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName(sheetName) || ss.getSheets()[0];
    const gid = sheet.getSheetId();

    const exportUrl =
      'https://docs.google.com/spreadsheets/d/' +
      encodeURIComponent(spreadsheetId) +
      '/export?' +
      [
        'format=pdf',
        'portrait=true',
        'size=A4',
        'fitw=true',
        'sheetnames=false',
        'printtitle=false',
        'pagenumbers=false',
        'gridlines=false',
        'fzr=false',
        'gid=' + gid,
      ].join('&');

    const res = UrlFetchApp.fetch(exportUrl, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true,
    });
    if (res.getResponseCode() !== 200) {
      throw new Error('PDF export failed (' + res.getResponseCode() + '): ' + res.getContentText().substring(0, 300));
    }
    const blob = res.getBlob().setName(filename + '.pdf');

    const folderId = Config.get('OUTPUT_DRIVE_FOLDER_ID');
    const folder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
    const file = folder.createFile(blob);

    // PDF chứa PII khách hàng (tên, SĐT, giá) — mặc định giữ PRIVATE.
    // Telegram pipeline gửi blob trực tiếp nên không cần share Drive.
    // Chỉ share ANYONE_WITH_LINK khi user opt-in (PUBLIC_PDF_SHARING=true) —
    // hữu ích nếu cần gửi link Drive cho người không có account Google.
    if (Config.get('PUBLIC_PDF_SHARING')) {
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e) {
        console.warn('setSharing failed (org policy): ' + (e && e.message || e));
      }
    }

    return { file, url: file.getUrl() };
  }

  return { exportToDrive };
})();
