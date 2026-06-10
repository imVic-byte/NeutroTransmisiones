<script setup>
import { storeToRefs } from 'pinia'
import navbar from '../../components/componentes/navbar.vue'
import VistaSimple from './vistaTaller.vue'
import VistaAvanzada from './vistaAvanzada.vue'
import { useDashboardStore } from '../../stores/dashboard.js'

const dashboardStore = useDashboardStore()
const { activeTab } = storeToRefs(dashboardStore)

</script>

<template>
  <div class="neutro-background min-h-screen flex flex-col font-sans">
    <navbar class="navbar" :titulo="'Dashboard'" notificaciones="true" :subtitulo="activeTab === 'simple' ? 'Vista Simple' : 'Resumen de operaciones'" />

    <!-- Tabs de Selección de Vista -->
    <div class="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      <div class="flex gap-1 neutro-secondary rounded-xl p-1 shadow-sm border border-white/5 w-fit">
        <button
          @click="activeTab = 'simple'"
          class="px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer"
          :class="activeTab === 'simple' ? 'neutro-primary text-white shadow-sm' : 'text-white/60 hover:text-white'"
        >
          Vista Simple
        </button>
        <button
          @click="activeTab = 'avanzada'"
          class="px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer"
          :class="activeTab === 'avanzada' ? 'neutro-primary text-white shadow-sm' : 'text-white/60 hover:text-white'"
        >
          Vista Avanzada
        </button>
      </div>
    </div>

    <!-- Contenido Dinámico de Pestañas con Transición -->
    <div class="flex-1 flex flex-col">
      <transition name="fade" mode="out-in">
        <VistaSimple v-if="activeTab === 'simple'" />
        <VistaAvanzada v-else />
      </transition>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
