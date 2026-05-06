<template>
  <button @click="activarNotificaciones">
    Activar Notificaciones de Escritorio
  </button>
</template>

<script setup>
import { usePush } from '@/lib/usePush.js'
import { useUserStore } from '@/stores/user.js'

const { subscribeToPush } = usePush()
const userStore = useUserStore()

const activarNotificaciones = async () => {
  try {
    const userId = 'ID_DEL_USUARIO_AQUI'
    await subscribeToPush(userId)
    alert('Notificaciones activadas correctamente')
  } catch (error) {
    console.error("Nombre del error:", error.name)
    console.error("Mensaje del error:", error.message)
    console.error("Stack trace:", error.stack)
    console.dir(error)

    if (error.name === 'NotAllowedError') {
      alert('Debes conceder permisos de notificación en tu navegador.')
    } else {
      alert(`Fallo en la suscripción: ${error.message}`)
    }
  }
}
</script>