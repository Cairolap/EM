/* Pure domain rules shared with the local verification suite. */
const MachineCore = (() => {
  const SEARCH_FIELDS = [
    'machineId', 'machineCode', 'machineName', 'manufacturer', 'model',
    'serialNo', 'machineType', 'locationDetail', 'departmentName', 'lineName'
  ];
  const SORT_FIELDS = [...SEARCH_FIELDS, 'status', 'criticality', 'installDate', 'updatedAt', 'lineOrder'];
  const STATUSES = ['ใช้งาน', 'หยุด', 'ซ่อม', 'สำรอง', 'ปลดระวาง'];
  const CRITICALITIES = ['สูง', 'กลาง', 'ต่ำ'];
  const MACHINE_TYPES = ['Press', 'Printing', 'Packing', 'อื่นๆ'];
  const PAGE_SIZES = [25, 50, 100];

  const text = value => String(value == null ? '' : value).trim();
  const normalize = value => text(value)
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('th-TH');

  function validate(input) {
    const value = {};
    const errors = {};
    const limits = {
      machineCode: 80,
      machineName: 200,
      manufacturer: 160,
      model: 160,
      serialNo: 160,
      machineType: 120,
      locationDetail: 300,
      manualUrl: 1000,
      remark: 4000
    };

    Object.entries(limits).forEach(([key, max]) => {
      value[key] = text(input[key]);
      if (value[key].length > max) errors[key] = 'กรอกได้ไม่เกิน ' + max + ' ตัวอักษร';
    });
    value.deptId = text(input.deptId);
    value.lineId = text(input.lineId);
    const rawOrder = text(input.lineOrder);
    if (rawOrder) {
      const num = Number(rawOrder);
      if (isNaN(num) || !Number.isInteger(num) || num < 1 || num > 9999) {
        errors.lineOrder = 'ระบุลำดับเป็นจำนวนเต็มบวก 1–9999';
      } else {
        value.lineOrder = num;
      }
    } else {
      value.lineOrder = '';
    }
    value.installDate = text(input.installDate);
    value.criticality = text(input.criticality);
    value.status = text(input.status);
    value.isActive = input.isActive !== false && String(input.isActive).toLowerCase() !== 'false';

    if (!value.machineCode) errors.machineCode = 'กรุณากรอกรหัสเครื่องจักร';
    if (!value.machineName) errors.machineName = 'กรุณากรอกชื่อเครื่องจักร';
    if (!value.deptId) errors.deptId = 'กรุณาเลือกแผนก';
    if (!value.lineId) errors.lineId = 'กรุณาเลือกไลน์ผลิต';
    if (!CRITICALITIES.includes(value.criticality)) errors.criticality = 'กรุณาเลือกความสำคัญ';
    if (!STATUSES.includes(value.status)) errors.status = 'กรุณาเลือกสถานะ';
    if (value.machineType && !MACHINE_TYPES.includes(value.machineType)) {
      errors.machineType = 'กรุณาเลือกประเภทเครื่องจากรายการ';
    }
    if (value.installDate && !isValidDateOnly(value.installDate)) {
      errors.installDate = 'วันที่ติดตั้งไม่ถูกต้อง';
    }
    if (value.manualUrl) {
      try {
        const parsed = new URL(value.manualUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol');
      } catch (_) {
        errors.manualUrl = 'กรอกลิงก์ที่ขึ้นต้นด้วย http:// หรือ https://';
      }
    }
    return {value, errors};
  }

  function isValidDateOnly(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text(value));
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;
  }

  function query(rows, params) {
    params = params || {};
    const rawQuery = text(params.query);
    const tokens = [...new Set(normalize(rawQuery).split(' ').filter(Boolean))];
    if (rawQuery.length > 300 || tokens.length > 20) {
      throw new Error('คำค้นยาวเกินไป กรุณาใช้ไม่เกิน 20 คำ / 300 ตัวอักษร');
    }
    const sortBy = SORT_FIELDS.includes(params.sortBy) ? params.sortBy : 'machineCode';
    const sortOrder = params.sortOrder === 'desc' ? -1 : 1;
    const pageSize = PAGE_SIZES.includes(Number(params.pageSize)) ? Number(params.pageSize) : 25;
    const deptId = text(params.deptId);
    const lineId = text(params.lineId);
    const status = text(params.status);
    const criticality = text(params.criticality);
    const machineType = text(params.machineType);
    const legacyActiveOnly = params.activeOnly !== false && String(params.activeOnly).toLowerCase() !== 'false';
    const visibility = ['active', 'hidden', 'all'].includes(params.visibility)
      ? params.visibility
      : (legacyActiveOnly ? 'active' : 'all');

    const filtered = rows.filter(row => {
      if (visibility === 'active' && row.isActive === false) return false;
      if (visibility === 'hidden' && row.isActive !== false) return false;
      if (deptId && row.deptId !== deptId) return false;
      if (lineId && row.lineId !== lineId) return false;
      if (status && row.status !== status) return false;
      if (criticality && row.criticality !== criticality) return false;
      if (machineType && row.machineType !== machineType) return false;
      if (!tokens.length) return true;
      const haystacks = SEARCH_FIELDS.map(key => normalize(row[key]));
      return tokens.every(token => haystacks.some(haystack => haystack.includes(token)));
    });

    filtered.sort((a, b) => {
      if (sortBy === 'lineOrder') {
        const leftOrder = a.lineOrder !== '' && a.lineOrder != null ? Number(a.lineOrder) : 999999;
        const rightOrder = b.lineOrder !== '' && b.lineOrder != null ? Number(b.lineOrder) : 999999;
        if (leftOrder !== rightOrder) {
          return (leftOrder - rightOrder) * sortOrder;
        }
      }
      const left = String(a[sortBy] == null ? '' : a[sortBy]);
      const right = String(b[sortBy] == null ? '' : b[sortBy]);
      const compared = left.localeCompare(right, 'th', {numeric: true, sensitivity: 'base'});
      return compared * sortOrder || String(a.machineId).localeCompare(String(b.machineId), 'th', {numeric: true});
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(totalPages, Math.max(1, Math.floor(Number(params.page) || 1)));
    return {
      items: filtered.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total,
      totalPages,
      allTotal: rows.length
    };
  }

  function safeFileName(machineId, stamp) {
    const id = text(machineId).replace(/[^A-Za-z0-9_-]/g, '_') || 'MACHINE';
    const suffix = text(stamp).replace(/[^0-9]/g, '').slice(0, 17) || Date.now();
    return id + '_' + suffix + '.jpg';
  }

  function departmentsMissingActiveLine(departments, lines) {
    const activeLineDepartments = new Set(
      (lines || []).filter(line => line.isActive !== false).map(line => text(line.deptId))
    );
    return (departments || [])
      .filter(department => department.isActive !== false)
      .map(department => text(department.deptId))
      .filter(deptId => deptId && !activeLineDepartments.has(deptId));
  }

  return {
    STATUSES,
    CRITICALITIES,
    MACHINE_TYPES,
    PAGE_SIZES,
    normalize,
    validate,
    query,
    safeFileName,
    departmentsMissingActiveLine
  };
})();



export {MachineCore};
