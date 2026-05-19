self.addEventListener('push', (event) => {
  let data = { title: 'Nueva notificación', body: 'Tienes una actualización' }

  if (event.data) {
    data = event.data.json()
  }

  const options = {
    body: data.body,
    icon: '/logo.png',
    badge: '/logo.png'
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/')
      }
    })
  )
})
