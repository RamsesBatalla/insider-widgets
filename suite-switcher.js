/*
 * suite-switcher.js — Insider Suite · widget de cambio rápido entre productos + chat de soporte.
 * v2.0 — Sin Shadow DOM, CSS prefijado con isw- para evitar conflictos.
 */
(function () {
  "use strict";

  if (window.__insiderSuiteSwitcherLoaded) return;
  window.__insiderSuiteSwitcherLoaded = true;

  // AUTH_ORIGIN fijo — nunca se infiere del dominio del script
  var AUTH_ORIGIN = "https://auth.insider-mail.com";
  var CURRENT_PID = null;
  var POSITION = "center-right";
  var OFFSET_BOTTOM = 0;
  var VALID_POSITIONS = { "bottom-left":1,"bottom-right":1,"top-left":1,"top-right":1,"center-left":1,"center-right":1 };

  (function () {
    var scripts = document.getElementsByTagName("script");
    var s = scripts[scripts.length - 1];
    if (!s) return;
    var authOverride = s.getAttribute("data-auth-origin");
    if (authOverride) AUTH_ORIGIN = authOverride;
    CURRENT_PID = s.getAttribute("data-product");
    var pos = s.getAttribute("data-position");
    if (pos && VALID_POSITIONS[pos]) POSITION = pos;
    var off = parseInt(s.getAttribute("data-offset-bottom"), 10);
    if (off > 0) OFFSET_BOTTOM = off;
  })();

  if (!CURRENT_PID) {
    var slug = (location.hostname.split(".")[0] || "").replace(/-staging$/, "");
    CURRENT_PID = slug === "chat" ? "insider-chat" : (slug ? "insider-" + slug : "insider-suite");
  }

  // ── Inyectar CSS global prefijado (una sola vez) ──────────────────────────
  if (!document.getElementById("isw-global-style")) {
    var edges = POSITION.split("-");
    var vSide = edges[0], hSide = edges[1];
    var isCenter = vSide === "center";
    var panelOpenDir = (vSide === "top") ? "top:58px" : "bottom:58px";
    var vPos = isCenter ? "top:50%;transform:translateY(-50%)" : (vSide + ":" + (20 + (vSide === "bottom" ? OFFSET_BOTTOM : 0)) + "px");

    var supBottom = (CURRENT_PID === "insider-chat" && OFFSET_BOTTOM === 0) ? 85 : (16 + OFFSET_BOTTOM);
    var supModalBottom = supBottom + 56;

    var css = document.createElement("style");
    css.id = "isw-global-style";
    css.textContent = [
      // Suite switcher
      "#isw-suite-root{position:fixed;" + vPos + ";" + hSide + ":20px;z-index:2147483640!important;font-family:Montserrat,system-ui,sans-serif}",
      "#isw-suite-root *{box-sizing:border-box}",
      ".isw-btn{width:48px;height:48px;border-radius:50%;background:#0E1E3A;border:2px solid #C4AE70;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,.4);padding:0;outline:none}",
      ".isw-btn:hover{background:#162848}",
      ".isw-btn svg{width:22px;height:22px}",
      ".isw-panel{position:fixed;top:50%;transform:translateY(-50%);right:76px;background:#0E1E3A;border:1px solid rgba(196,174,112,.35);border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.5);padding:10px;min-width:210px;display:none;flex-direction:column;gap:4px;z-index:2147483645!important}",
      ".isw-panel.isw-open{display:flex}",
      ".isw-hdr{display:block;color:#C4AE70;font-size:.68rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:2px 8px 6px;text-decoration:none;cursor:pointer;font-family:inherit}",
      ".isw-hdr:hover{text-decoration:underline}",
      ".isw-item{display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;color:#E8EEFF;font-size:.86rem;font-weight:600;cursor:pointer;background:none;border:none;text-align:left;width:100%;font-family:inherit}",
      ".isw-item:hover{background:rgba(196,174,112,.12)}",
      // Support widget
      "#isw-sup-root{position:fixed;bottom:" + supBottom + "px;right:20px;z-index:2147483647!important;font-family:Montserrat,system-ui,sans-serif}",
      "#isw-sup-root *{box-sizing:border-box}",
      ".isw-sup-btn{height:44px;padding:0 18px;border-radius:22px;background:#0E1E3A;border:1.5px solid #C4AE70;color:#E8EEFF;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 4px 16px rgba(0,0,0,.4);outline:none;font-family:inherit}",
      ".isw-sup-btn:hover{background:#162848;border-color:#DFD0A4}",
      ".isw-sup-modal{position:fixed;bottom:" + supModalBottom + "px;right:20px;width:340px;max-width:calc(100vw - 32px);height:440px;background:#091224;border:1px solid rgba(196,174,112,.35);border-radius:16px;box-shadow:0 16px 40px rgba(0,0,0,.7);padding:12px;display:none;flex-direction:column;gap:8px;color:#E8EEFF;z-index:2147483647!important;font-family:Montserrat,system-ui,sans-serif}",
      ".isw-sup-modal.isw-open{display:flex}",
      ".isw-sup-title{font-size:12px;font-weight:800;color:#C4AE70;display:flex;align-items:center;justify-content:space-between}",
      ".isw-sup-sub{font-size:10px;color:#94A3B8;margin-top:1px;display:flex;justify-content:space-between;align-items:center}",
      ".isw-sup-close,.isw-sup-hide{background:none;border:1px solid rgba(196,174,112,.3);color:#C4AE70;font-size:10px;padding:2px 7px;border-radius:4px;cursor:pointer;font-family:inherit}",
      ".isw-sup-close:hover,.isw-sup-hide:hover{background:rgba(196,174,112,.15);color:#fff}",
      ".isw-chat-body{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding-right:4px}",
      ".isw-msg{padding:6px 10px;border-radius:10px;font-size:11px;line-height:1.45;max-width:82%;word-break:break-word;white-space:pre-wrap}",
      ".isw-msg-in{background:#132240;color:#E8EEFF;align-self:flex-start;border:1px solid rgba(196,174,112,.2)}",
      ".isw-msg-out{background:#C4AE70;color:#000;font-weight:700;align-self:flex-end}",
      ".isw-opts{display:flex;flex-direction:column;gap:4px;margin-top:4px}",
      ".isw-opt{background:#0E1E3A;border:1px solid rgba(196,174,112,.25);color:#E8EEFF;padding:6px 9px;border-radius:7px;font-size:10.5px;text-align:left;cursor:pointer;transition:all .15s;font-family:inherit}",
      ".isw-opt:hover{background:rgba(196,174,112,.2);border-color:#C4AE70;color:#fff}",
      ".isw-footer{display:flex;flex-direction:column;gap:5px;margin-top:auto}",
      ".isw-input-row{display:flex;gap:5px}",
      ".isw-textarea{flex:1;resize:none;height:34px;background:#030712;border:1px solid rgba(196,174,112,.25);color:#fff;padding:7px 9px;border-radius:8px;font-size:10.5px;outline:none;font-family:inherit}",
      ".isw-textarea:focus{border-color:#C4AE70}",
      ".isw-send{background:#C4AE70;color:#000;font-weight:800;border:none;padding:0 12px;border-radius:8px;cursor:pointer;font-size:11px;height:34px;white-space:nowrap;transition:background .15s;font-family:inherit}",
      ".isw-send:hover{background:#DFD0A4}",
      ".isw-send:disabled{opacity:.5;cursor:not-allowed}",
      // Mobile responsive adaptive rules (iPhone, Android, small screens)
      "@media (max-width: 640px) {",
      "  #isw-suite-root{right:12px!important}",
      "  .isw-panel{position:fixed!important;top:auto!important;transform:none!important;bottom:70px!important;right:12px!important;left:12px!important;width:auto!important;max-width:calc(100vw - 24px)!important;max-height:calc(85vh - 65px)!important;overflow-y:auto!important;box-shadow:0 16px 48px rgba(0,0,0,0.85)!important;border:1.5px solid rgba(196,174,112,0.5)!important}",
      "  .isw-sup-modal{position:fixed!important;top:12px!important;bottom:65px!important;left:12px!important;right:12px!important;width:auto!important;height:auto!important;max-width:none!important}",
      "  #isw-passkey-banner{bottom:10px!important;left:10px!important;right:10px!important;transform:none!important;width:auto!important;max-width:none!important;padding:6px 10px!important;border-radius:10px!important;gap:6px!important}",
      "  #isw-passkey-banner .isw-pk-icon{width:26px!important;height:26px!important;font-size:14px!important;border-radius:6px!important}",
      "  #isw-passkey-banner .isw-pk-title{font-size:11px!important;gap:4px!important}",
      "  #isw-passkey-banner .isw-pk-sub{font-size:9px!important;margin-top:1px!important}",
      "  #isw-passkey-act-btn{padding:4px 8px!important;font-size:10px!important;border-radius:6px!important}",
      "  #isw-passkey-close-btn{width:20px!important;height:20px!important;font-size:10px!important}",
      "}"
    ].join("\n");
    document.head.appendChild(css);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function decodeJwt(t) {
    try { return JSON.parse(decodeURIComponent(escape(atob(t.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"))))); }
    catch(e) { return null; }
  }

  var CHAT_JWT_KEY = "insider_chat_jwt";

  function resolveSession(cb) {
    if (CURRENT_PID === "insider-chat") {
      var token = null;
      try { token = localStorage.getItem(CHAT_JWT_KEY); } catch(_) {}
      if (!token) { cb(null, null, false); return; }
      var claims = decodeJwt(token);
      cb((claims && claims.licenses) || null, token, false);
      return;
    }
    fetch(AUTH_ORIGIN + "/api/session/whoami", { credentials: "include" })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(d) { cb((d && d.licenses) || null, null, !!(d && d.has_webauthn)); })
      .catch(function() { cb(null, null, false); });
  }

  var THEMES = {
    gold:  { base: "#000000", tri: "#C4AE70" },
    navy:  { base: "#1D3360", tri: "#BCC0C7" },
    amber: { base: "#15110D", tri: "#A3681E" }
  };
  function miniLogo(p) {
    var t = THEMES[p.theme] || THEMES.navy;
    return '<svg width="26" height="26" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">'
      + '<rect x="8" y="8" width="104" height="104" rx="20" fill="' + t.base + '"/>'
      + '<polygon points="60,8 112,8 112,44" fill="' + t.tri + '"/>'
      + '</svg>';
  }

  var LANG = "es";
  try { LANG = localStorage.getItem("insider:lang") || "es"; } catch(_) {}
  var SUITE_LABEL = LANG === "en" ? "Your suite" : "Tu suite";

  // ── Mi Suite widget ───────────────────────────────────────────────────────
  function renderSuite(products, token) {
    if (document.getElementById("isw-suite-root")) return;

    var root = document.createElement("div");
    root.id = "isw-suite-root";
    document.body.appendChild(root);

    var btn = document.createElement("button");
    btn.className = "isw-btn";
    btn.setAttribute("aria-label", SUITE_LABEL);
    btn.setAttribute("aria-haspopup", "true");
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#C4AE70" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>'
      + '<rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'
      + '</svg>';
    root.appendChild(btn);

    var panel = document.createElement("div");
    panel.className = "isw-panel";

    var hdr = document.createElement("a");
    hdr.className = "isw-hdr";
    hdr.href = AUTH_ORIGIN + "/suite";
    hdr.textContent = SUITE_LABEL;
    panel.appendChild(hdr);

    products.forEach(function(p) {
      var item = document.createElement("button");
      item.className = "isw-item";
      item.innerHTML = miniLogo(p) + "<span>" + p.name + "</span>";
      item.addEventListener("click", function() {
        var url = p.activate;
        if (token) url += (url.indexOf("?") > -1 ? "&" : "?") + "token=" + token;
        location.href = url;
      });
      panel.appendChild(item);
    });

    if (window.PublicKeyCredential && typeof window.PublicKeyCredential === "function") {
      var passkeyBtn = document.createElement("button");
      passkeyBtn.className = "isw-item";
      passkeyBtn.style.marginTop = "6px";
      passkeyBtn.style.background = "linear-gradient(135deg, rgba(196,174,112,0.2) 0%, rgba(30,58,138,0.4) 100%)";
      passkeyBtn.style.border = "1px solid rgba(196,174,112,0.4)";
      passkeyBtn.style.borderRadius = "8px";
      passkeyBtn.style.padding = "8px 10px";
      passkeyBtn.innerHTML = '<span style="font-size:15px">🔑</span><span style="color:#DFD0A4;font-weight:700;font-size:.8rem">' + (LANG === "en" ? "Activate Face ID / Touch ID" : "Activar Face ID / Huella") + '</span>';
      passkeyBtn.addEventListener("click", function() {
        try { localStorage.setItem("trigger_passkey_reg", "true"); } catch(_) {}
        location.href = AUTH_ORIGIN + "/suite?trigger_passkey_reg=1";
      });
      panel.appendChild(passkeyBtn);
    }
    document.body.appendChild(panel);

    btn.addEventListener("click", function(e) {
      e.stopPropagation();
      panel.classList.toggle("isw-open");
    });
    document.addEventListener("click", function() {
      panel.classList.remove("isw-open");
    });
  }

  // ── Support widget ────────────────────────────────────────────────────────
  function renderSupport(pid, identity) {
    if (document.getElementById("isw-sup-root")) return;

    var OPTIONS = {
      "insider-call":    ["📞 Reportar problema con llamada o IVR","⚙️ Duda de configuración de número","👥 Asistencia con permisos de equipo","💬 Hablar con soporte humano"],
      "insider-receipt": ["📄 Duda con lectura de recibo","💳 Problema de facturación","🏢 Configuración de empresa / merchant","💬 Hablar con soporte humano"],
      "insider-chat":    ["💬 Problema enviando WhatsApp / SMS","📥 Asignación de inbox","⚙️ Configuración de canal","💬 Hablar con soporte humano"],
      "insider-iron":    ["⚙️ Incidencia técnica de sistema","📷 Registro de fotos","📋 Plan de mantenimiento","💬 Hablar con soporte humano"],
      "default":         ["❓ Pregunta general","🐞 Reportar una incidencia / error","💬 Hablar con soporte humano"]
    };
    var opts = OPTIONS[pid] || OPTIONS["default"];
    var productName = (pid || "").replace("insider-", "").toUpperCase();

    var supSessionId;
    try { supSessionId = localStorage.getItem("insider_sup_session_id"); } catch(_) {}
    if (!supSessionId || supSessionId.length > 28) {
      supSessionId = "sup_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      try { localStorage.setItem("insider_sup_session_id", supSessionId); } catch(_) {}
    }

    var root = document.createElement("div");
    root.id = "isw-sup-root";
    document.body.appendChild(root);

    var toggleBtn = document.createElement("button");
    toggleBtn.className = "isw-sup-btn";
    toggleBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C4AE70" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
      + '<span id="isw-sup-label">Soporte & Ayuda</span>';
    root.appendChild(toggleBtn);

    var modal = document.createElement("div");
    modal.className = "isw-sup-modal";
    modal.innerHTML = '<div class="isw-sup-title">'
      + '<span>💬 Chat de Soporte Insider</span>'
      + '<button class="isw-sup-close">✕</button>'
      + '</div>'
      + '<div class="isw-sup-sub">'
      + '<span>Atención Inteligente · ' + productName + '</span>'
      + '<span style="color:#34D399;font-weight:700">🤖 IA Activa</span>'
      + '</div>'
      + '<div class="isw-chat-body" id="isw-chat-body"></div>'
      + '<div class="isw-footer">'
      + '<div class="isw-opts" id="isw-opts"></div>'
      + '<div class="isw-input-row">'
      + '<textarea class="isw-textarea" id="isw-input" placeholder="Escribe tu consulta..."></textarea>'
      + '<button class="isw-send" id="isw-send">Enviar</button>'
      + '</div></div>';
    document.body.appendChild(modal);

    var chatBody = modal.querySelector("#isw-chat-body");
    var optsContainer = modal.querySelector("#isw-opts");
    var inputEl = modal.querySelector("#isw-input");
    var sendBtn = modal.querySelector("#isw-send");
    var unreadCount = 0;

    function getLabel() { return document.getElementById("isw-sup-label"); }

    function updateUnreadBadge() {
      var lbl = getLabel();
      if (!lbl) return;
      if (modal.classList.contains("isw-open")) { unreadCount = 0; lbl.textContent = "Soporte & Ayuda"; return; }
      if (unreadCount > 0) { lbl.textContent = "Soporte (" + unreadCount + ")"; }
      else { lbl.textContent = "Soporte & Ayuda"; }
    }

    function appendMsg(text, isUser) {
      var msg = document.createElement("div");
      msg.className = "isw-msg " + (isUser ? "isw-msg-out" : "isw-msg-in");
      msg.textContent = text;
      chatBody.appendChild(msg);
      chatBody.scrollTop = chatBody.scrollHeight;
    }

    function renderQuickOpts() {
      optsContainer.innerHTML = "";
      opts.forEach(function(o) {
        var btnOpt = document.createElement("button");
        btnOpt.className = "isw-opt";
        btnOpt.textContent = o;
        btnOpt.addEventListener("click", function() { sendUserMsg(o); });
        optsContainer.appendChild(btnOpt);
      });
    }

    function sendUserMsg(txt) {
      if (!txt) return;
      appendMsg(txt, true);
      optsContainer.style.display = "none";
      var payload = { session_id: supSessionId, product: CURRENT_PID, user_message: txt };
      if (identity && identity.email) payload.user_email = identity.email;
      sendBtn.disabled = true;
      fetch(AUTH_ORIGIN + "/api/support/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        sendBtn.disabled = false;
        if (d && d.reply) { appendMsg(d.reply, false); }
        else { appendMsg("Recibido. Un agente revisará tu consulta a la brevedad.", false); }
      })
      .catch(function() {
        sendBtn.disabled = false;
        appendMsg("Mensaje enviado. Nuestro equipo lo revisará.", false);
      });
    }

    sendBtn.addEventListener("click", function() {
      var txt = inputEl.value.trim();
      if (!txt) return;
      inputEl.value = "";
      sendUserMsg(txt);
    });

    inputEl.addEventListener("keydown", function(e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
      }
    });

    var pollingTimer = null;
    var lastRenderedMsgIds = "";

    function pollMessages() {
      if (!supSessionId) return;
      fetch(AUTH_ORIGIN + "/api/support/messages?session_id=" + encodeURIComponent(supSessionId))
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(d) {
          if (d && d.messages && d.messages.length > 0) {
            var msgFingerprint = d.messages.map(function(m){ return m.id; }).join(",");
            var existingCount = chatBody.querySelectorAll(".isw-msg").length;
            if (msgFingerprint !== lastRenderedMsgIds) {
              lastRenderedMsgIds = msgFingerprint;
              chatBody.innerHTML = "";
              d.messages.forEach(function(m) {
                // direction = 'in' (usuario escribiendo a soporte) -> isUser = true
                // direction = 'out' (soporte o IA respondiendo al usuario) -> isUser = false
                var isUserMsg = (m.direction === "in" || m.from === supSessionId);
                appendMsg(m.body, isUserMsg);
              });
              if (!modal.classList.contains("isw-open")) {
                var newCount = d.messages.length - existingCount;
                if (newCount > 0) {
                  unreadCount += newCount;
                  updateUnreadBadge();
                }
              }
            }
          }
        })
        .catch(function() {});
    }

    function startPolling() {
      pollMessages();
      if (!pollingTimer) pollingTimer = setInterval(pollMessages, 8000);
    }

    renderQuickOpts();

    function openModal() {
      modal.classList.add("isw-open");
      toggleBtn.style.display = "none";
      unreadCount = 0;
      updateUnreadBadge();
      startPolling();
      var swPanel = document.querySelector("#isw-suite-root .isw-panel");
      if (swPanel) swPanel.classList.remove("isw-open");
    }

    function closeModal() {
      modal.classList.remove("isw-open");
      toggleBtn.style.display = "";
    }

    toggleBtn.addEventListener("click", openModal);
    var closeBtn = modal.querySelector(".isw-sup-close");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
  }

  // ── Productos fallback ─────────────────────────────────────────────────────
  var FALLBACK = [
    { pid: "insider-suite",    name: "Insider Suite",    activate: "https://auth.insider-mail.com/suite",       available: true, theme: "gold"  },
    { pid: "insider-call",     name: "Insider Call",     activate: "https://call.insider-mail.com",             available: true, theme: "navy"  },
    { pid: "insider-receipt",  name: "Insider Receipts", activate: "https://receipts.insider-mail.com/hub",     available: true, theme: "amber" },
    { pid: "insider-invoices", name: "Insider Invoices", activate: "https://invoices.insider-mail.com",         available: true, theme: "navy"  },
    { pid: "insider-chat",     name: "Insider Chat",     activate: "https://chat.insider-mail.com",             available: true, theme: "navy"  },
    { pid: "insider-iron",     name: "Insider Iron",     activate: "https://iron.insider-mail.com/hub",         available: true, theme: "amber" },
    { pid: "insider-ads",      name: "Insider Ads",      activate: "https://ads.insider-mail.com/",           available: true, theme: "gold"  }
  ];

  // ── Banner promocional de biometría en todos los servicios ─────────────────
  var CAMPAIGN_END_TIMESTAMP = 1786740782000; // 7 días exactamente desde hoy (14 de Agosto de 2026)

  function renderPasskeyAnnouncementBanner() {
    if (!window.PublicKeyCredential || typeof window.PublicKeyCredential !== "function") return;
    if (Date.now() >= CAMPAIGN_END_TIMESTAMP) return; // Expira automáticamente a los 7 días
    if (document.getElementById("isw-passkey-banner")) return;

    try {
      if (localStorage.getItem("isw_passkey_this_device_enrolled") === "true" ||
          localStorage.getItem("passkey_enrolled_global") === "true" ||
          localStorage.getItem("passkey_enrolled_" + location.host) === "true") {
        return; // Ya tiene biometría configurada. Ocultar banner por completo.
      }
      var dismissedUntil = parseInt(localStorage.getItem("isw_passkey_banner_dismissed") || "0", 10);
      if (Date.now() < dismissedUntil) return;
    } catch(_) {}

    var banner = document.createElement("div");
    banner.id = "isw-passkey-banner";
    banner.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);width:calc(100% - 24px);max-width:680px;background:linear-gradient(135deg,#091326 0%,#0E1E3A 100%);border:1.5px solid #C4AE70;border-radius:14px;box-shadow:0 12px 36px rgba(0,0,0,0.65),0 0 16px rgba(196,174,112,0.15);padding:10px 14px;z-index:2147483635!important;color:#E8EEFF;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;font-family:Montserrat,system-ui,sans-serif";

    var isES = (LANG === "es");
    banner.innerHTML = '<div style="display:flex;align-items:center;gap:8px;flex:1;min-width:200px">'
      + '<div class="isw-pk-icon" style="width:34px;height:34px;border-radius:8px;background:rgba(196,174,112,0.15);border:1px solid rgba(196,174,112,0.3);display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0">📱</div>'
      + '<div style="min-width:0;flex:1">'
      + '<div class="isw-pk-title" style="font-size:11.5px;font-weight:700;color:#F2F5FC;display:flex;align-items:center;gap:5px;flex-wrap:wrap">'
      + '<span>' + (isES ? '✨ Novedad: Activa Face ID / Huella en este equipo' : '✨ New: Enable Face ID / Touch ID here') + '</span>'
      + '<span style="background:rgba(52,211,153,0.15);color:#34D399;font-size:8.5px;font-weight:800;padding:1px 5px;border-radius:4px;border:1px solid rgba(52,211,153,0.3)">1-Clic</span>'
      + '<span id="isw-passkey-timer" style="font-size:9px;color:#C4AE70;background:rgba(196,174,112,0.12);border:1px solid rgba(196,174,112,0.25);padding:1px 5px;border-radius:4px;font-family:monospace;white-space:nowrap">⏳ 7d</span>'
      + '</div>'
      + '<div class="isw-pk-sub" style="font-size:9.5px;color:#94A3B8;margin-top:1px;line-height:1.25">'
      + (isES ? 'Entra en 1 segundo sin pedir enlaces por correo · <span style="color:#C4AE70">*Vinculado a este equipo.</span>' : 'Sign in 1-sec without email links · <span style="color:#C4AE70">*Links to this device.</span>')
      + '</div></div></div>'
      + '<div style="display:flex;align-items:center;gap:6px;margin-left:auto">'
      + '<button type="button" id="isw-passkey-act-btn" style="background:#C4AE70;color:#000;border:none;border-radius:7px;padding:6px 11px;font-weight:800;font-size:10.5px;cursor:pointer;white-space:nowrap;box-shadow:0 2px 8px rgba(196,174,112,0.3)">' + (isES ? '🔑 Activar' : '🔑 Enable') + '</button>'
      + '<button type="button" id="isw-passkey-close-btn" style="background:none;border:1px solid rgba(196,174,112,0.3);color:#C4AE70;border-radius:6px;width:22px;height:22px;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">✕</button>'
      + '</div>';

    document.body.appendChild(banner);

    function updateTimer() {
      var rem = CAMPAIGN_END_TIMESTAMP - Date.now();
      if (rem <= 0) {
        if (banner.parentNode) banner.parentNode.removeChild(banner);
        return;
      }
      var days = Math.floor(rem / (1000 * 60 * 60 * 24));
      var hours = Math.floor((rem % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      var mins = Math.floor((rem % (1000 * 60 * 60)) / (1000 * 60));
      var secs = Math.floor((rem % (1000 * 60)) / 1000);
      var timerEl = document.getElementById("isw-passkey-timer");
      if (timerEl) {
        timerEl.textContent = "⏳ " + (days > 0 ? days + "d " : "") + (hours < 10 ? "0" : "") + hours + "h " + (mins < 10 ? "0" : "") + mins + "m " + (secs < 10 ? "0" : "") + secs + "s";
      }
    }
    setInterval(updateTimer, 1000);
    updateTimer();

    document.getElementById("isw-passkey-act-btn").addEventListener("click", function() {
      try { localStorage.setItem("trigger_passkey_reg", "true"); } catch(_) {}
      location.href = AUTH_ORIGIN + "/suite?trigger_passkey_reg=1";
    });

    document.getElementById("isw-passkey-close-btn").addEventListener("click", function() {
      try {
        localStorage.setItem("isw_passkey_banner_dismissed", (Date.now() + 7 * 24 * 3600 * 1000).toString());
      } catch(_) {}
      banner.style.display = "none";
    });
  }

  // ── 1. Renderizar widgets ─────────────────────
  try { renderSupport(CURRENT_PID, null); } catch(e) { console.error("[isw] support error:", e); }
  try {
    var fallbackProducts = FALLBACK.filter(function(p) { return p.pid !== CURRENT_PID; });
    renderSuite(fallbackProducts, null);
  } catch(e) { console.error("[isw] suite error:", e); }
  try { renderPasskeyAnnouncementBanner(); } catch(e) { console.error("[isw] passkey banner error:", e); }

  // ── 2. Enriquecer con datos reales de sesión ───────────────────────────────
  resolveSession(function(licenses, token, hasWebAuthn) {
    if (hasWebAuthn) {
      try {
        localStorage.setItem("isw_passkey_this_device_enrolled", "true");
        localStorage.setItem("passkey_enrolled_global", "true");
        localStorage.setItem("passkey_enrolled_" + location.host, "true");
      } catch(_) {}
      var b = document.getElementById("isw-passkey-banner");
      if (b) b.remove();
    }
    if (!token && !licenses) return;
    if (token) {
      var items = document.querySelectorAll("#isw-suite-root .isw-item");
      items.forEach(function(item) {
        var pid = item.getAttribute("data-pid");
        if (pid) {
          item.onclick = function() {
            var p = FALLBACK.find(function(x) { return x.pid === pid; });
            if (!p) return;
            location.href = p.activate + (p.activate.indexOf("?") > -1 ? "&" : "?") + "token=" + token;
          };
        }
      });
    }
  });

})();
