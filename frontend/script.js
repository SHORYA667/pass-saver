// ─── STATE ───────────────────────────────────────────────
const S = {
  page: "login",
  theme: localStorage.getItem("ps-theme") || "light",
  users: JSON.parse(localStorage.getItem("ps-users") || "[]"),
  session: JSON.parse(localStorage.getItem("ps-session") || "null"),
  creds: JSON.parse(localStorage.getItem("ps-creds") || "{}"),
  modal: null,
  editId: null,
  searchQ: "",
  showPw: {},
  loading: false,
};

const API_BASE = "https://pass-saver.onrender.com//api";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function mongoCredToLocal(mongoCred, sessionId) {
  const id = String(mongoCred._id);
  return {
    id,
    name: mongoCred.website,
    url: mongoCred.url || "",
    username: mongoCred.username,
    epw: enc(mongoCred.password, sessionId + id),
    notes: mongoCred.notes || "",
    ts: new Date(mongoCred.createdAt || mongoCred.updatedAt).getTime(),
  };
}

// ─── HELPERS ─────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const ce = (t, c = "", a = {}) => {
  const el = document.createElement(t);
  el.className = c;
  Object.entries(a).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
};
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
const hash = (s) => {
  let h = 0,
    i = 0;
  for (; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h.toString(36);
};
const enc = (s, k) =>
  btoa(
    unescape(
      encodeURIComponent(
        s
          .split("")
          .map((c, i) =>
            String.fromCharCode(c.charCodeAt(0) ^ k.charCodeAt(i % k.length)),
          )
          .join(""),
      ),
    ),
  );
const dec = (s, k) => {
  try {
    const d = decodeURIComponent(escape(atob(s)));
    return d
      .split("")
      .map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ k.charCodeAt(i % k.length)),
      )
      .join("");
  } catch {
    return "***";
  }
};
const save = () => {
  localStorage.setItem("ps-users", JSON.stringify(S.users));
  localStorage.setItem("ps-session", JSON.stringify(S.session));
  localStorage.setItem("ps-creds", JSON.stringify(S.creds));
};
const setErr = (id, msg) => {
  const el = $(id);
  if (el) el.textContent = msg;
};
const clrErr = (id) => setErr(id, "");
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const fmt = (d) => {
  const n = new Date(d);
  const diff = Date.now() - n;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  return n.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const faviconUrl = (url) => {
  try {
    const h = new URL(url.startsWith("http") ? url : "https://" + url).hostname;
    return `https://www.google.com/s2/favicons?domain=${h}&sz=64`;
  } catch {
    return null;
  }
};
const pwStrength = (p) => {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
};

function toast(msg, type = "success") {
  const tc = $("toasts");
  const t = ce("div", `toast ${type}`);
  const icons = {
    success: '<polyline points="20 6 9 17 4 12"/>',
    error:
      '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  };
  t.innerHTML = `<svg viewBox="0 0 24 24">${icons[type] || icons.info}</svg>${msg}`;
  tc.appendChild(t);
  setTimeout(() => {
    t.classList.add("out");
    setTimeout(() => t.remove(), 300);
  }, 2800);
}

function copyText(text, label) {
  navigator.clipboard
    .writeText(text)
    .then(() => toast(`${label} copied!`, "info"))
    .catch(() => {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
      toast(`${label} copied!`, "info");
    });
}

// ─── ICONS ───────────────────────────────────────────────
const ICONS = {
  lock: `<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`,
  eye: `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`,
  eyeOff: `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`,
  plus: `<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`,
  edit: `<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>`,
  trash: `<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>`,
  copy: `<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>`,
  search: `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`,
  sun: `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`,
  moon: `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`,
  logout: `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>`,
  shield: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`,
  key: `<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>`,
  x: `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
  globe: `<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>`,
  user: `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`,
  dash: `<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>`,
  alert: `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,
};
const ic = (name, sz = 20) =>
  `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ""}</svg>`;

// ─── THEME ───────────────────────────────────────────────
function applyTheme() {
  document.body.className = S.theme === "dark" ? "dark" : "";
  localStorage.setItem("ps-theme", S.theme);
}
applyTheme();

// ─── RENDER ──────────────────────────────────────────────
function render() {
  const app = $("app");
  if (S.loading) {
    app.innerHTML = `<div class="loading"><div class="spinner"></div><div class="loading-text">PassSaver</div></div>`;
    return;
  }
  if (!S.session) {
    renderAuth();
    return;
  }
  renderApp();
}

// ─── AUTH ─────────────────────────────────────────────────
function renderAuth() {
  const app = $("app");
  app.innerHTML = `
  <div class="auth-wrap">
    <div class="auth-blob b1"></div>
    <div class="auth-blob b2"></div>
    <div class="auth-card" id="auth-card">
      <div class="auth-logo">
        <div class="auth-logo-icon">${ic("lock", 22)}</div>
        <span class="auth-logo-text">PassSaver</span>
      </div>
      ${S.page === "login" ? renderLogin() : renderSignup()}
    </div>
  </div>`;
  bindAuth();
}

function renderLogin() {
  return `
  <h2 class="auth-title">Welcome back</h2>
  <p class="auth-sub">Sign in to your secure vault</p>
  <div class="field"><label>Username or Email</label><input id="l-id" placeholder="Enter username or email" autocomplete="username"/><div class="err" id="l-id-err"></div></div>
  <div class="field"><label>Password</label><div class="pw-wrap"><input id="l-pw" type="password" placeholder="Enter password" autocomplete="current-password"/><button class="pw-eye" id="l-pw-eye">${ic("eye", 18)}</button></div><div class="err" id="l-pw-err"></div></div>
  <button class="btn-primary" id="l-btn">Sign In</button>
  <p class="auth-switch">Don't have an account? <a id="go-signup">Sign up</a></p>`;
}

function renderSignup() {
  return `
  <h2 class="auth-title">Create account</h2>
  <p class="auth-sub">Start securing your passwords today</p>
  <div class="form-row">
    <div class="field"><label>Full Name</label><input id="s-name" placeholder="Jane Doe"/><div class="err" id="s-name-err"></div></div>
    <div class="field"><label>Username</label><input id="s-uname" placeholder="janedoe"/><div class="err" id="s-uname-err"></div></div>
  </div>
  <div class="field"><label>Email</label><input id="s-email" type="email" placeholder="jane@example.com"/><div class="err" id="s-email-err"></div></div>
  <div class="field"><label>Password</label><div class="pw-wrap"><input id="s-pw" type="password" placeholder="Min 8 characters"/><button class="pw-eye" id="s-pw-eye">${ic("eye", 18)}</button></div><div class="strength-bar"><div class="strength-fill" id="s-strength" style="width:0%;background:#ef4444"></div></div><div class="err" id="s-pw-err"></div></div>
  <div class="field"><label>Confirm Password</label><div class="pw-wrap"><input id="s-cpw" type="password" placeholder="Repeat password"/><button class="pw-eye" id="s-cpw-eye">${ic("eye", 18)}</button></div><div class="err" id="s-cpw-err"></div></div>
  <button class="btn-primary" id="s-btn">Create Account</button>
  <p class="auth-switch">Already have an account? <a id="go-login">Sign in</a></p>`;
}

function bindAuth() {
  // toggle pw visibility
  ["l-pw", "s-pw", "s-cpw"].forEach((id) => {
    const inp = $(id),
      btn = $(id + "-eye");
    if (!inp || !btn) return;
    on(btn, "click", () => {
      const t = inp.type === "password" ? "text" : "password";
      inp.type = t;
      btn.innerHTML = ic(t === "password" ? "eye" : "eyeOff", 18);
    });
  });
  // strength meter
  const spw = $("s-pw");
  if (spw)
    on(spw, "input", () => {
      const str = pwStrength(spw.value);
      const pct = (str / 5) * 100;
      const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];
      const fill = $("s-strength");
      if (fill) {
        fill.style.width = pct + "%";
        fill.style.background = colors[str - 1] || "#ef4444";
      }
    });
  // page switches
  const gs = $("go-signup"),
    gl = $("go-login");
  if (gs)
    on(gs, "click", () => {
      S.page = "signup";
      render();
    });
  if (gl)
    on(gl, "click", () => {
      S.page = "login";
      render();
    });
  // login
  const lb = $("l-btn");
  if (lb) on(lb, "click", doLogin);
  const linp = $("l-id");
  if (linp)
    on(linp, "keydown", (e) => {
      if (e.key === "Enter") doLogin();
    });
  const lpw = $("l-pw");
  if (lpw)
    on(lpw, "keydown", (e) => {
      if (e.key === "Enter") doLogin();
    });
  // signup
  const sb = $("s-btn");
  if (sb) on(sb, "click", doSignup);
}

function migrateLocalCredsToSession(mongoUserId, email, username) {
  if ((S.creds[mongoUserId] || []).length) return;

  const localUser = S.users.find(
    (u) =>
      u.email?.toLowerCase() === email.toLowerCase() ||
      u.username?.toLowerCase() === username.toLowerCase(),
  );

  if (localUser?.id && (S.creds[localUser.id] || []).length) {
    S.creds[mongoUserId] = S.creds[localUser.id];
    delete S.creds[localUser.id];
    save();
  }
}

async function doLogin() {
  const email = document.getElementById("l-id").value.trim().toLowerCase();
  const password = document.getElementById("l-pw").value;

  if (!email || !password) {
    toast("Enter email and password", "error");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    console.log("LOGIN RESPONSE:", data);

    if (!response.ok) {
      toast(data.message || "Login Failed", "error");
      return;
    }

    // Save JWT token
    localStorage.setItem("token", data.token);

    // Save logged-in user
    localStorage.setItem("user", JSON.stringify(data.user));

    // Create session
    S.session = {
      id: data.user._id,
      _id: data.user._id,
      fullName: data.user.fullName,
      name: data.user.fullName,
      username: data.user.username,
      email: data.user.email,
    };

    // Optional migration of old local credentials
    if (typeof migrateLocalCredsToSession === "function") {
      migrateLocalCredsToSession(
        data.user._id,
        data.user.email,
        data.user.username,
      );
    }

    // Load passwords from MongoDB
    if (typeof loadPasswords === "function") {
      await loadPasswords();
    }

    // Go to dashboard
    S.page = "dashboard";

    save();
    render();

    toast("Login Successful", "success");
  } catch (err) {
    console.error("Login Error:", err);
    toast("Server Error", "error");
  }
}

async function doSignup() {
  const fullName = document.getElementById("s-name").value.trim();
  const username = document.getElementById("s-uname").value.trim();
  const email = document.getElementById("s-email").value.trim();
  const password = document.getElementById("s-pw").value;
  const confirmPassword = document.getElementById("s-cpw").value;

  // Validation
  if (!fullName || !username || !email || !password) {
    toast("Please fill all fields", "error");
    return;
  }

  if (password.length < 8) {
    toast("Password must be at least 8 characters", "error");
    return;
  }

  if (password !== confirmPassword) {
    toast("Passwords do not match", "error");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullName,
        username,
        email,
        password,
      }),
    });

    const data = await response.json();

    console.log("Signup Response:", data);

    if (response.ok) {
      toast("Account Created Successfully", "success");

      // Clear form
      document.getElementById("s-name").value = "";
      document.getElementById("s-uname").value = "";
      document.getElementById("s-email").value = "";
      document.getElementById("s-pw").value = "";
      document.getElementById("s-cpw").value = "";

      // Redirect to login page
      S.page = "login";
      render();
    } else {
      toast(data.message || "Signup Failed", "error");
    }
  } catch (error) {
    console.error("Signup Error:", error);
    toast("Cannot connect to backend server", "error");
  }
}

// ─── APP ─────────────────────────────────────────────────
function renderApp() {
  const app = $("app");
  const creds = getUserCreds();
  const recent = [...creds].sort((a, b) => b.ts - a.ts).slice(0, 5);
  app.innerHTML = `
  ${renderNavbar()}
  <div class="page" id="page-content">
    ${S.page === "dashboard" ? renderDashboard(creds, recent) : ""}
    ${S.page === "vault" ? renderVault(creds) : ""}
    ${S.page === "profile" ? renderProfile() : ""}
  </div>
  ${renderMobileNav()}
  ${S.modal ? renderModal() : ""}
  ${S.confirmDelete ? renderConfirm() : ""}`;
  bindApp(creds);
}

function renderNavbar() {
  const ini =
    S.session?.name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  return `<nav class="navbar">
    <div class="nav-logo">
      <div class="nav-logo-icon">${ic("lock", 18)}</div>
      <span class="nav-logo-text">PassSaver</span>
    </div>
    <div class="nav-links">
      <button class="nav-link${S.page === "dashboard" ? " active" : ""}" data-nav="dashboard">${ic("dash", 16)} Dashboard</button>
      <button class="nav-link${S.page === "vault" ? " active" : ""}" data-nav="vault">${ic("key", 16)} Vault</button>
      <button class="nav-link${S.page === "profile" ? " active" : ""}" data-nav="profile">${ic("user", 16)} Profile</button>
    </div>
    <div class="nav-actions">
      <button class="nav-icon-btn" id="theme-toggle" title="Toggle theme">${ic(S.theme === "dark" ? "sun" : "moon", 18)}</button>
      <button class="nav-icon-btn" id="nav-logout" title="Logout">${ic("logout", 18)}</button>
      <button class="avatar-btn" data-nav="profile">${ini}</button>
    </div>
  </nav>`;
}

function renderMobileNav() {
  return `<nav class="mobile-nav">
    <button class="mobile-nav-btn${S.page === "dashboard" ? " active" : ""}" data-nav="dashboard">${ic("dash", 22)}<span>Home</span></button>
    <button class="mobile-nav-btn${S.page === "vault" ? " active" : ""}" data-nav="vault">${ic("key", 22)}<span>Vault</span></button>
    <button class="mobile-nav-btn${S.page === "profile" ? " active" : ""}" data-nav="profile">${ic("user", 22)}<span>Profile</span></button>
  </nav>`;
}

function getUserCreds() {
  return S.creds[S.session?.id] || [];
}

function renderDashboard(creds, recent) {
  const strength = creds.length
    ? Math.round(
        creds.reduce((a, c) => {
          const p = dec(c.epw, S.session.id + c.id);
          return a + pwStrength(p);
        }, 0) / creds.length,
      )
    : 0;
  return `<div class="container">
    <div class="dash-greeting">
      <h2>Good ${getGreeting()}, ${(S.session.fullName || S.session.name || "User").split(" ")[0]} 👋</h2>
      <p>Your passwords are safe and encrypted.</p>
    </div>
    <div class="stats-grid">
      <div class="stat-card orange">
        <div class="stat-icon orange">${ic("key", 20)}</div>
        <div class="stat-num">${creds.length}</div>
        <div class="stat-label">Passwords Saved</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-icon blue">${ic("shield", 20)}</div>
        <div class="stat-num">${strength}<small style="font-size:.8rem;color:var(--text2)">/5</small></div>
        <div class="stat-label">Avg. Password Strength</div>
      </div>
      <div class="stat-card purple">
        <div class="stat-icon purple">${ic("globe", 20)}</div>
        <div class="stat-num">${
          new Set(
            creds.map((c) => {
              try {
                return new URL(c.url || "https://x.x").hostname;
              } catch {
                return c.url || c.name;
              }
            }),
          ).size
        }</div>
        <div class="stat-label">Unique Sites</div>
      </div>
    </div>
    <div class="section-title">${ic("key", 18)} Recent Passwords <span>${recent.length} entries</span></div>
    ${recent.length ? `<div class="recent-list">${recent.map((c) => recentItem(c)).join("")}</div><div style="margin-top:1rem;text-align:center"><button class="btn-save" data-nav="vault" style="background:none;border:1.5px solid var(--border);color:var(--text);font-family:'DM Sans',sans-serif;font-weight:500">View All Passwords →</button></div>` : `<div style="text-align:center;padding:2rem;color:var(--text3)">No passwords yet. <a style="color:var(--orange1);cursor:pointer" data-nav="vault">Add your first one →</a></div>`}
  </div>`;
}

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}

function recentItem(c) {
  const fav = faviconUrl(c.url);
  const ini = (c.name || "?")[0].toUpperCase();
  return `<div class="recent-item">
    <div class="recent-favicon">${fav ? `<img src="${fav}" onerror="this.style.display='none'"/><span style="position:absolute">${ini}</span>` : ini}</div>
    <div class="recent-info"><div class="recent-name">${escHtml(c.name)}</div><div class="recent-user">${escHtml(c.username)}</div></div>
    <div class="recent-date">${fmt(c.ts)}</div>
  </div>`;
}

function renderVault(creds) {
  const filtered = creds.filter(
    (c) =>
      !S.searchQ ||
      c.name.toLowerCase().includes(S.searchQ.toLowerCase()) ||
      c.username.toLowerCase().includes(S.searchQ.toLowerCase()) ||
      (c.url || "").toLowerCase().includes(S.searchQ.toLowerCase()),
  );
  return `<div class="container">
    <div style="margin-bottom:1.5rem"><h2 style="font-size:1.5rem;font-weight:700;margin-bottom:.25rem">Password Vault</h2><p style="color:var(--text2);font-size:.9rem">All your credentials, encrypted and secure.</p></div>
    <div class="vault-toolbar">
      <div class="search-wrap">${ic("search", 18)}<input id="search-inp" placeholder="Search by name, username, URL…" value="${escHtml(S.searchQ)}"/></div>
      <span class="vault-count">${filtered.length} of ${creds.length}</span>
    </div>
    ${
      filtered.length
        ? `<div class="creds-grid">${filtered.map((c) => credCard(c)).join("")}</div>`
        : creds.length
          ? `<div class="empty-state"><div class="empty-icon">${ic("search", 32)}</div><h3>No results</h3><p>Try a different search term.</p></div>`
          : `<div class="empty-state"><div class="empty-icon">${ic("lock", 32)}</div><h3>Your vault is empty</h3><p>Tap the + button to add your first password.</p></div>`
    }
    <button class="fab" id="fab-add" title="Add password">${ic("plus", 24)}</button>
  </div>`;
}

function credCard(c) {
  const fav = faviconUrl(c.url);
  const ini = (c.name || "?")[0].toUpperCase();
  const pw = dec(c.epw, S.session.id + c.id);
  const shown = S.showPw[c.id];
  return `<div class="cred-card" data-id="${c.id}">
    <div class="cred-top">
      <div class="cred-favicon" style="position:relative">${fav ? `<img src="${fav}" onerror="this.parentElement.innerHTML='${ini}'" style="width:100%;height:100%;object-fit:cover;border-radius:var(--r3)"/>` : ini}</div>
      <div class="cred-info"><div class="cred-name">${escHtml(c.name)}</div><div class="cred-url">${c.url ? escHtml(c.url) : "No URL"}</div></div>
      <div class="cred-actions">
        <button class="icon-btn" data-edit="${c.id}" title="Edit">${ic("edit", 15)}</button>
        <button class="icon-btn danger" data-del="${c.id}" title="Delete">${ic("trash", 15)}</button>
      </div>
    </div>
    <div class="cred-field">
      <span class="cred-field-label">User</span>
      <span class="cred-field-val">${escHtml(c.username)}</span>
      <div class="cred-field-actions"><button class="tiny-btn" data-copy-user="${c.id}" title="Copy">${ic("copy", 13)}</button></div>
    </div>
    <div class="cred-field">
      <span class="cred-field-label">Password</span>
      <span class="cred-field-val" id="pw-val-${c.id}">${shown ? escHtml(pw) : "••••••••"}</span>
      <div class="cred-field-actions">
        <button class="tiny-btn" data-toggle-pw="${c.id}" title="${shown ? "Hide" : "Show"}">${ic(shown ? "eyeOff" : "eye", 13)}</button>
        <button class="tiny-btn" data-copy-pw="${c.id}" title="Copy">${ic("copy", 13)}</button>
      </div>
    </div>
    ${c.notes ? `<div class="cred-notes">${escHtml(c.notes)}</div>` : ""}
  </div>`;
}

function renderProfile() {
  const u = S.session;
  const ini = u.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const creds = getUserCreds();
  return `<div class="container">
    <div style="margin-bottom:1.5rem"><h2 style="font-size:1.5rem;font-weight:700;margin-bottom:.25rem">Profile Settings</h2><p style="color:var(--text2);font-size:.9rem">Manage your account details.</p></div>
    <div class="profile-card">
      <div class="profile-hero">
        <div class="profile-avatar">${ini}</div>
        <div class="profile-meta"><h3>${escHtml(u.name)}</h3><p>@${escHtml(u.username)} · ${escHtml(u.email)}</p><p style="margin-top:.25rem;font-size:.82rem;color:var(--text3)">${creds.length} passwords saved</p></div>
      </div>
      <div class="divider-label">Personal Information</div>
      <div class="form-row">
        <div class="field"><label>Full Name</label><input id="p-name" value="${escHtml(u.name)}"/><div class="err" id="p-name-err"></div></div>
        <div class="field"><label>Username</label><input id="p-uname" value="${escHtml(u.username)}"/><div class="err" id="p-uname-err"></div></div>
      </div>
      <div class="field"><label>Email Address</label><input id="p-email" type="email" value="${escHtml(u.email)}"/><div class="err" id="p-email-err"></div></div>
      <button class="btn-save" id="p-save-info">Save Changes</button>
    </div>
    <div class="profile-card">
      <div class="divider-label">Change Password</div>
      <div class="field"><label>Current Password</label><div class="pw-wrap"><input id="p-cur-pw" type="password" placeholder="Enter current password"/><button class="pw-eye" id="p-cur-eye">${ic("eye", 18)}</button></div><div class="err" id="p-cur-err"></div></div>
      <div class="field"><label>New Password</label><div class="pw-wrap"><input id="p-new-pw" type="password" placeholder="Min 8 characters"/><button class="pw-eye" id="p-new-eye">${ic("eye", 18)}</button></div><div class="strength-bar"><div class="strength-fill" id="p-strength" style="width:0%;background:#ef4444"></div></div><div class="err" id="p-new-err"></div></div>
      <div class="field"><label>Confirm New Password</label><div class="pw-wrap"><input id="p-conf-pw" type="password" placeholder="Repeat new password"/><button class="pw-eye" id="p-conf-eye">${ic("eye", 18)}</button></div><div class="err" id="p-conf-err"></div></div>
      <button class="btn-save" id="p-save-pw">Update Password</button>
    </div>
  </div>`;
}

function renderModal() {
  const ed = S.editId ? getUserCreds().find((c) => c.id === S.editId) : null;
  return `<div class="overlay open" id="modal-overlay">
    <div class="modal">
      <div class="modal-head">
        <div class="modal-title">${ed ? "Edit Credential" : "Add New Credential"}</div>
        <button class="modal-close" id="modal-close">${ic("x", 16)}</button>
      </div>
      <div class="field"><label>Website Name *</label><input id="m-name" placeholder="e.g. GitHub" value="${ed ? escHtml(ed.name) : ""}"/><div class="err" id="m-name-err"></div></div>
      <div class="field"><label>Website URL</label><input id="m-url" placeholder="https://github.com" value="${ed ? escHtml(ed.url || "") : ""}"/></div>
      <div class="field"><label>Username / Email *</label><input id="m-user" placeholder="your@email.com" value="${ed ? escHtml(ed.username) : ""}"/><div class="err" id="m-user-err"></div></div>
      <div class="field"><label>Password *</label><div class="pw-wrap"><input id="m-pw" type="password" placeholder="Enter password" value="${ed ? escHtml(dec(ed.epw, S.session.id + ed.id)) : ""}"/><button class="pw-eye" id="m-pw-eye">${ic("eye", 18)}</button></div><div class="strength-bar"><div class="strength-fill" id="m-strength" style="width:0%"></div></div><div class="err" id="m-pw-err"></div></div>
      <div class="field"><label>Notes (optional)</label><textarea id="m-notes" placeholder="Any notes…" rows="3" style="width:100%;resize:vertical;background:var(--bg2);border:1.5px solid var(--border);border-radius:var(--r3);padding:.7rem 1rem;font-size:.9rem;color:var(--text);transition:border-color .2s">${ed ? escHtml(ed.notes || "") : ""}</textarea></div>
      <button class="btn-primary" id="m-save">${ed ? "Save Changes" : "Add Password"}</button>
    </div>
  </div>`;
}

function renderConfirm() {
  return `<div class="overlay open" id="confirm-overlay">
    <div class="modal confirm-modal">
      <div class="confirm-icon">${ic("alert", 28)}</div>
      <div class="confirm-title">Delete credential?</div>
      <div class="confirm-msg">This action cannot be undone. The credential will be permanently removed from your vault.</div>
      <div class="confirm-btns">
        <button class="btn-cancel" id="conf-cancel">Cancel</button>
        <button class="btn-delete" id="conf-delete">Delete</button>
      </div>
    </div>
  </div>`;
}

function escHtml(s) {
  const d = document.createElement("div");
  d.appendChild(document.createTextNode(String(s || "")));
  return d.innerHTML;
}

// ─── BIND ─────────────────────────────────────────────────
function bindApp(creds) {
  // NAV
  document.querySelectorAll("[data-nav]").forEach((btn) => {
    on(btn, "click", () => {
      S.page = btn.dataset.nav;
      S.searchQ = "";
      render();
    });
  });
  on($("theme-toggle"), "click", () => {
    S.theme = S.theme === "dark" ? "light" : "dark";
    applyTheme();
    render();
  });
  on($("nav-logout"), "click", doLogout);

  // SEARCH
  on($("search-inp"), "input", (e) => {
    S.searchQ = e.target.value;
    const f = getUserCreds().filter(
      (c) =>
        !S.searchQ ||
        c.name.toLowerCase().includes(S.searchQ.toLowerCase()) ||
        c.username.toLowerCase().includes(S.searchQ.toLowerCase()) ||
        (c.url || "").toLowerCase().includes(S.searchQ.toLowerCase()),
    );
    const grid = document.querySelector(".creds-grid");
    const vc = document.querySelector(".vault-count");
    if (vc) vc.textContent = `${f.length} of ${getUserCreds().length}`;
    if (grid) grid.innerHTML = f.map((c) => credCard(c)).join("");
    else render();
    S.searchQ = e.target.value;
    bindVaultCardActions();
  });

  // FAB
  on($("fab-add"), "click", () => {
    S.modal = true;
    S.editId = null;
    render();
  });

  // CARD ACTIONS
  bindVaultCardActions();

  // MODAL
  if (S.modal) {
    on($("modal-close"), "click", () => {
      S.modal = false;
      S.editId = null;
      render();
    });
    on($("modal-overlay"), "click", (e) => {
      if (e.target.id === "modal-overlay") {
        S.modal = false;
        S.editId = null;
        render();
      }
    });
    const mpw = $("m-pw");
    if (mpw) {
      // strength
      on(mpw, "input", () => {
        const str = pwStrength(mpw.value);
        const pct = (str / 5) * 100;
        const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];
        const fill = $("m-strength");
        if (fill) {
          fill.style.width = pct + "%";
          fill.style.background = colors[str - 1] || "#ef4444";
        }
      });
      // eye
      const eye = $("m-pw-eye");
      on(eye, "click", () => {
        const t = mpw.type === "password" ? "text" : "password";
        mpw.type = t;
        eye.innerHTML = ic(t === "password" ? "eye" : "eyeOff", 18);
      });
    }
    on($("m-save"), "click", saveModal);
  }

  // CONFIRM
  if (S.confirmDelete) {
    on($("conf-cancel"), "click", () => {
      S.confirmDelete = null;
      render();
    });
    on($("conf-delete"), "click", async () => {
      const credId = S.confirmDelete;
      try {
        const response = await fetch(`${API_BASE}/passwords/${credId}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) {
          toast(data.message || "Failed to delete", "error");
          return;
        }
        S.creds[S.session.id] = (S.creds[S.session.id] || []).filter(
          (c) => c.id !== credId,
        );
        S.confirmDelete = null;
        save();
        toast("Credential deleted", "info");
        render();
      } catch (error) {
        console.error("Delete failed:", error);
        toast("Server Error", "error");
      }
    });
  }

  // PROFILE
  if (S.page === "profile") {
    ["p-cur", "p-new", "p-conf"].forEach((pref) => {
      const inp = $(pref + "-pw"),
        btn = $(pref + "-eye");
      if (!inp || !btn) return;
      on(btn, "click", () => {
        const t = inp.type === "password" ? "text" : "password";
        inp.type = t;
        btn.innerHTML = ic(t === "password" ? "eye" : "eyeOff", 18);
      });
    });
    const npw = $("p-new-pw");
    if (npw)
      on(npw, "input", () => {
        const str = pwStrength(npw.value);
        const pct = (str / 5) * 100;
        const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];
        const fill = $("p-strength");
        if (fill) {
          fill.style.width = pct + "%";
          fill.style.background = colors[str - 1] || "#ef4444";
        }
      });
    on($("p-save-info"), "click", saveProfileInfo);
    on($("p-save-pw"), "click", saveProfilePw);
  }
}

function bindVaultCardActions() {
  document.querySelectorAll("[data-edit]").forEach((btn) => {
    on(btn, "click", () => {
      S.editId = btn.dataset.edit;
      S.modal = true;
      render();
    });
  });
  document.querySelectorAll("[data-del]").forEach((btn) => {
    on(btn, "click", () => {
      S.confirmDelete = btn.dataset.del;
      render();
    });
  });
  document.querySelectorAll("[data-copy-user]").forEach((btn) => {
    on(btn, "click", () => {
      const c = getUserCreds().find((x) => x.id === btn.dataset.copyUser);
      if (c) copyText(c.username, "Username");
    });
  });
  document.querySelectorAll("[data-copy-pw]").forEach((btn) => {
    on(btn, "click", () => {
      const c = getUserCreds().find((x) => x.id === btn.dataset.copyPw);
      if (c) copyText(dec(c.epw, S.session.id + c.id), "Password");
    });
  });
  document.querySelectorAll("[data-toggle-pw]").forEach((btn) => {
    on(btn, "click", () => {
      const id = btn.dataset.togglePw;
      S.showPw[id] = !S.showPw[id];
      const c = getUserCreds().find((x) => x.id === id);
      const valEl = $("pw-val-" + id);
      if (valEl && c) {
        const pw = dec(c.epw, S.session.id + c.id);
        valEl.textContent = S.showPw[id] ? pw : "••••••••";
      }
      btn.innerHTML = ic(S.showPw[id] ? "eyeOff" : "eye", 13);
    });
  });
}

async function saveModal() {
  const website = document.getElementById("m-name").value.trim();
  const url = document.getElementById("m-url").value.trim();
  const username = document.getElementById("m-user").value.trim();
  const password = document.getElementById("m-pw").value;
  const notes = document.getElementById("m-notes").value.trim();

  let ok = true;

  if (!website) {
    setErr("m-name-err", "Required");
    ok = false;
  } else {
    clrErr("m-name-err");
  }

  if (!username) {
    setErr("m-user-err", "Required");
    ok = false;
  } else {
    clrErr("m-user-err");
  }

  if (!password) {
    setErr("m-pw-err", "Required");
    ok = false;
  } else {
    clrErr("m-pw-err");
  }

  if (!ok) return;

  const sessionId = S.session?.id || S.session?._id;
  if (!sessionId) {
    toast("Session expired. Please log in again.", "error");
    return;
  }

  try {
    const isEdit = !!S.editId;
    const endpoint = isEdit
      ? `${API_BASE}/passwords/${S.editId}`
      : `${API_BASE}/passwords`;
    const method = isEdit ? "PUT" : "POST";

    // #region agent log
    fetch("http://127.0.0.1:7729/ingest/1f7d9069-6476-45fe-9bb9-faf6ddca8657", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "213814",
      },
      body: JSON.stringify({
        sessionId: "213814",
        location: "script.js:saveModal",
        message: "Saving vault credential",
        data: { isEdit, website, hasToken: !!localStorage.getItem("token") },
        timestamp: Date.now(),
        hypothesisId: "B",
      }),
    }).catch(() => {});
    // #endregion

    const response = await fetch(endpoint, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify({
        website,
        url,
        username,
        password,
        notes,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      toast(data.message || "Failed to save password", "error");
      return;
    }

    const localCred = mongoCredToLocal(data.data, sessionId);
    const userCreds = S.creds[sessionId] || [];

    if (isEdit) {
      S.creds[sessionId] = userCreds.map((c) =>
        c.id === S.editId ? localCred : c,
      );
    } else {
      S.creds[sessionId] = [localCred, ...userCreds];
    }

    save();
    toast(
      isEdit ? "Credential updated!" : "Password saved successfully!",
      "success",
    );

    S.modal = false;
    S.editId = null;
    render();
  } catch (err) {
    console.error(err);
    toast("Server Error", "error");
  }
}

async function loadPasswords() {
  try {
    const sessionId = S.session?.id || S.session?._id;
    if (!sessionId) {
      console.error("No active session for loadPasswords");
      return;
    }

    const response = await fetch(`${API_BASE}/passwords`, {
      headers: getAuthHeaders(),
    });

    const result = await response.json();

    // #region agent log
    fetch("http://127.0.0.1:7729/ingest/1f7d9069-6476-45fe-9bb9-faf6ddca8657", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "213814",
      },
      body: JSON.stringify({
        sessionId: "213814",
        location: "script.js:loadPasswords",
        message: "Loaded passwords from API",
        data: {
          ok: response.ok,
          count: result.data?.length ?? 0,
        },
        timestamp: Date.now(),
        hypothesisId: "C",
      }),
    }).catch(() => {});
    // #endregion

    if (response.ok && result.success) {
      S.creds[sessionId] = (result.data || []).map((item) =>
        mongoCredToLocal(item, sessionId),
      );
      save();
    } else {
      S.creds[sessionId] = [];
      console.error(result.message);
    }
  } catch (err) {
    console.error(err);
    const sessionId = S.session?.id || S.session?._id;
    if (sessionId) S.creds[sessionId] = [];
  }
}

function saveProfileInfo() {
  const name = ($("p-name") || {}).value?.trim();
  const uname = ($("p-uname") || {}).value?.trim();
  const email = ($("p-email") || {}).value?.trim();
  let ok = true;
  if (!name) {
    setErr("p-name-err", "Required");
    ok = false;
  } else clrErr("p-name-err");
  if (!uname || uname.length < 3) {
    setErr("p-uname-err", "Min 3 chars");
    ok = false;
  } else clrErr("p-uname-err");
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    setErr("p-email-err", "Valid email required");
    ok = false;
  } else clrErr("p-email-err");
  if (!ok) return;

  fetch(`${API_BASE}/profile`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      fullName: name,
      username: uname,
      email,
    }),
  })
    .then((response) => response.json().then((data) => ({ response, data })))
    .then(({ response, data }) => {
      if (!response.ok) {
        toast(data.message || "Profile update failed", "error");
        return;
      }

      S.session = {
        ...S.session,
        fullName: data.user.fullName,
        name: data.user.fullName,
        username: data.user.username,
        email: data.user.email,
      };
      localStorage.setItem("user", JSON.stringify(data.user));
      save();
      toast("Profile updated!", "success");
      render();
    })
    .catch((error) => {
      console.error("Profile update failed:", error);
      toast("Server Error", "error");
    });
}

async function saveProfilePw() {
  const cur = ($("p-cur-pw") || {}).value;
  const nw = ($("p-new-pw") || {}).value;
  const conf = ($("p-conf-pw") || {}).value;
  let ok = true;

  if (!cur) {
    setErr("p-cur-err", "Required");
    ok = false;
  } else clrErr("p-cur-err");
  if (!nw || nw.length < 8) {
    setErr("p-new-err", "Min 8 characters");
    ok = false;
  } else clrErr("p-new-err");
  if (nw !== conf) {
    setErr("p-conf-err", "Passwords do not match");
    ok = false;
  } else clrErr("p-conf-err");
  if (!ok) return;

  try {
    const response = await fetch(`${API_BASE}/profile/password`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        currentPassword: cur,
        newPassword: nw,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        setErr("p-cur-err", "Incorrect password");
      } else {
        toast(data.message || "Password update failed", "error");
      }
      return;
    }

    toast("Password updated successfully!", "success");
    const curEl = $("p-cur-pw");
    const newEl = $("p-new-pw");
    const confEl = $("p-conf-pw");
    if (curEl) curEl.value = "";
    if (newEl) newEl.value = "";
    if (confEl) confEl.value = "";
  } catch (error) {
    console.error("Password update failed:", error);
    toast("Server Error", "error");
  }
}

function doLogout() {
  S.session = null;
  S.page = "login";
  S.showPw = {};
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  save();
  toast("Logged out", "info");
  render();
}

// ─── INIT ─────────────────────────────────────────────────
async function hydrateSession() {
  const token = localStorage.getItem("token");

  if (!token) {
    render();
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Session expired");
    }

    S.session = {
      id: data.user._id,
      _id: data.user._id,
      fullName: data.user.fullName,
      name: data.user.fullName,
      username: data.user.username,
      email: data.user.email,
    };
    localStorage.setItem("user", JSON.stringify(data.user));
    S.page = "dashboard";
    await loadPasswords();
    save();
  } catch (error) {
    console.error("Session restore failed:", error);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    S.session = null;
    S.page = "login";
    save();
  }

  render();
}

// #region agent log
fetch("http://127.0.0.1:7729/ingest/1f7d9069-6476-45fe-9bb9-faf6ddca8657", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Debug-Session-Id": "213814",
  },
  body: JSON.stringify({
    sessionId: "213814",
    location: "script.js:init",
    message: "App init session state",
    data: {
      hasPsSession: !!S.session,
      psSessionId: S.session?.id || null,
      hasToken: !!localStorage.getItem("token"),
      credsKeys: Object.keys(S.creds || {}),
    },
    timestamp: Date.now(),
    hypothesisId: "G",
  }),
}).catch(() => {});
// #endregion

async function initApp() {
  const token = localStorage.getItem("token");

  if (token) {
    await hydrateSession();
    return;
  }

  if (S.session) {
    S.session = null;
    S.page = "login";
    save();
  }

  render();
}

initApp();
