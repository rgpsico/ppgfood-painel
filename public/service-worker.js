/* Avisos de pedido novo: o servidor manda o push e este arquivo mostra a notificacao do sistema,
   mesmo com o painel fechado ou a tela bloqueada. Nao guarda nada em cache. */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let dados = {}
  try {
    dados = event.data ? event.data.json() : {}
  } catch (e) {
    dados = { title: 'Novo pedido', body: event.data ? event.data.text() : '' }
  }

  event.waitUntil(
    self.registration.showNotification(dados.title || 'Novo pedido', {
      body: dados.body || '',
      tag: dados.tag || 'pedido',
      renotify: true,
      requireInteraction: true,
      // Android vibra neste padrao; no iPhone vale o som/vibracao configurados no sistema
      vibrate: [300, 120, 300, 120, 300],
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: dados.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const destino = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abertas) => {
      for (const janela of abertas) {
        if ('focus' in janela) return janela.focus()
      }
      return self.clients.openWindow(destino)
    })
  )
})
