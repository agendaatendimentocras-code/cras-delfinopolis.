// ============================================================
// CRAS Delfinópolis V2 — Service Worker
//
// IMPORTANTE: este service worker NÃO faz mais cache de páginas
// nem de arquivos do app. O cache agressivo estava servindo uma
// versão velha/quebrada da página depois de republicar, deixando
// a tela branca. Agora o navegador sempre busca a versão nova
// direto da internet, e o service worker cuida APENAS das
// notificações (push + clique na notificação).
// ============================================================

const CACHE_NAME = 'cras-v2-v42';

// ============================================================
// INSTALL — ativar imediatamente, sem pré-cachear nada
// ============================================================
self.addEventListener('install', () => {
  self.skipWaiting();
});

// ============================================================
// ACTIVATE — apagar TODOS os caches antigos e assumir controle
// (garante que nenhuma versão velha fique guardada no aparelho)
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// (sem handler de 'fetch': o navegador carrega os arquivos
//  normalmente da rede, sempre a versão mais recente publicada)

// ============================================================
// PUSH — notificação recebida do servidor push
// ============================================================
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || '💬 CRAS Delfinópolis';
  const options = {
    body: data.body || 'Você recebeu uma nova mensagem.',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'cras-chat',
    data: {
      url: data.url || '/chat',
      ...(data.data || {}),
    },
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ============================================================
// NOTIFICATION CLICK — foca a janela do CRAS e vai para /chat
// ============================================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/chat';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if ('postMessage' in client) {
            client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
          }
          if ('navigate' in client) {
            try { client.navigate(targetUrl); } catch {}
          }
          return;
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ============================================================
// MESSAGE — o app React pode pedir para atualizar o SW
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
