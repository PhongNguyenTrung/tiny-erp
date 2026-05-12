/**
 * ZaloAPI — thin client for Zalo OA Open API v3.0.
 * Docs: https://developers.zalo.me/docs/api/official-account-api
 *
 * Provides:
 *  - sendText(userId, text)
 *  - sendFileLink(userId, url, label)
 *  - downloadAttachment(url) → Blob
 *  - refreshAccessToken()    (called transparently on 401)
 */

const ZaloAPI = (() => {
  const SEND_ENDPOINT = 'https://openapi.zalo.me/v3.0/oa/message/cs';
  const OAUTH_ENDPOINT = 'https://oauth.zaloapp.com/v4/oa/access_token';

  function _post(payload, _retry) {
    const token = Config.require('ZALO_OA_ACCESS_TOKEN');
    const res = UrlFetchApp.fetch(SEND_ENDPOINT, {
      method: 'post',
      contentType: 'application/json',
      headers: { access_token: token },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const code = res.getResponseCode();
    const body = res.getContentText();
    let parsed = {};
    try { parsed = JSON.parse(body); } catch (_) { /* keep raw */ }

    // Zalo returns 200 even for app-level errors; check `error` field
    const errCode = parsed.error;
    if (errCode === -216 || errCode === -124 || code === 401) {
      if (_retry) throw new Error('Zalo auth failed after refresh: ' + body);
      refreshAccessToken();
      return _post(payload, true);
    }
    if (code < 200 || code >= 300 || (errCode != null && errCode !== 0)) {
      throw new Error('Zalo send failed (' + code + '): ' + body.substring(0, 500));
    }
    return parsed;
  }

  function sendText(userId, text) {
    return _post({
      recipient: { user_id: String(userId) },
      message: { text: String(text).substring(0, 2000) },
    });
  }

  /**
   * Send a clickable link (PDF preview/download).
   * Uses list template — supported by OA messages.
   */
  function sendFileLink(userId, url, label) {
    return _post({
      recipient: { user_id: String(userId) },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'list',
            elements: [
              {
                title: label || 'Báo giá PDF',
                subtitle: 'Bấm để xem / tải file',
                image_url: '',
                default_action: { type: 'oa.open.url', url: url },
              },
            ],
          },
        },
      },
    });
  }

  /**
   * Download an attachment URL provided by a Zalo webhook image event.
   */
  function downloadAttachment(url) {
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) {
      throw new Error('Download attachment ' + res.getResponseCode() + ': ' + url);
    }
    return res.getBlob();
  }

  function refreshAccessToken() {
    const refresh = Config.require('ZALO_OA_REFRESH_TOKEN');
    const appId = Config.require('ZALO_APP_ID');
    const secret = Config.require('ZALO_APP_SECRET');
    const res = UrlFetchApp.fetch(OAUTH_ENDPOINT, {
      method: 'post',
      headers: { secret_key: secret },
      payload: {
        refresh_token: refresh,
        app_id: appId,
        grant_type: 'refresh_token',
      },
      muteHttpExceptions: true,
    });
    const body = res.getContentText();
    let parsed = {};
    try { parsed = JSON.parse(body); } catch (_) {}
    if (!parsed.access_token) throw new Error('Refresh token failed: ' + body);
    const props = PropertiesService.getScriptProperties();
    props.setProperty('ZALO_OA_ACCESS_TOKEN', parsed.access_token);
    if (parsed.refresh_token) props.setProperty('ZALO_OA_REFRESH_TOKEN', parsed.refresh_token);
    Config.clearCache();
  }

  return { sendText, sendFileLink, downloadAttachment, refreshAccessToken };
})();
