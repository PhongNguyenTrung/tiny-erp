/**
 * AIClient — generic Gemini wrapper, module-agnostic.
 *
 * Đây là layer adapter (provider boundary). Các module ERP gọi:
 *   AIClient.generateJson({ systemPrompt, userText, images, responseSchema })
 * và nhận về object đã parse + validate sơ bộ. Không có domain logic
 * (quote / customer / product) ở đây — module sở hữu prompt + schema riêng.
 *
 * Đổi provider (OpenAI, local Llama, …) chỉ cần thay file này.
 *
 * Cấu hình:
 *   GEMINI_API_KEY        (Script Property)  required
 *   GEMINI_MODEL          (Script Property)  default 'gemini-2.5-flash'
 */

const AIClient = (() => {
  const ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';

  function _endpoint() {
    const model = Config.get('GEMINI_MODEL');
    const key = Config.require('GEMINI_API_KEY');
    return ENDPOINT_BASE + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key);
  }

  function _buildParts(systemPrompt, userText, imageBlobs) {
    const parts = [];
    if (systemPrompt) parts.push({ text: systemPrompt });
    parts.push({ text: userText || '(không có text)' });
    (imageBlobs || []).forEach((blob) => {
      parts.push({
        inline_data: {
          mime_type: blob.getContentType() || 'image/jpeg',
          data: Utilities.base64Encode(blob.getBytes()),
        },
      });
    });
    return parts;
  }

  /**
   * @param {Object} opts
   * @param {string} opts.systemPrompt
   * @param {string} opts.userText
   * @param {Blob[]} [opts.images]
   * @param {Object} [opts.responseSchema]   JSON schema for structured output
   * @param {number} [opts.temperature]      default 0.1
   * @returns {Object}  parsed JSON object
   */
  function generateJson(opts) {
    const payload = {
      contents: [{ role: 'user', parts: _buildParts(opts.systemPrompt, opts.userText, opts.images) }],
      generationConfig: {
        temperature: opts.temperature != null ? opts.temperature : 0.1,
        responseMimeType: 'application/json',
        responseSchema: opts.responseSchema,
      },
    };

    const res = UrlFetchApp.fetch(_endpoint(), {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const code = res.getResponseCode();
    const body = res.getContentText();
    if (code < 200 || code >= 300) {
      const safe = body.replace(/key=[A-Za-z0-9_\-]+/g, 'key=***').substring(0, 500);
      throw new Error('Gemini API ' + code + ': ' + safe);
    }

    const parsed = JSON.parse(body);
    const candidate = parsed.candidates && parsed.candidates[0];
    if (!candidate) throw new Error('Gemini returned no candidates');
    const rawText = candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text;
    if (!rawText) throw new Error('Gemini candidate missing text');

    try {
      return JSON.parse(rawText);
    } catch (e) {
      throw new Error('Gemini returned non-JSON: ' + rawText.substring(0, 300));
    }
  }

  /**
   * List Gemini models that the current API key has access to. Useful when
   * a model 404s — call from Apps Script editor to discover correct names.
   */
  function listModels() {
    const key = Config.require('GEMINI_API_KEY');
    const res = UrlFetchApp.fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(key),
      { muteHttpExceptions: true }
    );
    if (res.getResponseCode() !== 200) {
      const safe = res.getContentText().replace(/key=[A-Za-z0-9_\-]+/g, 'key=***').substring(0, 500);
      throw new Error('ListModels ' + res.getResponseCode() + ': ' + safe);
    }
    return JSON.parse(res.getContentText()).models || [];
  }

  return { generateJson, listModels };
})();
