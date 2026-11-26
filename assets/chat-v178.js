

(function () {
  'use strict';
  if (window.__crxChat) return;
  window.__crxChat = 1;

  var URL_BASE = 'https://tizruuquhhpmykkjsmpn.supabase.co';
  var WS_BASE = 'wss://tizruuquhhpmykkjsmpn.supabase.co/realtime/v1/websocket';
  var ANON = 'sb_publishable_l-COxHSUAoiOf7PMXAb3SQ_ZWZk1v1w';
  var POLL_OK = 6000;
  var POLL_LIVE = 30000;

  var seen = {};
  var shown = {};
  var baselineDone = false;
  var timer = null;
  var busy = false;
  var fails = 0;
  var pending = [];
  var baseTitle = document.title || 'CRAS';
  var unread = 0;

  var ws = null, wsTries = 0, wsOpen = false, joined = false, joinRef = null, refSeq = 1, beat = null;

  var css = ''
    + '.crx-ct-wrap{position:fixed;top:70px;right:16px;z-index:2147483000;display:flex;flex-direction:column;gap:10px;width:min(92vw,352px);pointer-events:none}'
    + '.crx-ct{pointer-events:auto;display:flex;gap:11px;background:#fff;border:1px solid #e5ecf4;border-left:4px solid #1a5276;border-radius:12px;box-shadow:0 12px 30px rgba(15,40,66,.18);padding:11px 12px;animation:crx-ct-in .28s ease-out;cursor:pointer}'
    + '@keyframes crx-ct-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}'
    + '.crx-ct-av{width:36px;height:36px;border-radius:50%;flex:0 0 36px;background:#1a5276;color:#fff;font:600 14px/36px system-ui,sans-serif;text-align:center;text-transform:uppercase}'
    + '.crx-ct-b{flex:1;min-width:0}'
    + '.crx-ct-h{display:flex;align-items:baseline;gap:6px}'
    + '.crx-ct-n{font:600 13px system-ui,sans-serif;color:#0f2c3f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    + '.crx-ct-k{font:500 10px system-ui,sans-serif;color:#7b8794;text-transform:uppercase;letter-spacing:.03em;white-space:nowrap}'
    + '.crx-ct-t{font:400 12.5px/1.4 system-ui,sans-serif;color:#33475b;margin-top:3px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}'
    + '.crx-ct-f{display:flex;align-items:center;gap:8px;margin-top:8px}'
    + '.crx-ct-go{font:600 12px system-ui,sans-serif;color:#fff;background:#1a5276;border:0;border-radius:7px;padding:5px 10px;cursor:pointer}'
    + '.crx-ct-x{margin-left:auto;background:none;border:0;color:#98a2b3;font:400 17px/1 system-ui;cursor:pointer;padding:2px 4px}'
    + '.crx-chat-badge{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;margin-left:auto;border-radius:9px;background:#dc2626;color:#fff;font:700 10px/1 system-ui,sans-serif}'
    + '.crx-nudge{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147482000;display:flex;align-items:center;gap:12px;background:#0f2c3f;color:#fff;border-radius:12px;padding:11px 14px;box-shadow:0 14px 34px rgba(0,0,0,.3);max-width:min(94vw,520px);font:500 12.5px/1.4 system-ui,sans-serif}'
    + '.crx-nudge button{font:600 12px system-ui,sans-serif;border:0;border-radius:8px;padding:7px 11px;cursor:pointer}'
    + '.crx-nudge .go{background:#38bdf8;color:#062033}'
    + '.crx-nudge .no{background:transparent;color:#c7d5e2}'
    + '@media(max-width:640px){.crx-ct-wrap{top:auto;bottom:58px;right:10px;left:10px;width:auto}.crx-ct-t{-webkit-line-clamp:3}.crx-nudge{bottom:10px;padding:10px 12px;gap:8px}.crx-nudge span{font-size:12px}}';

  function style() {
    if (document.getElementById('crx-ct-styles')) return;
    var s = document.createElement('style');
    s.id = 'crx-ct-styles'; s.textContent = css;
    document.head.appendChild(s);
  }

  function session() {
    try {
      var best = null;
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf('-auth-token') < 0) continue;
        var v = JSON.parse(localStorage.getItem(k) || 'null');
        if (v && (v.access_token || (v.currentSession && v.currentSession.access_token))) {
          best = v.access_token ? v : v.currentSession;
        }
      }
      return best;
    } catch (e) { return null; }
  }

  function api(path) {
    var s = session();
    if (!s || !s.access_token) return Promise.resolve(null);
    return fetch(URL_BASE + '/rest/v1/' + path, {
      headers: { apikey: ANON, Authorization: 'Bearer ' + s.access_token, Accept: 'application/json' }
    }).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    });
  }

  function wrapEl() {
    var w = document.getElementById('crx-ct-wrap');
    if (!w) {
      w = document.createElement('div');
      w.id = 'crx-ct-wrap'; w.className = 'crx-ct-wrap';
      document.body.appendChild(w);
    }
    return w;
  }

  function initials(name) {
    var p = String(name || '?').trim().split(/\s+/);
    return (p[0] || '?').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '');
  }

  function inChat() { return location.pathname === '/chat'; }

  function appAlreadyShowed(text) {
    try {
      var hosts = document.querySelectorAll('.fixed.top-4.right-4');
      var probe = String(text || '').slice(0, 24);
      if (!probe) return false;
      for (var i = 0; i < hosts.length; i++) {
        if (hosts[i].innerText && hosts[i].innerText.indexOf(probe) >= 0) return true;
      }
    } catch (e) {}
    return false;
  }

  function showCard(m) {
    var w = wrapEl();
    var el = document.createElement('div');
    el.className = 'crx-ct';
    el.setAttribute('role', 'status');
    el.innerHTML = ''
      + '<div class="crx-ct-av"></div>'
      + '<div class="crx-ct-b">'
      + '  <div class="crx-ct-h"><span class="crx-ct-n"></span><span class="crx-ct-k"></span></div>'
      + '  <div class="crx-ct-t"></div>'
      + '  <div class="crx-ct-f"><button type="button" class="crx-ct-go">Abrir chat</button><button type="button" class="crx-ct-x" aria-label="Fechar">&times;</button></div>'
      + '</div>';
    el.querySelector('.crx-ct-av').textContent = initials(m.nome);
    el.querySelector('.crx-ct-n').textContent = m.nome || 'Nova mensagem';
    el.querySelector('.crx-ct-k').textContent = m.public ? 'Chat Geral' : 'Privada';
    el.querySelector('.crx-ct-t').textContent = m.texto || '';
    var close = function (e) { if (e) e.stopPropagation(); el.remove(); };
    el.querySelector('.crx-ct-x').addEventListener('click', close);
    el.addEventListener('click', function () { location.href = '/chat'; });
    w.appendChild(el);
    while (w.children.length > 3) w.removeChild(w.firstChild);
    setTimeout(function () { if (el.parentNode) el.remove(); }, 12000);
  }

  function headline(n) {
    unread = n;
    var base = baseTitle.replace(/^\(\d+\)\s*/, '');
    document.title = n > 0 ? '(' + n + ') ' + base : base;
    try {
      if (navigator.setAppBadge) { if (n > 0) navigator.setAppBadge(n); else if (navigator.clearAppBadge) navigator.clearAppBadge(); }
    } catch (e) {}
  }

  function badge(n) {
    var runs = document.querySelectorAll('a[href="/chat"], a[href$="/chat"]'), i, a, b;
    for (i = 0; i < runs.length; i++) {
      a = runs[i];
      b = a.querySelector('.crx-chat-badge');
      var own = a.querySelector('span.rounded-full, span[class*="bg-danger"]');
      if (n <= 0) { if (b) b.remove(); continue; }
      if (!b) {
        if (own) { own.textContent = n > 99 ? '99+' : String(n); continue; }
        b = document.createElement('span');
        b.className = 'crx-chat-badge';
        a.appendChild(b);
      }
      b.textContent = n > 99 ? '99+' : String(n);
    }
  }

  function beep() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      var ctx = window.__crxCtx || (window.__crxCtx = new AC());
      if (ctx.state === 'suspended') ctx.resume();
      var t = ctx.currentTime;
      [880, 1180].forEach(function (f, i) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + i * 0.16);
        g.gain.exponentialRampToValueAtTime(0.07, t + i * 0.16 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.16 + 0.14);
        o.connect(g); g.connect(ctx.destination);
        o.start(t + i * 0.16); o.stop(t + i * 0.16 + 0.15);
      });
    } catch (e) {}
  }

  var nativeStatus = 'Clique para testar o aviso neste computador.';
  function statusNative(text) {
    nativeStatus = text;
    var el = document.getElementById('crx-native-status');
    if (el) el.textContent = text;
  }
  var activeNativeReg=null;
  function nativeRegistration() {
    if(activeNativeReg && activeNativeReg.active && activeNativeReg.active.state==='activated') return Promise.resolve(activeNativeReg);
    if (!navigator.serviceWorker) return Promise.reject(new Error('Este navegador não oferece notificações persistentes.'));
    return navigator.serviceWorker.register('/sw.js', {updateViaCache:'none'}).then(function (reg) {
      if (reg.active && reg.active.state === 'activated') return reg;
      return new Promise(function (resolve, reject) {
        var timeout = setTimeout(function () { reject(new Error('O serviço de avisos não ativou. Atualize a página e teste novamente.')); }, 15000);
        navigator.serviceWorker.ready.then(function (ready) { clearTimeout(timeout); resolve(ready); }, function (err) { clearTimeout(timeout); reject(err); });
      });
    });
  }
  function notifyNative(m) {
    if (!('Notification' in window)) {
      statusNative('Notificações indisponíveis neste navegador. Use Chrome ou Edge atualizado.');
      return Promise.resolve(false);
    }
    if (Notification.permission !== 'granted') {
      statusNative(Notification.permission === 'denied' ? 'Bloqueado no navegador. Abra as configurações do site e permita Notificações.' : 'Clique em Ativar avisos e permita as notificações.');
      return Promise.resolve(false);
    }
    var title = 'CRAS · ' + (m.nome || 'Nova mensagem');
    var opts = {body:(m.public ? 'Chat Geral: ' : 'Mensagem privada: ') + (m.texto || ''), icon:'/icons/icon-192.png', badge:'/icons/icon-192.png', tag:'cras-chat-' + String(m.id || Date.now()), data:{url:'/chat'}, requireInteraction:true, silent:false};
    return nativeRegistration().then(function (reg) {
      activeNativeReg=reg;
      return reg.showNotification(title, opts);
    }).then(function () {
      statusNative('O navegador aceitou o aviso. Confira o canto da tela ou a Central de Notificações (Win + N). Se não aparecer, verifique os banners do Chrome/Edge e Não perturbe no Windows.');
      return true;
    }).catch(function (error) {
      statusNative('Falha ao enviar o aviso: ' + String(error && error.message || error));
      return false;
    });
  }

  function deliver(m, instant) {
    if (shown[m.id]) return;
    shown[m.id] = 1;
    if (inChat() && !document.hidden) return;
    notifyNative(m);
    if (document.hidden) {
      pending.push(m);
      if (pending.length > 6) pending = pending.slice(-6);
      beep();
      return;
    }
    setTimeout(function () {
      if (appAlreadyShowed(m.texto)) return;
      showCard(m);
    }, instant ? 0 : 900);
  }

  function flush() {
    if (document.hidden || inChat()) return;
    var list = pending.splice(0, pending.length);
    list.forEach(function (m, i) { setTimeout(function () { showCard(m); }, i * 160); });
  }

  var senderNames={};
  function names(rows) {
    var ids = {}, list = [], i;
    for (i = 0; i < rows.length; i++) if (!ids[rows[i].remetente_id] && !senderNames[rows[i].remetente_id]) { ids[rows[i].remetente_id] = 1; list.push(rows[i].remetente_id); }
    if (!list.length) return Promise.resolve(rows.map(function(r){return {id:r.id,texto:r.texto,nome:senderNames[r.remetente_id]||'Nova mensagem',public:r.destinatario_id==null};}));
    var q = 'profiles?select=id,nome&id=in.(' + list.map(function (x) { return '"' + x + '"'; }).join(',') + ')';
    return api(q).then(function (ps) {
      var map = senderNames;
      (ps || []).forEach(function (p) { map[p.id] = p.nome; });
      return rows.map(function (r) {
        return { id: r.id, texto: r.texto, nome: map[r.remetente_id] || 'Nova mensagem', public: r.destinatario_id === null || r.destinatario_id === undefined };
      });
    }).catch(function () {
      return rows.map(function (r) { return { id: r.id, texto: r.texto, nome: 'Nova mensagem', public: r.destinatario_id === null }; });
    });
  }

  function handleRows(rows, instant) {
    var s = session();
    var myId = s && s.user && s.user.id;
    if (!myId) return Promise.resolve();
    var fresh = [], i, r;
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      if (!r || !r.id) continue;
      if (r.remetente_id === myId) continue;
      if (String(r.lido) === 'true') continue;
      if (seen[r.id]) continue;
      seen[r.id] = 1;
      fresh.push(r);
    }
    if (!fresh.length) return Promise.resolve();
    return names(fresh).then(function (msgs) {
      msgs.forEach(function (m) { deliver(m, instant); });
    });
  }

  function tick() {
    var s = session();
    if (!s || !s.access_token) { headline(0); badge(0); return Promise.resolve(); }
    var myId = s.user && s.user.id;
    if (!myId) return Promise.resolve();
    var q = 'chat_mensagens?select=id,remetente_id,destinatario_id,texto,lido,created_at'
      + '&lido=eq.false&remetente_id=neq.' + encodeURIComponent(myId)
      + '&or=(destinatario_id.is.null,destinatario_id.eq.' + encodeURIComponent(myId) + ')'
      + '&order=created_at.desc&limit=30';
    return api(q).then(function (rows) {
      rows = rows || [];
      fails = 0;
      headline(rows.length);
      badge(rows.length);
      if (!baselineDone) {
        rows.forEach(function (r) { seen[r.id] = 1; });
        baselineDone = true;
        return;
      }
      return handleRows(rows, false);
    }).catch(function () { fails++; throw new Error('poll'); });
  }

  function wsSend(topic, event, payload, joinRef) {
    try {
      if (!ws || ws.readyState !== 1) return;
      var ref = String(refSeq++);
      ws.send(JSON.stringify([joinRef || null, ref, topic, event, payload || {}]));
    } catch (e) {}
  }

  function wsConnect() {
    var s = session();
    if (!s || !s.access_token) return;
    if (!('WebSocket' in window)) return;
    try { if (ws) { ws.onclose = null; ws.close(); } } catch (e) {}
    try { ws = new WebSocket(WS_BASE + '?apikey=' + encodeURIComponent(ANON) + '&vsn=2.0.0'); }
    catch (e) { wsLater(); return; }
    ws.onopen = function () {
      wsOpen = true; wsTries = 0; joined = false;
      clearTimeout(timer);
      timer = setTimeout(loop, 1500);
      joinRef = String(refSeq);
      wsSend('realtime:chat-notifications-global', 'phx_join', {
        config: {
          broadcast: { ack: false, self: false },
          presence: { key: '' },
          postgres_changes: [{ event: 'INSERT', schema: 'public', table: 'chat_mensagens' }],
          private: false
        },
        access_token: s.access_token
      }, joinRef);
      if (beat) clearInterval(beat);
      beat = setInterval(function () { wsSend('phoenix', 'heartbeat', {}, null); }, 25000);
      setTimeout(function () {
        if (joined) return;
        wsOpen = false;
        clearTimeout(timer);
        timer = setTimeout(loop, 1500);
      }, 7000);
    };
    ws.onmessage = function (ev) {
      var m, event, payload;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (Object.prototype.toString.call(m) === '[object Array]') { event = m[3]; payload = m[4]; }
      else if (m && typeof m === 'object') { event = m.event; payload = m.payload; }
      else return;
      if (event === 'postgres_changes') {
        var rec = (payload && ((payload.data && payload.data.record) || payload.record || payload.new)) || null;
        if (rec) onRealtime(rec);
        return;
      }
      var replyRef = Array.isArray(m) ? m[1] : m.ref;
      if (event === 'phx_reply' && String(replyRef) === String(joinRef)) {
        if (payload && payload.status === 'ok') {
          wsTries = 0; joined = true; wsOpen = true;
          tick().catch(function () {});
        } else {
          joined = false; wsOpen = false;
          statusNative('Canal de mensagens indisponível. A conferência automática continua ativa.');
          clearTimeout(timer);
          timer = setTimeout(loop, 2000);
        }
      }
    };
    ws.onclose = function () {
      wsOpen = false; joined = false;
      if (beat) clearInterval(beat);
      clearTimeout(timer);
      timer = setTimeout(loop, 2500);
      wsLater();
    };
    ws.onerror = function () { wsOpen = false; joined = false; };
  }

  function wsLater() {
    wsTries++;
    var wait = Math.min(60000, 3000 * Math.pow(1.7, Math.min(wsTries, 6)));
    setTimeout(wsConnect, wait);
  }

  function onRealtime(rec) {
    var s = session();
    var myId = s && s.user && s.user.id;
    if (!myId || !rec || !rec.id) return;
    if (rec.remetente_id === myId) return;
    if (!(rec.destinatario_id === null || rec.destinatario_id === undefined || rec.destinatario_id === myId)) return;
    if (String(rec.lido) === 'true') return;
    if (seen[rec.id]) return;
    handleRows([rec], true);
  }

  function nudge() {
    var oldButton=document.getElementById('crx-chat-controls'),oldPanel=document.getElementById('crx-chat-nudge');
    if(!/^\/configuracoes\/?$/.test(location.pathname)){
      if(oldButton)oldButton.remove();if(oldPanel)oldPanel.remove();return;
    }
    var tabs=document.querySelector('.cras-tabs-bar');
    if(!tabs||!tabs.parentElement)return;
    var page=tabs.parentElement,title=page.querySelector('h1');
    if(!title||!title.parentElement)return;
    var toolbar=title.parentElement;
    if(oldButton&&toolbar.contains(oldButton))return;
    if(oldButton)oldButton.remove();if(oldPanel)oldPanel.remove();
    var open = document.createElement('button');
    open.id = 'crx-chat-controls'; open.type = 'button';
    open.textContent = 'Avisos do Windows';
    open.style.cssText = 'background:#0f2c3f;color:white;border:0;border-radius:9px;padding:9px 12px;font:600 12px system-ui;cursor:pointer;flex-shrink:0';
    open.setAttribute('aria-expanded','false');open.setAttribute('aria-controls','crx-chat-nudge');
    toolbar.style.flexWrap='wrap';toolbar.style.gap='12px';toolbar.appendChild(open);
    var panel = null;
    open.addEventListener('click', function () {
      if (panel && panel.isConnected) { panel.remove(); panel=null;open.setAttribute('aria-expanded','false'); return; }
      panel = document.createElement('div'); panel.className='crx-native-panel'; panel.id='crx-chat-nudge';
      panel.style.cssText='position:relative;background:white;color:#0f2c3f;border:1px solid #dbe4ef;border-radius:12px;padding:16px;width:100%;box-sizing:border-box;font:13px/1.5 system-ui';
      panel.innerHTML='<strong>Avisos do Windows · v178</strong><p>Receba avisos com o sistema aberto ou minimizado. O navegador precisa continuar aberto.</p><p id="crx-native-status" role="status"></p><button type="button" class="crx-native-enable">Ativar avisos</button> <button type="button" class="crx-native-test">Testar aviso do Windows</button><p>Não apareceu? No Windows, ative as notificações e os banners do Chrome/Edge e desative Não perturbe.</p><button type="button" class="crx-native-close">Fechar</button>';
      panel.querySelector('#crx-native-status').textContent=nativeStatus;
      Array.prototype.forEach.call(panel.querySelectorAll('button'),function (button) {button.style.cssText='border:0;border-radius:7px;background:#1a5276;color:white;padding:8px;margin:3px 0;cursor:pointer;font:600 12px system-ui';});
      function activate(test) {
        if (!('Notification' in window)) {statusNative('Notificações indisponíveis neste navegador.');return;}
        if (!window.isSecureContext) {statusNative('Abra o sistema no endereço seguro HTTPS.');return;}
        function send(p) {
          if (p !== 'granted') {statusNative(p==='denied'?'Bloqueado. Permita Notificações nas configurações do site.':'Permissão ainda não concedida. Clique novamente e escolha Permitir.');return;}
          notifyNative({id:'test-'+Date.now(),nome:'Teste de aviso',public:true,texto:test?'Se você está vendo este aviso, a entrega neste computador funcionou.':'Avisos ativados neste navegador.'});
        }
        if (Notification.permission==='default') Notification.requestPermission().then(send).catch(function(e){statusNative('Não foi possível pedir permissão: '+e.message);});
        else send(Notification.permission);
      }
      panel.querySelector('.crx-native-enable').addEventListener('click',function(){activate(false);});
      panel.querySelector('.crx-native-test').addEventListener('click',function(){activate(true);});
      panel.querySelector('.crx-native-close').addEventListener('click',function(){panel.remove();panel=null;open.setAttribute('aria-expanded','false');});
      page.insertBefore(panel,tabs);open.setAttribute('aria-expanded','true');
    });
  }

  function loop() {
    if (busy) return;
    busy = true;
    tick().catch(function () {}).then(function () {
      busy = false;
      clearTimeout(timer);
      var wait = fails > 2 ? 30000 : (joined ? POLL_LIVE : POLL_OK);
      timer = setTimeout(loop, wait);
    });
  }

  function boot() {
    style();
    baseTitle = document.title || 'CRAS';
    var settingsTimer=null;
    function syncSettings(){if(settingsTimer)return;settingsTimer=setTimeout(function(){settingsTimer=null;nudge();},120);}
    var settingsObserver=new MutationObserver(syncSettings);settingsObserver.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('popstate',syncSettings);window.addEventListener('cras-app-ready',syncSettings);syncSettings();
    setTimeout(function () { loop(); wsConnect(); nudge(); }, 2500);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) { flush(); loop(); }
    });
    window.addEventListener('focus', flush);
    window.addEventListener('online', function () { loop(); if (!wsOpen) wsConnect(); });
    var lastPath = location.pathname;
    setInterval(function () {
      if (location.pathname !== lastPath) { lastPath = location.pathname; loop(); }
      if (!wsOpen && session()) wsConnect();
    }, 20000);
    document.addEventListener('click', function once() {
      if ('Notification' in window && Notification.permission === 'default') nudge();
      document.removeEventListener('click', once);
    }, { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();


