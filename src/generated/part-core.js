/* Pure domain rules shared with the local verification suite. */
const PartCore = (() => {
  const fields = ['id', 'partNumber', 'description', 'brand', 'storeCode', 'notes'];
  const normalize = value => String(value == null ? '' : value).normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('th-TH');
  function validate(input) {
    const errors = {};
    const value = {};
    for (const [key, max] of Object.entries({partNumber: 160, description: 2000, storeCode: 160, notes: 4000})) {
      value[key] = String(input[key] == null ? '' : input[key]).trim();
      if (value[key].length > max) errors[key] = 'กรอกได้ไม่เกิน ' + max + ' ตัวอักษร';
    }
    if (!value.partNumber) errors.partNumber = 'กรุณากรอก Part number';
    if (!value.description) errors.description = 'กรุณากรอก Description';
    const raw = input.price == null ? '' : String(input.price).replace(/,/g, '').trim();
    value.price = raw === '' ? null : Number(raw);
    if (raw && (!/^\d+(\.\d{1,2})?$/.test(raw) || !Number.isFinite(value.price) || value.price > 999999999999)) errors.price = 'กรอกราคา 0 ขึ้นไป ทศนิยมไม่เกิน 2 ตำแหน่ง';
    const rawLifespan = input.lifespan == null ? '' : String(input.lifespan).replace(/,/g, '').replace(/ปี/g, '').trim();
    value.lifespan = rawLifespan === '' ? null : Number(rawLifespan);
    if (rawLifespan && (!/^\d+(\.\d{1,2})?$/.test(rawLifespan) || !Number.isFinite(value.lifespan) || value.lifespan < 0 || value.lifespan > 999)) errors.lifespan = 'กรอกอายุอุปกรณ์เป็นตัวเลขปี 0 ขึ้นไป (เช่น 1, 2, 5 หรือ 0.5)';
    value.brandId = input.brandId || null;
    return {value, errors};
  }
  function query(rows, params) {
    const tokens = [...new Set(normalize(params.query).split(' ').filter(Boolean))];
    if (tokens.length > 20 || String(params.query || '').length > 300) throw new Error('คำค้นยาวเกินไป กรุณาใช้ไม่เกิน 20 คำ / 300 ตัวอักษร');
    const sortBy = [...fields, 'price', 'lifespan'].includes(params.sortBy) ? params.sortBy : 'id';
    const direction = params.sortOrder === 'asc' ? 1 : -1;
    const size = [25, 50, 100].includes(Number(params.pageSize)) ? Number(params.pageSize) : 50;
    const filtered = rows.filter(row => {
      if (!tokens.length) return true;
      const haystacks = [...fields.map(key => normalize(row[key])), row.lifespan != null ? String(row.lifespan) + ' ' + String(row.lifespan) + 'ปี' : ''];
      return tokens.every(token => haystacks.some(text => text.includes(token)));
    });
    filtered.sort((a,b) => {
      if (sortBy === 'price' || sortBy === 'lifespan') {
        if (a[sortBy] == null && b[sortBy] != null) return 1;
        if (b[sortBy] == null && a[sortBy] != null) return -1;
        const cmp = (a[sortBy] || 0) - (b[sortBy] || 0);
        return cmp * direction || a.id.localeCompare(b.id);
      }
      const cmp = String(a[sortBy] || '').localeCompare(String(b[sortBy] || ''), 'th', {numeric:true});
      return cmp * direction || a.id.localeCompare(b.id);
    });
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / size));
    const page = Math.min(totalPages, Math.max(1, Math.floor(Number(params.page) || 1)));
    return {items: filtered.slice((page-1)*size, page*size), page, pageSize:size, total, totalPages, allTotal:rows.length};
  }
  return {normalize, validate, query};
})();


export {PartCore};
