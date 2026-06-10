<script setup>
import { ref, onMounted, computed, defineEmits } from 'vue'
import { useRouter } from "vue-router"
import { supabase } from "../../lib/supabaseClient"

const router = useRouter()
const emit = defineEmits(['cerrar'])

const fichasDisponibles = ref([])
const cargando = ref(true)
const textoBusqueda = ref('')

const buscarFichasDisponibles = async () => {
  cargando.value = true
  try {
    const { data: disponibles, error: errDisponibles } = await supabase
      .from("ficha_de_trabajo")
      .select("*, cliente(*),orden_trabajo(id,vehiculo(id,marca,modelo,patente))")
      .in('estado', [1, 6])
      .order("id", { ascending: false })
      
    if (errDisponibles) throw errDisponibles
    fichasDisponibles.value = disponibles || []
  } catch (error) {
    console.error("Error cargando fichas:", error)
  } finally {
    cargando.value = false
  }
}

const fichasFiltradas = computed(() => {
  if (!textoBusqueda.value.trim()) return fichasDisponibles.value
  
  const busqueda = textoBusqueda.value.toLowerCase().trim()
  return fichasDisponibles.value.filter(ficha => {
    const idFicha = ficha.id?.toString() || ''
    const nombreCliente = `${ficha.cliente?.nombre || ''} ${ficha.cliente?.apellido || ''}`.toLowerCase()
    
    // Buscar en patentes o marcas de los vehículos
    const matchVehiculo = ficha.orden_trabajo?.some(ot => 
      ot.vehiculo?.patente?.toLowerCase().includes(busqueda) ||
      ot.vehiculo?.marca?.toLowerCase().includes(busqueda)
    )

    return idFicha.includes(busqueda) || nombreCliente.includes(busqueda) || matchVehiculo
  })
})

const seleccionarFicha = (id) => {
  router.push({ name: 'crear-cotizacion-ficha-de-trabajo', params: { id } })
}

const formatFecha = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const inicialesCliente = (nombre, apellido) => {
  return `${(nombre?.charAt(0) || '').toUpperCase()}${(apellido?.charAt(0) || '').toUpperCase()}`
}

onMounted(() => {
  buscarFichasDisponibles()
})
</script>

<template>
  <div class="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4 transition-all duration-300">
    <!-- Modal Container: neutro-primary -->
    <div class="neutro-primary border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-modal-entrance">
      
      <!-- Header: neutro-secondary -->
      <div class="px-6 py-5 border-b border-white/10 flex justify-between items-center neutro-secondary">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-bold text-white tracking-wide">Nueva Cotización</h2>
            <p class="text-xs text-white/60 font-medium mt-0.5">Selecciona la Ficha de Trabajo origen</p>
          </div>
        </div>
        <button @click="emit('cerrar')" class="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Buscador: neutro-primary -->
      <div class="px-6 py-4 border-b border-white/10 neutro-primary">
        <div class="relative">
          <input 
            v-model="textoBusqueda" 
            type="text" 
            placeholder="Buscar por N°, cliente o patente..."
            class="w-full pl-10 pr-4 py-2.5 neutro-secondary border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner font-medium"
          />
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <svg class="h-4 w-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Lista de Fichas -->
      <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
        
        <!-- Loading State -->
        <div v-if="cargando" class="flex flex-col items-center justify-center py-12">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-white mb-4"></div>
          <p class="text-white/70 text-sm font-medium animate-pulse">Cargando fichas disponibles...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="fichasFiltradas.length === 0" class="flex flex-col items-center justify-center py-12 opacity-90">
          <div class="w-16 h-16 neutro-secondary rounded-full flex items-center justify-center mb-4 border border-white/10">
            <svg class="h-8 w-8 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p class="text-white font-medium text-lg">No se encontraron fichas</p>
          <p class="text-white/60 text-sm mt-1 text-center px-6">
            {{ textoBusqueda ? 'No hay resultados que coincidan con tu búsqueda.' : 'No hay fichas en estado inicial o terminadas para cotizar.' }}
          </p>
        </div>

        <!-- Resultados -->
        <div v-else class="grid grid-cols-1 gap-3">
          <div 
            v-for="(ficha, index) in fichasFiltradas" 
            :key="ficha.id"
            @click="seleccionarFicha(ficha.id)"
            class="group neutro-secondary border border-white/5 rounded-xl p-4 cursor-pointer hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:brightness-110 transition-all duration-200 animate-slide-up"
            :style="{ animationDelay: `${index * 50}ms` }"
          >
            <div class="flex items-start gap-4">
              
              <!-- Avatar Cliente -->
              <div class="w-12 h-12 rounded-full neutro-primary flex items-center justify-center shrink-0 border border-white/10 shadow-inner group-hover:bg-blue-600 group-hover:border-blue-400 transition-colors duration-300">
                <span class="text-white font-bold text-sm tracking-widest">
                  {{ inicialesCliente(ficha.cliente?.nombre, ficha.cliente?.apellido) }}
                </span>
              </div>
              
              <!-- Info Ficha -->
              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start mb-1">
                  <h3 class="text-white font-bold truncate pr-2 group-hover:text-blue-300 transition-colors">
                    {{ ficha.cliente?.nombre }} {{ ficha.cliente?.apellido }}
                  </h3>
                  <span class="neutro-primary text-white/80 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 border border-white/10">
                    Ficha #{{ ficha.id }}
                  </span>
                </div>
                
                <p class="text-xs text-white/60 mb-2 truncate font-medium">
                  Ingresada: {{ formatFecha(ficha.fecha_ingreso) }}
                </p>

                <!-- Vehiculos (Chips) -->
                <div v-if="ficha.orden_trabajo && ficha.orden_trabajo.length > 0" class="flex flex-wrap gap-1.5 mt-2">
                  <div v-for="ot in ficha.orden_trabajo" :key="ot.id" class="inline-flex items-center gap-1.5 neutro-primary border border-white/10 rounded-md px-2 py-1">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span class="text-[10px] text-white/90 font-semibold truncate max-w-[120px]">
                      {{ ot.vehiculo?.marca }} {{ ot.vehiculo?.modelo }}
                    </span>
                    <span class="text-[9px] font-black text-white bg-white/20 px-1 rounded uppercase tracking-widest ml-1">
                      {{ ot.vehiculo?.patente }}
                    </span>
                  </div>
                </div>
                <div v-else class="text-xs text-white/50 italic">
                  Sin vehículos asignados
                </div>
              </div>

              <!-- Flecha Indicadora -->
              <div class="shrink-0 flex items-center justify-center h-full opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300 mt-3">
                <div class="w-8 h-8 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
      
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

@keyframes modalEntrance {
  0% {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.animate-modal-entrance {
  animation: modalEntrance 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes slideUp {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-up {
  opacity: 0;
  animation: slideUp 0.3s ease-out forwards;
}
</style>