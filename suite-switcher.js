/*
 * suite-switcher.js — Insider Suite · widget de cambio rápido entre productos.
 *
 * Se embebe con una línea en cualquier producto de la suite:
 *   <script src="https://auth.insider-mail.com/suite-switcher.js"></script>
 *
 * data-position (opcional, default "center-right"): "bottom-left" |
 * "bottom-right" | "top-left" | "top-right" | "center-left" | "center-right"
 * — posición donde se ancla el botón flotante. "center-*" lo fija a media
 * altura usando top:50% + translateY(-50%). Sin el atributo, usa center-right.
 *
 * data-offset-bottom (opcional, default 0): píxeles extra a sumar al offset
 * base de 20px en el eje vertical, SOLO cuando la esquina elegida es
 * "bottom-*". Sirve para que el producto host apile este widget por encima
 * de su propio botón flotante de soporte (que vive fuera de este archivo,
 * en cada repo de producto) sin que se solapen. Sin el atributo, offset 0 —
 * mismo comportamiento que antes para cualquier producto que no lo declare.
 *
 * Detecta el producto host (data-product en el <script>, o el subdominio
 * actual) y resuelve sus licencias de dos formas:
 *   - Chat: lee el JWT que ya guarda en localStorage['insider_chat_jwt'] y
 *     decodifica claims.licenses localmente (no requiere red).
 *   - Cualquier otro producto (Call, Invoices, Iron, ...): hace fetch
 *     same-origin a /api/session/whoami (credentials:'include') para leer
 *     `licenses` desde la sesión del propio producto — esos productos
 *     guardan el JWT server-side (cookie httponly) y no lo exponen crudo al
 *     cliente, así que no hay nada legible en localStorage.
 *
 * Nota: las licenses de Call no traen "status" — la sola presencia del
 * producto en `licenses` ya cuenta como activo (no se filtra por status en
 * ningún lado de este archivo, a propósito).
 */
(function () {
  "use strict";

  if (window.__insiderSuiteSwitcherLoaded) return;
  window.__insiderSuiteSwitcherLoaded = true;

  var CHAT_JWT_KEY = "insider_chat_jwt";

  // AUTH_ORIGIN siempre apunta a auth.insider-mail.com sin importar desde
  // qué dominio se sirva este archivo (GitHub Pages, CDN, etc.)
  var AUTH_ORIGIN = "https://auth.insider-mail.com";
  var CURRENT_PID = null;
  var POSITIONS = { "bottom-left": 1, "bottom-right": 1, "top-left": 1, "top-right": 1, "center-left": 1, "center-right": 1 };
  var POSITION = "center-right";
  var OFFSET_BOTTOM = 0;
  (function () {
    var scripts = document.getElementsByTagName("script");
    var thisScript = scripts[scripts.length - 1];
    if (!thisScript) return;
    // Permitir override explícito vía data-auth-origin (para staging)
    var authOverride = thisScript.getAttribute && thisScript.getAttribute("data-auth-origin");
    if (authOverride) AUTH_ORIGIN = authOverride;
    CURRENT_PID = thisScript.getAttribute && thisScript.getAttribute("data-product");
    var pos = thisScript.getAttribute && thisScript.getAttribute("data-position");
    if (pos && POSITIONS[pos]) POSITION = pos;
    var off = thisScript.getAttribute && parseInt(thisScript.getAttribute("data-offset-bottom"), 10);
    if (off && off > 0) OFFSET_BOTTOM = off;
  })();
  if (!CURRENT_PID) {
    // Fallback: el subdominio actual coincide con el slug del producto
    // (chat., call., invoices., iron.) — ver activate URLs en
    // suite_products.py. "-staging" se recorta para que también funcione
    // en subdominios de staging.
    var slug = (location.hostname.split(".")[0] || "").replace(/-staging$/, "");
    CURRENT_PID = slug === "chat" ? "insider-chat" : (slug ? "insider-" + slug : "insider-chat");
  }

  function decodeJwt(t) {
    try {
      var p = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(decodeURIComponent(escape(atob(p))));
    } catch (e) { return null; }
  }

  // Resuelve (licenses, token) según el producto host. `token` solo existe
  // en el caso Chat (JWT legible en localStorage) — en el caso whoami no hay
  // JWT crudo del lado del cliente, así que los links de switch navegan sin
  // `?token=` y el producto destino resuelve su propio login.
  function resolveSession(callback) {
    if (CURRENT_PID === "insider-chat") {
      var token = null;
      try { token = localStorage.getItem(CHAT_JWT_KEY); } catch (_) {}
      if (!token) { callback(null, null); return; }
      var claims = decodeJwt(token);
      callback((claims && claims.licenses) || null, token);
      return;
    }
    fetch("/api/session/whoami", { credentials: "include" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { callback((data && data.licenses) || null, null); })
      .catch(function () { callback(null, null); });
  }

  var THEMES = {
    gold:  { base: "#000000", tri: "#C4AE70" },
    navy:  { base: "#1D3360", tri: "#BCC0C7" },
    amber: { base: "#15110D", tri: "#A3681E" },
  };
  function miniLogo(p) {
    var t = THEMES[p.theme] || THEMES.navy;
    return '<svg width="28" height="28" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">'
      + '<rect x="8" y="8" width="104" height="104" rx="20" fill="' + t.base + '"/>'
      + '<polygon points="60,8 112,8 112,44" fill="' + t.tri + '"/>'
      + '</svg>';
  }

  var LANG = "es";
  try { LANG = localStorage.getItem("insider:lang") || "es"; } catch (_) {}
  var T = {
    es: { title: "Tu suite", empty: "" },
    en: { title: "Your suite", empty: "" },
  }[LANG] || { title: "Tu suite" };

  function render(products, token) {
    var host = document.createElement("div");
    host.id = "insider-suite-switcher-root";
    host.style.position = "fixed";
    host.style.zIndex = "2147483000"; // por encima de casi cualquier UI del host
    document.body.appendChild(host);

    // Shadow DOM: aísla el CSS del widget del CSS del producto host (y
    // viceversa) — necesario porque este script se embebe en páginas que no
    // controlamos.
    var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;

    // Posición configurable vía data-position en el <script> tag. El .wrap se
    // ancla a la esquina elegida y el .panel se abre hacia el lado opuesto
    // (arriba si el botón está abajo, abajo si el botón está arriba) para no
    // salirse de la pantalla.
    var edges = POSITION.split("-"); // ["bottom"|"top"|"center", "left"|"right"]
    var vSide = edges[0], hSide = edges[1];
    var isCenter = vSide === "center";
    // Panel abre hacia arriba para bottom y center, hacia abajo para top
    var panelV = (vSide === "top") ? "top:58px" : "bottom:58px";
    var vOffset = isCenter ? 0 : (20 + (vSide === "bottom" ? OFFSET_BOTTOM : 0));

    var style = document.createElement("style");
    style.textContent = ""
      + ":host{all:initial}"
      + "*{box-sizing:border-box;font-family:Montserrat,system-ui,sans-serif}"
      + ".wrap{position:fixed;" + (isCenter ? "top:50%;transform:translateY(-50%)" : (vSide + ":" + vOffset + "px")) + ";" + hSide + ":20px}"
      + ".btn{width:48px;height:48px;border-radius:50%;background:#0E1E3A;"
      + "border:2px solid #C4AE70;cursor:pointer;display:flex;align-items:center;"
      + "justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,.35);padding:0}"
      + ".btn:hover{background:#162848}"
      + ".btn svg{width:22px;height:22px}"
      + ".panel{position:absolute;" + panelV + ";" + hSide + ":0;background:#0E1E3A;border:1px solid rgba(196,174,112,.35);"
      + "border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.5);padding:10px;min-width:200px;"
      + "display:none;flex-direction:column;gap:4px}"
      + ".panel.open{display:flex}"
      + ".hdr{display:block;color:#C4AE70;font-size:.68rem;font-weight:800;letter-spacing:.08em;"
      + "text-transform:uppercase;padding:2px 8px 6px;text-decoration:none;cursor:pointer}"
      + ".hdr:hover{text-decoration:underline}"
      + ".item{display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;"
      + "text-decoration:none;color:#E8EEFF;font-size:.86rem;font-weight:600;cursor:pointer;"
      + "background:none;border:none;text-align:left;width:100%}"
      + ".item:hover{background:rgba(196,174,112,.12)}";
    root.appendChild(style);

    var wrap = document.createElement("div");
    wrap.className = "wrap";
    wrap.innerHTML =
      '<button class="btn" aria-label="' + T.title + '" aria-haspopup="true">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="#C4AE70" stroke-width="2" '
      + 'stroke-linecap="round" stroke-linejoin="round">'
      + '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>'
      + '<rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'
      + '</svg></button>'
      + '<div class="panel"><a class="hdr" href="' + AUTH_ORIGIN + '/suite">' + T.title + '</a></div>';
    root.appendChild(wrap);

    var panel = wrap.querySelector(".panel");
    products.forEach(function (p) {
      var item = document.createElement("button");
      item.className = "item";
      item.innerHTML = miniLogo(p) + '<span>' + p.name + '</span>';
      item.addEventListener("click", function () {
        var url = p.activate;
        if (token) {
          var sep = p.activate.indexOf("?") > -1 ? "&" : "?";
          url = p.activate + sep + "token=" + token;
        }
        location.href = url;
      });
      panel.appendChild(item);
    });

    var btn = wrap.querySelector(".btn");
    btn.addEventListener("click", function () {
      panel.classList.toggle("open");
    });
    document.addEventListener("click", function (e) {
      if (!wrap.contains(e.target) && !(root !== host && host.contains(e.target))) {
        panel.classList.remove("open");
      }
    });
    // identity se pasa desde resolveSession (ver más abajo)
  }

  function renderSupportWidget(pid, identity) {
    if (document.getElementById("insider-support-widget-root")) return;
    var host = document.createElement("div");
    host.id = "insider-support-widget-root";
    host.style.position = "fixed";
    host.style.zIndex = "2147482900";
    document.body.appendChild(host);

    var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;

    var OPTIONS_BY_PID = {
      "insider-call": [
        "📞 Reportar problema con llamada o IVR",
        "⚙️ Duda de configuración de número",
        "👥 Asistencia con permisos de equipo",
        "💬 Hablar con soporte humano"
      ],
      "insider-receipt": [
        "📄 Duda con lectura de recibo",
        "💳 Problema de facturación",
        "🏢 Configuración de empresa / merchant",
        "💬 Hablar con soporte humano"
      ],
      "insider-chat": [
        "💬 Problema enviando WhatsApp / SMS",
        "📥 Asignación de inbox",
        "⚙️ Configuración de canal",
        "💬 Hablar con soporte humano"
      ],
      "insider-iron": [
        "⚙️ Incidencia técnica de sistema",
        "📷 Registro de fotos",
        "📋 Plan de mantenimiento",
        "💬 Hablar con soporte humano"
      ],
      "default": [
        "❓ Pregunta general",
        "🐞 Reportar una incidencia / error",
        "💬 Hablar con soporte humano"
      ]
    };

    var opts = OPTIONS_BY_PID[pid] || OPTIONS_BY_PID["default"];
    var productName = (pid || "").replace("insider-", "").toUpperCase();

    var supSessionId = localStorage.getItem("insider_sup_session_id");
    if (!supSessionId || supSessionId.length > 28) {
      supSessionId = "sup_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem("insider_sup_session_id", supSessionId);
    }

    var style = document.createElement("style");
    style.textContent = ""
      + ":host{all:initial}"
      + "*{box-sizing:border-box;font-family:Montserrat,system-ui,sans-serif}"
      + ".sup-wrap{position:fixed;bottom:20px;right:20px;z-index:2147483000}"
      + ".sup-btn{height:44px;padding:0 18px;border-radius:22px;background:#0E1E3A;"
      + "border:1.5px solid #C4AE70;color:#E8EEFF;font-size:13px;font-weight:700;"
      + "cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 4px 16px rgba(0,0,0,.4)}"
      + ".sup-btn:hover{background:#162848;border-color:#DFD0A4}"
      + ".sup-modal{position:fixed;bottom:20px;right:20px;width:340px;max-width:calc(100vw - 32px);"
      + "height:440px;background:#091224;border:1px solid rgba(196,174,112,.35);border-radius:16px;"
      + "box-shadow:0 16px 40px rgba(0,0,0,.7);padding:12px;display:none;flex-direction:column;gap:8px;"
      + "color:#E8EEFF;z-index:2147483000}"
      + ".sup-modal.open{display:flex}"
      + ".sup-title{font-size:12px;font-weight:800;color:#C4AE70;display:flex;align-items:center;justify-content:space-between}"
      + ".sup-sub{font-size:10px;color:#94A3B8;margin-top:1px}"
      + ".sup-hide-btn{background:none;border:1px solid rgba(196,174,112,.3);color:#C4AE70;font-size:10px;padding:2px 7px;border-radius:4px;cursor:pointer;margin-right:4px}"
      + ".sup-hide-btn:hover{background:rgba(196,174,112,.15);color:#FFF}"
      + ".sup-close{background:none;border:none;color:#94A3B8;font-size:15px;cursor:pointer;padding:0}"
      + ".sup-close:hover{color:#FFF}"
      + ".sup-chat-body{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding-right:4px}"
      + ".sup-msg-item{padding:5px 10px;border-radius:10px;font-size:11px;line-height:1.35;max-width:78%;word-break:break-word}"
      + ".sup-msg-in{background:#132240;color:#E8EEFF;align-self:flex-start;border:1px solid rgba(196,174,112,.2)}"
      + ".sup-msg-out{background:#C4AE70;color:#000;font-weight:600;align-self:flex-end}"
      + ".sup-options{display:flex;flex-direction:column;gap:4px;margin-top:4px}"
      + ".sup-opt-btn{background:#0E1E3A;border:1px solid rgba(196,174,112,.25);color:#E8EEFF;"
      + "padding:6px 9px;border-radius:7px;font-size:10.5px;text-align:left;cursor:pointer;"
      + "transition:all .15s ease}"
      + ".sup-opt-btn:hover{background:rgba(196,174,112,.2);border-color:#C4AE70;color:#FFF}"
      + ".sup-confirm-box{display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center;"
      + "flex:1;padding:12px;text-align:center}"
      + ".sup-confirm-id{font-size:12px;color:#E8EEFF;background:#132240;border:1px solid rgba(196,174,112,.25);"
      + "padding:8px 14px;border-radius:8px;word-break:break-all;max-width:100%}"
      + ".sup-confirm-label{font-size:11px;color:#94A3B8}"
      + ".sup-confirm-btns{display:flex;gap:8px;margin-top:4px}"
      + ".sup-confirm-yes{background:#C4AE70;color:#000;font-weight:800;border:none;padding:7px 16px;"
      + "border-radius:8px;cursor:pointer;font-size:11px;transition:background .15s}"
      + ".sup-confirm-yes:hover{background:#DFD0A4}"
      + ".sup-confirm-no{background:none;border:1px solid rgba(196,174,112,.35);color:#94A3B8;"
      + "padding:7px 12px;border-radius:8px;cursor:pointer;font-size:11px;transition:all .15s}"
      + ".sup-confirm-no:hover{border-color:#C4AE70;color:#E8EEFF}"
      + ".sup-footer{display:flex;flex-direction:column;gap:5px;margin-top:auto}"
      + ".sup-input-row{display:flex;gap:5px}"
      + ".sup-input{background:#030712;border:1px solid rgba(196,174,112,.25);"
      + "color:#FFF;padding:7px 9px;border-radius:8px;font-size:10.5px;outline:none}"
      + ".sup-input:focus{border-color:#C4AE70}"
      + "textarea.sup-input{flex:1;resize:none;height:32px}"
      + ".sup-send{background:#C4AE70;color:#000;font-weight:800;border:none;padding:0 11px;"
      + "border-radius:8px;cursor:pointer;font-size:11px;height:32px;white-space:nowrap;transition:background .15s ease}"
      + ".sup-send:hover{background:#DFD0A4}"
      + ".sup-send:disabled{opacity:.5;cursor:not-allowed}";
    root.appendChild(style);

    var optionsHtml = opts.map(function(o) {
      return '<button class="sup-opt-btn" data-val="' + o + '">' + o + '</button>';
    }).join('');

    // Pantalla de confirmación de identidad (se muestra si se detecta email del login)
    var confirmedIdentity = null; // email/phone confirmado o null si anónimo
    var needsConfirm = !!identity; // si hay identity, pedir confirmación primero

    var confirmHtml = identity
      ? '<div class="sup-confirm-box">'
        + '<div class="sup-confirm-label">Detectamos tu cuenta registrada:</div>'
        + '<div class="sup-confirm-id">' + identity + '</div>'
        + '<div class="sup-confirm-btns">'
        + '<button class="sup-confirm-yes">✓ Sí, es mi cuenta</button>'
        + '<button class="sup-confirm-no">Continuar anónimo</button>'
        + '</div></div>'
      : '';

    var chatHtml =
        '<div class="sup-chat-body" id="supChatBody">'
      + '<div class="sup-msg-item sup-msg-in">👋 ¡Hola! Bienvenido a Soporte Técnico. Selecciona una opción o escribe tu mensaje:</div>'
      + '<div class="sup-options">' + optionsHtml + '</div>'
      + '</div>'
      + '<div class="sup-footer">'
      + '<div class="sup-input-row">'
      + '<textarea class="sup-input sup-msg" placeholder="Escribe tu mensaje..."></textarea>'
      + '<button class="sup-send">Enviar</button>'
      + '</div>'
      + '</div>';

    var wrap = document.createElement("div");
    wrap.className = "sup-wrap";
    wrap.innerHTML =
      '<button class="sup-btn">'
      + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C4AE70" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
      + '<span class="sup-btn-label">Soporte &amp; Ayuda</span></button>'
      + '<div class="sup-modal">'
      + '<div class="sup-title"><span>💬 Chat de Soporte Insider</span><div><button class="sup-hide-btn">— Ocultar</button><button class="sup-close">✕</button></div></div>'
      + '<div class="sup-sub" style="display:flex;justify-content:space-between;align-items:center;"><span>Atención Inteligente · ' + productName + '</span><span style="color:#34D399;font-weight:700;">🤖 IA Activa</span></div>'
      + (needsConfirm ? confirmHtml : chatHtml)
      + '</div>';
    root.appendChild(wrap);

    var modal = wrap.querySelector(".sup-modal");
    var toggleBtn = wrap.querySelector(".sup-btn");
    var toggleBtnLabel = wrap.querySelector(".sup-btn-label");
    var closeBtn = wrap.querySelector(".sup-close");
    var hideBtn = wrap.querySelector(".sup-hide-btn");

    function getElements() {
      return {
        chatBody: wrap.querySelector("#supChatBody"),
        optBtns:  wrap.querySelectorAll(".sup-opt-btn"),
        sendBtn:  wrap.querySelector(".sup-send"),
        msgInput: wrap.querySelector(".sup-msg")
      };
    }

    function showDirectChat() {
      needsConfirm = false;
      bindChatEvents();
      fetchSupportHistory();
    }

    var seenMsgIds = {};
    var unreadCount = 0;

    function fetchSupportHistory() {
      if (needsConfirm) return; // aún en pantalla de confirmación, no iniciar chat
      var chatBody = wrap.querySelector("#supChatBody");
      if (!chatBody) return;
      var email = confirmedIdentity || "";
      var url = AUTH_ORIGIN + "/api/support/messages?session_id=" + encodeURIComponent(supSessionId)
                + "&email=" + encodeURIComponent(email);
      fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(res) {
          if (res.ok && res.messages && res.messages.length) {
            res.messages.forEach(function(m) {
              if (!seenMsgIds[m.id]) {
                seenMsgIds[m.id] = true;
                if (m.direction === "out") {
                  var textMsg = m.body;
                  if (!textMsg.startsWith("🤖") && !textMsg.startsWith("💬")) {
                    textMsg = "💬 " + textMsg;
                  }
                  addMessageBubble(textMsg, false);
                  if (!modal.classList.contains("open")) {
                    unreadCount++;
                    if (toggleBtnLabel) toggleBtnLabel.textContent = "🔴 (" + unreadCount + ") Respuesta";
                  }
                } else if (m.direction === "in" && m.body) {
                  // Si el mensaje del usuario ya está en el historial (por polling), mostrarlo como su burbuja enviada
                  if (!m.body.startsWith("📌 [SOPORTE INSIDER]")) {
                    addMessageBubble(m.body, true);
                  }
                }
              }
            });
          }
        })
        .catch(function() {});
    }

    // Polling continuo cada 3.5 s (solo activo si el chat ya fue iniciado)
    setInterval(fetchSupportHistory, 3500);

    function closeSupportModal() {
      modal.classList.remove("open");
      toggleBtn.style.display = "flex";
      var sw = document.getElementById("insider-suite-switcher-root");
      if (sw) sw.style.display = "block";
    }

    toggleBtn.addEventListener("click", function() {
      modal.classList.add("open");
      toggleBtn.style.display = "none";
      unreadCount = 0;
      if (toggleBtnLabel) toggleBtnLabel.textContent = "Soporte &amp; Ayuda";
      var sw = document.getElementById("insider-suite-switcher-root");
      if (sw) sw.style.display = "none";
      if (!needsConfirm) fetchSupportHistory();
    });

    closeBtn.addEventListener("click", closeSupportModal);
    if (hideBtn) hideBtn.addEventListener("click", closeSupportModal);

    // Manejo de la pantalla de confirmación
    function bindConfirmEvents() {
      var yesBtn = wrap.querySelector(".sup-confirm-yes");
      var noBtn  = wrap.querySelector(".sup-confirm-no");
      if (yesBtn) yesBtn.addEventListener("click", function() {
        confirmedIdentity = identity;
        var box = wrap.querySelector(".sup-confirm-box");
        if (box) box.remove();
        var tmpDiv = document.createElement("div");
        tmpDiv.innerHTML = chatHtml;
        while (tmpDiv.firstChild) modal.appendChild(tmpDiv.firstChild);
        needsConfirm = false;
        bindChatEvents();
        fetchSupportHistory();
      });
      if (noBtn) noBtn.addEventListener("click", function() {
        var box = wrap.querySelector(".sup-confirm-box");
        if (box) box.remove();
        var tmpDiv = document.createElement("div");
        tmpDiv.innerHTML = chatHtml;
        while (tmpDiv.firstChild) modal.appendChild(tmpDiv.firstChild);
        needsConfirm = false;
        bindChatEvents();
        fetchSupportHistory();
      });
    }

    function bindChatEvents() {
      var els = getElements();
      var chatBody = els.chatBody;
      var sendBtn  = els.sendBtn;
      var msgInput = els.msgInput;
      var optBtns  = els.optBtns;
      if (optBtns) optBtns.forEach(function(btn) {
        btn.addEventListener("click", function() {
          sendTicket(btn.getAttribute("data-val"), "", chatBody, sendBtn, msgInput);
        });
      });
      if (sendBtn) sendBtn.addEventListener("click", function() {
        var msg = (msgInput ? msgInput.value : "").trim();
        if (msg) sendTicket("", msg, chatBody, sendBtn, msgInput);
      });
      if (msgInput) msgInput.addEventListener("keydown", function(e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          var msg = msgInput.value.trim();
          if (msg) sendTicket("", msg, chatBody, sendBtn, msgInput);
        }
      });
    }

    if (needsConfirm) {
      bindConfirmEvents();
    } else {
      showDirectChat();
    }

    function addMessageBubble(text, isOut) {
      var chatBody = wrap.querySelector("#supChatBody");
      if (!chatBody) return;
      var div = document.createElement("div");
      div.className = "sup-msg-item " + (isOut ? "sup-msg-out" : "sup-msg-in");
      div.style.whiteSpace = "pre-wrap";
      div.textContent = text;
      chatBody.appendChild(div);
      chatBody.scrollTop = chatBody.scrollHeight;
    }

    function sendTicket(optionText, customMsg, chatBody, sendBtn, msgInput) {
      if (sendBtn) sendBtn.disabled = true;
      var fullMsg = customMsg ? (optionText ? "[" + optionText + "] " + customMsg : customMsg) : optionText;
      addMessageBubble(fullMsg, true);

      fetch(AUTH_ORIGIN + "/api/support/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: pid,
          option:   optionText || "Consulta Directa",
          message:  customMsg || optionText,
          email:    confirmedIdentity || "",
          phone:    "",
          session_id: supSessionId
        })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (sendBtn) sendBtn.disabled = false;
        if (res.ok) {
          if (res.reply) {
            var replyText = res.reply;
            if (!replyText.startsWith("🤖") && !replyText.startsWith("💬")) {
              replyText = "🤖 " + replyText;
            }
            addMessageBubble(replyText, false);
          } else {
            addMessageBubble("✅ Mensaje recibido. El equipo responderá en breve.", false);
          }
          if (msgInput) msgInput.value = "";
          setTimeout(fetchSupportHistory, 1500);
        } else {
          addMessageBubble("⚠️ " + (res.error || "No se pudo enviar el mensaje"), false);
        }
      })
      .catch(function() {
        if (sendBtn) sendBtn.disabled = false;
        addMessageBubble("⚠️ Error de conexión. Intenta de nuevo.", false);
      });
    }
  }

  // ─── FALLBACK fijo de productos ─────────────────────────────────────────
  var FALLBACK_PRODUCTS = [
    { pid: "insider-suite",    name: "Insider Suite",    activate: "https://auth.insider-mail.com/suite",        available: true, theme: "gold"  },
    { pid: "insider-call",     name: "Insider Call",     activate: "https://call.insider-mail.com",              available: true, theme: "navy"  },
    { pid: "insider-receipt",  name: "Insider Receipts", activate: "https://receipts.insider-mail.com",          available: true, theme: "amber" },
    { pid: "insider-invoices", name: "Insider Invoices", activate: "https://invoices.insider-mail.com",          available: true, theme: "navy"  },
    { pid: "insider-chat",     name: "Insider Chat",     activate: "https://chat.insider-mail.com",              available: true, theme: "navy"  },
    { pid: "insider-iron",     name: "Insider Iron",     activate: "https://iron.insider-mail.com",              available: true, theme: "amber" }
  ];

  // ─── 1. Renderizar el widget de soporte INMEDIATAMENTE (sin esperar sesión)
  try { renderSupportWidget(CURRENT_PID, null); } catch (e) {}

  // ─── 2. Renderizar el lanzador Mi Suite INMEDIATAMENTE con productos estáticos
  (function renderSuiteNow() {
    if (document.getElementById("insider-suite-switcher-root")) return;
    var products = FALLBACK_PRODUCTS.filter(function(p) { return p.pid !== CURRENT_PID; });
    try { render(products, null); } catch(e) {}
  })();

  // ─── 3. Enriquecer con datos reales de la API (si está disponible)
  fetch(AUTH_ORIGIN + "/api/suite/products")
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || !data.products || !data.products.length) return;
      // Actualizar identidad en el widget de soporte si viene de la sesión
      resolveSession(function(licenses, token) {
        if (token) {
          try {
            var claims = decodeJwt(token);
            if (claims) {
              var identity = claims.email || claims.phone || null;
              // Actualizar identityEl si existe en el widget
              var rootEl = document.getElementById("insider-support-widget-root");
              if (rootEl && identity) {
                var sr = rootEl.shadowRoot || rootEl;
                var idEl = sr.querySelector && sr.querySelector("#supIdentityConfirmed");
                if (idEl) idEl.textContent = identity;
              }
            }
          } catch (_) {}
        }
      });
    })
    .catch(function () {});

})();

