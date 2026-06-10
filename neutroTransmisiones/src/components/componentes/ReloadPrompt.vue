<script setup>
import { useRegisterSW } from 'virtual:pwa-register/vue'

const {
  offlineReady,
  needRefresh,
  updateServiceWorker,
} = useRegisterSW()

const close = async () => {
  offlineReady.value = false
  needRefresh.value = false
}
</script>

<template>
  <div
    v-if="offlineReady || needRefresh"
    class="fixed bottom-4 right-4 z-50 p-4 m-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl"
    role="alert"
  >
    <div class="mb-3 text-sm text-gray-800 dark:text-gray-200">
      <span v-if="offlineReady">
        La aplicación está lista para funcionar sin conexión.
      </span>
      <span v-else>
        Hay una nueva versión de NeutroTransmisiones disponible. Actualiza para ver los cambios.
      </span>
    </div>
    <div class="flex gap-2">
      <button
        v-if="needRefresh"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        @click="updateServiceWorker()"
      >
        Actualizar
      </button>
      <button
        class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
        @click="close"
      >
        Cerrar
      </button>
    </div>
  </div>
</template>
