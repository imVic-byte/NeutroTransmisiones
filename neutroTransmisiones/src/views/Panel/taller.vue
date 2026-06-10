<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useInterfaz } from '@/stores/interfaz'

const interfaz = useInterfaz()
const loading = ref(true)
const celdas = ref([])
const celdaEditando = ref(null)
const nuevoStatus = ref('')
const guardando = ref(false)

const sortCeldas = (arr) => {
  return [...arr].sort((a, b) => {
    if (a.row_number !== b.row_number) {
      return a.row_number - b.row_number
    }
    return a.column_number - b.column_number
  })
}

const cargarTaller = async () => {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('taller')
      .select('*')
    if (error) throw error
    
    if (!data || data.length === 0) {
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
      const { data: insertedData, error: insertError } = await supabase
        .from('taller')
        .insert(vacantes)
        .select()
      if (insertError) throw insertError
      celdas.value = sortCeldas(insertedData || [])
    } else {
      celdas.value = sortCeldas(data)
    }
  } catch (err) {
    console.error('Error al cargar taller:', err)
  } finally {
    loading.value = false
  }
}

const abrirEdicion = (celda) => {
  celdaEditando.value = { ...celda }
  nuevoStatus.value = celda.status
}

const guardarCambio = async () => {
  if (!celdaEditando.value || guardando.value) return
  guardando.value = true
  try {
    const payload = {
      status: nuevoStatus.value
    }
    
    // Si se cambia de ocupado a otra cosa, liberar vehiculo
    if (celdaEditando.value.status === 'ocupado' && nuevoStatus.value !== 'ocupado') {
      payload.id_ficha = null
      payload.vehicle_name = null
    }

    const { error } = await supabase
      .from('taller')
      .update(payload)
      .eq('id', celdaEditando.value.id)
    
    if (error) throw error
    
    celdaEditando.value = null
    await cargarTaller()
  } catch (err) {
    console.error('Error al actualizar celda:', err)
  } finally {
    guardando.value = false
  }
}

onMounted(() => {
  cargarTaller()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-xl font-bold text-white neutro-font">Cuadrícula del Taller</h2>
        <p class="text-sm neutro-font">Configura la distribución de espacios designando áreas de trabajo, bodegas, oficinas o bloqueando bahías.</p>
      </div>
    </div>

    <!-- Carga -->
    <div v-if="loading" class="grid grid-cols-3 grid-rows-5 gap-4 animate-pulse">
      <div v-for="n in 15" :key="n" class="h-28 bg-white/5 rounded-2xl border border-white/10"></div>
    </div>

    <!-- Cuadrícula -->
    <div v-else class="grid grid-cols-3 grid-rows-5 gap-4">
      <div 
        v-for="celda in celdas" 
        :key="celda.id"
        @click="abrirEdicion(celda)"
        class="neutro-primary rounded-2xl p-5 border min-h-[120px] flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        :class="{
          'border-white/10 hover:border-white/30 border-dashed border-white/20': celda.status === 'vacante',
          'border-blue-500/30 bg-blue-500/5 hover:border-blue-500/50 shadow-[0_0_15px_-3px_rgba(59,130,246,0.1)]': celda.status === 'ocupado',
          'border-red-500/20 opacity-55 bg-red-950/5 hover:border-red-500/35 pattern-stripes': celda.status === 'tachado',
          'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50': celda.status === 'bodega',
          'border-purple-500/30 bg-purple-500/5 hover:border-purple-500/50': celda.status === 'oficina',
        }"
      >
        <!-- Cabecera -->
        <div class="flex justify-between items-start">
          <span class="text-[10px] font-bold text-white/40 uppercase tracking-wider">
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

        <!-- Contenido principal -->
        <div class="my-1.5">
          <div v-if="celda.status === 'ocupado'" class="space-y-0.5">
            <h3 class="font-bold text-white text-xs truncate">{{ celda.vehicle_name || 'Vehículo' }}</h3>
            <span class="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">Ficha #{{ celda.id_ficha }}</span>
          </div>
          <div v-else-if="celda.status === 'bodega'" class="flex items-center gap-1.5 text-xs text-amber-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <span class="font-semibold">Bodega</span>
          </div>
          <div v-else-if="celda.status === 'oficina'" class="flex items-center gap-1.5 text-xs text-purple-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
            <span class="font-semibold">Oficina</span>
          </div>
          <div v-else-if="celda.status === 'tachado'" class="text-xs text-red-400/60 font-semibold italic">
            Bloqueado
          </div>
          <div v-else class="text-xs text-white/30 italic">
            Espacio Vacante
          </div>
        </div>

        <!-- Pie -->
        <span class="text-[9px] text-white/40 block">Haz clic para configurar</span>
      </div>
    </div>

    <!-- Modal de Edición de Celda -->
    <Teleport to="body">
      <div v-if="celdaEditando" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="celdaEditando = null"></div>
        <div class="relative neutro-primary text-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
          <div class="p-5 border-b border-white/10 flex justify-between items-center">
            <h3 class="text-lg font-bold text-white">Configurar Celda Fila {{ celdaEditando.row_number }} - Col {{ celdaEditando.column_number }}</h3>
            <button @click="celdaEditando = null" class="text-white/60 hover:text-white transition-colors cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="p-6 space-y-5">
            <!-- Advertencia si está Ocupada -->
            <div v-if="celdaEditando.status === 'ocupado'" class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-400 text-xs space-y-1">
              <p class="font-bold flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 shrink-0"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" /></svg>
                Espacio actualmente ocupado
              </p>
              <p>
                Vehículo: <b>{{ celdaEditando.vehicle_name }}</b> (Ficha #{{ celdaEditando.id_ficha }}).
              </p>
              <p>Si cambias el estado de esta celda a uno distinto de 'ocupado', el vehículo se desvinculará de la cuadrícula.</p>
            </div>

            <!-- Selector de Estados -->
            <div class="space-y-2.5">
              <label class="text-xs text-white/50 uppercase font-bold tracking-wider">Asignar Estatus del Espacio</label>
              
              <div class="grid grid-cols-1 gap-2.5">
                <!-- Vacante -->
                <button 
                  type="button" 
                  @click="nuevoStatus = 'vacante'"
                  class="flex items-center justify-between px-4 py-3 rounded-xl border font-bold text-sm transition-all cursor-pointer"
                  :class="nuevoStatus === 'vacante' ? 'border-white bg-white/10 text-white' : 'border-white/5 bg-white/5 text-white/60 hover:bg-white/10'"
                >
                  <span class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-white/30"></span>
                    Vacante (Disponible para vehículos)
                  </span>
                  <span v-if="nuevoStatus === 'vacante'" class="text-xs">✓</span>
                </button>

                <!-- Tachado -->
                <button 
                  type="button" 
                  @click="nuevoStatus = 'tachado'"
                  class="flex items-center justify-between px-4 py-3 rounded-xl border font-bold text-sm transition-all cursor-pointer"
                  :class="nuevoStatus === 'tachado' ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-white/5 bg-white/5 text-white/60 hover:bg-white/10'"
                >
                  <span class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-red-500/50"></span>
                    Tachado (Bloqueado/Fuera de servicio)
                  </span>
                  <span v-if="nuevoStatus === 'tachado'" class="text-xs">✓</span>
                </button>

                <!-- Bodega -->
                <button 
                  type="button" 
                  @click="nuevoStatus = 'bodega'"
                  class="flex items-center justify-between px-4 py-3 rounded-xl border font-bold text-sm transition-all cursor-pointer"
                  :class="nuevoStatus === 'bodega' ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-white/5 bg-white/5 text-white/60 hover:bg-white/10'"
                >
                  <span class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-amber-500/50"></span>
                    Bodega (Área de almacenamiento)
                  </span>
                  <span v-if="nuevoStatus === 'bodega'" class="text-xs">✓</span>
                </button>

                <!-- Oficina -->
                <button 
                  type="button" 
                  @click="nuevoStatus = 'oficina'"
                  class="flex items-center justify-between px-4 py-3 rounded-xl border font-bold text-sm transition-all cursor-pointer"
                  :class="nuevoStatus === 'oficina' ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-white/5 bg-white/5 text-white/60 hover:bg-white/10'"
                >
                  <span class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-purple-500/50"></span>
                    Oficina (Área administrativa)
                  </span>
                  <span v-if="nuevoStatus === 'oficina'" class="text-xs">✓</span>
                </button>

                <!-- Mantener ocupado (si ya lo estaba) -->
                <button 
                  v-if="celdaEditando.status === 'ocupado'"
                  type="button" 
                  @click="nuevoStatus = 'ocupado'"
                  class="flex items-center justify-between px-4 py-3 rounded-xl border font-bold text-sm transition-all cursor-pointer"
                  :class="nuevoStatus === 'ocupado' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-white/5 bg-white/5 text-white/60 hover:bg-white/10'"
                >
                  <span class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-blue-500/50"></span>
                    Mantener Ocupado (No liberar vehículo)
                  </span>
                  <span v-if="nuevoStatus === 'ocupado'" class="text-xs">✓</span>
                </button>
              </div>
            </div>
          </div>

          <div class="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
            <button 
              @click="celdaEditando = null" 
              :disabled="guardando" 
              class="px-4 py-2.5 rounded-xl text-sm font-semibold text-white/80 hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              @click="guardarCambio" 
              :disabled="guardando || nuevoStatus === celdaEditando.status"
              class="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg v-if="guardando" class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              {{ guardando ? 'Guardando...' : 'Confirmar Cambios' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.pattern-stripes {
  background-image: repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.05) 0px, rgba(239, 68, 68, 0.05) 10px, transparent 10px, transparent 20px);
}
</style>
