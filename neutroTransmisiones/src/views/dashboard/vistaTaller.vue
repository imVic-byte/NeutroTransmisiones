<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../../stores/user'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabaseClient'

const router = useRouter()
const userStore = useUserStore()
const nombre = userStore.trabajador?.nombre || 'Jeremy'

const loading = ref(true)
const celdas = ref([])
const estadosFicha = ref([])

const sortCeldas = (arr) => {
  return [...arr].sort((a, b) => {
    if (a.row_number !== b.row_number) {
      return a.row_number - b.row_number
    }
    return a.column_number - b.column_number
  })
}

const obtenerEstadoFicha = (celda) => {
  const ficha = celda.ficha_de_trabajo
  if (!ficha) return null
  const est = estadosFicha.value.find(e => e.id === ficha.estado)
  return est || { estado: 'Desconocido', color: '#6b7280' }
}

const cargarTaller = () => {
  loading.value = true
  
  // 1. Cargar los estados de las fichas
  supabase
    .from('tabla_estados_ficha')
    .select('*')
    .then(({ data: estadosData, error: estadosError }) => {
      if (estadosError) throw estadosError
      estadosFicha.value = estadosData || []

      // 2. Cargar celdas de taller y relacionar con ficha_de_trabajo
      return supabase
        .from('taller')
        .select('*, ficha_de_trabajo(id, estado)')
    })
    .then(({ data, error }) => {
      if (error) throw error
      
      if (!data || data.length === 0) {
        // Inicializar con 15 registros vacíos (5 filas x 3 columnas)
        const vacantes = []
        for (let r = 1; r <= 5; r++) {
          for (let c = 1; c <= 3; c++) {
            vacantes.push({
              row_number: r,
              column_number: c,
              status: 'vacante',
              vehicle_name: null,
              id_ficha: null
            })
          }
        }
        
        return supabase
          .from('taller')
          .insert(vacantes)
          .select()
          .then(({ data: insertedData, error: insertError }) => {
            if (insertError) throw insertError
            celdas.value = sortCeldas(insertedData || [])
          })
      } else {
        celdas.value = sortCeldas(data)
      }
    })
    .catch((err) => {
      console.error('Error al cargar taller:', err)
    })
    .finally(() => {
      loading.value = false
    })
}

const irAFicha = (idFicha) => {
  if (idFicha) {
    router.push({ name: 'ficha-de-trabajo', params: { id: idFicha } })
  }
}

onMounted(() => {
  cargarTaller()
})
</script>

<template>
  <div class="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-20 space-y-6">
    <!-- Cabecera -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-3xl font-bold neutro-font">Hola, {{ nombre }}</h1>
        <p class="text-sm font-medium neutro-font capitalize text-white/70">Vista Simple (Taller)</p>
      </div>
    </div>

    <!-- 1. Vista de Carga (Skeleton Loader) -->
    <div v-if="loading" class="grid grid-cols-3 grid-rows-5 gap-4 animate-pulse">
      <div v-for="i in 15" :key="i" class="h-[130px] bg-white/5 rounded-2xl border border-white/10"></div>
    </div>

    <!-- 2. Cuadrícula de Ordenes de Trabajo -->
    <div v-else class="grid grid-cols-3 grid-rows-5 gap-4">
      <div 
        v-for="celda in celdas" 
        :key="celda.id" 
        class="neutro-primary rounded-2xl p-5 border min-h-[130px] flex flex-col justify-between transition-all duration-200"
        :class="{
          'border-white/10 hover:border-white/30 border-dashed border-white/20': celda.status === 'vacante',
          'border-blue-500/30 bg-blue-500/5 hover:border-blue-500/50 shadow-[0_0_15px_-3px_rgba(59,130,246,0.1)]': celda.status === 'ocupado',
          'border-red-500/20 opacity-55 bg-red-950/5 cursor-not-allowed pattern-stripes': celda.status === 'tachado',
          'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50': celda.status === 'bodega',
          'border-purple-500/30 bg-purple-500/5 hover:border-purple-500/50': celda.status === 'oficina',
        }"
      >
        <!-- Cabecera de Celda -->
        <div class="flex justify-between items-start">
          <span class="text-[10px] font-bold text-white/40 tracking-wider uppercase">
            Fila {{ celda.row_number }} - Col {{ celda.column_number }}
          </span>
          <span 
            class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider"
            :class="{
              'bg-white/10 text-white/60': celda.status === 'vacante',
              'bg-blue-500/20 text-blue-400': celda.status === 'ocupado',
              'bg-red-500/20 text-red-400': celda.status === 'tachado',
              'bg-amber-500/20 text-amber-400': celda.status === 'bodega',
              'bg-purple-500/20 text-purple-400': celda.status === 'oficina',
            }"
          >
            {{ celda.status }}
          </span>
        </div>

        <!-- Contenido de Celda -->
        <div class="my-2">
          <!-- Ocupado -->
          <div v-if="celda.status === 'ocupado'" class="space-y-2">
            <h3 class="font-bold text-white text-sm truncate">{{ celda.vehicle_name || 'Vehículo sin nombre' }}</h3>
            <div class="flex flex-wrap items-center gap-1.5">
              <button 
                v-if="celda.id_ficha" 
                @click="irAFicha(celda.id_ficha)" 
                class="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer bg-blue-500/10 px-2 py-0.5 rounded"
              >
                Ficha #{{ celda.id_ficha }}
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <span 
                v-if="obtenerEstadoFicha(celda)"
                class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white shadow-sm"
                :style="{ backgroundColor: obtenerEstadoFicha(celda).color }"
              >
                {{ obtenerEstadoFicha(celda).estado }}
              </span>
              <span v-else-if="celda.id_ficha" class="text-[10px] text-white/40 italic">Sin estado</span>
              <span v-else class="text-[10px] text-white/40 italic">Sin ficha asociada</span>
            </div>
          </div>

          <!-- Bodega -->
          <div v-else-if="celda.status === 'bodega'" class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-amber-400">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <span class="text-xs font-semibold text-white/80">Área de Bodega</span>
          </div>

          <!-- Oficina -->
          <div v-else-if="celda.status === 'oficina'" class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-purple-400">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
            <span class="text-xs font-semibold text-white/80">Oficina</span>
          </div>

          <!-- Tachado / Inactivo -->
          <div v-else-if="celda.status === 'tachado'">
            <span class="text-xs text-red-400/60 font-semibold italic">No Disponible</span>
          </div>

          <!-- Vacante -->
          <div v-else>
            <span class="text-xs text-white/30 italic">Bahía libre</span>
          </div>
        </div>

        <!-- Pie de Celda -->
        <div class="text-[10px] text-white/20 font-medium">
          {{ celda.status === 'ocupado' ? 'Trabajo en progreso' : '—' }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pattern-stripes {
  background-image: repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.05) 0px, rgba(239, 68, 68, 0.05) 10px, transparent 10px, transparent 20px);
}
</style>
