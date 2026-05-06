import { supabase } from '@/lib/supabaseClient.js'

function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePush() {
  const subscribeToPush = async (userId) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push not soportado')
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      throw new Error('Permiso denegado')
    }

    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    const convertedVapidKey = urlB64ToUint8Array(vapidPublicKey)

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    })

    const subData = JSON.parse(JSON.stringify(subscription))

    const { error } = await supabase.from('suscripciones_push').upsert({
      user_id: userId,
      endpoint: subData.endpoint,
      p256dh: subData.keys.p256dh,
      auth: subData.keys.auth
    }, { onConflict: 'endpoint' })

    if (error) throw error

    return true
  }

  return { subscribeToPush }
}