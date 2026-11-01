var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/errors.js
var AppError = class extends Error {
  static {
    __name(this, "AppError");
  }
  constructor(code, message, status = 422, fields = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
};
var fail = /* @__PURE__ */ __name((code, message, status = 422, fields = {}) => {
  throw new AppError(code, message, status, fields);
}, "fail");
var conflict = /* @__PURE__ */ __name(() => fail("CONFLICT", "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E16\u0E39\u0E01\u0E41\u0E01\u0E49\u0E44\u0E02\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E42\u0E2B\u0E25\u0E14\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14\u0E01\u0E48\u0E2D\u0E19\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07", 409), "conflict");
function stable(value) {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.keys(value).sort().map((k) => JSON.stringify(k) + ":" + stable(value[k])).join(",") + "}";
  return JSON.stringify(value);
}
__name(stable, "stable");
async function hash(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), (b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hash, "hash");
function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin" } });
}
__name(json, "json");

// src/auth.js
async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    salt: enc.encode(saltHex),
    iterations: 1e5,
    hash: "SHA-256"
  }, keyMaterial, 256);
  const arr = new Uint8Array(derived);
  let hex = "";
  for (let i = 0; i < arr.length; i++) hex += arr[i].toString(16).padStart(2, "0");
  return hex;
}
__name(hashPassword, "hashPassword");
async function authenticateUser(db, username, password) {
  if (!username || typeof username !== "string" || !password || typeof password !== "string") {
    fail("VALIDATION", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E41\u0E25\u0E30\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19", 422);
  }
  const user = await db.prepare("SELECT * FROM app_users WHERE username=? AND is_active=1").bind(username.trim().toLowerCase()).first();
  if (!user) fail("AUTH", "\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07", 401);
  if (user.user_type === "temporary" && user.expires_at) {
    if (Date.now() > new Date(user.expires_at).getTime()) {
      fail("AUTH", "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27\u0E19\u0E35\u0E49\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25", 401);
    }
  }
  const calculatedHash = await hashPassword(password, user.password_salt);
  if (calculatedHash !== user.password_hash) fail("AUTH", "\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07", 401);
  const mustChangePassword = password.length < 5 || Boolean(user.force_password_change);
  let permissions = {};
  try {
    permissions = JSON.parse(user.permissions_json || "{}");
  } catch (_) {
  }
  const defaultPerms = user.role === "admin" ? { machines: "write", parts: "write", bom: "write", announcements: "write", users: "admin", can_delete: true } : user.role === "editor" ? { machines: "write", parts: "write", bom: "write", announcements: "write", users: "none", can_delete: false } : { machines: "read", parts: "read", bom: "read", announcements: "read", users: "none", can_delete: false };
  return {
    ...user,
    permissions: { ...defaultPerms, ...permissions },
    mustChangePassword
  };
}
__name(authenticateUser, "authenticateUser");
async function changePassword(db, userId, newPassword) {
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 5) {
    fail("VALIDATION", "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 5 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23", 422);
  }
  const salt = crypto.randomUUID().replace(/-/g, "");
  const newHash = await hashPassword(newPassword, salt);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db.prepare("UPDATE app_users SET password_hash=?, password_salt=?, force_password_change=0, updated_at=? WHERE id=?").bind(newHash, salt, now, userId).run();
}
__name(changePassword, "changePassword");
async function createSession(db, userId) {
  const rawToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const tokenHash = await hash(rawToken);
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1e3;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db.prepare("INSERT INTO app_sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), userId, tokenHash, expiresAt, now).run();
  return { rawToken, expiresAt };
}
__name(createSession, "createSession");
async function destroySession(db, rawToken) {
  if (!rawToken) return;
  const tokenHash = await hash(rawToken);
  await db.prepare("DELETE FROM app_sessions WHERE token_hash=?").bind(tokenHash).run();
}
__name(destroySession, "destroySession");
async function authenticate(request, env) {
  const url = new URL(request.url);
  if (env.ENVIRONMENT === "local" && env.DEV_AUTH === "local-admin" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    return {
      id: "local-admin",
      username: "admin",
      role: "admin",
      displayName: "Local Admin",
      permissions: { machines: "write", parts: "write", bom: "write", users: "admin", can_delete: true },
      mustChangePassword: false
    };
  }
  if (url.pathname.startsWith("/api/v1/integrations/bom/") && request.method === "GET" && env.BOM_SERVICE_TOKEN) {
    const token2 = request.headers.get("Authorization") || "";
    if (await hash(token2) === await hash("Bearer " + env.BOM_SERVICE_TOKEN)) {
      return {
        id: "bom-service",
        username: "bom-service",
        role: "integration",
        displayName: "BOM Service",
        permissions: { machines: "read", parts: "read", bom: "read", users: "none", can_delete: false },
        mustChangePassword: false
      };
    }
  }
  const cookie = request.headers.get("Cookie") || "";
  const sessionToken = cookie.match(/(?:^|;\s*)em_session=([^;]+)/)?.[1] || request.headers.get("Authorization")?.replace(/^Bearer\s+/, "");
  if (sessionToken) {
    const tokenHash = await hash(sessionToken);
    const session = await env.DB.prepare(
      "SELECT u.id, u.username, u.display_name, u.role, u.user_type, u.expires_at, u.permissions_json, u.force_password_change FROM app_sessions s JOIN app_users u ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at > ? AND u.is_active=1"
    ).bind(tokenHash, Date.now()).first();
    if (session) {
      if (session.user_type === "temporary" && session.expires_at) {
        if (Date.now() > new Date(session.expires_at).getTime()) {
          fail("AUTH", "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27\u0E19\u0E35\u0E49\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25", 401);
        }
      }
      let permissions = {};
      try {
        permissions = JSON.parse(session.permissions_json || "{}");
      } catch (_) {
      }
      const defaultPerms = session.role === "admin" ? { machines: "write", parts: "write", bom: "write", announcements: "write", users: "admin", can_delete: true } : session.role === "editor" ? { machines: "write", parts: "write", bom: "write", announcements: "write", users: "none", can_delete: false } : { machines: "read", parts: "read", bom: "read", announcements: "read", users: "none", can_delete: false };
      return {
        id: session.id,
        username: session.username,
        role: session.role,
        displayName: session.display_name,
        permissions: { ...defaultPerms, ...permissions },
        mustChangePassword: Boolean(session.force_password_change)
      };
    }
  }
  const domain = env.ACCESS_TEAM_DOMAIN;
  if (domain && env.ACCESS_AUD) {
    const cfToken = request.headers.get("Cf-Access-Jwt-Assertion") || cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1];
    if (cfToken) {
      try {
        const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(cfToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(cfToken.split(".")[1].length / 4) * 4, "=")), (c) => c.charCodeAt(0))));
        if (payload && payload.email) {
          const email = payload.email.toLowerCase();
          const record = await env.DB.prepare("SELECT role FROM user_roles WHERE email=?").bind(email).first();
          const role = record?.role || (email === String(env.OWNER_EMAIL || "").toLowerCase() ? "admin" : null);
          if (role) {
            const defaultPerms = role === "admin" ? { machines: "write", parts: "write", bom: "write", announcements: "write", users: "admin", can_delete: true } : { machines: "write", parts: "write", bom: "write", announcements: "write", users: "none", can_delete: false };
            return { id: email, username: email, role, displayName: email, permissions: defaultPerms, mustChangePassword: false };
          }
        }
      } catch (_) {
      }
    }
  }
  fail("AUTH", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E01\u0E48\u0E2D\u0E19\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19", 401);
}
__name(authenticate, "authenticate");
function authorizeWrite(actor, env, scope = "machines") {
  if (actor.role === "admin" || actor.permissions?.users === "admin") {
  } else if (actor.permissions && actor.permissions[scope] !== void 0) {
    if (actor.permissions[scope] !== "write") fail("FORBIDDEN", "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E41\u0E01\u0E49\u0E44\u0E02\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E19\u0E2A\u0E48\u0E27\u0E19\u0E19\u0E35\u0E49", 403);
  } else if (actor.permissions && scope === "pm_expenses" && actor.permissions.pm !== void 0) {
    if (actor.permissions.pm !== "write") fail("FORBIDDEN", "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E41\u0E01\u0E49\u0E44\u0E02\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E19\u0E2A\u0E48\u0E27\u0E19\u0E19\u0E35\u0E49", 403);
  } else if (!["editor", "admin"].includes(actor.role)) {
    fail("FORBIDDEN", "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E41\u0E01\u0E49\u0E44\u0E02\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25", 403);
  }
  if (env.MAINTENANCE_MODE !== "false") fail("MAINTENANCE", "\u0E23\u0E30\u0E1A\u0E1A\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E20\u0E32\u0E22\u0E2B\u0E25\u0E31\u0E07", 503);
}
__name(authorizeWrite, "authorizeWrite");
function authorizeDelete(actor, env, scope = "machines") {
  authorizeWrite(actor, env, scope);
  if (actor.role !== "admin" && actor.permissions && !actor.permissions.can_delete) {
    fail("FORBIDDEN", "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E43\u0E19\u0E01\u0E32\u0E23\u0E25\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25", 403);
  }
}
__name(authorizeDelete, "authorizeDelete");

// src/generated/machine-core.js
var MachineCore = (() => {
  const SEARCH_FIELDS = [
    "machineId",
    "machineCode",
    "machineName",
    "manufacturer",
    "model",
    "serialNo",
    "machineType",
    "locationDetail",
    "departmentName",
    "lineName"
  ];
  const SORT_FIELDS = [...SEARCH_FIELDS, "status", "criticality", "installDate", "updatedAt", "lineOrder"];
  const STATUSES = ["\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19", "\u0E2B\u0E22\u0E38\u0E14", "\u0E0B\u0E48\u0E2D\u0E21", "\u0E2A\u0E33\u0E23\u0E2D\u0E07", "\u0E1B\u0E25\u0E14\u0E23\u0E30\u0E27\u0E32\u0E07"];
  const CRITICALITIES = ["\u0E2A\u0E39\u0E07", "\u0E01\u0E25\u0E32\u0E07", "\u0E15\u0E48\u0E33"];
  const MACHINE_TYPES = ["Press", "Printing", "Packing", "\u0E2D\u0E37\u0E48\u0E19\u0E46"];
  const PAGE_SIZES = [25, 50, 100];
  const text = /* @__PURE__ */ __name((value) => String(value == null ? "" : value).trim(), "text");
  const normalize = /* @__PURE__ */ __name((value) => text(value).normalize("NFKC").replace(/\s+/g, " ").toLocaleLowerCase("th-TH"), "normalize");
  function validate(input, allowedTypes = MACHINE_TYPES) {
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
      manualUrl: 1e3,
      remark: 4e3
    };
    Object.entries(limits).forEach(([key, max]) => {
      value[key] = text(input[key]);
      if (value[key].length > max) errors[key] = "\u0E01\u0E23\u0E2D\u0E01\u0E44\u0E14\u0E49\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 " + max + " \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23";
    });
    value.deptId = text(input.deptId);
    value.lineId = text(input.lineId);
    const rawOrder = text(input.lineOrder);
    if (rawOrder) {
      const num = Number(rawOrder);
      if (isNaN(num) || !Number.isInteger(num) || num < 1 || num > 9999) {
        errors.lineOrder = "\u0E23\u0E30\u0E1A\u0E38\u0E25\u0E33\u0E14\u0E31\u0E1A\u0E40\u0E1B\u0E47\u0E19\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E15\u0E47\u0E21\u0E1A\u0E27\u0E01 1\u20139999";
      } else {
        value.lineOrder = num;
      }
    } else {
      value.lineOrder = "";
    }
    value.installDate = text(input.installDate);
    value.criticality = text(input.criticality);
    value.status = text(input.status);
    value.isActive = input.isActive !== false && String(input.isActive).toLowerCase() !== "false";
    if (!value.machineCode) errors.machineCode = "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E23\u0E2B\u0E31\u0E2A\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23";
    if (!value.machineName) errors.machineName = "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23";
    if (!value.deptId) errors.deptId = "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E41\u0E1C\u0E19\u0E01";
    if (!value.lineId) errors.lineId = "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E44\u0E25\u0E19\u0E4C\u0E1C\u0E25\u0E34\u0E15";
    if (!CRITICALITIES.includes(value.criticality)) errors.criticality = "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E33\u0E04\u0E31\u0E0D";
    if (!STATUSES.includes(value.status)) errors.status = "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E2A\u0E16\u0E32\u0E19\u0E30";
    if (value.machineType && !allowedTypes.includes(value.machineType)) {
      errors.machineType = "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E32\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23";
    }
    if (value.installDate && !isValidDateOnly(value.installDate)) {
      errors.installDate = "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E15\u0E34\u0E14\u0E15\u0E31\u0E49\u0E07\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07";
    }
    if (value.manualUrl) {
      try {
        const parsed = new URL(value.manualUrl);
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("protocol");
      } catch (_) {
        errors.manualUrl = "\u0E01\u0E23\u0E2D\u0E01\u0E25\u0E34\u0E07\u0E01\u0E4C\u0E17\u0E35\u0E48\u0E02\u0E36\u0E49\u0E19\u0E15\u0E49\u0E19\u0E14\u0E49\u0E27\u0E22 http:// \u0E2B\u0E23\u0E37\u0E2D https://";
      }
    }
    return { value, errors };
  }
  __name(validate, "validate");
  function isValidDateOnly(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text(value));
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }
  __name(isValidDateOnly, "isValidDateOnly");
  function query(rows, params) {
    params = params || {};
    const rawQuery = text(params.query);
    const tokens = [...new Set(normalize(rawQuery).split(" ").filter(Boolean))];
    if (rawQuery.length > 300 || tokens.length > 20) {
      throw new Error("\u0E04\u0E33\u0E04\u0E49\u0E19\u0E22\u0E32\u0E27\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B \u0E01\u0E23\u0E38\u0E13\u0E32\u0E43\u0E0A\u0E49\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 20 \u0E04\u0E33 / 300 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23");
    }
    const sortBy = SORT_FIELDS.includes(params.sortBy) ? params.sortBy : "machineCode";
    const sortOrder = params.sortOrder === "desc" ? -1 : 1;
    const pageSize = PAGE_SIZES.includes(Number(params.pageSize)) ? Number(params.pageSize) : 25;
    const deptId = text(params.deptId);
    const lineId = text(params.lineId);
    const status = text(params.status);
    const criticality = text(params.criticality);
    const machineType = text(params.machineType);
    const legacyActiveOnly = params.activeOnly !== false && String(params.activeOnly).toLowerCase() !== "false";
    const visibility = ["active", "hidden", "all"].includes(params.visibility) ? params.visibility : legacyActiveOnly ? "active" : "all";
    const filtered = rows.filter((row) => {
      if (visibility === "active" && row.isActive === false) return false;
      if (visibility === "hidden" && row.isActive !== false) return false;
      if (deptId && row.deptId !== deptId) return false;
      if (lineId && row.lineId !== lineId) return false;
      if (status && row.status !== status) return false;
      if (criticality && row.criticality !== criticality) return false;
      if (machineType && row.machineType !== machineType) return false;
      if (!tokens.length) return true;
      const haystacks = SEARCH_FIELDS.map((key) => normalize(row[key]));
      return tokens.every((token2) => haystacks.some((haystack) => haystack.includes(token2)));
    });
    filtered.sort((a, b) => {
      if (sortBy === "lineOrder") {
        const leftOrder = a.lineOrder !== "" && a.lineOrder != null ? Number(a.lineOrder) : 999999;
        const rightOrder = b.lineOrder !== "" && b.lineOrder != null ? Number(b.lineOrder) : 999999;
        if (leftOrder !== rightOrder) {
          return (leftOrder - rightOrder) * sortOrder;
        }
      }
      const left = String(a[sortBy] == null ? "" : a[sortBy]);
      const right = String(b[sortBy] == null ? "" : b[sortBy]);
      const compared = left.localeCompare(right, "th", { numeric: true, sensitivity: "base" });
      return compared * sortOrder || String(a.machineId).localeCompare(String(b.machineId), "th", { numeric: true });
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
  __name(query, "query");
  function safeFileName(machineId, stamp) {
    const id = text(machineId).replace(/[^A-Za-z0-9_-]/g, "_") || "MACHINE";
    const suffix = text(stamp).replace(/[^0-9]/g, "").slice(0, 17) || Date.now();
    return id + "_" + suffix + ".jpg";
  }
  __name(safeFileName, "safeFileName");
  function departmentsMissingActiveLine(departments, lines) {
    const activeLineDepartments = new Set(
      (lines || []).filter((line) => line.isActive !== false).map((line) => text(line.deptId))
    );
    return (departments || []).filter((department) => department.isActive !== false).map((department) => text(department.deptId)).filter((deptId) => deptId && !activeLineDepartments.has(deptId));
  }
  __name(departmentsMissingActiveLine, "departmentsMissingActiveLine");
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

// src/generated/part-core.js
var PartCore = /* @__PURE__ */ (() => {
  const fields = ["id", "partNumber", "description", "brand", "storeCode", "notes"];
  const normalize = /* @__PURE__ */ __name((value) => String(value == null ? "" : value).normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("th-TH"), "normalize");
  function validate(input) {
    const errors = {};
    const value = {};
    for (const [key, max] of Object.entries({ partNumber: 160, description: 2e3, storeCode: 160, notes: 4e3 })) {
      value[key] = String(input[key] == null ? "" : input[key]).trim();
      if (value[key].length > max) errors[key] = "\u0E01\u0E23\u0E2D\u0E01\u0E44\u0E14\u0E49\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 " + max + " \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23";
    }
    if (!value.partNumber) errors.partNumber = "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01 Part number";
    if (!value.description) errors.description = "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01 Description";
    const raw = input.price == null ? "" : String(input.price).replace(/,/g, "").trim();
    value.price = raw === "" ? null : Number(raw);
    if (raw && (!/^\d+(\.\d{1,2})?$/.test(raw) || !Number.isFinite(value.price) || value.price > 999999999999)) errors.price = "\u0E01\u0E23\u0E2D\u0E01\u0E23\u0E32\u0E04\u0E32 0 \u0E02\u0E36\u0E49\u0E19\u0E44\u0E1B \u0E17\u0E28\u0E19\u0E34\u0E22\u0E21\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 2 \u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07";
    const rawLifespan = input.lifespan == null ? "" : String(input.lifespan).replace(/,/g, "").replace(/ปี/g, "").trim();
    value.lifespan = rawLifespan === "" ? null : Number(rawLifespan);
    if (rawLifespan && (!/^\d+(\.\d{1,2})?$/.test(rawLifespan) || !Number.isFinite(value.lifespan) || value.lifespan < 0 || value.lifespan > 999)) errors.lifespan = "\u0E01\u0E23\u0E2D\u0E01\u0E2D\u0E32\u0E22\u0E38\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E40\u0E1B\u0E47\u0E19\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02\u0E1B\u0E35 0 \u0E02\u0E36\u0E49\u0E19\u0E44\u0E1B (\u0E40\u0E0A\u0E48\u0E19 1, 2, 5 \u0E2B\u0E23\u0E37\u0E2D 0.5)";
    value.brandId = input.brandId || null;
    return { value, errors };
  }
  __name(validate, "validate");
  function query(rows, params) {
    const tokens = [...new Set(normalize(params.query).split(" ").filter(Boolean))];
    if (tokens.length > 20 || String(params.query || "").length > 300) throw new Error("\u0E04\u0E33\u0E04\u0E49\u0E19\u0E22\u0E32\u0E27\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B \u0E01\u0E23\u0E38\u0E13\u0E32\u0E43\u0E0A\u0E49\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 20 \u0E04\u0E33 / 300 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23");
    const sortBy = [...fields, "price", "lifespan"].includes(params.sortBy) ? params.sortBy : "id";
    const direction = params.sortOrder === "asc" ? 1 : -1;
    const size = [25, 50, 100].includes(Number(params.pageSize)) ? Number(params.pageSize) : 50;
    const filtered = rows.filter((row) => {
      if (!tokens.length) return true;
      const haystacks = [...fields.map((key) => normalize(row[key])), row.lifespan != null ? String(row.lifespan) + " " + String(row.lifespan) + "\u0E1B\u0E35" : ""];
      return tokens.every((token2) => haystacks.some((text) => text.includes(token2)));
    });
    filtered.sort((a, b) => {
      if (sortBy === "price" || sortBy === "lifespan") {
        if (a[sortBy] == null && b[sortBy] != null) return 1;
        if (b[sortBy] == null && a[sortBy] != null) return -1;
        const cmp2 = (a[sortBy] || 0) - (b[sortBy] || 0);
        return cmp2 * direction || a.id.localeCompare(b.id);
      }
      const cmp = String(a[sortBy] || "").localeCompare(String(b[sortBy] || ""), "th", { numeric: true });
      return cmp * direction || a.id.localeCompare(b.id);
    });
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / size));
    const page = Math.min(totalPages, Math.max(1, Math.floor(Number(params.page) || 1)));
    return { items: filtered.slice((page - 1) * size, page * size), page, pageSize: size, total, totalPages, allTotal: rows.length };
  }
  __name(query, "query");
  return { normalize, validate, query };
})();

// src/generated/bom-core.js
var BomCore = (() => {
  "use strict";
  const headers = ["RecordID", "EquipmentID", "MachineID", "PartID", "Label", "Quantity", "InstalledAt", "DueMode", "ManualExpiryDate", "Notes", "RecordStatus", "EndedAt", "PreviousRecordID", "CreatedAt", "UpdatedAt", "Version", "OperationID"];
  const opHeaders = ["OperationID", "Fingerprint", "MachineID", "Status", "Plan", "Result", "CreatedAt", "SessionRef"];
  const text = /* @__PURE__ */ __name((value) => value == null ? "" : String(value), "text");
  const normalized = /* @__PURE__ */ __name((value) => text(value).normalize("NFKC").trim().toLocaleLowerCase("en-US"), "normalized");
  function fail2(message, code = "VALIDATION", fields = {}) {
    const e = new Error(message);
    e.code = code;
    e.fields = fields;
    throw e;
  }
  __name(fail2, "fail");
  function date(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text(value))) return null;
    const d = /* @__PURE__ */ new Date(value + "T00:00:00Z");
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value && +value.slice(0, 4) >= 1900 ? d : null;
  }
  __name(date, "date");
  function today(now = /* @__PURE__ */ new Date()) {
    return new Date(now.getTime() + 7 * 36e5).toISOString().slice(0, 10);
  }
  __name(today, "today");
  function days(a, b) {
    return Math.round((date(b) - date(a)) / 864e5);
  }
  __name(days, "days");
  function addMonths(value, months) {
    const d = date(value);
    if (!d || !Number.isInteger(months) || months < 0 || months > 12e3) return "";
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months + 1, 0));
    return new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), Math.min(d.getUTCDate(), last.getUTCDate()))).toISOString().slice(0, 10);
  }
  __name(addMonths, "addMonths");
  function lifeMonths(part) {
    if (!part) return null;
    let raw = part["\u0E2D\u0E32\u0E22\u0E38\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C (\u0E1B\u0E35)"] ?? part["\u0E2D\u0E32\u0E22\u0E38\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C"] ?? part["Lifespan"] ?? part["lifespan"];
    if (typeof raw === "string") {
      const clean = raw.trim().replace(/,/g, "");
      const match = clean.match(/^(\d+(?:\.\d+)?)/);
      if (match) raw = match[1];
    }
    const years = Number(raw);
    const months = years * 12;
    return years > 0 && months <= 12e3 && Math.abs(Math.round(months) - months) < 1e-8 ? Math.round(months) : null;
  }
  __name(lifeMonths, "lifeMonths");
  function elapsed(start, end) {
    if (!date(start) || !date(end) || end < start) return "\u0E44\u0E21\u0E48\u0E17\u0E23\u0E32\u0E1A\u0E2D\u0E32\u0E22\u0E38";
    const a = date(start), b = date(end);
    let m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
    if (addMonths(start, m) > end) m--;
    return `${Math.floor(m / 12)} \u0E1B\u0E35 ${m % 12} \u0E40\u0E14\u0E37\u0E2D\u0E19 ${days(addMonths(start, m), end)} \u0E27\u0E31\u0E19`;
  }
  __name(elapsed, "elapsed");
  function age(row, part, on = today()) {
    const end = row.RecordStatus === "ACTIVE" ? on : row.EndedAt;
    const months = lifeMonths(part);
    const dueDate = row.DueMode === "MANUAL" ? date(row.ManualExpiryDate) ? row.ManualExpiryDate : "" : months && date(row.InstalledAt) ? addMonths(row.InstalledAt, months) : "";
    const remainingDays = dueDate ? days(on, dueDate) : null;
    const ageDays = date(row.InstalledAt) && date(end) ? days(row.InstalledAt, end) : null;
    let status = "unknown", label = "\u0E22\u0E31\u0E07\u0E23\u0E30\u0E1A\u0E38\u0E27\u0E31\u0E19\u0E04\u0E23\u0E1A\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49";
    if (remainingDays !== null) {
      status = remainingDays < 0 ? "overdue" : remainingDays === 0 ? "today" : remainingDays <= 30 ? "soon" : "normal";
      label = remainingDays < 0 ? `\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14 ${-remainingDays} \u0E27\u0E31\u0E19` : remainingDays === 0 ? "\u0E04\u0E23\u0E1A\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49" : `\u0E40\u0E2B\u0E25\u0E37\u0E2D ${remainingDays} \u0E27\u0E31\u0E19`;
    }
    return { dueDate, remainingDays, ageDays, status, label, ageText: elapsed(row.InstalledAt, end), lifeText: months ? `\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E17\u0E38\u0E01 ${months / 12} \u0E1B\u0E35` : "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E23\u0E2D\u0E1A\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19", basis: row.DueMode === "MANUAL" ? "\u0E27\u0E31\u0E19\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E40\u0E2D\u0E07" : "\u0E40\u0E01\u0E13\u0E11\u0E4C Part list \u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19" };
  }
  __name(age, "age");
  function validate(input, on = today()) {
    const row = { PartID: text(input.PartID).trim(), Label: text(input.Label).trim(), Quantity: Number(input.Quantity), InstalledAt: text(input.InstalledAt), DueMode: input.DueMode, ManualExpiryDate: text(input.ManualExpiryDate), Notes: text(input.Notes) };
    const fields = {};
    if (!row.PartID) fields.PartID = "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E08\u0E32\u0E01 Part list";
    if (row.Label && row.Label.length > 100) fields.Label = "\u0E01\u0E23\u0E2D\u0E01 Label \u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 100 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23";
    if (!Number.isSafeInteger(row.Quantity) || row.Quantity <= 0 || row.Quantity > 1e5) fields.Quantity = "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E15\u0E47\u0E21 1\u2013100,000";
    if (row.InstalledAt && (!date(row.InstalledAt) || row.InstalledAt > on)) fields.InstalledAt = "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E27\u0E31\u0E19\u0E15\u0E34\u0E14\u0E15\u0E31\u0E49\u0E07\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E41\u0E25\u0E30\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49";
    if (!["PART_LIFE", "MANUAL"].includes(row.DueMode)) fields.DueMode = "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E27\u0E34\u0E18\u0E35\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E27\u0E31\u0E19\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38";
    if (row.DueMode === "MANUAL" && (!date(row.ManualExpiryDate) || row.InstalledAt && row.ManualExpiryDate < row.InstalledAt)) fields.ManualExpiryDate = "\u0E23\u0E30\u0E1A\u0E38\u0E27\u0E31\u0E19\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E01\u0E48\u0E2D\u0E19\u0E27\u0E31\u0E19\u0E15\u0E34\u0E14\u0E15\u0E31\u0E49\u0E07";
    if (row.DueMode === "PART_LIFE") row.ManualExpiryDate = "";
    if (row.Notes.length > 2e3) fields.Notes = "\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38\u0E15\u0E49\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 2,000 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23";
    if (Object.keys(fields).length) fail2("\u0E15\u0E23\u0E27\u0E08\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E01\u0E23\u0E2D\u0E01", "VALIDATION", fields);
    return row;
  }
  __name(validate, "validate");
  function uniqueLabels(rows) {
    const seen = /* @__PURE__ */ new Set();
    rows.forEach((r) => {
      const key = normalized(r.Label);
      if (!key) return;
      if (seen.has(key)) fail2("Label \u0E0B\u0E49\u0E33\u0E43\u0E19\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23: " + r.Label, "VALIDATION", { Label: "\u0E43\u0E0A\u0E49 Label \u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E0B\u0E49\u0E33" });
      seen.add(key);
    });
  }
  __name(uniqueLabels, "uniqueLabels");
  function stable2(value) {
    if (Array.isArray(value)) return "[" + value.map(stable2).join(",") + "]";
    if (value && typeof value === "object") return "{" + Object.keys(value).sort().map((k) => JSON.stringify(k) + ":" + stable2(value[k])).join(",") + "}";
    return JSON.stringify(value);
  }
  __name(stable2, "stable");
  function imageUrl(value) {
    const raw = text(value).trim();
    if (!/^https:\/\//i.test(raw)) return "";
    if (!/^https:\/\/(?:www\.)?drive\.google\.com\//i.test(raw)) return raw;
    const path = raw.match(/\/file\/d\/([A-Za-z0-9_-]+)/i);
    const query = raw.match(/[?&]id=([A-Za-z0-9_-]+)/i);
    const id = (path || query || [])[1];
    return id ? "https://drive.google.com/thumbnail?id=" + encodeURIComponent(id) + "&sz=w800" : "";
  }
  __name(imageUrl, "imageUrl");
  function page(items, query = {}) {
    const isAll = query.pageSize === "all" || query.pageSize === "ALL" || +query.pageSize === 0 || +query.pageSize >= 999999;
    const count = items.length;
    if (isAll) {
      return { items: items.slice(), total: count, page: 1, pageSize: "all" };
    }
    const size = [10, 25, 50, 100].includes(+query.pageSize) ? +query.pageSize : 25;
    const current = Math.max(1, Math.min(Math.ceil(count / size) || 1, Math.floor(+query.page) || 1));
    return { items: items.slice((current - 1) * size, current * size), total: count, page: current, pageSize: size };
  }
  __name(page, "page");
  return { headers, opHeaders, text, normalized, fail: fail2, date, today, days, addMonths, lifeMonths, age, validate, uniqueLabels, stable: stable2, imageUrl, page };
})();

// src/generated/bom-service.js
var BomService = (() => {
  "use strict";
  const C = typeof BomCore !== "undefined" ? BomCore : BomCore;
  class Service {
    static {
      __name(this, "Service");
    }
    constructor(repo, clock, uuid) {
      this.repo = repo;
      this.clock = clock;
      this.uuid = uuid;
    }
    context(machineId, write = false) {
      const ref = this.repo.references();
      const machine = ref.machines.find((m) => m.MachineID === machineId);
      if (!machine) C.fail("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23\u0E43\u0E19\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E01\u0E25\u0E32\u0E07", "NOT_FOUND");
      const line = ref.lines.find((l) => l.LineID === machine.LineID && l.DeptID === machine.DeptID);
      const dept = ref.departments.find((d) => d.DeptID === machine.DeptID);
      if (!line || !dept) C.fail("\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E31\u0E21\u0E1E\u0E31\u0E19\u0E18\u0E4C\u0E41\u0E1C\u0E19\u0E01\u0E41\u0E25\u0E30\u0E44\u0E25\u0E19\u0E4C\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E01\u0E25\u0E32\u0E07", "SCHEMA");
      const editable = machine.IsActive && line.IsActive && dept.IsActive && machine.Status !== "\u0E1B\u0E25\u0E14\u0E23\u0E30\u0E27\u0E32\u0E07";
      if (write && !editable) C.fail("\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23\u0E19\u0E35\u0E49\u0E14\u0E39\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E44\u0E14\u0E49 \u0E41\u0E15\u0E48\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E2B\u0E23\u0E37\u0E2D\u0E41\u0E01\u0E49\u0E44\u0E02\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49", "FORBIDDEN");
      return { machine, line, dept, editable, location: this.repo.location(machine, write) };
    }
    references(query) {
      return this.repo.references(Boolean(query && (query.refresh || query.refreshParts || query.refreshReferences)));
    }
    searchParts(query) {
      const parts = this.repo.parts(Boolean(query && query.refreshParts));
      if (query && query.all) return { items: parts, total: parts.length };
      const words = C.normalized(query.query).split(/\s+/).filter(Boolean);
      return C.page(parts.filter((p) => words.every((w) => C.normalized([p.ID, p["Part number"], p.Description, p.Brand].join(" ")).includes(w))), query);
    }
    lineMachineStats(query) {
      const ref = this.repo.references();
      const dept = ref.departments.find((d) => d.DeptID === C.text(query && query.deptId));
      const line = ref.lines.find((l) => l.LineID === C.text(query && query.lineId) && dept && l.DeptID === dept.DeptID);
      if (!dept || !line) C.fail("\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E31\u0E21\u0E1E\u0E31\u0E19\u0E18\u0E4C\u0E41\u0E1C\u0E19\u0E01\u0E41\u0E25\u0E30\u0E44\u0E25\u0E19\u0E4C\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E01\u0E25\u0E32\u0E07", "SCHEMA");
      const machines = ref.machines.filter((m) => m.DeptID === dept.DeptID && m.LineID === line.LineID);
      const location = this.repo.lineLocation(dept, line), asOfDate = C.today(this.clock());
      this.repo.assertReady(location);
      const load = /* @__PURE__ */ __name(() => {
        const parts = new Map(this.repo.parts().map((p) => [p.ID, p]));
        const stats = {};
        machines.forEach((machine) => {
          stats[machine.MachineID] = { partTypes: 0, totalPieces: 0, attentionLabels: 0 };
        });
        const partIds = new Map(machines.map((machine) => [machine.MachineID, /* @__PURE__ */ new Set()]));
        this.repo.records(location).filter((row) => row.RecordStatus === "ACTIVE" && stats[row.MachineID]).forEach((row) => {
          if (C.text(row.PartID)) partIds.get(row.MachineID).add(row.PartID);
          stats[row.MachineID].totalPieces += Number(row.Quantity) || 0;
          const age = C.age(row, parts.get(row.PartID), asOfDate);
          if (["overdue", "today", "soon"].includes(age.status)) stats[row.MachineID].attentionLabels++;
        });
        partIds.forEach((ids, machineId) => {
          stats[machineId].partTypes = ids.size;
        });
        return { deptId: dept.DeptID, lineId: line.LineID, asOfDate, machines: stats };
      }, "load");
      return this.repo.lineStats ? this.repo.lineStats(location, asOfDate, load) : load();
    }
    list(query) {
      const ctx = this.context(query.machineId);
      this.repo.assertReady(ctx.location);
      const parts = new Map(this.repo.parts(Boolean(query && query.refreshParts)).map((p) => [p.ID, p]));
      const records = this.repo.records(ctx.location).filter((r) => r.MachineID === query.machineId);
      const allRows = records.map((row) => ({ ...row, part: parts.get(row.PartID) || null, age: C.age(row, parts.get(row.PartID), C.today(this.clock())) }));
      const rows = allRows.filter((r) => query.history || r.RecordStatus === "ACTIVE");
      const current = allRows.filter((r) => r.RecordStatus === "ACTIVE");
      const totals = { parts: new Set(current.map((r) => r.PartID)).size, labels: current.length, quantity: current.reduce((s, r) => s + Number(r.Quantity), 0), attention: current.filter((r) => ["overdue", "today", "soon"].includes(r.age.status)).length };
      const words = C.normalized(query.query).split(/\s+/).filter(Boolean);
      const filtered = rows.filter((r) => (!query.status || r.age.status === query.status) && words.every((w) => C.normalized([r.Label, r.PartID, r.part && r.part["Part number"], r.part && r.part.Description, r.part && r.part.Brand, r.Notes].join(" ")).includes(w)));
      const groups = /* @__PURE__ */ new Map();
      filtered.forEach((r) => {
        if (!groups.has(r.PartID)) groups.set(r.PartID, { PartID: r.PartID, part: r.part, quantity: 0, labels: [] });
        const g = groups.get(r.PartID);
        g.quantity += r.Quantity;
        g.labels.push(r);
      });
      const ordered = [...groups.values()].sort((a, b) => a.PartID.localeCompare(b.PartID, "th", { numeric: true }));
      ordered.forEach((g) => g.labels.sort((a, b) => a.Label.localeCompare(b.Label, "th", { numeric: true })));
      return { ...C.page(ordered, query), totals, machine: ctx.machine, line: ctx.line, department: ctx.dept, editable: ctx.editable, asOf: C.today(this.clock()), filtered: !!(query.query || query.status), rawRows: allRows };
    }
    history(query) {
      const ctx = this.context(query.machineId);
      this.repo.assertReady(ctx.location);
      const rows = this.repo.records(ctx.location).filter((r) => r.MachineID === query.machineId && r.EquipmentID === query.equipmentId);
      const parts = new Map(this.repo.parts().map((p) => [p.ID, p]));
      return { records: C.page(rows.sort((a, b) => b.CreatedAt.localeCompare(a.CreatedAt)).map((r) => ({ ...r, part: parts.get(r.PartID) || null, age: C.age(r, parts.get(r.PartID), C.today(this.clock())) })), query), events: C.page(this.repo.events(ctx.location, query.machineId, query.equipmentId), query) };
    }
    mutate(kind, payload, sessionRef) {
      if (!/^[A-Za-z0-9-]{16,80}$/.test(C.text(payload.operationId))) C.fail("\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E2B\u0E31\u0E2A\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
      const ctx = this.context(payload.machineId, true);
      const fingerprint = C.stable({ kind, payload });
      const prior = this.repo.operation(ctx.location, payload.operationId);
      if (prior) {
        if (prior.Fingerprint !== fingerprint) C.fail("\u0E23\u0E2B\u0E31\u0E2A\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E19\u0E35\u0E49\u0E43\u0E0A\u0E49\u0E01\u0E31\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2D\u0E37\u0E48\u0E19\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E1C\u0E25\u0E40\u0E14\u0E34\u0E21\u0E01\u0E48\u0E2D\u0E19", "CONFLICT");
        return this.repo.replay(ctx.location, prior);
      }
      this.repo.assertReady(ctx.location, true);
      const records = this.repo.records(ctx.location);
      const active = records.filter((r) => r.MachineID === payload.machineId && r.RecordStatus === "ACTIVE");
      const parts = new Map(this.repo.parts().map((p) => [p.ID, p]));
      const now = this.clock().toISOString(), on = C.today(this.clock());
      const changes = [], additions = [];
      const validate = /* @__PURE__ */ __name((value, existingPart) => {
        const valid = C.validate(value, on);
        if (!parts.has(valid.PartID) && valid.PartID !== existingPart) C.fail("\u0E44\u0E21\u0E48\u0E1E\u0E1A Part \u0E17\u0E35\u0E48\u0E40\u0E25\u0E37\u0E2D\u0E01 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E43\u0E2B\u0E21\u0E48", "VALIDATION", { PartID: "\u0E44\u0E21\u0E48\u0E1E\u0E1A Part" });
        return valid;
      }, "validate");
      const newRecord = /* @__PURE__ */ __name((values, equipmentId, previous = "") => ({ ...values, RecordID: this.uuid(), EquipmentID: equipmentId || this.uuid(), MachineID: payload.machineId, RecordStatus: "ACTIVE", EndedAt: "", PreviousRecordID: previous, CreatedAt: now, UpdatedAt: now, Version: 1, OperationID: payload.operationId }), "newRecord");
      const target = /* @__PURE__ */ __name((item) => {
        const row = active.find((r) => r.RecordID === item.recordId);
        if (!row || row.Version !== item.expectedVersion) C.fail("\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E42\u0E2B\u0E25\u0E14\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14\u0E01\u0E48\u0E2D\u0E19\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01", "CONFLICT");
        return row;
      }, "target");
      if (kind === "add") {
        if (!Array.isArray(payload.labels) || !payload.labels.length || payload.labels.length > 50) C.fail("\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E44\u0E14\u0E49\u0E04\u0E23\u0E31\u0E49\u0E07\u0E25\u0E30 1\u201350 \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23");
        payload.labels.forEach((v) => additions.push(newRecord(validate(v))));
      } else if (kind === "edit") {
        const editItems = Array.isArray(payload.items) ? payload.items : [{ recordId: payload.recordId, expectedVersion: payload.expectedVersion, values: payload.values }];
        if (!editItems.length || editItems.length > 50) C.fail("\u0E41\u0E01\u0E49\u0E44\u0E02\u0E44\u0E14\u0E49\u0E04\u0E23\u0E31\u0E49\u0E07\u0E25\u0E30 1\u201350 \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23");
        if (new Set(editItems.map((t) => t.recordId)).size !== editItems.length) C.fail("\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E41\u0E01\u0E49\u0E44\u0E02\u0E0B\u0E49\u0E33");
        editItems.forEach((item) => {
          const row = target(item);
          const values = validate({ ...item.values, PartID: item.values?.PartID || row.PartID }, row.PartID);
          changes.push({ before: row, after: { ...row, ...values, Version: row.Version + 1, UpdatedAt: now, OperationID: payload.operationId } });
        });
      } else if (kind === "split") {
        if (!payload.isAdmin && !C.text(payload.reason).trim()) C.fail("\u0E01\u0E23\u0E2D\u0E01\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E41\u0E22\u0E01\u0E08\u0E33\u0E19\u0E27\u0E19", "VALIDATION", { reason: "\u0E23\u0E30\u0E1A\u0E38\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25\u0E17\u0E35\u0E48\u0E41\u0E22\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23" });
        const row = target(payload);
        if (!Number.isSafeInteger(row.Quantity) || row.Quantity < 2 || row.Quantity > 50) C.fail("\u0E41\u0E22\u0E01\u0E44\u0E14\u0E49\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E21\u0E35\u0E08\u0E33\u0E19\u0E27\u0E19 2\u201350 \u0E0A\u0E34\u0E49\u0E19", "VALIDATION");
        if (!Array.isArray(payload.labels) || payload.labels.length !== row.Quantity) C.fail("\u0E01\u0E23\u0E2D\u0E01 Label \u0E43\u0E2B\u0E49\u0E04\u0E23\u0E1A " + row.Quantity + " \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23", "VALIDATION", { SplitLabel: "\u0E01\u0E23\u0E2D\u0E01 Label \u0E43\u0E2B\u0E49\u0E04\u0E23\u0E1A\u0E15\u0E32\u0E21\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E14\u0E34\u0E21" });
        const values = payload.values || {};
        const splitRows = payload.labels.map((label, index) => {
          const clean = C.text(label).trim();
          if (!clean) C.fail("\u0E01\u0E23\u0E2D\u0E01 Label \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48 " + (index + 1), "VALIDATION", { ["SplitLabel-" + index]: "\u0E01\u0E23\u0E2D\u0E01 Label" });
          return validate({ ...row, ...values, PartID: row.PartID, Label: clean, Quantity: 1 }, row.PartID);
        });
        const first = splitRows.shift();
        changes.push({ before: row, after: { ...row, ...first, Version: row.Version + 1, UpdatedAt: now, OperationID: payload.operationId } });
        splitRows.forEach((value) => additions.push(newRecord(value)));
      } else if (kind === "replace") {
        if (!Array.isArray(payload.targets) || !payload.targets.length || payload.targets.length > 50) C.fail("\u0E40\u0E25\u0E37\u0E2D\u0E01 1\u201350 \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E15\u0E48\u0E2D\u0E04\u0E23\u0E31\u0E49\u0E07");
        if (new Set(payload.targets.map((t) => t.recordId)).size !== payload.targets.length) C.fail("\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E0B\u0E49\u0E33");
        if (!C.date(payload.installedAt)) C.fail("\u0E23\u0E30\u0E1A\u0E38\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C", "VALIDATION", { InstalledAt: "\u0E23\u0E30\u0E1A\u0E38\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19" });
        payload.targets.forEach((t) => {
          const row = target(t);
          if (row.InstalledAt && payload.installedAt < row.InstalledAt) C.fail("\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E01\u0E48\u0E2D\u0E19\u0E27\u0E31\u0E19\u0E15\u0E34\u0E14\u0E15\u0E31\u0E49\u0E07\u0E40\u0E14\u0E34\u0E21", "VALIDATION", { InstalledAt: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E01\u0E48\u0E2D\u0E19\u0E23\u0E2D\u0E1A\u0E40\u0E14\u0E34\u0E21" });
          const values = validate({ ...row, PartID: t.partId || row.PartID, InstalledAt: payload.installedAt, DueMode: payload.dueMode, ManualExpiryDate: payload.manualExpiryDate || "", Notes: payload.notes === void 0 ? row.Notes : payload.notes });
          changes.push({ before: row, after: { ...row, RecordStatus: "REPLACED", EndedAt: payload.installedAt, UpdatedAt: now, Version: row.Version + 1, OperationID: payload.operationId } });
          additions.push(newRecord(values, row.EquipmentID, row.RecordID));
        });
      } else if (kind === "remove") {
        if (!C.date(payload.endedAt) || payload.endedAt > on) C.fail("\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E16\u0E2D\u0E14\u0E15\u0E49\u0E2D\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E27\u0E31\u0E19\u0E15\u0E34\u0E14\u0E15\u0E31\u0E49\u0E07\u0E41\u0E25\u0E30\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49", "VALIDATION", { endedAt: "\u0E15\u0E23\u0E27\u0E08\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E16\u0E2D\u0E14\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C" });
        if (!payload.isAdmin && !C.text(payload.reason).trim()) C.fail("\u0E01\u0E23\u0E2D\u0E01\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E16\u0E2D\u0E14", "VALIDATION", { reason: "\u0E23\u0E30\u0E1A\u0E38\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E16\u0E2D\u0E14" });
        const targets = Array.isArray(payload.targets) ? payload.targets : [{ recordId: payload.recordId, expectedVersion: payload.expectedVersion, quantity: payload.quantity }];
        if (!targets.length || targets.length > 50) C.fail("\u0E40\u0E25\u0E37\u0E2D\u0E01 1\u201350 \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E15\u0E48\u0E2D\u0E04\u0E23\u0E31\u0E49\u0E07");
        if (new Set(targets.map((t) => t.recordId)).size !== targets.length) C.fail("\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E0B\u0E49\u0E33");
        targets.forEach((t) => {
          const row = target(t);
          if (row.InstalledAt && payload.endedAt < row.InstalledAt) C.fail("\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E16\u0E2D\u0E14\u0E15\u0E49\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E01\u0E48\u0E2D\u0E19\u0E27\u0E31\u0E19\u0E15\u0E34\u0E14\u0E15\u0E31\u0E49\u0E07\u0E40\u0E14\u0E34\u0E21 (" + (row.Label || "\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38") + ")", "VALIDATION", { endedAt: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E16\u0E2D\u0E14\u0E01\u0E48\u0E2D\u0E19\u0E27\u0E31\u0E19\u0E15\u0E34\u0E14\u0E15\u0E31\u0E49\u0E07" });
          const removeQty = Number(t.quantity);
          if (Number.isSafeInteger(removeQty) && removeQty > 0 && removeQty < row.Quantity) {
            changes.push({ before: row, after: { ...row, Quantity: row.Quantity - removeQty, Version: row.Version + 1, UpdatedAt: now, OperationID: payload.operationId } });
            additions.push({ ...row, RecordID: this.uuid(), EquipmentID: row.EquipmentID, Quantity: removeQty, RecordStatus: "REMOVED", EndedAt: payload.endedAt, PreviousRecordID: row.RecordID, CreatedAt: now, UpdatedAt: now, Version: 1, OperationID: payload.operationId });
          } else {
            changes.push({ before: row, after: { ...row, RecordStatus: "REMOVED", EndedAt: payload.endedAt, UpdatedAt: now, Version: row.Version + 1, OperationID: payload.operationId } });
          }
        });
      } else C.fail("\u0E44\u0E21\u0E48\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E19\u0E35\u0E49");
      const changed = new Map(changes.map((c) => [c.before.RecordID, c.after]));
      C.uniqueLabels(active.map((r) => changed.get(r.RecordID) || r).filter((r) => r.RecordStatus === "ACTIVE").concat(additions));
      if (C.text(payload.reason).length > 2e3) C.fail("\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25\u0E15\u0E49\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 2,000 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23");
      const result = { operationId: payload.operationId, count: kind === "add" ? additions.length : kind === "split" ? 1 + additions.length : changes.length };
      const operation = { OperationID: payload.operationId, Fingerprint: fingerprint, MachineID: payload.machineId, Status: "PREPARED", Plan: JSON.stringify({ kind, changes, additions, reason: payload.reason || "" }), Result: JSON.stringify(result), CreatedAt: now, SessionRef: sessionRef };
      if (operation.Plan.length > 45e3 || fingerprint.length > 45e3) C.fail("\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E0A\u0E38\u0E14\u0E19\u0E35\u0E49\u0E22\u0E32\u0E27\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B \u0E01\u0E23\u0E38\u0E13\u0E32\u0E41\u0E1A\u0E48\u0E07\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E40\u0E1B\u0E47\u0E19\u0E0A\u0E38\u0E14\u0E40\u0E25\u0E47\u0E01\u0E25\u0E07");
      const commitResult = this.repo.commit(ctx.location, operation);
      if (this.repo.clearLineStats) {
        try {
          this.repo.clearLineStats(ctx.location);
        } catch (_) {
        }
      }
      return commitResult;
    }
  }
  return Service;
})();

// src/model.js
var machineFields = { machineId: "id", machineCode: "code", machineName: "name", deptId: "department_id", lineId: "line_id", lineOrder: "line_order", manufacturer: "manufacturer", model: "model", serialNo: "serial_no", machineType: "machine_type", installDate: "install_date", criticality: "criticality", status: "status", locationDetail: "location_detail", photoFileId: "photo_file_id", photoFileName: "photo_file_name", manualUrl: "manual_url", remark: "remark", createdAt: "created_at", createdBy: "created_by", updatedAt: "updated_at", updatedBy: "updated_by", isActive: "is_active", version: "version", requestId: "request_id" };
var partFields = { id: "id", partNumber: "part_number", description: "description", brandId: "brand_id", brand: "legacy_brand_name", storeCode: "store_code", lifespan: "lifespan_years", notes: "notes", picture: "picture_source", thumbnail: "thumbnail_source", createdAt: "created_at", updatedAt: "updated_at", version: "version", requestId: "request_id" };
function machineRecord(row) {
  if (!row) return null;
  const m = Object.fromEntries(Object.entries(machineFields).map(([key, col]) => [key, row[col]]));
  return { ...m, isActive: !!m.isActive, departmentName: row.department_name || "", lineName: row.line_name || "", hasPhoto: !!m.photoFileId };
}
__name(machineRecord, "machineRecord");
function partRecord(row) {
  if (!row) return null;
  const p = Object.fromEntries(Object.entries(partFields).map(([key, col]) => [key, row[col]]));
  return { ...p, brand: row.brand_name || p.brand, brandActive: !!row.brand_active, price: row.price_minor === null ? null : row.price_minor / 100, hasThumbnail: !!p.thumbnail };
}
__name(partRecord, "partRecord");
function columns(fields, value) {
  return Object.fromEntries(Object.entries(fields).map(([key, col]) => [col, typeof value[key] === "boolean" ? Number(value[key]) : key === "lineOrder" && value[key] === "" ? null : value[key] ?? (["brandId", "lifespan", "lineOrder"].includes(key) ? null : "")]));
}
__name(columns, "columns");
var MACHINE_SELECT = "SELECT m.*, d.name department_name, l.name line_name FROM machines m JOIN departments d ON d.id=m.department_id JOIN lines l ON l.id=m.line_id";
var PART_SELECT = "SELECT p.*, b.name brand_name, b.is_active brand_active FROM parts p LEFT JOIN brands b ON b.id=p.brand_id";

// src/repository.js
var Repository = class {
  static {
    __name(this, "Repository");
  }
  constructor(db) {
    this.db = db;
  }
  async all(sql, ...args) {
    return (await this.db.prepare(sql).bind(...args).all()).results;
  }
  async references() {
    return { departments: (await this.all("SELECT * FROM departments")).map((d) => ({ deptId: d.id, deptName: d.name, isActive: !!d.is_active })), lines: (await this.all("SELECT * FROM lines")).map((l) => ({ lineId: l.id, deptId: l.department_id, lineName: l.name, isActive: !!l.is_active, remark: l.remark })) };
  }
  async brands() {
    return (await this.all("SELECT * FROM brands")).map((b) => ({ id: b.id, name: b.name, active: !!b.is_active, version: b.version }));
  }
  async machineTypes() {
    return (await this.all("SELECT * FROM machine_types")).map((t) => ({ id: t.id, name: t.name, active: !!t.is_active, version: t.version }));
  }
  async machine(id) {
    return machineRecord(await this.db.prepare(MACHINE_SELECT + " WHERE m.id=?").bind(id).first());
  }
  async part(id) {
    return partRecord(await this.db.prepare(PART_SELECT + " WHERE p.id=?").bind(id).first());
  }
  async partsByIds(ids) {
    const unique = [...new Set([...ids].map((id) => String(id || "").trim()).filter(Boolean))];
    if (!unique.length) return [];
    const placeholders = unique.map(() => "?").join(",");
    return (await this.all(PART_SELECT + " WHERE p.id IN (" + placeholders + ")", ...unique)).map(partRecord);
  }
  async catalog(kind) {
    const rows = await this.all((kind === "machines" ? MACHINE_SELECT : PART_SELECT) + " ORDER BY " + (kind === "machines" ? "m" : "p") + ".id LIMIT 10001");
    if (rows.length > 1e4) fail("CAPACITY", "\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E40\u0E01\u0E34\u0E19\u0E02\u0E2D\u0E1A\u0E40\u0E02\u0E15 10,000 \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E1B\u0E34\u0E14\u0E01\u0E32\u0E23\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E41\u0E1A\u0E1A\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25", 503);
    return rows.map(kind === "machines" ? machineRecord : partRecord);
  }
  async reorderMachine(req, machineId, targetPosition) {
    const machine = await this.machine(machineId);
    if (!machine) fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23\u0E19\u0E35\u0E49", 404);
    const rows = await this.all(`${MACHINE_SELECT} WHERE m.department_id=? AND m.line_id=? ORDER BY CASE WHEN m.line_order IS NULL THEN 1 ELSE 0 END, m.line_order, m.code COLLATE NOCASE, m.id`, machine.deptId, machine.lineId);
    const ordered = rows.map(machineRecord).filter((m) => m.machineId !== machineId);
    const position = Math.max(1, Math.min(Number(targetPosition) || 1, ordered.length + 1));
    ordered.splice(position - 1, 0, machine);
    const statements = [this.db.prepare("INSERT INTO requests VALUES(?,?,?,?,'DONE',?,?)").bind(req.key, req.actor, req.operation, req.payloadHash, JSON.stringify({ machineId, position }), req.now)];
    ordered.forEach((m, index) => statements.push(this.db.prepare("UPDATE machines SET line_order=? WHERE id=?").bind(index + 1, m.machineId)));
    statements.push(this.db.prepare("INSERT INTO audit_events(request_key,actor,operation,entity_id,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?)").bind(req.key, req.actor, req.operation, machineId, JSON.stringify({ lineOrder: machine.lineOrder || null }), JSON.stringify({ lineOrder: position, departmentId: machine.deptId, lineId: machine.lineId }), req.now));
    await this.db.batch(statements);
    return { machineId, position };
  }
  async nextId(kind) {
    const r = await this.db.prepare("UPDATE id_counters SET value=value+1 WHERE kind=? RETURNING value").bind(kind).first();
    if (!r) fail("SCHEMA", "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25", 503);
    return (kind === "machines" ? "M" : "PART-") + String(r.value).padStart(6, "0");
  }
  async request(actor, operation, payload, requestId) {
    if (!/^[\w-]{16,80}$/.test(requestId || "")) fail("VALIDATION", "\u0E23\u0E2B\u0E31\u0E2A\u0E04\u0E33\u0E02\u0E2D\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
    const key = await hash(actor.id + ":" + requestId), payloadHash = await hash(stable({ operation, payload }));
    const old = await this.db.prepare("SELECT * FROM requests WHERE key=?").bind(key).first();
    if (old) {
      if (old.payload_hash !== payloadHash) fail("CONFLICT", "\u0E23\u0E2B\u0E31\u0E2A\u0E04\u0E33\u0E02\u0E2D\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E43\u0E0A\u0E49\u0E01\u0E31\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2D\u0E37\u0E48\u0E19\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E1B\u0E34\u0E14\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E43\u0E2B\u0E21\u0E48", 409);
      if (old.status === "DONE") return { key, replay: JSON.parse(old.response_json) };
      fail("BUSY", "\u0E04\u0E33\u0E02\u0E2D\u0E19\u0E35\u0E49\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E14\u0E34\u0E21\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07", 409);
    }
    return { key, payloadHash, actor: actor.id, operation, now: (/* @__PURE__ */ new Date()).toISOString() };
  }
  async commit(req, table, id, before, after, response) {
    const statements = [this.db.prepare("INSERT INTO requests VALUES(?,?,?,?,'DONE',?,?)").bind(req.key, req.actor, req.operation, req.payloadHash, JSON.stringify(response), req.now)];
    if (before) {
      const fields = Object.keys(after).filter((k) => k !== "id");
      statements.push(this.db.prepare(`UPDATE ${table} SET ${fields.map((k) => k + "=?").join(",")} WHERE id=? AND version=?`).bind(...fields.map((k) => after[k]), id, before.version));
      statements.push(this.db.prepare("INSERT INTO mutation_guards VALUES(?,changes())").bind(req.key));
      statements.push(this.db.prepare("DELETE FROM mutation_guards WHERE id=?").bind(req.key));
    } else statements.push(this.db.prepare(`INSERT INTO ${table} (${Object.keys(after).join(",")}) VALUES(${Object.keys(after).map(() => "?").join(",")})`).bind(...Object.values(after)));
    statements.push(this.db.prepare("INSERT INTO audit_events(request_key,actor,operation,entity_id,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?)").bind(req.key, req.actor, req.operation, id, before ? JSON.stringify(before) : null, JSON.stringify(after), req.now));
    statements.push(this.db.prepare("UPDATE image_operations SET status='ATTACHED' WHERE request_key=? AND status='UPLOADED'").bind(req.key));
    try {
      await this.db.batch(statements);
    } catch (error) {
      const replay = await this.db.prepare("SELECT * FROM requests WHERE key=?").bind(req.key).first();
      if (replay?.status === "DONE" && replay.payload_hash === req.payloadHash) return JSON.parse(replay.response_json);
      if (/mutation_guards|changed=1/.test(error.message)) conflict();
      if (/UNIQUE|PRIMARY KEY/.test(error.message)) fail("DUPLICATE", "\u0E23\u0E2B\u0E31\u0E2A\u0E2B\u0E23\u0E37\u0E2D\u0E0A\u0E37\u0E48\u0E2D\u0E0B\u0E49\u0E33\u0E01\u0E31\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E21\u0E35\u0E2D\u0E22\u0E39\u0E48\u0E41\u0E25\u0E49\u0E27", 409);
      throw error;
    }
    return response;
  }
  async bomRecords(machineId) {
    const rows = await this.all("SELECT * FROM equipment_records WHERE machine_id=? ORDER BY created_at ASC", machineId);
    return rows.map(bomRecord);
  }
  async bomLineRecords(deptId, lineId) {
    const rows = await this.all("SELECT r.* FROM equipment_records r JOIN machines m ON r.machine_id=m.id WHERE m.department_id=? AND m.line_id=? AND r.record_status='ACTIVE' ORDER BY r.created_at ASC", deptId, lineId);
    return rows.map(bomRecord);
  }
  async bomPartsForMachine(machineId) {
    const rows = await this.all(`${PART_SELECT} WHERE p.id IN (SELECT DISTINCT part_id FROM equipment_records WHERE machine_id=?)`, machineId);
    return rows.map(partRecord);
  }
  async bomPartsForLine(deptId, lineId) {
    const rows = await this.all(`${PART_SELECT} WHERE p.id IN (SELECT DISTINCT r.part_id FROM equipment_records r JOIN machines m ON r.machine_id=m.id WHERE m.department_id=? AND m.line_id=?)`, deptId, lineId);
    return rows.map(partRecord);
  }
  async bomOperation(opId) {
    const r = await this.db.prepare("SELECT * FROM equipment_operations WHERE id=?").bind(opId).first();
    if (!r) return null;
    return { OperationID: r.id, Fingerprint: r.fingerprint, MachineID: r.machine_id, Status: r.status, Plan: r.plan_json, Result: r.result_json, CreatedAt: r.created_at, SessionRef: r.session_ref };
  }
  async bomEvents(machineId, equipmentId) {
    const rows = await this.all("SELECT * FROM equipment_operations WHERE machine_id=? AND status='COMMITTED' ORDER BY created_at DESC", machineId);
    return rows.map((o) => {
      let p;
      try {
        p = JSON.parse(o.plan_json);
      } catch (_) {
        p = {};
      }
      const eqIds = (p.changes || []).map((c) => c.before.EquipmentID).concat((p.additions || []).map((r) => r.EquipmentID));
      return { operationId: o.id, kind: p.kind, reason: p.reason, at: o.created_at, sessionRef: o.session_ref, equipmentIds: eqIds };
    }).filter((o) => o.equipmentIds.includes(equipmentId));
  }
  async bomCommit(req, op, changes, additions, actorId) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const response = JSON.parse(op.Result);
    const statements = [
      this.db.prepare("INSERT INTO requests VALUES(?,?,?,?,'DONE',?,?)").bind(req.key, req.actor, req.operation, req.payloadHash, JSON.stringify(response), req.now),
      this.db.prepare("INSERT INTO equipment_operations (id,fingerprint,machine_id,status,plan_json,result_json,created_at,session_ref) VALUES (?,?,?, 'COMMITTED', ?,?,?,?)").bind(op.OperationID, op.Fingerprint, op.MachineID, op.Plan, op.Result, op.CreatedAt || now, op.SessionRef || "")
    ];
    for (const c of changes) {
      statements.push(
        this.db.prepare("UPDATE equipment_records SET record_status=?,ended_at=?,updated_at=?,version=?,operation_id=?,label=?,quantity=?,installed_at=?,due_mode=?,manual_expiry_date=?,notes=?,part_id=? WHERE id=? AND version=?").bind(
          c.after.RecordStatus,
          c.after.EndedAt || "",
          c.after.UpdatedAt || now,
          c.after.Version,
          op.OperationID,
          c.after.Label,
          c.after.Quantity,
          c.after.InstalledAt,
          c.after.DueMode,
          c.after.ManualExpiryDate || "",
          c.after.Notes || "",
          c.after.PartID,
          c.before.RecordID,
          c.before.Version
        )
      );
      statements.push(this.db.prepare("INSERT INTO mutation_guards VALUES(?,changes())").bind(req.key + ":" + c.before.RecordID));
      statements.push(this.db.prepare("DELETE FROM mutation_guards WHERE id=?").bind(req.key + ":" + c.before.RecordID));
    }
    for (const a of additions) {
      statements.push(
        this.db.prepare("INSERT INTO equipment_records (id,equipment_id,machine_id,part_id,label,quantity,installed_at,due_mode,manual_expiry_date,notes,record_status,ended_at,previous_record_id,created_at,created_by,updated_at,updated_by,version,operation_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(
          a.RecordID,
          a.EquipmentID,
          a.MachineID,
          a.PartID,
          a.Label,
          a.Quantity,
          a.InstalledAt,
          a.DueMode,
          a.ManualExpiryDate || "",
          a.Notes || "",
          a.RecordStatus || "ACTIVE",
          a.EndedAt || "",
          a.PreviousRecordID || "",
          a.CreatedAt || now,
          actorId || "system",
          a.UpdatedAt || now,
          actorId || "system",
          a.Version || 1,
          op.OperationID
        )
      );
    }
    statements.push(
      this.db.prepare("INSERT INTO audit_events(request_key,actor,operation,entity_id,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?)").bind(req.key, actorId, req.operation, op.MachineID, JSON.stringify(changes.map((c) => c.before)), JSON.stringify({ changes: changes.map((c) => c.after), additions }), now)
    );
    try {
      await this.db.batch(statements);
    } catch (error) {
      if (/mutation_guards|changed=1/.test(error.message)) conflict();
      throw error;
    }
    return JSON.parse(op.Result);
  }
};
function bomRecord(r) {
  if (!r) return null;
  return {
    RecordID: r.id,
    EquipmentID: r.equipment_id,
    MachineID: r.machine_id,
    PartID: r.part_id,
    Label: r.label,
    Quantity: Number(r.quantity),
    InstalledAt: r.installed_at,
    DueMode: r.due_mode,
    ManualExpiryDate: r.manual_expiry_date,
    Notes: r.notes,
    RecordStatus: r.record_status,
    EndedAt: r.ended_at,
    PreviousRecordID: r.previous_record_id,
    CreatedAt: r.created_at,
    CreatedBy: r.created_by,
    UpdatedAt: r.updated_at,
    UpdatedBy: r.updated_by,
    Version: Number(r.version),
    OperationID: r.operation_id
  };
}
__name(bomRecord, "bomRecord");

// src/drive.js
var tokenCache = null;
function fileId(source) {
  if (!source) return "";
  if (/^[\w-]{20,}$/.test(source)) return source;
  try {
    const url = new URL(source);
    if (!["drive.google.com", "docs.google.com"].includes(url.hostname)) return "";
    return url.searchParams.get("id") || url.pathname.match(/\/d\/([\w-]+)/)?.[1] || "";
  } catch {
    return "";
  }
}
__name(fileId, "fileId");
function fastBase64Decode(b64) {
  if (typeof Uint8Array.fromBase64 === "function") {
    return Uint8Array.fromBase64(b64);
  }
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
__name(fastBase64Decode, "fastBase64Decode");
function decodeImage(image, max = 15e5) {
  if (!image || !["image/jpeg", "image/png", "image/webp"].includes(image.mime) || typeof image.base64 !== "string" || image.base64.length > Math.ceil(max / 3) * 4 + 4) fail("VALIDATION", "\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A\u0E23\u0E39\u0E1B JPEG, PNG \u0E2B\u0E23\u0E37\u0E2D WebP \u0E17\u0E35\u0E48\u0E02\u0E19\u0E32\u0E14\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14");
  let bytes;
  try {
    bytes = fastBase64Decode(image.base64);
  } catch {
    fail("VALIDATION", "\u0E44\u0E1F\u0E25\u0E4C\u0E23\u0E39\u0E1B\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
  }
  const hex = Array.from(bytes.slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
  const valid = image.mime === "image/jpeg" ? hex.startsWith("ffd8ff") : image.mime === "image/png" ? hex.startsWith("89504e470d0a1a0a") : hex.startsWith("52494646") && hex.slice(16, 24) === "57454250";
  if (!valid || !bytes.length || bytes.length > max) fail("VALIDATION", "\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E2B\u0E32\u0E23\u0E39\u0E1B\u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E0A\u0E19\u0E34\u0E14\u0E44\u0E1F\u0E25\u0E4C\u0E2B\u0E23\u0E37\u0E2D\u0E02\u0E19\u0E32\u0E14\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14");
  return bytes;
}
__name(decodeImage, "decodeImage");
async function getServiceAccountToken(email, privateKeyPem) {
  const cleanKey = privateKeyPem.replace(/\\n/g, "").replace(/-----BEGIN [A-Z ]+-----/g, "").replace(/-----END [A-Z ]+-----/g, "").replace(/\s+/g, "");
  const bytes = fastBase64Decode(cleanKey);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    bytes.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const now = Math.floor(Date.now() / 1e3);
  const enc = new TextEncoder();
  const b64url = /* @__PURE__ */ __name((obj) => btoa(unescape(encodeURIComponent(typeof obj === "string" ? obj : JSON.stringify(obj)))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"), "b64url");
  const header = b64url({ alg: "RS256", typ: "JWT" });
  const payload = b64url({
    iss: email,
    scope: "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  });
  const dataToSign = enc.encode(`${header}.${payload}`);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, dataToSign);
  const signBase64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const assertion = `${header}.${payload}.${signBase64}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    }),
    signal: AbortSignal.timeout(15e3)
  });
  if (!response.ok) fail("DRIVE_AUTH", "\u0E1A\u0E31\u0E0D\u0E0A\u0E35 Service Account \u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D Drive \u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C", 503);
  return await response.json();
}
__name(getServiceAccountToken, "getServiceAccountToken");
async function token(env) {
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN) {
    if (tokenCache?.client === env.GOOGLE_CLIENT_ID && tokenCache.expires > Date.now()) return tokenCache.value;
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        refresh_token: env.GOOGLE_REFRESH_TOKEN,
        grant_type: "refresh_token"
      }),
      signal: AbortSignal.timeout(15e3)
    });
    if (!response.ok) fail("DRIVE_AUTH", "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E15\u0E48\u0E2D\u0E2D\u0E32\u0E22\u0E38\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C", 503);
    const data = await response.json();
    tokenCache = { client: env.GOOGLE_CLIENT_ID, value: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1e3 };
    return data.access_token;
  }
  if (env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_PRIVATE_KEY) {
    if (tokenCache?.client === env.GOOGLE_SERVICE_ACCOUNT_EMAIL && tokenCache.expires > Date.now()) return tokenCache.value;
    const data = await getServiceAccountToken(env.GOOGLE_SERVICE_ACCOUNT_EMAIL, env.GOOGLE_PRIVATE_KEY);
    tokenCache = { client: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, value: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1e3 };
    return data.access_token;
  }
  fail("DRIVE_CONFIG", "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25", 503);
}
__name(token, "token");
async function getGoogleAccessToken(env) {
  try {
    return await token(env);
  } catch (err) {
    return null;
  }
}
__name(getGoogleAccessToken, "getGoogleAccessToken");
async function call(env, path, options = {}, timeoutMs = 25e3) {
  const access = await token(env);
  try {
    return await fetch("https://www.googleapis.com" + path, { ...options, headers: { ...options.headers, Authorization: "Bearer " + access }, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    fail("DRIVE_TIMEOUT", "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E17\u0E23\u0E32\u0E1A\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E14\u0E34\u0E21\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07", 503);
  }
}
__name(call, "call");
function folder(env, scope) {
  const id = scope === "announcements" ? env.ANNOUNCEMENT_FOLDER_ID || "1HH9TL8_Z3dzXrA8O-0Gx9ajq5Z2wj-h8" : scope === "parts" && env.PART_IMAGE_FOLDER_ID ? env.PART_IMAGE_FOLDER_ID : env.MACHINE_IMAGE_FOLDER_ID;
  if (!id || !/^[\w-]{10,}$/.test(id)) fail("DRIVE_CONFIG", "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E42\u0E1F\u0E25\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E\u0E02\u0E2D\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E19\u0E35\u0E49", 503);
  return id;
}
__name(folder, "folder");
async function metadata(env, id) {
  const r = await call(env, `/drive/v3/files/${encodeURIComponent(id)}?fields=id,name,mimeType,size,parents,trashed,appProperties&supportsAllDrives=true`);
  if (r.status === 404) return null;
  if (!r.ok) fail("DRIVE_UNAVAILABLE", "\u0E2D\u0E48\u0E32\u0E19\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E44\u0E1F\u0E25\u0E4C\u0E23\u0E39\u0E1B\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48", 503);
  return r.json();
}
__name(metadata, "metadata");
async function deleteDriveFile(env, fileIdInput) {
  const id = fileId(fileIdInput);
  if (!id) return false;
  try {
    const res = await call(env, `/drive/v3/files/${encodeURIComponent(id)}?supportsAllDrives=true`, { method: "DELETE" });
    return res.ok || res.status === 404;
  } catch (_) {
    return false;
  }
}
__name(deleteDriveFile, "deleteDriveFile");
async function readPicture(env, scope, source) {
  const id = fileId(source);
  if (!id) fail("IMAGE_SOURCE", "\u0E23\u0E39\u0E1B\u0E19\u0E35\u0E49\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E25\u0E34\u0E07\u0E01\u0E4C Drive \u0E17\u0E35\u0E48\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E23\u0E39\u0E1B\u0E40\u0E14\u0E34\u0E21", 422);
  const parent = folder(env, scope), meta = await metadata(env, id);
  if (!meta || meta.trashed) fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E44\u0E1F\u0E25\u0E4C\u0E23\u0E39\u0E1B\u0E40\u0E14\u0E34\u0E21", 404);
  if (!meta.parents?.includes(parent)) fail("FORBIDDEN", "\u0E23\u0E39\u0E1B\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E42\u0E1F\u0E25\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E17\u0E35\u0E48\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15", 403);
  if (!["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"].includes(meta.mimeType)) fail("VALIDATION", "\u0E0A\u0E19\u0E34\u0E14\u0E2B\u0E23\u0E37\u0E2D\u0E02\u0E19\u0E32\u0E14\u0E23\u0E39\u0E1B\u0E40\u0E14\u0E34\u0E21\u0E44\u0E21\u0E48\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A");
  const response = await call(env, `/drive/v3/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`);
  if (!response.ok) fail("DRIVE_UNAVAILABLE", "\u0E2D\u0E48\u0E32\u0E19\u0E23\u0E39\u0E1B\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48", 503);
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return { mime: meta.mimeType, base64: btoa(binary) };
}
__name(readPicture, "readPicture");
async function streamMedia(env, scope, source, request) {
  const id = fileId(source);
  if (!id) fail("IMAGE_SOURCE", "\u0E23\u0E39\u0E1B\u0E19\u0E35\u0E49\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E25\u0E34\u0E07\u0E01\u0E4C Drive \u0E17\u0E35\u0E48\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E23\u0E39\u0E1B\u0E40\u0E14\u0E34\u0E21", 422);
  const parent = folder(env, scope), meta = await metadata(env, id);
  if (!meta || meta.trashed) fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E44\u0E1F\u0E25\u0E4C\u0E23\u0E39\u0E1B\u0E40\u0E14\u0E34\u0E21", 404);
  if (!meta.parents?.includes(parent)) fail("FORBIDDEN", "\u0E23\u0E39\u0E1B\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E42\u0E1F\u0E25\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E17\u0E35\u0E48\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15", 403);
  const headers = {};
  const range = request?.headers?.get("Range");
  if (range) headers["Range"] = range;
  const response = await call(env, `/drive/v3/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`, { headers });
  if (!response.ok) fail("DRIVE_UNAVAILABLE", "\u0E2D\u0E48\u0E32\u0E19\u0E44\u0E1F\u0E25\u0E4C\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48", 503);
  const resHeaders = new Headers();
  resHeaders.set("Content-Type", meta.mimeType || "video/mp4");
  resHeaders.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
  resHeaders.set("Accept-Ranges", "bytes");
  if (response.headers.get("Content-Length")) resHeaders.set("Content-Length", response.headers.get("Content-Length"));
  if (response.headers.get("Content-Range")) resHeaders.set("Content-Range", response.headers.get("Content-Range"));
  return new Response(response.body, { status: response.status, headers: resHeaders });
}
__name(streamMedia, "streamMedia");
async function uploadPicture(env, scope, req, slot, image, entityId, max = 5e7) {
  const isVideo = image.mime?.startsWith("video/");
  const bytes = isVideo ? fastBase64Decode(image.bytes || image.base64) : decodeImage(image, max), parent = folder(env, scope), db = env.DB;
  let op = await db.prepare("SELECT * FROM image_operations WHERE request_key=? AND slot=?").bind(req.key, slot).first();
  if (!op) {
    const response = await call(env, "/drive/v3/files/generateIds?count=1&space=drive&type=files");
    if (!response.ok) fail("DRIVE_UNAVAILABLE", "\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14\u0E44\u0E1F\u0E25\u0E4C\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08", 503);
    const id = (await response.json()).ids?.[0];
    if (!id) fail("DRIVE_UNAVAILABLE", "\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E23\u0E2B\u0E31\u0E2A\u0E44\u0E1F\u0E25\u0E4C\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08", 503);
    const ext = image.mime.split("/")[1] || "bin";
    const name = entityId + "-" + slot + "-" + req.key.slice(0, 12) + "." + ext;
    await db.prepare("INSERT OR IGNORE INTO image_operations VALUES(?,?,?,?,?,?,?,?,'RESERVED',?)").bind(crypto.randomUUID(), req.key, slot, parent, id, name, image.mime, req.payloadHash, req.now).run();
    op = await db.prepare("SELECT * FROM image_operations WHERE request_key=? AND slot=?").bind(req.key, slot).first();
  }
  if (op.payload_hash !== req.payloadHash || op.folder_id !== parent) fail("CONFLICT", "\u0E04\u0E33\u0E02\u0E2D\u0E44\u0E1F\u0E25\u0E4C\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E43\u0E0A\u0E49\u0E01\u0E31\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2D\u0E37\u0E48\u0E19\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E1B\u0E34\u0E14\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E43\u0E2B\u0E21\u0E48", 409);
  const existing = await metadata(env, op.file_id);
  if (existing) {
    if (existing.trashed || !existing.parents?.includes(parent) || existing.appProperties?.request !== req.key) fail("CONFLICT", "\u0E44\u0E1F\u0E25\u0E4C\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14\u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E04\u0E33\u0E02\u0E2D \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25", 409);
  } else {
    const boundary = "em_" + crypto.randomUUID();
    const info = { id: op.file_id, name: op.name, parents: [parent], appProperties: { request: req.key, payload: req.payloadHash, slot } };
    const body = new Blob([`--${boundary}\r
Content-Type: application/json; charset=UTF-8\r
\r
${JSON.stringify(info)}\r
--${boundary}\r
Content-Type: ${image.mime}\r
\r
`, bytes, `\r
--${boundary}--`]);
    const response = await call(env, "/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id", { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body }, 12e4);
    if (!response.ok) {
      const recovered = await metadata(env, op.file_id);
      if (!recovered || recovered.appProperties?.request !== req.key || recovered.appProperties?.payload !== req.payloadHash) fail("DRIVE_UNAVAILABLE", "\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14\u0E44\u0E1F\u0E25\u0E4C\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E14\u0E34\u0E21\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07", 503);
    }
  }
  await db.prepare("UPDATE image_operations SET status='UPLOADED' WHERE id=? AND status='RESERVED'").bind(op.id).run();
  return { id: op.file_id, name: op.name, url: "https://drive.google.com/file/d/" + op.file_id + "/view" };
}
__name(uploadPicture, "uploadPicture");

// src/service.js
var machineReads = /* @__PURE__ */ new Set(["bootstrap", "getMachines", "getMachine", "getMachinePhoto", "getMachineTypes"]);
var partReads = /* @__PURE__ */ new Set(["bootstrap", "getParts", "getAllParts", "getBrands", "getPicture", "getPart"]);
var bomReads = /* @__PURE__ */ new Set(["references", "searchParts", "lineMachineStats", "list", "history"]);
var isRead = /* @__PURE__ */ __name((scope, method) => (scope === "machines" ? machineReads : scope === "parts" ? partReads : bomReads).has(method), "isRead");
var publicMachine = /* @__PURE__ */ __name(({ requestId, photoFileId, ...m }) => ({ ...m, hasPhoto: !!photoFileId }), "publicMachine");
var publicPart = /* @__PURE__ */ __name(({ requestId, ...p }) => p, "publicPart");
async function bomReferences(repo, actor) {
  const ref = await repo.references(), rawMachines = await repo.catalog("machines");
  const bomRef = {
    departments: ref.departments.map((d) => ({ DeptID: d.deptId, DeptName: d.deptName, Code: d.deptId, IsActive: d.isActive })),
    lines: ref.lines.map((l) => ({ LineID: l.lineId, DeptID: l.deptId, LineName: l.lineName, IsActive: l.isActive })),
    machines: rawMachines.map((m) => ({ MachineID: m.machineId, MachineCode: m.machineCode, MachineName: m.machineName, DeptID: m.deptId, LineID: m.lineId, LineOrder: m.lineOrder, IsActive: m.isActive, Status: m.status })),
    role: actor?.role,
    permissions: actor?.permissions
  };
  return bomRef;
}
__name(bomReferences, "bomReferences");
function mapBomParts(rawParts) {
  return rawParts.map((p) => ({
    ID: p.id,
    "Part number": p.partNumber,
    Description: p.description,
    Brand: p.brand,
    Price: p.price,
    Picture: p.picture,
    Thumbnail: p.thumbnail,
    "Store code": p.storeCode,
    "\u0E2D\u0E32\u0E22\u0E38\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C (\u0E1B\u0E35)": p.lifespan,
    Notes: p.notes,
    brandId: p.brandId,
    version: p.version
  }));
}
__name(mapBomParts, "mapBomParts");
async function bomContext(repo) {
  const bomRef = await bomReferences(repo), rawParts = await repo.catalog("parts");
  return { bomRef, bomParts: mapBomParts(rawParts) };
}
__name(bomContext, "bomContext");
async function dispatch(env, actor, scope, method, args, key) {
  const repo = new Repository(env.DB);
  if (!["machines", "parts", "bom"].includes(scope) || typeof method !== "string" || !Array.isArray(args) || args.length > 3) fail("VALIDATION", "\u0E04\u0E33\u0E02\u0E2D\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
  if (isRead(scope, method)) {
    if (scope === "machines") {
      if (method === "bootstrap") {
        const ref = await repo.references(), types = (await repo.machineTypes()).filter((t) => t.active);
        return { ...ref, departments: ref.departments.filter((d) => d.isActive), lines: ref.lines.filter((l) => l.isActive), statuses: MachineCore.STATUSES, criticalities: MachineCore.CRITICALITIES, machineTypes: types.map((t) => t.name), machineTypeDetails: types, pageSizes: MachineCore.PAGE_SIZES, role: actor.role, permissions: actor.permissions };
      }
      if (method === "getMachineTypes") return (await repo.machineTypes()).filter((t) => t.active);
      if (method === "getMachines") {
        const rows = await repo.catalog(scope), result = MachineCore.query(rows, args[0] || {}), visible = rows.filter((m2) => m2.isActive);
        return { ...result, items: result.items.map(publicMachine), statusCounts: { ...Object.fromEntries(MachineCore.STATUSES.map((s) => [s, visible.filter((m2) => m2.status === s).length])), all: visible.length } };
      }
      const m = await repo.machine(String(args[0]));
      if (!m) fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23\u0E19\u0E35\u0E49", 404);
      if (method === "getMachine") return publicMachine(m);
      return m.photoFileId ? readPicture(env, scope, m.photoFileId) : null;
    }
    if (scope === "parts") {
      if (method === "getBrands") return (await repo.brands()).filter((b) => b.active);
      if (method === "getPart") {
        const p = await repo.part(String(args[0]));
        if (!p) fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A Part \u0E19\u0E35\u0E49", 404);
        return publicPart(p);
      }
      if (method === "getPicture") {
        const p = await repo.part(String(args[0]));
        if (!p) fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A Part \u0E19\u0E35\u0E49", 404);
        const source = args[1] === "full" ? p.picture : p.thumbnail || p.picture;
        return source ? readPicture(env, scope, source) : null;
      }
      const rows = await repo.catalog(scope);
      if (method === "bootstrap") return { parts: rows.map(publicPart), brands: (await repo.brands()).filter((b) => b.active), webAppUrl: "/parts/", role: actor.role };
      if (method === "getAllParts") return rows.map(publicPart);
      return args[0]?.all ? { all: true, allTotal: rows.length, total: rows.length, items: rows.map(publicPart) } : { ...PartCore.query(rows, args[0] || {}), items: PartCore.query(rows, args[0] || {}).items.map(publicPart) };
    }
    if (scope === "bom") {
      if (method === "references") return bomReferences(repo, actor);
      if (method === "searchParts") {
        const query = args[0] || {};
        const { bomParts } = await bomContext(repo);
        if (query.all) return { items: bomParts, total: bomParts.length };
        const words = BomCore.normalized(query.query).split(/\s+/).filter(Boolean);
        return BomCore.page(bomParts.filter((p) => words.every((w) => BomCore.normalized([p.ID, p["Part number"], p.Description, p.Brand].join(" ")).includes(w))), query);
      }
      if (method === "lineMachineStats") {
        const query = args[0] || {}, records = await repo.bomLineRecords(query.deptId, query.lineId);
        const bomRef = await bomReferences(repo);
        const rawParts = await repo.bomPartsForLine(query.deptId, query.lineId);
        const bomParts = mapBomParts(rawParts);
        const bomRepo = { references: /* @__PURE__ */ __name(() => bomRef, "references"), parts: /* @__PURE__ */ __name(() => bomParts, "parts"), lineLocation: /* @__PURE__ */ __name((dept, line) => ({ code: dept.DeptID, sheet: "LINE_" + line.LineID }), "lineLocation"), assertReady: /* @__PURE__ */ __name(() => {
        }, "assertReady"), records: /* @__PURE__ */ __name(() => records, "records") };
        const service = new BomService(bomRepo, () => /* @__PURE__ */ new Date(), () => crypto.randomUUID());
        return service.lineMachineStats(query);
      }
      if (method === "list") {
        const query = args[0] || {}, records = await repo.bomRecords(query.machineId);
        const bomRef = await bomReferences(repo);
        const rawParts = await repo.bomPartsForMachine(query.machineId);
        const bomParts = mapBomParts(rawParts);
        const bomRepo = { references: /* @__PURE__ */ __name(() => bomRef, "references"), parts: /* @__PURE__ */ __name(() => bomParts, "parts"), location: /* @__PURE__ */ __name((m) => ({ code: m.DeptID, sheet: "LINE_" + m.LineID }), "location"), assertReady: /* @__PURE__ */ __name(() => {
        }, "assertReady"), records: /* @__PURE__ */ __name(() => records, "records") };
        const service = new BomService(bomRepo, () => /* @__PURE__ */ new Date(), () => crypto.randomUUID());
        return service.list(query);
      }
      if (method === "history") {
        const query = args[0] || {}, records = await repo.bomRecords(query.machineId), events = await repo.bomEvents(query.machineId, query.equipmentId);
        const bomRef = await bomReferences(repo);
        const rawParts = await repo.bomPartsForMachine(query.machineId);
        const bomParts = mapBomParts(rawParts);
        const bomRepo = { references: /* @__PURE__ */ __name(() => bomRef, "references"), parts: /* @__PURE__ */ __name(() => bomParts, "parts"), location: /* @__PURE__ */ __name((m) => ({ code: m.DeptID, sheet: "LINE_" + m.LineID }), "location"), assertReady: /* @__PURE__ */ __name(() => {
        }, "assertReady"), records: /* @__PURE__ */ __name(() => records, "records"), events: /* @__PURE__ */ __name(() => events, "events") };
        const service = new BomService(bomRepo, () => /* @__PURE__ */ new Date(), () => crypto.randomUUID());
        return service.history(query);
      }
    }
  }
  authorizeWrite(actor, env);
  if (scope === "bom") {
    if (["add", "edit", "split", "replace", "remove"].includes(method)) return saveBomMutation(repo, actor, method, args, key);
    fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E19\u0E35\u0E49", 404);
  }
  const payload = args.findLast((x) => x && typeof x === "object" && !Array.isArray(x));
  const req = await repo.request(actor, scope + ":" + method, args, payload?.requestId || key);
  if (req.replay) return req.replay;
  if (["deleteMachine", "deletePart"].includes(method)) fail("REFERENCE_CHECK_REQUIRED", "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E40\u0E1B\u0E34\u0E14\u0E01\u0E32\u0E23\u0E25\u0E1A\u0E16\u0E32\u0E27\u0E23\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E22\u0E49\u0E32\u0E22\u0E23\u0E30\u0E1A\u0E1A \u0E01\u0E23\u0E38\u0E13\u0E32\u0E0B\u0E48\u0E2D\u0E19\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23\u0E2B\u0E23\u0E37\u0E2D\u0E04\u0E07 Part \u0E44\u0E27\u0E49\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E23\u0E31\u0E01\u0E29\u0E32\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34 BOM", 409);
  if (scope === "machines") {
    if (method === "reorderMachine") return repo.reorderMachine(req, String(args[0]), Number(args[1]?.position));
    if (["createMachineType", "deleteMachineType"].includes(method)) return saveMachineType(repo, actor, env, req, method, args);
    return saveMachine(env, repo, req, method, args);
  }
  if (["createBrand", "deleteBrand"].includes(method)) return saveBrand(repo, req, method, args);
  if (["createPart", "updatePart", "updatePartImage"].includes(method)) return savePart(env, repo, req, method, args);
  if (method === "createPartsBatch") return savePartsBatch(env, repo, req, args[0]);
  fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E19\u0E35\u0E49", 404);
}
__name(dispatch, "dispatch");
async function saveBomMutation(repo, actor, method, args, key) {
  const payload = args[0];
  if (!payload || typeof payload !== "object") fail("VALIDATION", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E04\u0E33\u0E02\u0E2D");
  const opId = payload.operationId || key || crypto.randomUUID();
  payload.operationId = opId;
  if (actor && (actor.role === "admin" || actor.permissions?.bom === "admin")) payload.isAdmin = true;
  const req = await repo.request(actor, "bom:" + method, args, opId);
  if (req.replay) return req.replay;
  const prior = await repo.bomOperation(opId);
  const fingerprint = BomCore.stable({ kind: method, payload });
  if (prior) {
    if (prior.Fingerprint !== fingerprint) fail("CONFLICT", "\u0E23\u0E2B\u0E31\u0E2A\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E19\u0E35\u0E49\u0E43\u0E0A\u0E49\u0E01\u0E31\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2D\u0E37\u0E48\u0E19\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E1C\u0E25\u0E40\u0E14\u0E34\u0E21\u0E01\u0E48\u0E2D\u0E19", 409);
    return JSON.parse(prior.Result);
  }
  const { bomRef, bomParts } = await bomContext(repo);
  const records = await repo.bomRecords(payload.machineId);
  let committedPlan = null;
  const bomRepo = {
    references: /* @__PURE__ */ __name(() => bomRef, "references"),
    parts: /* @__PURE__ */ __name(() => bomParts, "parts"),
    location: /* @__PURE__ */ __name((m) => ({ code: m.DeptID, sheet: "LINE_" + m.LineID }), "location"),
    assertReady: /* @__PURE__ */ __name(() => {
    }, "assertReady"),
    records: /* @__PURE__ */ __name(() => records, "records"),
    operation: /* @__PURE__ */ __name(() => null, "operation"),
    commit: /* @__PURE__ */ __name((loc, op) => {
      committedPlan = op;
      return JSON.parse(op.Result);
    }, "commit"),
    replay: /* @__PURE__ */ __name((loc, op) => JSON.parse(op.Result), "replay")
  };
  const service = new BomService(bomRepo, () => /* @__PURE__ */ new Date(), () => crypto.randomUUID());
  service.mutate(method, payload, actor.id);
  if (!committedPlan) fail("VALIDATION", "\u0E1B\u0E23\u0E30\u0E21\u0E27\u0E25\u0E1C\u0E25\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08");
  const planObj = JSON.parse(committedPlan.Plan);
  return repo.bomCommit(req, committedPlan, planObj.changes || [], planObj.additions || [], actor.id);
}
__name(saveBomMutation, "saveBomMutation");
async function saveMachine(env, repo, req, method, args) {
  const creating = method === "createMachine", lifecycle = ["archiveMachine", "restoreMachine", "retireMachine"].includes(method);
  if (!creating && !lifecycle && method !== "updateMachine") fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E19\u0E35\u0E49", 404);
  const before = creating ? null : await repo.machine(String(args[0]));
  if (!creating && !before) fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23\u0E19\u0E35\u0E49", 404);
  const payload = creating ? args[0] : lifecycle ? { ...before, version: args[1] } : args[1];
  if (!payload) fail("VALIDATION", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25");
  if (before && before.version !== Number(payload.version)) conflict();
  const activeTypes = (await repo.machineTypes()).filter((t) => t.active).map((t) => t.name);
  const validation = MachineCore.validate(payload, activeTypes);
  if (before && MachineCore.normalize(before.machineType) === MachineCore.normalize(validation.value.machineType)) delete validation.errors.machineType;
  if (Object.keys(validation.errors).length) fail("VALIDATION", "\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E0A\u0E48\u0E2D\u0E07\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E14\u0E49\u0E32\u0E19\u0E25\u0E48\u0E32\u0E07", 422, validation.errors);
  const value = validation.value, ref = await repo.references();
  const dept = ref.departments.find((d) => d.deptId === value.deptId), line = ref.lines.find((l) => l.lineId === value.lineId);
  if (!dept || !dept.isActive && before?.deptId !== dept.deptId) fail("VALIDATION", "\u0E41\u0E1C\u0E19\u0E01\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19", 422, { deptId: "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E41\u0E1C\u0E19\u0E01\u0E43\u0E2B\u0E21\u0E48" });
  if (!line || line.deptId !== value.deptId || !line.isActive && before?.lineId !== line.lineId) fail("VALIDATION", "\u0E44\u0E25\u0E19\u0E4C\u0E1C\u0E25\u0E34\u0E15\u0E44\u0E21\u0E48\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E41\u0E1C\u0E19\u0E01\u0E17\u0E35\u0E48\u0E40\u0E25\u0E37\u0E2D\u0E01", 422, { lineId: "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E44\u0E25\u0E19\u0E4C\u0E43\u0E2B\u0E21\u0E48" });
  const duplicate = await env.DB.prepare("SELECT id FROM machines WHERE normalized_code=? AND id<>?").bind(MachineCore.normalize(value.machineCode), before?.machineId || "").first();
  if (duplicate) fail("DUPLICATE", "\u0E23\u0E2B\u0E31\u0E2A\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23\u0E19\u0E35\u0E49\u0E21\u0E35\u0E2D\u0E22\u0E39\u0E48\u0E41\u0E25\u0E49\u0E27", 409, { machineCode: "\u0E43\u0E0A\u0E49\u0E23\u0E2B\u0E31\u0E2A\u0E2D\u0E37\u0E48\u0E19" });
  const id = before?.machineId || await repo.nextId("machines");
  let photoFileId = before?.photoFileId || "", photoFileName = before?.photoFileName || "";
  if (!lifecycle && payload.image) {
    const image = await uploadPicture(env, "machines", req, "full", payload.image, id);
    photoFileId = image.id;
    photoFileName = image.name;
  } else if (!lifecycle && payload.removePhoto) {
    photoFileId = "";
    photoFileName = "";
  }
  if (method === "archiveMachine") value.isActive = false;
  if (method === "restoreMachine") value.isActive = true;
  if (method === "retireMachine") value.status = "\u0E1B\u0E25\u0E14\u0E23\u0E30\u0E27\u0E32\u0E07";
  const m = { ...value, machineId: id, photoFileId, photoFileName, createdAt: before?.createdAt || req.now, createdBy: before?.createdBy || req.actor, updatedAt: req.now, updatedBy: req.actor, version: before ? before.version + 1 : 1, requestId: req.key };
  return repo.commit(req, "machines", id, before, { ...columns(machineFields, m), normalized_code: MachineCore.normalize(m.machineCode) }, { machineId: id, version: m.version });
}
__name(saveMachine, "saveMachine");
async function savePart(env, repo, req, method, args) {
  const creating = method === "createPart", imageOnly = method === "updatePartImage", payload = creating ? args[0] : args[1];
  if (!payload) fail("VALIDATION", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25");
  const before = creating ? null : await repo.part(String(args[0]));
  if (!creating && !before) fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A Part \u0E19\u0E35\u0E49", 404);
  if (before && before.version !== Number(payload.version)) conflict();
  const result = PartCore.validate(imageOnly ? before : payload);
  if (!imageOnly && Object.keys(result.errors).length) fail("VALIDATION", "\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E0A\u0E48\u0E2D\u0E07\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E14\u0E49\u0E32\u0E19\u0E25\u0E48\u0E32\u0E07", 422, result.errors);
  const value = result.value, brand = (await repo.brands()).find((b) => b.id === value.brandId);
  if (value.brandId && (!brand || !brand.active && before?.brandId !== brand.id)) fail("VALIDATION", "Brand \u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19", 422, { brandId: "\u0E40\u0E25\u0E37\u0E2D\u0E01 Brand \u0E43\u0E2B\u0E21\u0E48" });
  const id = before?.id || await repo.nextId("parts");
  let picture = before?.picture || "", thumbnail = before?.thumbnail || "";
  if (payload.image) {
    picture = (await uploadPicture(env, "parts", req, "full", payload.image, id)).url;
    thumbnail = payload.thumbnail ? (await uploadPicture(env, "parts", req, "thumbnail", payload.thumbnail, id, 1e5)).url : "";
  } else if (payload.removeImage) {
    picture = "";
    thumbnail = "";
  } else if (imageOnly) fail("VALIDATION", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E");
  const p = { ...value, id, brand: brand?.name || "", picture, thumbnail, createdAt: before?.createdAt || req.now, updatedAt: req.now, version: before ? before.version + 1 : 1, requestId: req.key };
  return repo.commit(req, "parts", id, before, { ...columns(partFields, p), price_minor: value.price === null ? null : Math.round(value.price * 100) }, { id, version: p.version, picture, thumbnail });
}
__name(savePart, "savePart");
async function savePartsBatch(env, repo, req, rawItems) {
  const items = Array.isArray(rawItems) ? rawItems : rawItems?.parts || [];
  if (!items.length) fail("VALIDATION", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2D\u0E30\u0E44\u0E2B\u0E25\u0E48");
  const allExisting = await repo.catalog("parts");
  const dbPartNumbers = new Set(allExisting.map((p) => PartCore.normalize(p.partNumber)));
  const seenInBatch = /* @__PURE__ */ new Set();
  const brands = await repo.brands();
  const brandMap = new Map(brands.map((b) => [b.id, b]));
  const brandNameMap = new Map(brands.map((b) => [PartCore.normalize(b.name), b]));
  const validRows = [];
  let skippedCount = 0;
  for (const item of items) {
    const pn = String(item.partNumber || "").trim();
    if (!pn) {
      skippedCount++;
      continue;
    }
    const norm = PartCore.normalize(pn);
    if (dbPartNumbers.has(norm) || seenInBatch.has(norm)) {
      skippedCount++;
      continue;
    }
    seenInBatch.add(norm);
    const val = PartCore.validate({
      partNumber: pn,
      description: item.description || "-",
      storeCode: item.storeCode || "",
      lifespan: item.lifespan,
      price: item.price,
      brandId: item.brandId
    });
    if (Object.keys(val.errors).length > 0) {
      skippedCount++;
      continue;
    }
    let brand = null;
    if (val.value.brandId) brand = brandMap.get(val.value.brandId);
    else if (item.brand) brand = brandNameMap.get(PartCore.normalize(item.brand));
    validRows.push({ item, value: val.value, brand });
  }
  if (!validRows.length) {
    return { success: true, createdCount: 0, skippedCount, createdParts: [] };
  }
  const count = validRows.length;
  const counterRes = await env.DB.prepare("UPDATE id_counters SET value=value+? WHERE kind=? RETURNING value").bind(count, "parts").first();
  if (!counterRes) fail("SCHEMA", "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25", 503);
  const endVal = Number(counterRes.value);
  const startVal = endVal - count + 1;
  const createdParts = [];
  const statements = [];
  for (let i = 0; i < count; i++) {
    const { item, value, brand } = validRows[i];
    const id = "PART-" + String(startVal + i).padStart(6, "0");
    let picture = "", thumbnail = "";
    if (item.image) {
      try {
        const uploadedPic = await uploadPicture(env, "parts", req, "bulk_" + id + "_full", item.image, id);
        picture = uploadedPic.url;
        if (item.thumbnail) {
          const uploadedThumb = await uploadPicture(env, "parts", req, "bulk_" + id + "_thumb", item.thumbnail, id, 1e5);
          thumbnail = uploadedThumb.url;
        }
      } catch (err) {
        console.error("Image upload failed for part " + id, err);
      }
    }
    const p = {
      ...value,
      id,
      brand: brand?.name || item.brand || "",
      brandId: brand?.id || null,
      picture,
      thumbnail,
      notes: item.notes || "",
      createdAt: req.now,
      updatedAt: req.now,
      version: 1,
      requestId: req.key
    };
    const after = {
      ...columns(partFields, p),
      price_minor: value.price === null ? null : Math.round(value.price * 100)
    };
    createdParts.push({
      ...p,
      brandActive: !!brand?.active,
      price: value.price,
      hasThumbnail: !!thumbnail,
      _after: after
    });
  }
  const response = {
    success: true,
    createdCount: createdParts.length,
    skippedCount,
    createdParts: createdParts.map(({ _after, ...cp }) => cp)
  };
  statements.push(
    env.DB.prepare("INSERT INTO requests VALUES(?,?,?,?,'DONE',?,?)").bind(req.key, req.actor, req.operation, req.payloadHash, JSON.stringify(response), req.now)
  );
  for (const cp of createdParts) {
    const after = cp._after;
    statements.push(
      env.DB.prepare(`INSERT INTO parts (${Object.keys(after).join(",")}) VALUES(${Object.keys(after).map(() => "?").join(",")})`).bind(...Object.values(after))
    );
  }
  statements.push(
    env.DB.prepare("INSERT INTO audit_events(request_key,actor,operation,entity_id,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?)").bind(req.key, req.actor, req.operation, createdParts.map((cp) => cp.id).join(","), null, JSON.stringify(createdParts.map((cp) => cp._after)), req.now)
  );
  statements.push(
    env.DB.prepare("UPDATE image_operations SET status='ATTACHED' WHERE request_key=? AND status='UPLOADED'").bind(req.key)
  );
  await env.DB.batch(statements);
  return response;
}
__name(savePartsBatch, "savePartsBatch");
async function saveBrand(repo, req, method, args) {
  const brands = await repo.brands();
  let before, value;
  if (method === "createBrand") {
    const name = String(args[0] || "").trim().replace(/\s+/g, " ");
    if (!name || name.length > 100) fail("VALIDATION", "\u0E01\u0E23\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D Brand 1\u2013100 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23");
    before = brands.find((b) => PartCore.normalize(b.name) === PartCore.normalize(name));
    if (before?.active) fail("DUPLICATE", "\u0E21\u0E35 Brand \u0E19\u0E35\u0E49\u0E41\u0E25\u0E49\u0E27", 409);
    if (before && !args[1]) return { requiresReactivation: true, id: before.id, name: before.name };
    value = { id: before?.id || "BR-" + crypto.randomUUID(), name: before?.name || name, active: true, version: (before?.version || 0) + 1 };
  } else {
    before = brands.find((b) => b.id === String(args[0]));
    if (!before) fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A Brand", 404);
    value = { ...before, active: false, version: before.version + 1 };
  }
  return repo.commit(req, "brands", value.id, before, { id: value.id, name: value.name, normalized_name: PartCore.normalize(value.name), is_active: Number(value.active), version: value.version }, value);
}
__name(saveBrand, "saveBrand");
async function saveMachineType(repo, actor, env, req, method, args) {
  const types = await repo.machineTypes();
  let before, value;
  if (method === "createMachineType") {
    const name = String(args[0] || "").trim().replace(/\s+/g, " ");
    if (!name || name.length > 100) fail("VALIDATION", "\u0E01\u0E23\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23 1\u2013100 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23");
    before = types.find((t) => MachineCore.normalize(t.name) === MachineCore.normalize(name));
    if (before?.active) fail("DUPLICATE", "\u0E21\u0E35\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23\u0E19\u0E35\u0E49\u0E41\u0E25\u0E49\u0E27", 409);
    if (before && !args[1]) return { requiresReactivation: true, id: before.id, name: before.name };
    value = { id: before?.id || "MT-" + crypto.randomUUID(), name: before?.name || name, active: true, version: (before?.version || 0) + 1 };
  } else {
    authorizeDelete(actor, env, "machines");
    before = types.find((t) => t.id === String(args[0]));
    if (!before) fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E31\u0E01\u0E23\u0E19\u0E35\u0E49", 404);
    value = { ...before, active: false, version: before.version + 1 };
  }
  return repo.commit(req, "machine_types", value.id, before, { id: value.id, name: value.name, normalized_name: MachineCore.normalize(value.name), is_active: Number(value.active), version: value.version }, value);
}
__name(saveMachineType, "saveMachineType");

// src/user-service.js
function ensureAdmin(actor) {
  if (actor.permissions?.users !== "admin" && actor.role !== "admin") {
    fail("FORBIDDEN", "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E43\u0E19\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19", 403);
  }
}
__name(ensureAdmin, "ensureAdmin");
async function listUsers(env, actor) {
  ensureAdmin(actor);
  const rows = await env.DB.prepare(
    "SELECT id, username, display_name, role, user_type, expires_at, permissions_json, is_active, created_at, updated_at FROM app_users ORDER BY username"
  ).all();
  return (rows.results || []).map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    role: u.role,
    userType: u.user_type || "permanent",
    expiresAt: u.expires_at || null,
    permissions: JSON.parse(u.permissions_json || "{}"),
    isActive: Boolean(u.is_active),
    createdAt: u.created_at,
    updatedAt: u.updated_at
  }));
}
__name(listUsers, "listUsers");
async function createUser(env, actor, payload) {
  ensureAdmin(actor);
  const username = payload.username?.trim().toLowerCase();
  const password = payload.password;
  const displayName = payload.displayName?.trim() || username;
  const role = payload.role || "viewer";
  const userType = payload.userType === "temporary" ? "temporary" : "permanent";
  const expiresAt = userType === "temporary" ? payload.expiresAt || null : null;
  const permissions = payload.permissions || {};
  if (!username || !/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) {
    fail("VALIDATION", "\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23\u0E20\u0E32\u0E29\u0E32\u0E2D\u0E31\u0E07\u0E01\u0E24\u0E29 \u0E15\u0E31\u0E27\u0E40\u0E25\u0E02 3-30 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23", 422);
  }
  if (!password || password.length < 5) {
    fail("VALIDATION", "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 5 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23", 422);
  }
  if (userType === "temporary" && !expiresAt) {
    fail("VALIDATION", "\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E27\u0E31\u0E19\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38", 422);
  }
  const existing = await env.DB.prepare("SELECT id FROM app_users WHERE username=?").bind(username).first();
  if (existing) fail("CONFLICT", "\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E19\u0E35\u0E49\u0E21\u0E35\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E43\u0E0A\u0E49\u0E0A\u0E37\u0E48\u0E2D\u0E2D\u0E37\u0E48\u0E19", 409);
  const salt = crypto.randomUUID().replace(/-/g, "");
  const hash2 = await hashPassword(password, salt);
  const id = "usr-" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const permsJson = JSON.stringify(permissions);
  await env.DB.prepare(
    "INSERT INTO app_users (id, username, password_hash, password_salt, display_name, role, user_type, expires_at, permissions_json, is_active, force_password_change, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)"
  ).bind(id, username, hash2, salt, displayName, role, userType, expiresAt, permsJson, now, now).run();
  return { id, username, displayName, role, userType, expiresAt, permissions, isActive: true };
}
__name(createUser, "createUser");
async function updateUser(env, actor, id, payload) {
  ensureAdmin(actor);
  const user = await env.DB.prepare("SELECT * FROM app_users WHERE id=?").bind(id).first();
  if (!user) fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E19\u0E35\u0E49\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A", 404);
  const displayName = payload.displayName?.trim() || user.display_name;
  const role = payload.role || user.role;
  const userType = payload.userType === "temporary" ? "temporary" : "permanent";
  const expiresAt = userType === "temporary" ? payload.expiresAt || user.expires_at : null;
  const permissions = payload.permissions || JSON.parse(user.permissions_json || "{}");
  const isActive = typeof payload.isActive === "boolean" ? payload.isActive ? 1 : 0 : user.is_active;
  if (userType === "temporary" && !expiresAt) {
    fail("VALIDATION", "\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E27\u0E31\u0E19\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38", 422);
  }
  if (user.username === actor.username && isActive === 0) {
    fail("VALIDATION", "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E23\u0E30\u0E07\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E02\u0E2D\u0E07\u0E15\u0E19\u0E40\u0E2D\u0E07\u0E44\u0E14\u0E49", 422);
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const permsJson = JSON.stringify(permissions);
  await env.DB.prepare(
    "UPDATE app_users SET display_name=?, role=?, user_type=?, expires_at=?, permissions_json=?, is_active=?, updated_at=? WHERE id=?"
  ).bind(displayName, role, userType, expiresAt, permsJson, isActive, now, id).run();
  if (isActive === 0) {
    await env.DB.prepare("DELETE FROM app_sessions WHERE user_id=?").bind(id).run();
  }
  return { id, username: user.username, displayName, role, userType, expiresAt, permissions, isActive: Boolean(isActive) };
}
__name(updateUser, "updateUser");
async function resetPassword(env, actor, id) {
  ensureAdmin(actor);
  const user = await env.DB.prepare("SELECT * FROM app_users WHERE id=?").bind(id).first();
  if (!user) fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E19\u0E35\u0E49\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A", 404);
  const salt = crypto.randomUUID().replace(/-/g, "");
  const hash2 = await hashPassword("1234", salt);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await env.DB.prepare(
    "UPDATE app_users SET password_hash=?, password_salt=?, force_password_change=1, updated_at=? WHERE id=?"
  ).bind(hash2, salt, now, id).run();
  await env.DB.prepare("DELETE FROM app_sessions WHERE user_id=?").bind(id).run();
  return { ok: true, message: "\u0E23\u0E35\u0E40\u0E0B\u0E47\u0E15\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E40\u0E1B\u0E47\u0E19 1234 \u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22 \u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E08\u0E30\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E17\u0E31\u0E19\u0E17\u0E35\u0E17\u0E35\u0E48\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A" };
}
__name(resetPassword, "resetPassword");
async function deleteUser(env, actor, id) {
  ensureAdmin(actor);
  const user = await env.DB.prepare("SELECT * FROM app_users WHERE id=?").bind(id).first();
  if (!user) fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E19\u0E35\u0E49\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A", 404);
  if (user.username === actor.username || user.username === "admin") {
    fail("FORBIDDEN", "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E25\u0E1A\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E02\u0E2D\u0E07\u0E15\u0E19\u0E40\u0E2D\u0E07\u0E2B\u0E23\u0E37\u0E2D\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E2B\u0E25\u0E31\u0E01\u0E02\u0E2D\u0E07\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E14\u0E49", 403);
  }
  await env.DB.prepare("DELETE FROM app_sessions WHERE user_id=?").bind(id).run();
  await env.DB.prepare("DELETE FROM app_users WHERE id=?").bind(id).run();
  return { ok: true };
}
__name(deleteUser, "deleteUser");

// src/announcement-service.js
async function listAnnouncements(env) {
  const items = await env.DB.prepare("SELECT * FROM announcements ORDER BY sort_order ASC, created_at DESC").all();
  const settings = await env.DB.prepare("SELECT * FROM announcement_settings WHERE id='main'").first();
  const mappedItems = (items.results || []).map((r) => ({
    id: r.id,
    title: r.title,
    media_type: r.media_type,
    mediaType: r.media_type,
    file_id: r.file_id,
    fileId: r.file_id,
    file_name: r.file_name,
    fileName: r.file_name,
    file_url: r.file_url,
    fileUrl: r.file_url,
    sort_order: r.sort_order,
    sortOrder: r.sort_order,
    is_active: !!r.is_active,
    isActive: !!r.is_active,
    created_at: r.created_at,
    createdAt: r.created_at,
    created_by: r.created_by,
    createdBy: r.created_by
  }));
  return {
    success: true,
    items: mappedItems,
    announcements: mappedItems,
    settings: settings ? {
      company_last_incident: settings.company_last_incident || "2023-10-28",
      company_target_days: settings.company_target_days || 1200,
      dept_last_incident: settings.dept_last_incident || "2016-09-12",
      dept_target_days: settings.dept_target_days || 3802,
      slide_interval_sec: settings.slide_interval_seconds || 60,
      show_clock: settings.show_clock !== void 0 ? Boolean(settings.show_clock) : true,
      show_safety: settings.show_safety !== void 0 ? Boolean(settings.show_safety) : true,
      force_media_id: settings.force_media_id || "",
      force_timestamp: settings.force_timestamp || 0,
      current_media_id: settings.current_media_id || ""
    } : null
  };
}
__name(listAnnouncements, "listAnnouncements");
async function createAnnouncement(env, actor, payload, requestId) {
  authorizeWrite(actor, env, "announcements");
  if (!payload || !payload.title) fail("VALIDATION", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E0A\u0E37\u0E48\u0E2D\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E0A\u0E32\u0E2A\u0E31\u0E21\u0E1E\u0E31\u0E19\u0E18\u0E4C");
  const id = "ANN-" + crypto.randomUUID().slice(0, 8);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const image = payload.image || (payload.data_base64 || payload.dataBase64 ? {
    mime: payload.mime_type || payload.mimeType || payload.mime || (payload.media_type === "video" ? "video/mp4" : "image/jpeg"),
    base64: (payload.data_base64 || payload.dataBase64).includes(",") ? (payload.data_base64 || payload.dataBase64).split(",")[1] : payload.data_base64 || payload.dataBase64
  } : null);
  let fileId2 = "", fileName = "", fileUrl = "";
  const mediaType = payload.mediaType || payload.media_type || (image?.mime?.startsWith("video/") ? "video" : "image");
  if (image) {
    const req = { key: "ANN_REQ_" + requestId, actor: actor.id, payloadHash: requestId, now };
    const uploadRes = await uploadPicture(env, "announcements", req, "media", image, id, 5e7);
    fileId2 = uploadRes.id;
    fileName = uploadRes.name;
    fileUrl = uploadRes.url;
  }
  await env.DB.prepare(
    "INSERT INTO announcements (id, title, media_type, file_id, file_name, file_url, sort_order, is_active, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)"
  ).bind(id, payload.title.trim(), mediaType, fileId2, fileName, fileUrl, Number(payload.sortOrder || payload.sort_order) || 0, now, actor.id, now, actor.id).run();
  return { id, title: payload.title, fileUrl, success: true };
}
__name(createAnnouncement, "createAnnouncement");
async function deleteAnnouncement(env, actor, idOrPayload) {
  authorizeDelete(actor, env, "announcements");
  const id = typeof idOrPayload === "object" && idOrPayload !== null ? idOrPayload.id : idOrPayload;
  const existing = await env.DB.prepare("SELECT * FROM announcements WHERE id=?").bind(id).first();
  if (!existing) fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2A\u0E37\u0E48\u0E2D\u0E1B\u0E23\u0E30\u0E0A\u0E32\u0E2A\u0E31\u0E21\u0E1E\u0E31\u0E19\u0E18\u0E4C\u0E19\u0E35\u0E49", 404);
  if (existing.file_id) {
    await deleteDriveFile(env, existing.file_id);
  }
  await env.DB.prepare("DELETE FROM announcements WHERE id=?").bind(id).run();
  return { id, success: true };
}
__name(deleteAnnouncement, "deleteAnnouncement");
async function updateAnnouncementSettings(env, actor, payload) {
  authorizeWrite(actor, env, "announcements");
  const settings = payload?.settings || payload || {};
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (settings.media_id || settings.mediaId) {
    const mediaId = settings.media_id || settings.mediaId;
    const isActive = settings.is_active !== void 0 ? settings.is_active ? 1 : 0 : 1;
    await env.DB.prepare("UPDATE announcements SET is_active=?, updated_at=?, updated_by=? WHERE id=?").bind(isActive, now, actor.id, mediaId).run();
    return { success: true, media_id: mediaId, is_active: isActive };
  }
  const companyLast = settings.company_last_incident || settings.companyLastIncident || "2023-10-28";
  const companyTarget = Number(settings.company_target_days || settings.companyTargetDays) || 1200;
  const deptLast = settings.dept_last_incident || settings.deptLastIncident || "2016-09-12";
  const deptTarget = Number(settings.dept_target_days || settings.deptTargetDays) || 3802;
  const slideInterval = Number(settings.slide_interval_sec || settings.slideIntervalSeconds) || 60;
  const showClock = settings.show_clock !== void 0 ? settings.show_clock ? 1 : 0 : settings.showClock ? 1 : 0;
  const showSafety = settings.show_safety !== void 0 ? settings.show_safety ? 1 : 0 : settings.showSafety ? 1 : 0;
  await env.DB.prepare(
    "INSERT INTO announcement_settings (id, company_last_incident, company_target_days, dept_last_incident, dept_target_days, slide_interval_seconds, show_clock, show_safety, updated_at) VALUES ('main', ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET company_last_incident=excluded.company_last_incident, company_target_days=excluded.company_target_days, dept_last_incident=excluded.dept_last_incident, dept_target_days=excluded.dept_target_days, slide_interval_seconds=excluded.slide_interval_seconds, show_clock=excluded.show_clock, show_safety=excluded.show_safety, updated_at=excluded.updated_at"
  ).bind(
    companyLast,
    companyTarget,
    deptLast,
    deptTarget,
    slideInterval,
    showClock,
    showSafety,
    now
  ).run();
  return { success: true };
}
__name(updateAnnouncementSettings, "updateAnnouncementSettings");
async function getAnnouncementMedia(env, id, request) {
  const item = await env.DB.prepare("SELECT * FROM announcements WHERE id=?").bind(id).first();
  if (!item || !item.file_id) fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E44\u0E1F\u0E25\u0E4C\u0E19\u0E35\u0E49", 404);
  return streamMedia(env, "announcements", item.file_id, request);
}
__name(getAnnouncementMedia, "getAnnouncementMedia");
async function forceAnnouncementSlide(env, actor, payload) {
  authorizeWrite(actor, env, "announcements");
  const mediaId = payload?.media_id || payload?.mediaId || payload?.id;
  if (!mediaId) fail("VALIDATION", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E2A\u0E37\u0E48\u0E2D\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E41\u0E2A\u0E14\u0E07");
  const now = Date.now();
  await env.DB.prepare("UPDATE announcements SET is_active=1 WHERE id=?").bind(mediaId).run();
  await env.DB.prepare("UPDATE announcement_settings SET force_media_id=?, force_timestamp=?, current_media_id=?, updated_at=CURRENT_TIMESTAMP WHERE id='main'").bind(mediaId, now, mediaId).run();
  return { success: true, force_media_id: mediaId, force_timestamp: now };
}
__name(forceAnnouncementSlide, "forceAnnouncementSlide");
async function reportCurrentAnnouncement(env, payload) {
  const mediaId = payload?.media_id || payload?.mediaId || payload?.id || "";
  if (mediaId) {
    await env.DB.prepare("UPDATE announcement_settings SET current_media_id=? WHERE id='main'").bind(mediaId).run();
  }
  return { success: true };
}
__name(reportCurrentAnnouncement, "reportCurrentAnnouncement");
async function getAnnouncementState(env) {
  const settings = await env.DB.prepare("SELECT force_media_id, force_timestamp, current_media_id, slide_interval_seconds FROM announcement_settings WHERE id='main'").first();
  return {
    force_media_id: settings?.force_media_id || "",
    force_timestamp: settings?.force_timestamp || 0,
    current_media_id: settings?.current_media_id || "",
    slide_interval_sec: settings?.slide_interval_seconds || 60
  };
}
__name(getAnnouncementState, "getAnnouncementState");

// src/pm-service.js
async function getPMReferences(env) {
  const departmentsResult = await env.DB.prepare(
    "SELECT id, name, is_active FROM departments WHERE is_active = 1 ORDER BY name ASC"
  ).all();
  const linesResult = await env.DB.prepare(
    "SELECT l.id, l.name, l.department_id, d.name as department_name, l.remark FROM lines l JOIN departments d ON d.id = l.department_id WHERE l.is_active = 1 ORDER BY d.name ASC, l.name ASC"
  ).all();
  const machinesResult = await env.DB.prepare(
    "SELECT id, code, normalized_code, name, department_id, line_id FROM machines WHERE is_active = 1 ORDER BY code ASC"
  ).all();
  return {
    departments: (departmentsResult.results || []).map((d) => ({
      deptId: d.id,
      deptName: d.name
    })),
    lines: (linesResult.results || []).map((l) => ({
      lineId: l.id,
      lineName: l.name,
      deptId: l.department_id,
      deptName: l.department_name,
      remark: l.remark
    })),
    machines: (machinesResult.results || []).map((m) => ({
      id: m.id,
      code: m.code,
      normalizedCode: m.normalized_code,
      name: m.name,
      deptId: m.department_id,
      lineId: m.line_id
    }))
  };
}
__name(getPMReferences, "getPMReferences");
async function getPMCycleData(env, { lineId, year, roundNo }) {
  if (!lineId) fail("VALIDATION", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E2A\u0E32\u0E22\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15 (Line ID)");
  const y = Number(year) || (/* @__PURE__ */ new Date()).getFullYear();
  const r = Number(roundNo) || 1;
  if (r < 1 || r > 5) fail("VALIDATION", "\u0E23\u0E2D\u0E1A PM \u0E15\u0E49\u0E2D\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07 1 \u0E16\u0E36\u0E07 5 \u0E04\u0E23\u0E31\u0E49\u0E07\u0E15\u0E48\u0E2D\u0E1B\u0E35");
  const line = await env.DB.prepare(
    "SELECT l.id, l.name, l.department_id, d.name as department_name FROM lines l JOIN departments d ON d.id = l.department_id WHERE l.id = ?"
  ).bind(lineId).first();
  if (!line) fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E2A\u0E32\u0E22\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38", 404);
  const cycle = await env.DB.prepare(
    "SELECT * FROM pm_cycles WHERE line_id = ? AND year = ? AND round_no = ?"
  ).bind(lineId, y, r).first();
  const cycleId = cycle ? cycle.id : null;
  let machines = [];
  const targetMonth = cycle ? cycle.target_month : "";
  if (cycleId) {
    const res = await env.DB.prepare(`
      SELECT 
        m.id as machine_id,
        m.code as machine_code,
        m.name as machine_name,
        m.line_order,
        m.status,
        m.criticality,
        pmo.id as order_id,
        COALESCE(pmo.order_no, '') as order_no,
        COALESCE(pmo.budget_amount, 0) as budget_amount,
        COALESCE(pmo.pr_no, '') as pr_no,
        COALESCE(pmo.pr_status, 'PENDING') as pr_status,
        COALESCE(pmo.notes, '') as notes,
        pmo.updated_at,
        COALESCE((
          SELECT SUM(e.amount)
          FROM pm_expenses e
          WHERE (
            (pmo.order_no IS NOT NULL AND TRIM(pmo.order_no) != '' AND (
              TRIM(e.pm_order_no) = TRIM(pmo.order_no)
              OR (e.machine_id = m.id AND TRIM(e.pm_order_no) = TRIM(pmo.order_no))
            ))
            OR (
              (pmo.order_no IS NULL OR TRIM(pmo.order_no) = '')
              AND (e.machine_id = m.id OR LOWER(e.machine_code) = LOWER(m.code))
              AND (? != '' AND STRFTIME('%Y-%m', e.doc_date) = ?)
            )
          )
        ), 0) as used_amount
      FROM machines m
      LEFT JOIN pm_machine_orders pmo 
        ON pmo.machine_id = m.id AND pmo.cycle_id = ?
      WHERE m.line_id = ? AND m.is_active = 1
      ORDER BY CASE WHEN m.line_order IS NULL THEN 1 ELSE 0 END, m.line_order, m.code COLLATE NOCASE, m.id
    `).bind(targetMonth, targetMonth, cycleId, lineId).all();
    machines = res.results || [];
  } else {
    const res = await env.DB.prepare(`
      SELECT 
        m.id as machine_id,
        m.code as machine_code,
        m.name as machine_name,
        m.line_order,
        m.status,
        m.criticality,
        NULL as order_id,
        '' as order_no,
        0 as budget_amount,
        '' as pr_no,
        'PENDING' as pr_status,
        '' as notes,
        NULL as updated_at,
        0 as used_amount
      FROM machines m
      WHERE m.line_id = ? AND m.is_active = 1
      ORDER BY CASE WHEN m.line_order IS NULL THEN 1 ELSE 0 END, m.line_order, m.code COLLATE NOCASE, m.id
    `).bind(lineId).all();
    machines = res.results || [];
  }
  const roundsRes = await env.DB.prepare(`
    SELECT 
      c.id,
      c.round_no,
      c.target_month,
      c.plan_date,
      c.status,
      c.updated_at,
      (SELECT COUNT(*) FROM pm_machine_orders mo WHERE mo.cycle_id = c.id AND TRIM(mo.order_no) != '') as filled_count
    FROM pm_cycles c
    WHERE c.line_id = ? AND c.year = ?
    ORDER BY c.round_no ASC
  `).bind(lineId, y).all();
  const existingRounds = roundsRes.results || [];
  const yearRounds = [1, 2, 3, 4, 5].map((roundNum) => {
    const match = existingRounds.find((item) => item.round_no === roundNum);
    return {
      roundNo: roundNum,
      exists: Boolean(match),
      cycleId: match ? match.id : null,
      targetMonth: match ? match.target_month : "",
      planDate: match ? match.plan_date : "",
      status: match ? match.status : "PENDING",
      filledCount: match ? match.filled_count : 0,
      totalMachines: machines.length
    };
  });
  return {
    lineId: line.id,
    lineName: line.name,
    departmentId: line.department_id,
    departmentName: line.department_name,
    year: y,
    roundNo: r,
    cycle: cycle ? {
      id: cycle.id,
      targetMonth: cycle.target_month,
      planDate: cycle.plan_date,
      status: cycle.status,
      notes: cycle.notes,
      updatedAt: cycle.updated_at,
      updatedBy: cycle.updated_by
    } : null,
    targetMonth: cycle ? cycle.target_month : "",
    planDate: cycle ? cycle.plan_date : "",
    notes: cycle ? cycle.notes : "",
    machines: machines.map((m) => ({
      machineId: m.machine_id,
      machineCode: m.machine_code,
      machineName: m.machine_name,
      orderNo: m.order_no,
      budgetAmount: Number(m.budget_amount) || 0,
      usedAmount: Number(m.used_amount) || 0,
      prNo: m.pr_no,
      prStatus: m.pr_status,
      notes: m.notes,
      isFilled: Boolean(m.order_no && m.order_no.trim().length > 0)
    })),
    yearRounds
  };
}
__name(getPMCycleData, "getPMCycleData");
async function savePMCycleOrders(env, actor, payload) {
  try {
    authorizeWrite(actor, env, "pm");
  } catch (err) {
    authorizeWrite(actor, env, "machines");
  }
  if (!payload) fail("VALIDATION", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01");
  const { lineId, departmentId, year, roundNo, targetMonth = "", planDate = "", notes = "", orders = [] } = payload;
  if (!lineId) fail("VALIDATION", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E2A\u0E32\u0E22\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15 (Line ID)");
  const y = Number(year) || (/* @__PURE__ */ new Date()).getFullYear();
  const r = Number(roundNo);
  if (!r || r < 1 || r > 5) fail("VALIDATION", "\u0E23\u0E2D\u0E1A PM \u0E15\u0E49\u0E2D\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07 1 \u0E16\u0E36\u0E07 5 \u0E04\u0E23\u0E31\u0E49\u0E07\u0E15\u0E48\u0E2D\u0E1B\u0E35");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const user = actor.username || actor.id || "system";
  let deptId = departmentId;
  if (!deptId) {
    const lineRow = await env.DB.prepare("SELECT department_id FROM lines WHERE id = ?").bind(lineId).first();
    if (!lineRow) fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E2A\u0E32\u0E22\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38", 404);
    deptId = lineRow.department_id;
  }
  const cycleId = `PMC-${lineId}-${y}-R${r}`;
  const existingCycle = await env.DB.prepare("SELECT id FROM pm_cycles WHERE id = ?").bind(cycleId).first();
  const statements = [];
  if (existingCycle) {
    statements.push(
      env.DB.prepare(`
        UPDATE pm_cycles 
        SET target_month = ?, plan_date = ?, notes = ?, updated_at = ?, updated_by = ?
        WHERE id = ?
      `).bind(targetMonth, planDate, notes, now, user, cycleId)
    );
  } else {
    statements.push(
      env.DB.prepare(`
        INSERT INTO pm_cycles (
          id, department_id, line_id, year, round_no, 
          target_month, plan_date, status, notes, 
          created_at, created_by, updated_at, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?)
      `).bind(cycleId, deptId, lineId, y, r, targetMonth, planDate, notes, now, user, now, user)
    );
  }
  for (const item of orders) {
    if (!item.machineId) continue;
    const orderNo = String(item.orderNo || "").trim();
    const budgetAmount = Math.max(0, parseFloat(String(item.budgetAmount || "0").replace(/,/g, "")) || 0);
    const prNo = String(item.prNo || "").trim();
    const itemNotes = String(item.notes || "").trim();
    const orderId = `PMO-${cycleId}-${item.machineId}`;
    const prStatus = orderNo ? prNo ? "PR_OPENED" : "ORDER_ASSIGNED" : "PENDING";
    statements.push(
      env.DB.prepare(`
        INSERT INTO pm_machine_orders (
          id, cycle_id, machine_id, order_no, budget_amount, pr_no, pr_status, notes,
          created_at, created_by, updated_at, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(cycle_id, machine_id) DO UPDATE SET
          order_no = excluded.order_no,
          budget_amount = excluded.budget_amount,
          pr_no = excluded.pr_no,
          pr_status = excluded.pr_status,
          notes = excluded.notes,
          updated_at = excluded.updated_at,
          updated_by = excluded.updated_by
      `).bind(orderId, cycleId, item.machineId, orderNo, budgetAmount, prNo, prStatus, itemNotes, now, user, now, user)
    );
  }
  await env.DB.batch(statements);
  return {
    success: true,
    cycleId,
    lineId,
    year: y,
    roundNo: r,
    savedCount: orders.length,
    updatedAt: now
  };
}
__name(savePMCycleOrders, "savePMCycleOrders");
async function listPMOverview(env, { year, deptId }) {
  const y = Number(year) || (/* @__PURE__ */ new Date()).getFullYear();
  let sql = `
    SELECT 
      l.id as line_id,
      l.name as line_name,
      l.department_id,
      d.name as department_name,
      (SELECT COUNT(*) FROM machines m WHERE m.line_id = l.id AND m.is_active = 1) as total_machines
    FROM lines l
    JOIN departments d ON d.id = l.department_id
    WHERE l.is_active = 1
  `;
  const params = [];
  if (deptId) {
    sql += " AND l.department_id = ?";
    params.push(deptId);
  }
  sql += " ORDER BY d.name ASC, l.name ASC";
  const linesRes = await env.DB.prepare(sql).bind(...params).all();
  const lines = linesRes.results || [];
  const cyclesRes = await env.DB.prepare(`
    SELECT 
      c.id,
      c.line_id,
      c.round_no,
      c.target_month,
      c.status,
      c.updated_at,
      (SELECT COUNT(*) FROM pm_machine_orders mo WHERE mo.cycle_id = c.id AND TRIM(mo.order_no) != '') as filled_count
    FROM pm_cycles c
    WHERE c.year = ?
  `).bind(y).all();
  const cycles = cyclesRes.results || [];
  const overview = lines.map((line) => {
    const lineCycles = cycles.filter((c) => c.line_id === line.line_id);
    const rounds = [1, 2, 3, 4, 5].map((roundNum) => {
      const c = lineCycles.find((item) => item.round_no === roundNum);
      return {
        roundNo: roundNum,
        cycleId: c ? c.id : null,
        targetMonth: c ? c.target_month : "",
        status: c ? c.status : "PENDING",
        filledCount: c ? c.filled_count : 0,
        totalMachines: line.total_machines,
        isComplete: Boolean(c && line.total_machines > 0 && c.filled_count >= line.total_machines)
      };
    });
    return {
      lineId: line.line_id,
      lineName: line.line_name,
      deptId: line.department_id,
      deptName: line.department_name,
      totalMachines: line.total_machines,
      rounds
    };
  });
  return {
    year: y,
    overview
  };
}
__name(listPMOverview, "listPMOverview");

// src/pm-expense-service.js
function getTwoYearCutoffDate() {
  const d = /* @__PURE__ */ new Date();
  d.setFullYear(d.getFullYear() - 2);
  return d.toISOString().slice(0, 10);
}
__name(getTwoYearCutoffDate, "getTwoYearCutoffDate");
async function pruneOldExpenses(env) {
  const cutoff = getTwoYearCutoffDate();
  const res = await env.DB.prepare("DELETE FROM pm_expenses WHERE doc_date < ?").bind(cutoff).run();
  return res.meta?.changes || 0;
}
__name(pruneOldExpenses, "pruneOldExpenses");
async function listExpenses(env, query = {}) {
  const {
    search = "",
    deptId = "",
    lineId = "",
    machineCode = "",
    startDate = "",
    endDate = "",
    limit = 50,
    offset = 0
  } = query;
  const conditions = [];
  const params = [];
  const cutoff = getTwoYearCutoffDate();
  conditions.push("e.doc_date >= ?");
  params.push(cutoff);
  if (deptId) {
    conditions.push("e.department_id = ?");
    params.push(deptId);
  }
  if (lineId) {
    conditions.push("e.line_id = ?");
    params.push(lineId);
  }
  if (machineCode) {
    conditions.push("LOWER(e.machine_code) = LOWER(?)");
    params.push(machineCode.trim());
  }
  if (startDate) {
    conditions.push("e.doc_date >= ?");
    params.push(startDate);
  }
  if (endDate) {
    conditions.push("e.doc_date <= ?");
    params.push(endDate);
  }
  if (search && search.trim()) {
    const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    words.forEach((word) => {
      conditions.push("(LOWER(e.description) LIKE ? OR LOWER(e.machine_code) LIKE ? OR LOWER(e.pm_order_no) LIKE ? OR LOWER(e.material_no) LIKE ? OR LOWER(e.doc_no) LIKE ? OR LOWER(e.line_id) LIKE ?)");
      const pattern = `%${word}%`;
      params.push(pattern, pattern, pattern, pattern, pattern, pattern);
    });
  }
  const whereClause = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
  const countSql = `
    SELECT 
      COUNT(*) as total_count,
      COALESCE(SUM(amount), 0) as total_amount
    FROM pm_expenses e
    ${whereClause}
  `;
  const countRow = await env.DB.prepare(countSql).bind(...params).first();
  const totalCount = countRow?.total_count || 0;
  const totalAmount = countRow?.total_amount || 0;
  const pageLimit = Math.min(500, Math.max(1, Number(limit) || 50));
  const pageOffset = Math.max(0, Number(offset) || 0);
  const dataSql = `
    SELECT 
      e.*,
      m.name as machine_name,
      l.name as line_name,
      d.name as department_name
    FROM pm_expenses e
    LEFT JOIN machines m ON m.id = e.machine_id
    LEFT JOIN lines l ON l.id = e.line_id
    LEFT JOIN departments d ON d.id = e.department_id
    ${whereClause}
    ORDER BY e.doc_date DESC, e.doc_no DESC, e.id DESC
    LIMIT ? OFFSET ?
  `;
  const rows = await env.DB.prepare(dataSql).bind(...params, pageLimit, pageOffset).all();
  return {
    items: (rows.results || []).map((r) => ({
      id: r.id,
      docDate: r.doc_date,
      doc_date: r.doc_date,
      departmentId: r.department_id,
      department_id: r.department_id,
      departmentName: r.department_name,
      department_name: r.department_name,
      lineId: r.line_id,
      line_id: r.line_id,
      lineName: r.line_name,
      line_name: r.line_name,
      machineCode: r.machine_code,
      machine_code: r.machine_code,
      machineId: r.machine_id,
      machine_id: r.machine_id,
      machineName: r.machine_name,
      machine_name: r.machine_name,
      pmOrderNo: r.pm_order_no,
      pm_order_no: r.pm_order_no,
      materialNo: r.material_no,
      material_no: r.material_no,
      description: r.description,
      quantity: r.quantity,
      uom: r.uom,
      unitPrice: r.unit_price,
      unit_price: r.unit_price,
      amount: r.amount,
      docNo: r.doc_no,
      doc_no: r.doc_no,
      costCenter: r.cost_center,
      cost_center: r.cost_center,
      functionalLoc: r.functional_loc,
      functional_loc: r.functional_loc,
      notes: r.notes
    })),
    totalCount,
    totalAmount,
    limit: pageLimit,
    offset: pageOffset
  };
}
__name(listExpenses, "listExpenses");
async function importExpenseRecords(env, actor, rawItems = []) {
  try {
    authorizeWrite(actor, env, "pm");
  } catch (_) {
    authorizeWrite(actor, env, "machines");
  }
  const items = Array.isArray(rawItems) ? rawItems : Array.isArray(rawItems?.records) ? rawItems.records : Array.isArray(rawItems?.items) ? rawItems.items : [];
  if (!items.length) {
    fail("VALIDATION", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32");
  }
  await pruneOldExpenses(env);
  const cutoff = getTwoYearCutoffDate();
  const machinesRes = await env.DB.prepare(
    "SELECT id, code, normalized_code, name, department_id, line_id, is_active FROM machines"
  ).all();
  const machineList = machinesRes.results || [];
  machineList.sort((a, b) => (a.is_active || 0) - (b.is_active || 0));
  const machineMap = /* @__PURE__ */ new Map();
  machineList.forEach((m) => {
    if (m.code) machineMap.set(m.code.trim().toUpperCase(), m);
    if (m.normalized_code) machineMap.set(m.normalized_code.trim().toUpperCase(), m);
  });
  const linesRes = await env.DB.prepare(
    "SELECT id, department_id, name FROM lines WHERE is_active = 1"
  ).all();
  const lineList = linesRes.results || [];
  const lineMap = /* @__PURE__ */ new Map();
  lineList.forEach((l) => lineMap.set(l.id.toUpperCase(), l));
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const user = actor.username || actor.id || "system";
  let importedCount = 0;
  let skippedOldCount = 0;
  let linkedMachineCount = 0;
  const statements = [];
  const parseSapNumber = /* @__PURE__ */ __name((val) => {
    if (val === null || val === void 0) return 0;
    let s = String(val).trim().replace(/,/g, "");
    if (s.endsWith("-")) {
      s = "-" + s.slice(0, -1);
    }
    return parseFloat(s) || 0;
  }, "parseSapNumber");
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let docDate = String(item.docDate || item["Posting date"] || "").trim();
    if (/^\d{8}$/.test(docDate)) {
      docDate = `${docDate.slice(0, 4)}-${docDate.slice(4, 6)}-${docDate.slice(6, 8)}`;
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(docDate)) {
      const parts = docDate.split("/");
      docDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
    if (docDate && docDate < cutoff) {
      skippedOldCount++;
      continue;
    }
    const machineCode = String(item.machineCode || item.Equipment || item.equipment || "").trim();
    const rawOrder = String(item.pmOrderNo || item.Order || item.order || "").trim();
    const pmOrderNo = rawOrder.replace(/^0+/, "") || rawOrder;
    const docNo = String(item.docNo || item["Doc. no."] || "").trim();
    const materialNo = String(item.materialNo || item["Material no."] || item.material || "").trim();
    const rawDesc = String(item.description || item.Description || "").trim();
    let description = rawDesc;
    if (materialNo) {
      if (description) {
        if (!description.includes(materialNo)) {
          description = `${description} (${materialNo})`;
        }
      } else {
        description = materialNo;
      }
    }
    const costCenter = String(item.costCenter || item["Cost ctr."] || "").trim();
    const functionalLoc = String(item.functionalLoc || item["Functional Loc."] || "").trim();
    const uom = String(item.uom || item.UOM || "EA").trim();
    const plant = String(item.plant || item.Plant || "1200").trim();
    const movementType = String(item.movementType || item["Mvt."] || "261").trim();
    const orderType = String(item.orderType || item.type || "1PMO").trim();
    const quantity = parseSapNumber(item.quantity !== void 0 ? item.quantity : item["Qty."]);
    const amount = parseSapNumber(item.amount !== void 0 ? item.amount : item.Amount);
    let unitPrice = 0;
    if (item.unitPrice !== void 0 && Number(item.unitPrice) > 0) {
      unitPrice = Number(item.unitPrice);
    } else if (quantity !== 0) {
      unitPrice = Math.abs(amount / quantity);
    }
    let machineId = null;
    let departmentId = null;
    let lineId = null;
    if (machineCode) {
      const matchedMachine = machineMap.get(machineCode.toUpperCase());
      if (matchedMachine) {
        machineId = matchedMachine.id;
        departmentId = matchedMachine.department_id;
        lineId = matchedMachine.line_id;
        linkedMachineCount++;
      }
    }
    if (!lineId && functionalLoc) {
      const match = functionalLoc.match(/-([A-Z0-9]+)-(L[A-Z0-9_-]+)/i);
      if (match) {
        const potentialDept = match[1].toUpperCase();
        const potentialLine = match[2].toUpperCase();
        const matchedLine = lineMap.get(potentialLine);
        if (matchedLine) {
          lineId = matchedLine.id;
          departmentId = matchedLine.department_id;
        } else {
          departmentId = potentialDept;
          lineId = potentialLine;
        }
      }
    }
    if (!departmentId && item.departmentId) departmentId = item.departmentId;
    if (!lineId && item.lineId) lineId = item.lineId;
    const id = item.id || `EXP-${docNo || "NO"}-${docDate || "DATE"}-${materialNo || "MAT"}-${i}-${Date.now().toString(36)}`;
    statements.push(
      env.DB.prepare(`
        INSERT INTO pm_expenses (
          id, plant, gl_account, cost_center, machine_code, machine_id,
          department_id, line_id, pm_order_no, doc_date, doc_no, movement_type,
          material_no, description, quantity, uom, unit_price, amount,
          order_type, po_no, functional_loc, work_center, notes,
          imported_at, imported_by, created_at, created_by, updated_at, updated_by
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, '',
          ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          machine_id = excluded.machine_id,
          department_id = excluded.department_id,
          line_id = excluded.line_id,
          quantity = excluded.quantity,
          amount = excluded.amount,
          unit_price = excluded.unit_price,
          description = excluded.description,
          updated_at = excluded.updated_at,
          updated_by = excluded.updated_by
      `).bind(
        id,
        plant,
        item.glAccount || "0000071111",
        costCenter,
        machineCode,
        machineId,
        departmentId,
        lineId,
        pmOrderNo,
        docDate,
        docNo,
        movementType,
        materialNo,
        description,
        quantity,
        uom,
        unitPrice,
        amount,
        orderType,
        item.poNo || "",
        functionalLoc,
        item.workCenter || "EC-420",
        now,
        user,
        now,
        user,
        now,
        user
      )
    );
    importedCount++;
  }
  const BATCH_SIZE = 50;
  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    const chunk = statements.slice(i, i + BATCH_SIZE);
    await env.DB.batch(chunk);
  }
  return {
    success: true,
    totalRecords: items.length,
    importedCount,
    skippedOldCount,
    linkedMachineCount,
    retentionCutoff: cutoff
  };
}
__name(importExpenseRecords, "importExpenseRecords");
async function deleteExpenseItem(env, actor, id) {
  authorizeDelete(actor, env, "pm");
  if (!id) fail("VALIDATION", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E2B\u0E31\u0E2A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23");
  await env.DB.prepare("DELETE FROM pm_expenses WHERE id = ?").bind(id).run();
  return { success: true, deletedId: id };
}
__name(deleteExpenseItem, "deleteExpenseItem");
async function clearAllExpenses(env, actor) {
  try {
    authorizeDelete(actor, env, "pm");
  } catch (_) {
    authorizeDelete(actor, env, "machines");
  }
  const res = await env.DB.prepare("DELETE FROM pm_expenses").run();
  return { success: true, deletedCount: res.meta?.changes || 0 };
}
__name(clearAllExpenses, "clearAllExpenses");
async function deleteExpensesByRange(env, actor, { startDate, endDate, deptId } = {}) {
  try {
    authorizeDelete(actor, env, "pm");
  } catch (_) {
    authorizeDelete(actor, env, "machines");
  }
  const conditions = [];
  const params = [];
  if (startDate) {
    conditions.push("doc_date >= ?");
    params.push(startDate.trim());
  }
  if (endDate) {
    conditions.push("doc_date <= ?");
    params.push(endDate.trim());
  }
  if (deptId && deptId.trim()) {
    conditions.push("department_id = ?");
    params.push(deptId.trim());
  }
  if (!conditions.length) {
    fail("VALIDATION", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E0A\u0E48\u0E27\u0E07\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E25\u0E1A");
  }
  const sql = `DELETE FROM pm_expenses WHERE ${conditions.join(" AND ")}`;
  const res = await env.DB.prepare(sql).bind(...params).run();
  return {
    success: true,
    deletedCount: res.meta?.changes || 0,
    startDate,
    endDate,
    deptId
  };
}
__name(deleteExpensesByRange, "deleteExpensesByRange");
async function saveExpenseItem(env, actor, payload) {
  authorizeWrite(actor, env, "pm");
  if (!payload || !payload.id) fail("VALIDATION", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const user = actor.username || actor.id || "system";
  await env.DB.prepare(`
    UPDATE pm_expenses
    SET 
      doc_date = ?,
      department_id = ?,
      line_id = ?,
      machine_code = ?,
      pm_order_no = ?,
      description = ?,
      quantity = ?,
      unit_price = ?,
      amount = ?,
      notes = ?,
      updated_at = ?,
      updated_by = ?
    WHERE id = ?
  `).bind(
    payload.docDate,
    payload.departmentId || null,
    payload.lineId || null,
    payload.machineCode || "",
    payload.pmOrderNo || "",
    payload.description || "",
    Number(payload.quantity) || 0,
    Number(payload.unitPrice) || 0,
    Number(payload.amount) || 0,
    payload.notes || "",
    now,
    user,
    payload.id
  ).run();
  return { success: true, id: payload.id };
}
__name(saveExpenseItem, "saveExpenseItem");
async function getDashboardData(env, { startDate, endDate, deptId, dept } = {}) {
  const cutoff = getTwoYearCutoffDate();
  const start = startDate || `${(/* @__PURE__ */ new Date()).getFullYear()}-01-01`;
  const end = endDate || `${(/* @__PURE__ */ new Date()).getFullYear()}-12-31`;
  const targetDept = (deptId || dept || "").trim();
  const year = parseInt(start.slice(0, 4), 10) || (/* @__PURE__ */ new Date()).getFullYear();
  let linesSql = `
    SELECT 
      l.id as line_id,
      l.name as line_name,
      l.department_id,
      d.name as department_name
    FROM lines l
    JOIN departments d ON d.id = l.department_id
    WHERE l.is_active = 1
  `;
  const lineParams = [];
  if (targetDept) {
    linesSql += " AND l.department_id = ?";
    lineParams.push(targetDept);
  }
  linesSql += " ORDER BY d.name ASC, l.name ASC";
  const linesRes = await env.DB.prepare(linesSql).bind(...lineParams).all();
  const lines = linesRes.results || [];
  const lineMap = /* @__PURE__ */ new Map();
  lines.forEach((l) => {
    lineMap.set(l.line_id, {
      lineId: l.line_id,
      lineName: l.line_name,
      deptId: l.department_id,
      deptName: l.department_name
    });
  });
  let expenseSql = `
    SELECT 
      COALESCE(e.line_id, '') as line_id,
      COALESCE(e.department_id, '') as department_id,
      SUM(e.amount) as actual_amount,
      COUNT(*) as expense_count
    FROM pm_expenses e
    WHERE e.doc_date >= ? AND e.doc_date <= ? AND e.doc_date >= ?
  `;
  const expParams = [start, end, cutoff];
  if (targetDept) {
    expenseSql += " AND e.department_id = ?";
    expParams.push(targetDept);
  }
  expenseSql += " GROUP BY e.line_id";
  const expenseRes = await env.DB.prepare(expenseSql).bind(...expParams).all();
  const expenseMap = /* @__PURE__ */ new Map();
  (expenseRes.results || []).forEach((r) => {
    expenseMap.set(r.line_id, {
      actualAmount: r.actual_amount || 0,
      count: r.expense_count || 0,
      deptId: r.department_id
    });
  });
  let budgetSql = "SELECT * FROM pm_line_budgets WHERE year = ?";
  const budgetParams = [year];
  const budgetRes = await env.DB.prepare(budgetSql).bind(...budgetParams).all();
  const budgetMap = /* @__PURE__ */ new Map();
  (budgetRes.results || []).forEach((b) => {
    budgetMap.set(b.line_id, b.budget_amount || 0);
  });
  const allLineIds = /* @__PURE__ */ new Set([...lineMap.keys(), ...expenseMap.keys()]);
  let totalActual = 0;
  let totalBudget = 0;
  let totalExpenseCount = 0;
  const lineBreakdown = [];
  for (const lid of allLineIds) {
    if (!lid) continue;
    const regLine = lineMap.get(lid);
    const expInfo = expenseMap.get(lid) || { actualAmount: 0, count: 0, deptId: "" };
    const budget = budgetMap.get(lid) || 0;
    const actual = expInfo.actualAmount;
    const count = expInfo.count;
    const lineDept = regLine?.deptId || expInfo.deptId || "";
    if (targetDept && lineDept && lineDept !== targetDept) {
      continue;
    }
    const variance = budget - actual;
    const percent = budget > 0 ? actual / budget * 100 : actual > 0 ? 100 : 0;
    totalActual += actual;
    totalBudget += budget;
    totalExpenseCount += count;
    let status = "NORMAL";
    if (budget === 0 && actual === 0) {
      status = "NO_DATA";
    } else if (actual > budget && budget > 0) {
      status = "OVER_BUDGET";
    } else if (percent >= 80) {
      status = "WARNING";
    }
    lineBreakdown.push({
      lineId: lid,
      lineName: regLine?.lineName || lid,
      deptId: lineDept,
      deptName: regLine?.deptName || lineDept,
      budget,
      actual,
      variance,
      percent: Math.round(percent * 100) / 100,
      usagePercent: Math.round(percent * 100) / 100,
      status,
      count
    });
  }
  lineBreakdown.sort((a, b) => (b.actual || 0) - (a.actual || 0));
  const totalVariance = totalBudget - totalActual;
  const budgetUsagePercent = totalBudget > 0 ? Math.round(totalActual / totalBudget * 1e4) / 100 : 0;
  const totals = {
    actual: totalActual,
    budget: totalBudget,
    variance: totalVariance,
    usagePercent: budgetUsagePercent,
    linesCount: lineBreakdown.length,
    expenseCount: totalExpenseCount
  };
  return {
    year,
    startDate: start,
    endDate: end,
    deptId: targetDept,
    kpi: {
      totalActual,
      totalBudget,
      variance: totalVariance,
      budgetUsagePercent,
      activeLinesCount: lineBreakdown.length
    },
    totals,
    lineBreakdown,
    lineMetrics: lineBreakdown
  };
}
__name(getDashboardData, "getDashboardData");
async function saveLineBudgets(env, actor, { year, budgets = [] }) {
  authorizeWrite(actor, env, "pm");
  const y = Number(year) || (/* @__PURE__ */ new Date()).getFullYear();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const user = actor.username || actor.id || "system";
  const statements = [];
  for (const b of budgets) {
    if (!b.lineId) continue;
    const id = `BUDGET-${b.lineId}-${y}`;
    const amount = Number(b.budgetAmount) || 0;
    const deptId = b.deptId || "";
    statements.push(
      env.DB.prepare(`
        INSERT INTO pm_line_budgets (id, line_id, department_id, year, budget_amount, notes, updated_at, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(line_id, year) DO UPDATE SET
          budget_amount = excluded.budget_amount,
          department_id = CASE WHEN excluded.department_id != '' THEN excluded.department_id ELSE pm_line_budgets.department_id END,
          notes = excluded.notes,
          updated_at = excluded.updated_at,
          updated_by = excluded.updated_by
      `).bind(id, b.lineId, deptId, y, amount, b.notes || "", now, user)
    );
  }
  if (statements.length) {
    await env.DB.batch(statements);
  }
  return { success: true, count: statements.length, year: y };
}
__name(saveLineBudgets, "saveLineBudgets");

// src/pr-service.js
async function getPRReferences(env) {
  const departmentsResult = await env.DB.prepare(
    "SELECT id, name, is_active FROM departments WHERE is_active = 1 ORDER BY name ASC"
  ).all();
  const linesResult = await env.DB.prepare(
    "SELECT l.id, l.name, l.department_id, d.name as department_name, l.remark FROM lines l JOIN departments d ON d.id = l.department_id WHERE l.is_active = 1 ORDER BY d.name ASC, l.name ASC"
  ).all();
  const machinesResult = await env.DB.prepare(
    "SELECT id, code, normalized_code, name, department_id, line_id FROM machines WHERE is_active = 1 ORDER BY code ASC"
  ).all();
  const ordersResult = await env.DB.prepare(`
    SELECT DISTINCT TRIM(order_no) as order_no, machine_id
    FROM pm_machine_orders
    WHERE TRIM(order_no) != ''
    UNION
    SELECT DISTINCT TRIM(pm_order_no) as order_no, machine_id
    FROM pm_expenses
    WHERE TRIM(pm_order_no) != ''
    ORDER BY order_no DESC
    LIMIT 100
  `).all().catch(() => ({ results: [] }));
  return {
    departments: (departmentsResult.results || []).map((d) => ({
      deptId: d.id,
      deptName: d.name
    })),
    lines: (linesResult.results || []).map((l) => ({
      lineId: l.id,
      lineName: l.name,
      deptId: l.department_id,
      deptName: l.department_name,
      remark: l.remark
    })),
    machines: (machinesResult.results || []).map((m) => ({
      id: m.id,
      code: m.code,
      normalizedCode: m.normalized_code,
      name: m.name,
      deptId: m.department_id,
      lineId: m.line_id
    })),
    pmOrders: (ordersResult.results || []).map((o) => ({
      orderNo: o.order_no,
      machineId: o.machine_id
    }))
  };
}
__name(getPRReferences, "getPRReferences");
function getTwoYearCutoffDate2() {
  const d = /* @__PURE__ */ new Date();
  d.setFullYear(d.getFullYear() - 2);
  return d.toISOString().slice(0, 10);
}
__name(getTwoYearCutoffDate2, "getTwoYearCutoffDate");
async function pruneOldPRItems(env) {
  const cutoff = getTwoYearCutoffDate2();
  const res = await env.DB.prepare("DELETE FROM pr_tracker_items WHERE created_date < ?").bind(cutoff).run();
  return res.meta?.changes || 0;
}
__name(pruneOldPRItems, "pruneOldPRItems");
async function listPRItems(env, filters = {}) {
  const {
    folder: folder2 = "inbox",
    // 'inbox' | 'archive' | 'all'
    pipelineStep = "",
    // 'PENDING_PR' | 'PENDING_PO' | 'PENDING_RECEIPT' | 'OVERDUE' | 'NEAR_DELIVERY'
    docType = "",
    // 'PR' | 'STORE'
    deptId = "",
    lineId = "",
    search = "",
    startDate = "",
    endDate = "",
    limit = 500,
    offset = 0
  } = filters;
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const next7DaysDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString().slice(0, 10);
  const cutoff = getTwoYearCutoffDate2();
  await pruneOldPRItems(env).catch(() => {
  });
  const countRes = await env.DB.prepare(`
    SELECT
      COUNT(CASE WHEN is_archived = 0 THEN 1 END) as total_inbox,
      COUNT(CASE WHEN is_archived = 1 THEN 1 END) as total_archive,
      COUNT(*) as total_all,
      COUNT(CASE WHEN is_archived = 0 AND (doc_no IS NULL OR TRIM(doc_no) = '') THEN 1 END) as pending_pr,
      COUNT(CASE WHEN is_archived = 0 AND (doc_no IS NOT NULL AND TRIM(doc_no) != '') AND (po_no IS NULL OR TRIM(po_no) = '') THEN 1 END) as pending_po,
      COUNT(CASE WHEN is_archived = 0 AND (po_no IS NOT NULL AND TRIM(po_no) != '') THEN 1 END) as pending_receipt,
      COUNT(CASE WHEN is_archived = 0 AND delivery_date != '' AND delivery_date < ? THEN 1 END) as overdue,
      COUNT(CASE WHEN is_archived = 0 AND delivery_date != '' AND delivery_date >= ? AND delivery_date <= ? THEN 1 END) as near_delivery
    FROM pr_tracker_items
    WHERE created_date >= ?
  `).bind(today, today, next7DaysDate, cutoff).first();
  const pipelineCounts = {
    inbox: Number(countRes?.total_inbox) || 0,
    archive: Number(countRes?.total_archive) || 0,
    all: Number(countRes?.total_all) || 0,
    pendingPr: Number(countRes?.pending_pr) || 0,
    pendingPo: Number(countRes?.pending_po) || 0,
    pendingReceipt: Number(countRes?.pending_receipt) || 0,
    overdue: Number(countRes?.overdue) || 0,
    nearDelivery: Number(countRes?.near_delivery) || 0
  };
  const whereClauses = [];
  const params = [];
  whereClauses.push("p.created_date >= ?");
  params.push(cutoff);
  if (folder2 === "inbox") {
    whereClauses.push("p.is_archived = 0");
  } else if (folder2 === "archive") {
    whereClauses.push("p.is_archived = 1");
  }
  if (pipelineStep === "PENDING_PR") {
    whereClauses.push("p.is_archived = 0 AND (p.doc_no IS NULL OR TRIM(p.doc_no) = '')");
  } else if (pipelineStep === "PENDING_PO") {
    whereClauses.push("p.is_archived = 0 AND (p.doc_no IS NOT NULL AND TRIM(p.doc_no) != '') AND (p.po_no IS NULL OR TRIM(p.po_no) = '')");
  } else if (pipelineStep === "PENDING_RECEIPT") {
    whereClauses.push("p.is_archived = 0 AND (p.po_no IS NOT NULL AND TRIM(p.po_no) != '')");
  } else if (pipelineStep === "OVERDUE") {
    whereClauses.push("p.is_archived = 0 AND p.delivery_date != '' AND p.delivery_date < ?");
    params.push(today);
  } else if (pipelineStep === "NEAR_DELIVERY") {
    whereClauses.push("p.is_archived = 0 AND p.delivery_date != '' AND p.delivery_date >= ? AND p.delivery_date <= ?");
    params.push(today, next7DaysDate);
  }
  if (docType && ["PR", "STORE"].includes(docType.toUpperCase())) {
    whereClauses.push("p.doc_type = ?");
    params.push(docType.toUpperCase());
  }
  if (deptId) {
    whereClauses.push("p.department_id = ?");
    params.push(deptId);
  }
  if (lineId) {
    whereClauses.push("p.line_id = ?");
    params.push(lineId);
  }
  if (startDate) {
    whereClauses.push("p.created_date >= ?");
    params.push(startDate);
  }
  if (endDate) {
    whereClauses.push("p.created_date <= ?");
    params.push(endDate);
  }
  if (search && search.trim()) {
    const tokens = search.trim().split(/\s+/).filter(Boolean);
    for (const token2 of tokens) {
      whereClauses.push(`(
        p.order_no LIKE ? OR
        p.description LIKE ? OR
        p.doc_no LIKE ? OR
        p.po_no LIKE ? OR
        p.machine_code LIKE ? OR
        p.notes LIKE ? OR
        m.name LIKE ? OR
        l.name LIKE ? OR
        d.name LIKE ?
      )`);
      const like = `%${token2}%`;
      params.push(like, like, like, like, like, like, like, like, like);
    }
  }
  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const metricsSql = `
    SELECT
      COUNT(*) as filtered_count,
      COALESCE(SUM(p.qty), 0) as total_qty,
      COALESCE(SUM(CASE WHEN p.price IS NOT NULL THEN (p.qty * p.price) ELSE 0 END), 0) as total_amount
    FROM pr_tracker_items p
    LEFT JOIN machines m ON m.id = p.machine_id
    LEFT JOIN lines l ON l.id = p.line_id
    LEFT JOIN departments d ON d.id = p.department_id
    ${whereSql}
  `;
  const metricsRes = await env.DB.prepare(metricsSql).bind(...params).first();
  const metrics = {
    totalCount: Number(metricsRes?.filtered_count) || 0,
    totalQty: Number(metricsRes?.total_qty) || 0,
    totalAmount: Number(metricsRes?.total_amount) || 0
  };
  const listSql = `
    SELECT
      p.*,
      COALESCE(d.name, p.department_id) as department_name,
      COALESCE(l.name, p.line_id) as line_name,
      COALESCE(m.name, '') as machine_name
    FROM pr_tracker_items p
    LEFT JOIN machines m ON m.id = p.machine_id
    LEFT JOIN lines l ON l.id = p.line_id
    LEFT JOIN departments d ON d.id = p.department_id
    ${whereSql}
    ORDER BY p.created_date DESC, p.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const itemsRes = await env.DB.prepare(listSql).bind(...params, Math.min(Number(limit) || 100, 1e3), Number(offset) || 0).all();
  const rawItems = itemsRes.results || [];
  const items = rawItems.map((item) => {
    const isArchived = Boolean(item.is_archived);
    const hasDocNo = Boolean(item.doc_no && item.doc_no.trim().length > 0);
    const hasPoNo = Boolean(item.po_no && item.po_no.trim().length > 0);
    const delivDate = item.delivery_date ? String(item.delivery_date).trim() : "";
    let pipelineStatus = "PENDING_PR";
    if (isArchived) {
      pipelineStatus = "ARCHIVED";
    } else if (!hasDocNo) {
      pipelineStatus = "PENDING_PR";
    } else if (!hasPoNo) {
      pipelineStatus = "PENDING_PO";
    } else {
      pipelineStatus = "PENDING_RECEIPT";
    }
    const isOverdue = !isArchived && Boolean(delivDate && delivDate < today);
    const isNearDelivery = !isArchived && Boolean(delivDate && delivDate >= today && delivDate <= next7DaysDate);
    return {
      id: item.id,
      createdDate: item.created_date,
      docType: item.doc_type || "PR",
      docNo: item.doc_no || "",
      departmentId: item.department_id || "",
      departmentName: item.department_name || item.department_id || "",
      lineId: item.line_id || "",
      lineName: item.line_name || item.line_id || "",
      machineId: item.machine_id || "",
      machineCode: item.machine_code || "",
      machineName: item.machine_name || "",
      orderNo: item.order_no || "",
      description: item.description || "",
      qty: Number(item.qty) || 1,
      unit: item.unit || "\u0E0A\u0E34\u0E49\u0E19",
      price: item.price !== null ? Number(item.price) : null,
      totalPrice: item.price !== null ? (Number(item.qty) || 1) * Number(item.price) : null,
      poNo: item.po_no || "",
      deliveryDate: item.delivery_date || "",
      isArchived,
      archivedAt: item.archived_at || null,
      archivedBy: item.archived_by || "",
      notes: item.notes || "",
      createdAt: item.created_at,
      createdBy: item.created_by,
      updatedAt: item.updated_at,
      updatedBy: item.updated_by,
      pipelineStatus,
      isOverdue,
      isNearDelivery
    };
  });
  return {
    items,
    pipelineCounts,
    metrics,
    retentionCutoff: cutoff,
    pagination: {
      limit: Number(limit) || 100,
      offset: Number(offset) || 0,
      total: metrics.totalCount
    }
  };
}
__name(listPRItems, "listPRItems");
async function getPRItem(env, id) {
  if (!id) fail("VALIDATION", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E23\u0E2B\u0E31\u0E2A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23");
  const item = await env.DB.prepare(`
    SELECT p.*, d.name as department_name, l.name as line_name, m.name as machine_name
    FROM pr_tracker_items p
    LEFT JOIN machines m ON m.id = p.machine_id
    LEFT JOIN lines l ON l.id = p.line_id
    LEFT JOIN departments d ON d.id = p.department_id
    WHERE p.id = ?
  `).bind(id).first();
  if (!item) fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38", 404);
  return item;
}
__name(getPRItem, "getPRItem");
async function savePRItem(env, actor, payload) {
  try {
    authorizeWrite(actor, env, "pm");
  } catch (err) {
    authorizeWrite(actor, env, "machines");
  }
  if (!payload) fail("VALIDATION", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01");
  const description = String(payload.description || "").trim();
  if (!description) fail("VALIDATION", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E2B\u0E23\u0E37\u0E2D\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const today = now.slice(0, 10);
  const user = actor.username || actor.displayName || actor.id || "system";
  const createdDate = payload.createdDate ? String(payload.createdDate).slice(0, 10) : today;
  const cutoff = getTwoYearCutoffDate2();
  if (createdDate < cutoff) {
    fail("VALIDATION", `\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E2A\u0E23\u0E49\u0E32\u0E07 (${createdDate}) \u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E19\u0E42\u0E22\u0E1A\u0E32\u0E22\u0E08\u0E31\u0E14\u0E40\u0E01\u0E47\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E22\u0E49\u0E2D\u0E19\u0E2B\u0E25\u0E31\u0E07 2 \u0E1B\u0E35 (\u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E31\u0E14\u0E40\u0E01\u0E47\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E40\u0E01\u0E48\u0E32\u0E01\u0E27\u0E48\u0E32 ${cutoff})`);
  }
  await pruneOldPRItems(env).catch(() => {
  });
  const docType = payload.docType === "STORE" ? "STORE" : "PR";
  const docNo = String(payload.docNo || "").trim();
  const orderNo = String(payload.orderNo || "").trim();
  const qty = Math.max(0.01, parseFloat(String(payload.qty || "1").replace(/,/g, "")) || 1);
  const unit = String(payload.unit || "\u0E0A\u0E34\u0E49\u0E19").trim() || "\u0E0A\u0E34\u0E49\u0E19";
  const price = payload.price !== void 0 && payload.price !== null && String(payload.price).trim() !== "" ? Math.max(0, parseFloat(String(payload.price).replace(/,/g, "")) || 0) : null;
  const poNo = String(payload.poNo || "").trim();
  const deliveryDate = payload.deliveryDate ? String(payload.deliveryDate).slice(0, 10) : "";
  const notes = String(payload.notes || "").trim();
  let deptId = String(payload.departmentId || "").trim();
  let lineId = String(payload.lineId || "").trim();
  let machineId = String(payload.machineId || "").trim();
  let machineCode = String(payload.machineCode || "").trim();
  if (machineId || machineCode) {
    let machineRow;
    if (machineId) {
      machineRow = await env.DB.prepare("SELECT id, code, department_id, line_id FROM machines WHERE id = ?").bind(machineId).first();
    } else {
      machineRow = await env.DB.prepare("SELECT id, code, department_id, line_id FROM machines WHERE LOWER(code) = LOWER(?)").bind(machineCode).first();
    }
    if (machineRow) {
      machineId = machineRow.id;
      machineCode = machineRow.code;
      if (!lineId && machineRow.line_id) lineId = machineRow.line_id;
      if (!deptId && machineRow.department_id) deptId = machineRow.department_id;
    }
  }
  if (lineId && !deptId) {
    const lineRow = await env.DB.prepare("SELECT department_id FROM lines WHERE id = ?").bind(lineId).first();
    if (lineRow) deptId = lineRow.department_id;
  }
  const isExisting = Boolean(payload.id);
  const id = isExisting ? payload.id : `PRT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  if (isExisting) {
    const existing = await env.DB.prepare("SELECT id, is_archived, archived_at, archived_by FROM pr_tracker_items WHERE id = ?").bind(id).first();
    if (!existing) fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E41\u0E01\u0E49\u0E44\u0E02", 404);
    await env.DB.prepare(`
      UPDATE pr_tracker_items
      SET
        created_date = ?,
        doc_type = ?,
        doc_no = ?,
        department_id = ?,
        line_id = ?,
        machine_id = ?,
        machine_code = ?,
        order_no = ?,
        description = ?,
        qty = ?,
        unit = ?,
        price = ?,
        po_no = ?,
        delivery_date = ?,
        notes = ?,
        updated_at = ?,
        updated_by = ?
      WHERE id = ?
    `).bind(
      createdDate,
      docType,
      docNo,
      deptId,
      lineId,
      machineId,
      machineCode,
      orderNo,
      description,
      qty,
      unit,
      price,
      poNo,
      deliveryDate,
      notes,
      now,
      user,
      id
    ).run();
  } else {
    await env.DB.prepare(`
      INSERT INTO pr_tracker_items (
        id, created_date, doc_type, doc_no, department_id, line_id, machine_id, machine_code,
        order_no, description, qty, unit, price, po_no, delivery_date,
        is_archived, archived_at, archived_by, notes,
        created_at, created_by, updated_at, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, '', ?, ?, ?, ?, ?)
    `).bind(
      id,
      createdDate,
      docType,
      docNo,
      deptId,
      lineId,
      machineId,
      machineCode,
      orderNo,
      description,
      qty,
      unit,
      price,
      poNo,
      deliveryDate,
      notes,
      now,
      user,
      now,
      user
    ).run();
  }
  return {
    success: true,
    id,
    updatedAt: now
  };
}
__name(savePRItem, "savePRItem");
async function bulkSavePRItems(env, actor, items = []) {
  try {
    authorizeWrite(actor, env, "pm");
  } catch (err) {
    authorizeWrite(actor, env, "machines");
  }
  if (!Array.isArray(items) || items.length === 0) {
    fail("VALIDATION", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E41\u0E01\u0E49\u0E44\u0E02");
  }
  await pruneOldPRItems(env).catch(() => {
  });
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const user = actor.username || actor.displayName || actor.id || "system";
  const statements = [];
  for (const item of items) {
    if (!item.id) continue;
    const description = String(item.description || "").trim();
    if (!description) continue;
    const docType = item.docType === "STORE" ? "STORE" : "PR";
    const docNo = String(item.docNo || "").trim();
    const orderNo = String(item.orderNo || "").trim();
    const qty = Math.max(0.01, parseFloat(String(item.qty || "1").replace(/,/g, "")) || 1);
    const unit = String(item.unit || "\u0E0A\u0E34\u0E49\u0E19").trim() || "\u0E0A\u0E34\u0E49\u0E19";
    const price = item.price !== void 0 && item.price !== null && String(item.price).trim() !== "" ? Math.max(0, parseFloat(String(item.price).replace(/,/g, "")) || 0) : null;
    const poNo = String(item.poNo || "").trim();
    const deliveryDate = item.deliveryDate ? String(item.deliveryDate).slice(0, 10) : "";
    const notes = String(item.notes || "").trim();
    statements.push(
      env.DB.prepare(`
        UPDATE pr_tracker_items
        SET
          doc_type = ?,
          doc_no = ?,
          order_no = ?,
          description = ?,
          qty = ?,
          unit = ?,
          price = ?,
          po_no = ?,
          delivery_date = ?,
          notes = ?,
          updated_at = ?,
          updated_by = ?
        WHERE id = ?
      `).bind(docType, docNo, orderNo, description, qty, unit, price, poNo, deliveryDate, notes, now, user, item.id)
    );
  }
  if (statements.length > 0) {
    await env.DB.batch(statements);
  }
  return {
    success: true,
    count: statements.length,
    updatedAt: now
  };
}
__name(bulkSavePRItems, "bulkSavePRItems");
async function archivePRItems(env, actor, { ids = [], archive = true }) {
  try {
    authorizeWrite(actor, env, "pm");
  } catch (err) {
    authorizeWrite(actor, env, "machines");
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    fail("VALIDATION", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 1 \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23");
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const user = actor.username || actor.displayName || actor.id || "system";
  const statements = [];
  for (const id of ids) {
    if (!id) continue;
    if (archive) {
      statements.push(
        env.DB.prepare(`
          UPDATE pr_tracker_items
          SET is_archived = 1, archived_at = ?, archived_by = ?, updated_at = ?, updated_by = ?
          WHERE id = ?
        `).bind(now, user, now, user, id)
      );
    } else {
      statements.push(
        env.DB.prepare(`
          UPDATE pr_tracker_items
          SET is_archived = 0, archived_at = NULL, archived_by = '', updated_at = ?, updated_by = ?
          WHERE id = ?
        `).bind(now, user, id)
      );
    }
  }
  if (statements.length > 0) {
    await env.DB.batch(statements);
  }
  return {
    success: true,
    count: statements.length,
    archived: Boolean(archive),
    updatedAt: now
  };
}
__name(archivePRItems, "archivePRItems");
async function bulkUpdateArea(env, actor, payload) {
  try {
    authorizeWrite(actor, env, "pm");
  } catch (err) {
    authorizeWrite(actor, env, "machines");
  }
  const { ids = [], departmentId = "", lineId = "", machineId = "", machineCode = "" } = payload || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    fail("VALIDATION", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 1 \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23");
  }
  let finalDeptId = departmentId;
  let finalLineId = lineId;
  let finalMachineId = machineId;
  let finalMachineCode = machineCode;
  if (finalMachineId || finalMachineCode) {
    let machineRow;
    if (finalMachineId) {
      machineRow = await env.DB.prepare("SELECT id, code, department_id, line_id FROM machines WHERE id = ?").bind(finalMachineId).first();
    } else {
      machineRow = await env.DB.prepare("SELECT id, code, department_id, line_id FROM machines WHERE LOWER(code) = LOWER(?)").bind(finalMachineCode).first();
    }
    if (machineRow) {
      finalMachineId = machineRow.id;
      finalMachineCode = machineRow.code;
      if (!finalLineId && machineRow.line_id) finalLineId = machineRow.line_id;
      if (!finalDeptId && machineRow.department_id) finalDeptId = machineRow.department_id;
    }
  }
  if (finalLineId && !finalDeptId) {
    const lineRow = await env.DB.prepare("SELECT department_id FROM lines WHERE id = ?").bind(finalLineId).first();
    if (lineRow) finalDeptId = lineRow.department_id;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const user = actor.username || actor.displayName || actor.id || "system";
  const statements = [];
  for (const id of ids) {
    statements.push(
      env.DB.prepare(`
        UPDATE pr_tracker_items
        SET department_id = ?, line_id = ?, machine_id = ?, machine_code = ?, updated_at = ?, updated_by = ?
        WHERE id = ?
      `).bind(finalDeptId, finalLineId, finalMachineId, finalMachineCode, now, user, id)
    );
  }
  await env.DB.batch(statements);
  return {
    success: true,
    count: statements.length,
    updatedAt: now
  };
}
__name(bulkUpdateArea, "bulkUpdateArea");
async function deletePRItems(env, actor, { ids = [], adminPassword = "" }) {
  if (!Array.isArray(ids) || ids.length === 0) {
    fail("VALIDATION", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E25\u0E1A");
  }
  if (!adminPassword || typeof adminPassword !== "string" || !adminPassword.trim()) {
    fail("VALIDATION", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A (Admin) \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E01\u0E32\u0E23\u0E25\u0E1A\u0E16\u0E32\u0E27\u0E23", 422);
  }
  let isAuthorizedAdmin = false;
  if (env.ENVIRONMENT === "local" && env.DEV_AUTH === "local-admin" && (adminPassword === "1234" || adminPassword === "admin")) {
    isAuthorizedAdmin = true;
  } else {
    const adminUsersRes = await env.DB.prepare(
      "SELECT id, username, password_hash, password_salt FROM app_users WHERE role = 'admin' AND is_active = 1"
    ).all().catch(() => ({ results: [] }));
    const adminUsers = adminUsersRes.results || [];
    for (const admin of adminUsers) {
      const calcHash = await hashPassword(adminPassword.trim(), admin.password_salt);
      if (calcHash === admin.password_hash) {
        isAuthorizedAdmin = true;
        break;
      }
    }
  }
  if (!isAuthorizedAdmin) {
    fail("FORBIDDEN", "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A (Admin) \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 \u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E25\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E14\u0E49", 403);
  }
  const statements = ids.map(
    (id) => env.DB.prepare("DELETE FROM pr_tracker_items WHERE id = ?").bind(id)
  );
  await env.DB.batch(statements);
  return {
    success: true,
    deletedCount: statements.length
  };
}
__name(deletePRItems, "deletePRItems");

// src/pm-aircooling-service.js
var AIRCOOLING_SPREADSHEET_ID = "1qmKINhpuUOenTavwDezQHV2IP4CaweJQ0o6ZL05rKiE";
var AIRCOOLING_SHEET_GID = "1502709574";
var AIRCOOLING_SHEET_NAME = "AirCoolingData";
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field.trim());
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && i + 1 < text.length && text[i + 1] === "\n") i++;
        row.push(field.trim());
        if (row.some((x) => x !== "")) rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
  }
  if (field || row.length > 0) {
    row.push(field.trim());
    if (row.some((x) => x !== "")) rows.push(row);
  }
  return rows;
}
__name(parseCsv, "parseCsv");
function calculateCleanStatus(nextCleanDate, reportStatus) {
  if (reportStatus && reportStatus !== "resolved") return "reported";
  if (!nextCleanDate) return "normal";
  const now = /* @__PURE__ */ new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(nextCleanDate);
  if (isNaN(target.getTime())) return "normal";
  const diffDays = Math.ceil((target - now) / (1e3 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays <= 30) return "due_soon";
  return "normal";
}
__name(calculateCleanStatus, "calculateCleanStatus");
function addOneYear(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return "";
  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10) + 1;
    const month = match[2];
    let day = match[3];
    if (month === "02" && day === "29") {
      const isLeap = year % 4 === 0 && year % 100 !== 0 || year % 400 === 0;
      if (!isLeap) day = "28";
    }
    return `${year}-${month}-${day}`;
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return "";
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}
__name(addOneYear, "addOneYear");
function generateAirCoolingId() {
  const randomPart = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return "AC-" + randomPart;
}
__name(generateAirCoolingId, "generateAirCoolingId");
async function fetchLiveGoogleSheetData(spreadsheetId = AIRCOOLING_SPREADSHEET_ID, gid = AIRCOOLING_SHEET_GID) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12e3) });
    if (!res.ok) return [];
    const text = await res.text();
    if (!text || text.includes("<!DOCTYPE html>") || text.includes("Google Docs - Error")) return [];
    const parsed = parseCsv(text);
    if (parsed.length <= 1) return [];
    const dataRows = parsed.slice(1);
    return dataRows.map((r) => ({
      id: r[0] || "",
      dept: r[1] || "",
      idTag: r[2] || "",
      line: r[3] || "",
      location: r[4] || "",
      brand: r[5] || "",
      power: Number(r[6]) || 0,
      serial: r[7] || "",
      details: r[8] || "",
      note: r[9] || "",
      lastCleanDate: r[10] || "",
      nextCleanDate: r[11] || "",
      imageUrl: r[12] || "",
      driveFileId: r[13] || "",
      createdAt: r[14] || "",
      updatedAt: r[15] || "",
      reportStatus: r[16] || "",
      reportInfo: r[17] || ""
    })).filter((item) => item.id !== "");
  } catch (err) {
    console.warn("Cannot fetch live Google Sheets data:", err.message);
    return [];
  }
}
__name(fetchLiveGoogleSheetData, "fetchLiveGoogleSheetData");
async function syncFromGoogleSheets(env, actor) {
  const liveRows = await fetchLiveGoogleSheetData();
  if (!liveRows || liveRows.length === 0) {
    fail("SYNC_FAILED", "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E14\u0E36\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E08\u0E32\u0E01 Google Sheets \u0E44\u0E14\u0E49\u0E43\u0E19\u0E02\u0E13\u0E30\u0E19\u0E35\u0E49 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E2D\u0E34\u0E19\u0E40\u0E17\u0E2D\u0E23\u0E4C\u0E40\u0E19\u0E47\u0E15", 502);
  }
  const statements = liveRows.map((r) => {
    return env.DB.prepare(`
      INSERT INTO pm_aircooling_units (
        id, dept, id_tag, line, location, brand, power, serial, details, note,
        last_clean_date, next_clean_date, image_url, drive_file_id, report_status, report_info,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        dept = excluded.dept,
        id_tag = excluded.id_tag,
        line = excluded.line,
        location = excluded.location,
        brand = excluded.brand,
        power = excluded.power,
        serial = excluded.serial,
        details = excluded.details,
        note = excluded.note,
        last_clean_date = excluded.last_clean_date,
        next_clean_date = excluded.next_clean_date,
        image_url = CASE WHEN excluded.image_url != '' THEN excluded.image_url ELSE pm_aircooling_units.image_url END,
        drive_file_id = CASE WHEN excluded.drive_file_id != '' THEN excluded.drive_file_id ELSE pm_aircooling_units.drive_file_id END,
        report_status = excluded.report_status,
        report_info = excluded.report_info,
        updated_at = excluded.updated_at
    `).bind(
      r.id,
      r.dept,
      r.idTag,
      r.line,
      r.location,
      r.brand,
      r.power,
      r.serial,
      r.details,
      r.note,
      r.lastCleanDate,
      r.nextCleanDate,
      r.imageUrl,
      r.driveFileId,
      r.reportStatus,
      r.reportInfo,
      r.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      r.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
    );
  });
  const chunkSize = 50;
  for (let i = 0; i < statements.length; i += chunkSize) {
    await env.DB.batch(statements.slice(i, i + chunkSize));
  }
  return { success: true, count: liveRows.length };
}
__name(syncFromGoogleSheets, "syncFromGoogleSheets");
async function listAirCoolingUnits(env, options = {}) {
  const { dept, line, brand, status, search } = options;
  const countRow = await env.DB.prepare("SELECT COUNT(*) as count FROM pm_aircooling_units").first();
  if (!countRow || countRow.count === 0) {
    try {
      await syncFromGoogleSheets(env, null);
    } catch (_) {
    }
  }
  let query = "SELECT * FROM pm_aircooling_units WHERE 1=1";
  const params = [];
  if (dept && dept !== "ALL") {
    query += " AND dept = ?";
    params.push(dept);
  }
  if (line) {
    query += " AND line = ?";
    params.push(line);
  }
  if (brand) {
    query += " AND brand = ?";
    params.push(brand);
  }
  if (search && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    query += " AND (LOWER(id_tag) LIKE ? OR LOWER(line) LIKE ? OR LOWER(location) LIKE ? OR LOWER(brand) LIKE ? OR LOWER(serial) LIKE ? OR LOWER(details) LIKE ? OR LOWER(note) LIKE ? OR LOWER(id) LIKE ?)";
    for (let i = 0; i < 8; i++) params.push(term);
  }
  query += " ORDER BY dept ASC, id_tag ASC, id ASC";
  const res = await env.DB.prepare(query).bind(...params).all();
  const rawUnits = res.results || [];
  const now = /* @__PURE__ */ new Date();
  now.setHours(0, 0, 0, 0);
  const units = rawUnits.map((r) => {
    const cleanStatus = calculateCleanStatus(r.next_clean_date, r.report_status);
    let daysRemaining = null;
    if (r.next_clean_date) {
      const target = new Date(r.next_clean_date);
      if (!isNaN(target.getTime())) {
        daysRemaining = Math.ceil((target - now) / (1e3 * 60 * 60 * 24));
      }
    }
    let reportInfo = null;
    if (r.report_info) {
      try {
        reportInfo = typeof r.report_info === "object" ? r.report_info : JSON.parse(r.report_info);
      } catch (_) {
        reportInfo = { issue: r.report_info };
      }
    }
    return {
      id: r.id,
      dept: r.dept,
      idTag: r.id_tag,
      line: r.line,
      location: r.location,
      brand: r.brand,
      power: r.power,
      serial: r.serial,
      details: r.details,
      note: r.note,
      lastCleanDate: r.last_clean_date,
      nextCleanDate: r.next_clean_date,
      imageUrl: r.image_url,
      driveFileId: r.drive_file_id,
      reportStatus: r.report_status,
      reportInfo,
      cleanStatus,
      daysRemaining,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  });
  let filteredUnits = units;
  if (status && status !== "all") {
    filteredUnits = units.filter((u) => u.cleanStatus === status);
  }
  const statsRes = await env.DB.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN dept = 'CC' THEN 1 ELSE 0 END) as cc_count,
      SUM(CASE WHEN dept = 'PP' THEN 1 ELSE 0 END) as pp_count,
      SUM(CASE WHEN dept = 'MX' THEN 1 ELSE 0 END) as mx_count,
      SUM(CASE WHEN dept = 'PC' THEN 1 ELSE 0 END) as pc_count,
      SUM(CASE WHEN dept = 'PR' THEN 1 ELSE 0 END) as pr_count,
      SUM(CASE WHEN dept = 'OT' THEN 1 ELSE 0 END) as ot_count,
      SUM(CASE WHEN report_status IS NOT NULL AND report_status != '' AND report_status != 'resolved' THEN 1 ELSE 0 END) as reported_count
    FROM pm_aircooling_units
  `).first();
  let normalCount = 0;
  let dueSoonCount = 0;
  let overdueCount = 0;
  for (const u of units) {
    if (u.cleanStatus === "normal") normalCount++;
    else if (u.cleanStatus === "due_soon") dueSoonCount++;
    else if (u.cleanStatus === "overdue") overdueCount++;
  }
  const stats = {
    total: statsRes?.total || 0,
    normal: normalCount,
    dueSoon: dueSoonCount,
    overdue: overdueCount,
    reported: statsRes?.reported_count || 0,
    byDept: {
      CC: statsRes?.cc_count || 0,
      PP: statsRes?.pp_count || 0,
      MX: statsRes?.mx_count || 0,
      PC: statsRes?.pc_count || 0,
      PR: statsRes?.pr_count || 0,
      OT: statsRes?.ot_count || 0
    }
  };
  return { units: filteredUnits, stats };
}
__name(listAirCoolingUnits, "listAirCoolingUnits");
async function getAirCoolingUnit(env, id) {
  if (!id) fail("VALIDATION", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38 ID \u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C");
  const r = await env.DB.prepare("SELECT * FROM pm_aircooling_units WHERE id = ?").bind(id).first();
  if (!r) fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07 Air Cooling \u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38", 404);
  const cleanStatus = calculateCleanStatus(r.next_clean_date, r.report_status);
  let reportInfo = null;
  if (r.report_info) {
    try {
      reportInfo = JSON.parse(r.report_info);
    } catch (_) {
      reportInfo = { issue: r.report_info };
    }
  }
  return {
    id: r.id,
    dept: r.dept,
    idTag: r.id_tag,
    line: r.line,
    location: r.location,
    brand: r.brand,
    power: r.power,
    serial: r.serial,
    details: r.details,
    note: r.note,
    lastCleanDate: r.last_clean_date,
    nextCleanDate: r.next_clean_date,
    imageUrl: r.image_url,
    driveFileId: r.drive_file_id,
    reportStatus: r.report_status,
    reportInfo,
    cleanStatus,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}
__name(getAirCoolingUnit, "getAirCoolingUnit");
async function saveAirCoolingUnit(env, actor, data = {}) {
  const isNew = !data.id;
  const id = data.id ? String(data.id).trim() : generateAirCoolingId();
  let existing = null;
  if (!isNew) {
    existing = await env.DB.prepare("SELECT * FROM pm_aircooling_units WHERE id = ?").bind(id).first();
    if (!existing) fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07 Air Cooling \u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E41\u0E01\u0E49\u0E44\u0E02", 404);
  }
  const dept = data.dept !== void 0 ? String(data.dept || "").trim().toUpperCase() : existing?.dept || "";
  const idTag = data.idTag !== void 0 || data.id_tag !== void 0 ? String(data.idTag || data.id_tag || "").trim() : existing?.id_tag || "";
  const line = data.line !== void 0 ? String(data.line || "").trim() : existing?.line || "";
  const location = data.location !== void 0 ? String(data.location || "").trim() : existing?.location || "";
  const brand = data.brand !== void 0 ? String(data.brand || "").trim() : existing?.brand || "";
  const power = data.power !== void 0 ? Number(data.power) || 0 : existing?.power || 0;
  const serial = data.serial !== void 0 ? String(data.serial || "").trim() : existing?.serial || "";
  const details = data.details !== void 0 ? String(data.details || "").trim() : existing?.details || "";
  const note = data.note !== void 0 ? String(data.note || "").trim() : existing?.note || "";
  const lastCleanProvided = data.lastCleanDate !== void 0 || data.last_clean_date !== void 0;
  const nextCleanProvided = data.nextCleanDate !== void 0 || data.next_clean_date !== void 0;
  const lastCleanDate = lastCleanProvided ? String(data.lastCleanDate || data.last_clean_date || "").trim() : existing?.last_clean_date || "";
  let nextCleanDate = "";
  if (nextCleanProvided) {
    nextCleanDate = String(data.nextCleanDate || data.next_clean_date || "").trim();
  } else if (lastCleanProvided && lastCleanDate) {
    nextCleanDate = addOneYear(lastCleanDate);
  } else {
    nextCleanDate = existing?.next_clean_date || "";
  }
  if (!nextCleanDate && lastCleanDate) {
    nextCleanDate = addOneYear(lastCleanDate);
  }
  let imageUrl = existing?.image_url || "";
  if (data.imageUrl !== void 0 || data.image_url !== void 0) {
    const passed = String(data.imageUrl || data.image_url || "").trim();
    if (passed !== "" || isNew) imageUrl = passed;
  }
  let driveFileId = existing?.drive_file_id || "";
  if (data.driveFileId !== void 0 || data.drive_file_id !== void 0) {
    const passed = String(data.driveFileId || data.drive_file_id || "").trim();
    if (passed !== "" || isNew) driveFileId = passed;
  }
  if (!idTag) fail("VALIDATION", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38 ID Tag (\u0E40\u0E0A\u0E48\u0E19 CC-01)");
  if (!dept) fail("VALIDATION", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E41\u0E1C\u0E19\u0E01 (Dept)");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (isNew) {
    await env.DB.prepare(`
      INSERT INTO pm_aircooling_units (
        id, dept, id_tag, line, location, brand, power, serial, details, note,
        last_clean_date, next_clean_date, image_url, drive_file_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      dept,
      idTag,
      line,
      location,
      brand,
      power,
      serial,
      details,
      note,
      lastCleanDate,
      nextCleanDate,
      imageUrl,
      driveFileId,
      now,
      now
    ).run();
  } else {
    await env.DB.prepare(`
      UPDATE pm_aircooling_units SET
        dept = ?,
        id_tag = ?,
        line = ?,
        location = ?,
        brand = ?,
        power = ?,
        serial = ?,
        details = ?,
        note = ?,
        last_clean_date = ?,
        next_clean_date = ?,
        image_url = ?,
        drive_file_id = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      dept,
      idTag,
      line,
      location,
      brand,
      power,
      serial,
      details,
      note,
      lastCleanDate,
      nextCleanDate,
      imageUrl,
      driveFileId,
      now,
      id
    ).run();
  }
  const result = await getAirCoolingUnit(env, id);
  try {
    await syncUnitToGoogleSheet(env, result);
  } catch (err) {
    console.warn("Google Sheets sync warning:", err.message);
  }
  return result;
}
__name(saveAirCoolingUnit, "saveAirCoolingUnit");
async function deleteAirCoolingUnit(env, actor, id) {
  if (!id) fail("VALIDATION", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38 ID \u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E25\u0E1A");
  const existing = await env.DB.prepare("SELECT id, drive_file_id FROM pm_aircooling_units WHERE id = ?").bind(id).first();
  if (!existing) fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07 Air Cooling \u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38", 404);
  await env.DB.prepare("DELETE FROM pm_aircooling_units WHERE id = ?").bind(id).run();
  try {
    await deleteUnitFromGoogleSheet(env, id);
  } catch (err) {
    console.warn("Google Sheets delete warning:", err.message);
  }
  return { success: true, id };
}
__name(deleteAirCoolingUnit, "deleteAirCoolingUnit");
async function reportAirCoolingIssue(env, actor, data = {}) {
  const id = String(data.id || "").trim();
  if (!id) fail("VALIDATION", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38 ID \u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C");
  const issue = String(data.issue || "\u0E41\u0E08\u0E49\u0E07\u0E1B\u0E31\u0E0D\u0E2B\u0E32\u0E01\u0E32\u0E23\u0E17\u0E33\u0E07\u0E32\u0E19").trim();
  const details = String(data.details || "").trim();
  const reporter = String(data.reporter || actor?.displayName || actor?.username || "\u0E1C\u0E39\u0E49\u0E1B\u0E0F\u0E34\u0E1A\u0E31\u0E15\u0E34\u0E07\u0E32\u0E19").trim();
  const phone = String(data.phone || "").trim();
  const imageUrl = String(data.imageUrl || "").trim();
  const driveFileId = String(data.driveFileId || "").trim();
  const reportedAt = (/* @__PURE__ */ new Date()).toLocaleString("th-TH");
  const reportInfo = JSON.stringify({
    issue,
    details,
    reporter,
    phone,
    imageUrl,
    driveFileId,
    reportedAt
  });
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await env.DB.prepare(`
    UPDATE pm_aircooling_units SET
      report_status = 'pending',
      report_info = ?,
      updated_at = ?
    WHERE id = ?
  `).bind(reportInfo, now, id).run();
  const result = await getAirCoolingUnit(env, id);
  try {
    await syncUnitToGoogleSheet(env, result);
  } catch (err) {
    console.warn("Google Sheets sync warning on report:", err.message);
  }
  return result;
}
__name(reportAirCoolingIssue, "reportAirCoolingIssue");
async function resolveAirCoolingIssue(env, actor, id) {
  if (!id) fail("VALIDATION", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38 ID \u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await env.DB.prepare(`
    UPDATE pm_aircooling_units SET
      report_status = 'resolved',
      updated_at = ?
    WHERE id = ?
  `).bind(now, id).run();
  const result = await getAirCoolingUnit(env, id);
  try {
    await syncUnitToGoogleSheet(env, result);
  } catch (err) {
    console.warn("Google Sheets sync warning on resolve:", err.message);
  }
  return result;
}
__name(resolveAirCoolingIssue, "resolveAirCoolingIssue");
async function syncUnitToGoogleSheet(env, unit) {
  if (!unit || !unit.id) return { success: false, reason: "INVALID_UNIT" };
  try {
    const access = await getGoogleAccessToken(env);
    if (!access) return { success: false, reason: "NO_AUTH" };
    const spreadsheetId = AIRCOOLING_SPREADSHEET_ID;
    const sheetName = AIRCOOLING_SHEET_NAME;
    const getRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:C`,
      {
        headers: { Authorization: `Bearer ${access}` },
        signal: AbortSignal.timeout(1e4)
      }
    );
    if (!getRes.ok) {
      const err = await getRes.text();
      console.warn("Google Sheets API get rows error:", getRes.status, err);
      return { success: false, error: err };
    }
    const data = await getRes.json();
    const rows = data.values || [];
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      const rowId = rows[i]?.[0];
      const rowTag = rows[i]?.[2];
      if (rowId && rowId === unit.id || unit.idTag && rowTag === unit.idTag) {
        rowIndex = i + 1;
        break;
      }
    }
    let reportInfoStr = "";
    if (unit.reportInfo) {
      reportInfoStr = typeof unit.reportInfo === "object" ? JSON.stringify(unit.reportInfo) : String(unit.reportInfo);
    }
    const rowValues = [
      unit.id || "",
      unit.dept || "",
      unit.idTag || "",
      unit.line || "",
      unit.location || "",
      unit.brand || "",
      unit.power ?? 0,
      unit.serial || "",
      unit.details || "",
      unit.note || "",
      unit.lastCleanDate || "",
      unit.nextCleanDate || "",
      unit.imageUrl || "",
      unit.driveFileId || "",
      unit.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      unit.updatedAt || (/* @__PURE__ */ new Date()).toISOString(),
      unit.reportStatus || "",
      reportInfoStr
    ];
    if (rowIndex > 0) {
      const updateRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowIndex}:R${rowIndex}?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${access}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            range: `${sheetName}!A${rowIndex}:R${rowIndex}`,
            majorDimension: "ROWS",
            values: [rowValues]
          }),
          signal: AbortSignal.timeout(1e4)
        }
      );
      if (!updateRes.ok) {
        const err = await updateRes.text();
        console.warn("Google Sheets API update error:", updateRes.status, err);
        return { success: false, error: err };
      }
      return { success: true, action: "updated", row: rowIndex };
    } else {
      const appendRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:R:append?valueInputOption=USER_ENTERED`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            range: `${sheetName}!A:R`,
            majorDimension: "ROWS",
            values: [rowValues]
          }),
          signal: AbortSignal.timeout(1e4)
        }
      );
      if (!appendRes.ok) {
        const err = await appendRes.text();
        console.warn("Google Sheets API append error:", appendRes.status, err);
        return { success: false, error: err };
      }
      return { success: true, action: "appended" };
    }
  } catch (err) {
    console.warn("syncUnitToGoogleSheet exception:", err.message);
    return { success: false, error: err.message };
  }
}
__name(syncUnitToGoogleSheet, "syncUnitToGoogleSheet");
async function deleteUnitFromGoogleSheet(env, id) {
  try {
    const access = await getGoogleAccessToken(env);
    if (!access) return { success: false, reason: "NO_AUTH" };
    const spreadsheetId = AIRCOOLING_SPREADSHEET_ID;
    const sheetName = AIRCOOLING_SHEET_NAME;
    const getRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:A`,
      {
        headers: { Authorization: `Bearer ${access}` },
        signal: AbortSignal.timeout(1e4)
      }
    );
    if (!getRes.ok) return { success: false };
    const data = await getRes.json();
    const rows = data.values || [];
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i]?.[0] === id) {
        rowIndex = i + 1;
        break;
      }
    }
    if (rowIndex > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowIndex}:R${rowIndex}:clear`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${access}` },
          signal: AbortSignal.timeout(1e4)
        }
      );
      return { success: true, row: rowIndex };
    }
    return { success: false, reason: "NOT_FOUND" };
  } catch (err) {
    console.warn("deleteUnitFromGoogleSheet error:", err.message);
    return { success: false, error: err.message };
  }
}
__name(deleteUnitFromGoogleSheet, "deleteUnitFromGoogleSheet");
async function getAirCoolingReferences(env) {
  const deptsRes = await env.DB.prepare("SELECT DISTINCT dept FROM pm_aircooling_units WHERE dept != '' ORDER BY dept ASC").all();
  const linesRes = await env.DB.prepare("SELECT DISTINCT line, dept FROM pm_aircooling_units WHERE line != '' ORDER BY line ASC").all();
  const brandsRes = await env.DB.prepare("SELECT DISTINCT brand FROM pm_aircooling_units WHERE brand != '' ORDER BY brand ASC").all();
  const locationsRes = await env.DB.prepare("SELECT DISTINCT location, dept FROM pm_aircooling_units WHERE location != '' ORDER BY location ASC").all();
  return {
    departments: (deptsRes.results || []).map((r) => r.dept),
    lines: (linesRes.results || []).map((r) => ({ line: r.line, dept: r.dept })),
    brands: (brandsRes.results || []).map((r) => r.brand),
    locations: (locationsRes.results || []).map((r) => ({ location: r.location, dept: r.dept })),
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${AIRCOOLING_SPREADSHEET_ID}/edit?gid=${AIRCOOLING_SHEET_GID}#gid=${AIRCOOLING_SHEET_GID}`
  };
}
__name(getAirCoolingReferences, "getAirCoolingReferences");

// src/worker.js
var worker_default = {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/v1/announcements/public") {
        if (request.method !== "GET") fail("METHOD", "\u0E43\u0E0A\u0E49 GET \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E14\u0E36\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1B\u0E23\u0E30\u0E0A\u0E32\u0E2A\u0E31\u0E21\u0E1E\u0E31\u0E19\u0E18\u0E4C", 405);
        const data = await listAnnouncements(env);
        return json({ ok: true, data });
      }
      if (url.pathname === "/api/v1/announcements/state") {
        if (request.method !== "GET") fail("METHOD", "\u0E43\u0E0A\u0E49 GET \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E1B\u0E23\u0E30\u0E0A\u0E32\u0E2A\u0E31\u0E21\u0E1E\u0E31\u0E19\u0E18\u0E4C", 405);
        const data = await getAnnouncementState(env);
        return json({ ok: true, data });
      }
      if (url.pathname === "/api/v1/announcements/current") {
        if (request.method !== "POST") fail("METHOD", "\u0E43\u0E0A\u0E49 POST \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E23\u0E32\u0E22\u0E07\u0E32\u0E19\u0E2A\u0E44\u0E25\u0E14\u0E4C\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19", 405);
        let body;
        try {
          body = await request.json();
        } catch {
          fail("VALIDATION", "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
        }
        await reportCurrentAnnouncement(env, body);
        return json({ ok: true });
      }
      if (url.pathname.startsWith("/api/v1/announcements/media/")) {
        const id = url.pathname.replace("/api/v1/announcements/media/", "");
        return await getAnnouncementMedia(env, id, request);
      }
      if (!url.pathname.startsWith("/api/")) {
        if (!["GET", "HEAD"].includes(request.method)) fail("METHOD", "\u0E44\u0E21\u0E48\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A\u0E04\u0E33\u0E02\u0E2D\u0E19\u0E35\u0E49", 405);
        if (url.pathname === "/") return Response.redirect(url.origin + "/machines/", 302);
        if (!env.ASSETS) fail("CONFIG", "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 build \u0E2B\u0E19\u0E49\u0E32\u0E40\u0E27\u0E47\u0E1A", 503);
        const response = await env.ASSETS.fetch(request);
        const headers = new Headers(response.headers);
        headers.set("Cache-Control", "private, no-store");
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set("Referrer-Policy", "same-origin");
        headers.set("X-Frame-Options", "DENY");
        return new Response(response.body, { status: response.status, headers });
      }
      if (request.method === "POST") {
        const origin = request.headers.get("Origin");
        if (origin && origin !== url.origin) fail("FORBIDDEN", "\u0E15\u0E49\u0E19\u0E17\u0E32\u0E07\u0E04\u0E33\u0E02\u0E2D\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E1B\u0E34\u0E14\u0E2B\u0E19\u0E49\u0E32\u0E40\u0E27\u0E47\u0E1A\u0E43\u0E2B\u0E21\u0E48", 403);
        if (!request.headers.get("Content-Type")?.startsWith("application/json")) fail("VALIDATION", "\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A JSON \u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19", 415);
      }
      if (url.pathname === "/api/v1/auth/login") {
        if (request.method !== "POST") fail("METHOD", "\u0E43\u0E0A\u0E49 POST \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A", 405);
        let body;
        try {
          body = await request.json();
        } catch {
          fail("VALIDATION", "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
        }
        const user = await authenticateUser(env.DB, body?.username, body?.password);
        const session = await createSession(env.DB, user.id);
        const secure = url.protocol === "https:" ? "; Secure" : "";
        const cookie = `em_session=${session.rawToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`;
        const res = json({ ok: true, data: {
          username: user.username,
          displayName: user.display_name,
          role: user.role,
          permissions: user.permissions,
          mustChangePassword: user.mustChangePassword
        } });
        res.headers.set("Set-Cookie", cookie);
        return res;
      }
      if (url.pathname === "/api/v1/auth/logout") {
        if (request.method !== "POST") fail("METHOD", "\u0E43\u0E0A\u0E49 POST \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A", 405);
        const cookie = request.headers.get("Cookie") || "";
        const sessionToken = cookie.match(/(?:^|;\s*)em_session=([^;]+)/)?.[1] || request.headers.get("Authorization")?.replace(/^Bearer\s+/, "");
        if (sessionToken) await destroySession(env.DB, sessionToken);
        const secure = url.protocol === "https:" ? "; Secure" : "";
        const res = json({ ok: true });
        res.headers.set("Set-Cookie", `em_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
        return res;
      }
      const actor = await authenticate(request, env);
      if (url.pathname === "/api/v1/auth/change-password") {
        if (request.method !== "POST") fail("METHOD", "\u0E43\u0E0A\u0E49 POST \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19", 405);
        let body;
        try {
          body = await request.json();
        } catch {
          fail("VALIDATION", "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
        }
        await changePassword(env.DB, actor.id, body?.newPassword);
        return json({ ok: true });
      }
      if (url.pathname === "/api/v1/auth/me") {
        if (request.method !== "GET") fail("METHOD", "\u0E43\u0E0A\u0E49 GET \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C", 405);
        return json({ ok: true, data: {
          id: actor.id,
          username: actor.username,
          displayName: actor.displayName,
          role: actor.role,
          permissions: actor.permissions,
          mustChangePassword: actor.mustChangePassword
        } });
      }
      if (url.pathname === "/api/v1/health") return json({ ok: true, data: { environment: env.ENVIRONMENT, maintenance: env.MAINTENANCE_MODE !== "false", role: actor.role } });
      if (url.pathname === "/api/v1/users/rpc") {
        if (request.method !== "POST") fail("METHOD", "\u0E43\u0E0A\u0E49 POST \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19", 405);
        let body;
        try {
          body = await request.json();
        } catch {
          fail("VALIDATION", "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E04\u0E33\u0E02\u0E2D\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
        }
        const { method, args = [] } = body || {};
        let result;
        if (method === "listUsers") result = await listUsers(env, actor);
        else if (method === "createUser") result = await createUser(env, actor, args[0]);
        else if (method === "updateUser") result = await updateUser(env, actor, args[0], args[1]);
        else if (method === "resetPassword") result = await resetPassword(env, actor, args[0]);
        else if (method === "deleteUser") result = await deleteUser(env, actor, args[0]);
        else fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E19\u0E35\u0E49", 404);
        return json({ ok: true, data: result });
      }
      if (url.pathname === "/api/v1/announcements/rpc") {
        if (request.method !== "POST") fail("METHOD", "\u0E43\u0E0A\u0E49 POST \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E1B\u0E23\u0E30\u0E0A\u0E32\u0E2A\u0E31\u0E21\u0E1E\u0E31\u0E19\u0E18\u0E4C", 405);
        if (actor.permissions && actor.permissions.announcements === "none") fail("FORBIDDEN", "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E40\u0E02\u0E49\u0E32\u0E16\u0E36\u0E07\u0E42\u0E21\u0E14\u0E39\u0E25\u0E1B\u0E23\u0E30\u0E0A\u0E32\u0E2A\u0E31\u0E21\u0E1E\u0E31\u0E19\u0E18\u0E4C", 403);
        let body;
        try {
          body = await request.json();
        } catch {
          fail("VALIDATION", "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E04\u0E33\u0E02\u0E2D\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
        }
        const rawMethod = body?.method || "";
        const method = rawMethod.replace(/^announcements\./, "");
        const args = body?.args || [];
        let result;
        if (method === "list") result = await listAnnouncements(env);
        else if (method === "create") result = await createAnnouncement(env, actor, args[0], request.headers.get("Idempotency-Key") || crypto.randomUUID());
        else if (method === "delete") result = await deleteAnnouncement(env, actor, args[0]);
        else if (method === "updateSettings") result = await updateAnnouncementSettings(env, actor, args[0]);
        else if (method === "forceSlide") result = await forceAnnouncementSlide(env, actor, args[0]);
        else fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E1B\u0E23\u0E30\u0E0A\u0E32\u0E2A\u0E31\u0E21\u0E1E\u0E31\u0E19\u0E18\u0E4C\u0E19\u0E35\u0E49", 404);
        return json({ ok: true, data: result });
      }
      if (url.pathname === "/api/v1/pm/rpc") {
        if (request.method !== "POST") fail("METHOD", "\u0E43\u0E0A\u0E49 POST \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07 PM", 405);
        if (actor.permissions && actor.permissions.pm === "none") fail("FORBIDDEN", "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E40\u0E02\u0E49\u0E32\u0E16\u0E36\u0E07\u0E42\u0E21\u0E14\u0E39\u0E25 PM", 403);
        let body;
        try {
          body = await request.json();
        } catch {
          fail("VALIDATION", "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E04\u0E33\u0E02\u0E2D\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
        }
        const method = body?.method || "";
        const args = body?.args || [];
        let result;
        if (method === "getReferences") result = await getPMReferences(env);
        else if (method === "getCycleData") result = await getPMCycleData(env, args[0]);
        else if (method === "saveOrders") result = await savePMCycleOrders(env, actor, args[0]);
        else if (method === "listOverview") result = await listPMOverview(env, args[0]);
        else fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07 PM \u0E19\u0E35\u0E49", 404);
        return json({ ok: true, data: result });
      }
      if (url.pathname === "/api/v1/pm-expenses/rpc") {
        if (request.method !== "POST") fail("METHOD", "\u0E43\u0E0A\u0E49 POST \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22 PM", 405);
        if (actor.permissions && (actor.permissions.pm_expenses === "none" || !actor.permissions.pm_expenses && actor.permissions.pm === "none")) fail("FORBIDDEN", "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E40\u0E02\u0E49\u0E32\u0E16\u0E36\u0E07\u0E42\u0E21\u0E14\u0E39\u0E25\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22 PM", 403);
        let body;
        try {
          body = await request.json();
        } catch {
          fail("VALIDATION", "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E04\u0E33\u0E02\u0E2D\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
        }
        const method = body?.method || "";
        const args = body?.args || [];
        let result;
        if (method === "getReferences") result = await getPMReferences(env);
        else if (method === "listExpenses") result = await listExpenses(env, args[0]);
        else if (method === "importRecords") result = await importExpenseRecords(env, actor, args[0]);
        else if (method === "deleteExpense") result = await deleteExpenseItem(env, actor, args[0]);
        else if (method === "clearAllExpenses") result = await clearAllExpenses(env, actor);
        else if (method === "deleteExpensesByRange") result = await deleteExpensesByRange(env, actor, args[0]);
        else if (method === "saveExpense") result = await saveExpenseItem(env, actor, args[0]);
        else if (method === "getDashboard") result = await getDashboardData(env, args[0]);
        else if (method === "saveBudgets") result = await saveLineBudgets(env, actor, args[0]);
        else fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22 PM \u0E19\u0E35\u0E49", 404);
        return json({ ok: true, data: result });
      }
      if (url.pathname === "/api/v1/pm-aircooling/rpc") {
        if (request.method !== "POST") fail("METHOD", "\u0E43\u0E0A\u0E49 POST \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07 Air Cooling", 405);
        if (actor.permissions && (actor.permissions.pm_aircooling === "none" || actor.permissions.pm === "none" && !actor.permissions.pm_aircooling)) fail("FORBIDDEN", "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E40\u0E02\u0E49\u0E32\u0E16\u0E36\u0E07\u0E42\u0E21\u0E14\u0E39\u0E25 Air Cooling", 403);
        let body;
        try {
          body = await request.json();
        } catch {
          fail("VALIDATION", "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E04\u0E33\u0E02\u0E2D\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
        }
        const method = body?.method || "";
        const args = body?.args || [];
        let result;
        if (method === "listUnits") result = await listAirCoolingUnits(env, args[0]);
        else if (method === "getUnit") result = await getAirCoolingUnit(env, args[0]);
        else if (method === "saveUnit") result = await saveAirCoolingUnit(env, actor, args[0]);
        else if (method === "deleteUnit") {
          if (actor.permissions && !actor.permissions.can_delete && actor.role !== "admin") fail("FORBIDDEN", "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E43\u0E19\u0E01\u0E32\u0E23\u0E25\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25", 403);
          result = await deleteAirCoolingUnit(env, actor, args[0]);
        } else if (method === "reportIssue") result = await reportAirCoolingIssue(env, actor, args[0]);
        else if (method === "resolveIssue") result = await resolveAirCoolingIssue(env, actor, args[0]);
        else if (method === "syncGoogleSheets") result = await syncFromGoogleSheets(env, actor);
        else if (method === "getReferences") result = await getAirCoolingReferences(env);
        else fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07 Air Cooling \u0E19\u0E35\u0E49", 404);
        return json({ ok: true, data: result });
      }
      if (url.pathname === "/api/v1/pr-tracker/rpc") {
        if (request.method !== "POST") fail("METHOD", "\u0E43\u0E0A\u0E49 POST \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E08\u0E31\u0E14\u0E0B\u0E37\u0E49\u0E2D/\u0E2A\u0E42\u0E15\u0E23\u0E4C", 405);
        if (actor.permissions && actor.permissions.pr_tracker === "none") fail("FORBIDDEN", "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E40\u0E02\u0E49\u0E32\u0E16\u0E36\u0E07\u0E42\u0E21\u0E14\u0E39\u0E25\u0E08\u0E31\u0E14\u0E0B\u0E37\u0E49\u0E2D\u0E41\u0E25\u0E30\u0E2A\u0E42\u0E15\u0E23\u0E4C", 403);
        let body;
        try {
          body = await request.json();
        } catch {
          fail("VALIDATION", "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E04\u0E33\u0E02\u0E2D\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
        }
        const method = body?.method || "";
        const args = body?.args || [];
        let result;
        if (method === "getReferences") result = await getPRReferences(env);
        else if (method === "listItems") result = await listPRItems(env, args[0]);
        else if (method === "getItem") result = await getPRItem(env, args[0]);
        else if (method === "saveItem") result = await savePRItem(env, actor, args[0]);
        else if (method === "bulkSaveItems") result = await bulkSavePRItems(env, actor, args[0]);
        else if (method === "archiveItems") result = await archivePRItems(env, actor, args[0]);
        else if (method === "bulkUpdateArea") result = await bulkUpdateArea(env, actor, args[0]);
        else if (method === "deleteItems") result = await deletePRItems(env, actor, args[0]);
        else if (method === "pruneOldItems") result = await pruneOldPRItems(env);
        else fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E08\u0E31\u0E14\u0E0B\u0E37\u0E49\u0E2D/\u0E2A\u0E42\u0E15\u0E23\u0E4C\u0E19\u0E35\u0E49", 404);
        return json({ ok: true, data: result });
      }
      const match = url.pathname.match(/^\/api\/v1\/(machines|parts|bom)\/rpc$/);
      if (match) {
        if (request.method !== "POST") fail("METHOD", "\u0E43\u0E0A\u0E49 POST \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19", 405);
        if (actor.role === "integration") fail("FORBIDDEN", "\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49\u0E2D\u0E48\u0E32\u0E19\u0E44\u0E14\u0E49\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 BOM", 403);
        const scope = match[1];
        if (actor.permissions && actor.permissions[scope] === "none") fail("FORBIDDEN", "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E40\u0E02\u0E49\u0E32\u0E16\u0E36\u0E07\u0E42\u0E21\u0E14\u0E39\u0E25\u0E19\u0E35\u0E49", 403);
        if (Number(request.headers.get("Content-Length")) > 35e6) fail("TOO_LARGE", "\u0E02\u0E19\u0E32\u0E14\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14", 413);
        const reader = request.body?.getReader();
        if (!reader) fail("VALIDATION", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25");
        const chunks = [];
        let size = 0;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 35e6) {
            await reader.cancel();
            fail("TOO_LARGE", "\u0E02\u0E19\u0E32\u0E14\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14", 413);
          }
          chunks.push(value);
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const c of chunks) {
          bytes.set(c, offset);
          offset += c.length;
        }
        let body;
        try {
          body = JSON.parse(new TextDecoder().decode(bytes));
        } catch {
          fail("VALIDATION", "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E04\u0E33\u0E02\u0E2D\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
        }
        const isDelete = ["deleteMachine", "deleteBrand", "remove", "deleteMachineType"].includes(body.method);
        if (isDelete && actor.permissions && !actor.permissions.can_delete) {
          fail("FORBIDDEN", "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E43\u0E19\u0E01\u0E32\u0E23\u0E25\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25", 403);
        }
        return json({ ok: true, data: await dispatch(env, actor, scope, body.method, body.args || [], request.headers.get("Idempotency-Key")) });
      }
      if (url.pathname.startsWith("/api/v1/integrations/bom/")) {
        if (request.method !== "GET") fail("METHOD", "\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23 BOM \u0E2D\u0E48\u0E32\u0E19\u0E44\u0E14\u0E49\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19", 405);
        const repo = new Repository(env.DB);
        let data;
        if (url.pathname.endsWith("/references")) {
          const ref = await repo.references(), machines = await repo.catalog("machines");
          data = { departments: ref.departments.map((d) => ({ DeptID: d.deptId, DeptName: d.deptName, IsActive: d.isActive })), lines: ref.lines.map((l) => ({ LineID: l.lineId, DeptID: l.deptId, LineName: l.lineName, IsActive: l.isActive })), machines: machines.map((m) => ({ MachineID: m.machineId, MachineCode: m.machineCode, MachineName: m.machineName, DeptID: m.deptId, LineID: m.lineId, LineOrder: m.lineOrder, Status: m.status, IsActive: m.isActive })) };
        } else if (url.pathname.endsWith("/parts")) data = (await repo.catalog("parts")).map((p) => ({ ID: p.id, "Part number": p.partNumber, Description: p.description, Brand: p.brand, Price: p.price, Picture: p.picture, Thumbnail: p.thumbnail, "Store code": p.storeCode, "\u0E2D\u0E32\u0E22\u0E38\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C (\u0E1B\u0E35)": p.lifespan, Notes: p.notes }));
        else fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25", 404);
        return json({ ok: true, data });
      }
      fail("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A API \u0E19\u0E35\u0E49", 404);
    } catch (e) {
      const known = e instanceof AppError || Boolean(e?.code);
      const status = e.status || (e.code === "VALIDATION" ? 422 : e.code === "CONFLICT" ? 409 : e.code === "UNAUTHORIZED" || e.code === "AUTH" ? 401 : e.code === "FORBIDDEN" ? 403 : e.code === "NOT_FOUND" ? 404 : known ? 422 : 500);
      if (!known) console.error("Registry request failed", e?.name);
      return json({ ok: false, error: { code: known ? e.code : "SERVER", message: e.message || "\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48", fields: e.fields || {} } }, status);
    }
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
