/**
 * QuoteExtractor — domain-specific: chat text (+ ảnh) → quote draft JSON.
 *
 * Dùng AIClient generic; sở hữu prompt + schema riêng cho domain báo giá
 * tiếng Việt. Module khác (orders, invoices) sẽ có Extractor riêng tương tự.
 *
 * Output schema:
 *   {
 *     customer_name: string|null,
 *     items: [{ name, description, dimensions, quantity, unit, unit_price, note }],
 *     missing_fields: string[]
 *   }
 */

const QuoteExtractor = (() => {
  const SYSTEM_PROMPT = [
    'Bạn là chuyên gia bóc tách dữ liệu báo giá cho doanh nghiệp nhỏ ở Việt Nam.',
    'Phân tích tin nhắn (và ảnh nếu có) rồi trả về JSON chuẩn đúng schema.',
    'Quy ước:',
    '- Tiền tệ VNĐ: "4tr5" = 4500000, "3tr2" = 3200000, "500k" = 500000.',
    '- Kích thước: giữ nguyên format gốc (vd "90x220", "3m2").',
    '- Đơn vị tính: "cái", "bộ", "m2", "md" (mét dài). Nếu không rõ để null.',
    '- Trường "note" (ghi chú per-item): bắt các yêu cầu/ràng buộc cụ thể của hạng mục đó —',
    '  ví dụ "vật liệu khách cung cấp", "có lắp đặt", "giao tuần sau", "màu nâu đậm",',
    '  "thay tay nắm vàng", "bao gồm sơn PU"… Để null nếu không có.',
    '- Nếu thiếu thông tin BẮT BUỘC (tên/SL/đơn giá), ĐỂ null thay vì đoán;',
    '  thêm tên field vào missing_fields. Note để null là bình thường, KHÔNG add vào missing_fields.',
    '- KHÔNG kèm markdown, KHÔNG ```json, chỉ output JSON thuần.',
  ].join('\n');

  const RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
      customer_name: { type: 'string', nullable: true },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', nullable: true },
            description: { type: 'string', nullable: true },
            dimensions: { type: 'string', nullable: true },
            quantity: { type: 'number', nullable: true },
            unit: { type: 'string', nullable: true },
            unit_price: { type: 'number', nullable: true },
            note: { type: 'string', nullable: true },
          },
        },
      },
      missing_fields: { type: 'array', items: { type: 'string' } },
    },
    required: ['customer_name', 'items', 'missing_fields'],
  };

  /**
   * @param {string} text  raw user text (may be empty if image-only)
   * @param {Blob[]} [imageBlobs]
   * @returns {Object} normalized draft
   */
  function extract(text, imageBlobs) {
    const raw = AIClient.generateJson({
      systemPrompt: SYSTEM_PROMPT,
      userText: 'Tin nhắn khách:\n' + (text || '(không có text)'),
      images: imageBlobs,
      responseSchema: RESPONSE_SCHEMA,
    });
    return _normalize(raw);
  }

  function _normalize(obj) {
    return {
      customer_name: obj.customer_name || null,
      items: Array.isArray(obj.items) ? obj.items.map((it) => ({
        name: it.name || null,
        description: it.description || null,
        dimensions: it.dimensions || null,
        quantity: typeof it.quantity === 'number' ? it.quantity : null,
        unit: it.unit || null,
        unit_price: typeof it.unit_price === 'number' ? it.unit_price : null,
        note: it.note || null,
      })) : [],
      missing_fields: Array.isArray(obj.missing_fields) ? obj.missing_fields : [],
    };
  }

  return { extract };
})();
