<script setup>
import navbar from '../components/componentes/navbar.vue'
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '../stores/user'
import { useRouter } from 'vue-router'
import { useInterfaz } from '@/stores/interfaz'
import { supabase } from '@/lib/supabaseClient'

const interfaz = useInterfaz()
const userStore = useUserStore()
const router = useRouter()
const nombre = userStore.trabajador?.nombre || ''
const apellido = userStore.trabajador?.apellido || ''
const nombreCompleto = computed(() => nombre + ' ' + apellido)

const hoy = new Date()
const fechaHoy = computed(() => {
  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }).format(hoy)
})
const esFinDeSemana = computed(() => {
  const dia = hoy.getDay()
  return dia === 0 || dia === 6
})
const fechaInicioSemana = computed(() => {
  const d = new Date(hoy)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString()
})

const vehiculosEnTaller = ref(0)
const otPorEntregar = ref(0)
const presupuestosSemana = ref(0)
const presupuestosHoy = ref(0)

const capacidadMaxima = ref(15)
const porcentajeCapacidad = computed(() => {
  if (!capacidadMaxima.value || capacidadMaxima.value === 0) return 0
  return (vehiculosEnTaller.value / capacidadMaxima.value) * 100
})
const TruncarPorcentaje = computed(() => Math.trunc(porcentajeCapacidad.value))

const cotizacionesTotales = ref(0)
const cotizacionesRechazadas = ref(0)
const porcentajeAprobadas = computed(() => {
  if (cotizacionesTotales.value === 0) return 0
  return Math.trunc(((cotizacionesTotales.value - cotizacionesRechazadas.value) / cotizacionesTotales.value) * 100)
})

const trabajoReciente = ref([])
const estados = ref([])
const ticketPromedio = ref(0)

// Acciones de redirección
const VehiculosEnTaller = () => router.push({ name: 'vehiculos-en-taller' })
const ListoParaEntregar = () => router.push({ name: 'ot-por-entregar' })
const verTablero = () => router.push({ name: 'ordenes-de-trabajo' })
const irAChequeoCompleto = () => router.push({ name: 'chequeos' })
const irACrearDeuda = () => router.push({ name: 'listado-deudas' })
const irACrearFinanzas = () => router.push({ name: 'crear-finanza' })
const irACrearCotizacion = () => router.push({ name: 'crear-cotizacion' })
const verOT = (id) => router.push({ name: 'ver-orden-de-trabajo', params: { id } })

const formatoMoneda = (valor) => {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(valor)
}

const handleVehiculosEnTaller = async () => {
  try {
    const { data, error } = await supabase
      .from('ficha_de_trabajo')
      .select('id, orden_trabajo!inner(id)')
      .in('estado', [1, 2, 3])
    if (error) throw error
    vehiculosEnTaller.value = data.reduce((total, ficha) => total + (Array.isArray(ficha.orden_trabajo) ? ficha.orden_trabajo.length : 1), 0)
  } catch (error) { console.error('Error al obtener vehiculos:', error) }
}

const handleListosParaEntregar = async () => {
  try {
    const { error, count } = await supabase
      .from('ficha_de_trabajo')
      .select('id', { count: 'exact' })
      .in('estado', [3])
    if (error) throw error
    otPorEntregar.value = count || 0
  } catch (error) { console.error('Error al obtener ot por entregar:', error) }
}

const handleCotizaciones = async () => {
  try {
    const { data, error } = await supabase
      .from('cotizaciones_ficha')
      .select('id, estado, total_final, created_at')
    
    if (error) throw error
    
    // Cálculos globales (Efectividad y Ticket Promedio)
    cotizacionesTotales.value = data.length || 0
    cotizacionesRechazadas.value = data.filter(cot => cot.estado === 3).length
    
    const aprobadas = data.filter(cot => cot.estado === 2)
    if (aprobadas.length > 0) {
        const sumaTotal = aprobadas.reduce((acc, cot) => acc + (Number(cot.total_final) || 0), 0)
        ticketPromedio.value = Math.round(sumaTotal / aprobadas.length)
    } else {
        ticketPromedio.value = 0
    }

    // Cálculos semanales y diarios
    const fechaSemanaDate = new Date(fechaInicioSemana.value)
    const deEstaSemana = data.filter(cot => new Date(cot.created_at) > fechaSemanaDate)
    presupuestosSemana.value = deEstaSemana.length

    const inicioHoy = new Date()
    inicioHoy.setHours(0,0,0,0)
    const deHoy = data.filter(cot => new Date(cot.created_at) >= inicioHoy)
    presupuestosHoy.value = deHoy.length
    
  } catch (error) { console.error('Error al obtener cotizaciones:', error) }
}

const handleTrabajoReciente = async () => {
  try {
    const { data, error } = await supabase
      .from('ficha_de_trabajo')
      .select('id, orden_trabajo!inner(*, vehiculo(*))')
      .order('id', { ascending: false })
      .limit(10)
    if (error) throw error
    const todasLasOTs = data.flatMap(ficha => ficha.orden_trabajo.map(ot => ({ ...ot, id_ficha: ficha.id })))
    trabajoReciente.value = todasLasOTs.sort((a, b) => b.id - a.id).slice(0, 5)
  } catch (error) { console.error('Error al obtener trabajo reciente:', error) }
}

const handleTraerEstados = async () => {
  try {
    const { data, error } = await supabase.from('tabla_estados').select('*')
    if (error) throw error
    estados.value = data || []
  } catch (error) { console.error('Error al traer estados:', error) }
}

const handleEstados = (estadoId) => {
  return estados.value.find(e => e.id === estadoId) || { estado: 'Desconocido', color: '#6b7280', texto: '#ffffff' }
}

onMounted(async () => {
  interfaz.showLoading()

  await handleVehiculosEnTaller()
  await handleListosParaEntregar()
  await handleCotizaciones()
  await handleTrabajoReciente()
  await handleTraerEstados()

  interfaz.hideLoading()
})
</script>

<template>
  <div class="neutro-background min-h-screen flex flex-col font-sans">
    <navbar class="navbar" :titulo="'Dashboard'" notificaciones="true" :subtitulo="'Resumen de operaciones'" />

    <main class="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-20 space-y-6">
      
      <!-- 1. Cabecera y Estado -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold neutro-font">Hola, Jeremy</h1>
          <p class="text-sm font-medium neutro-font capitalize text-white/70">{{ fechaHoy }}</p>
        </div>
        <div class="mt-4 sm:mt-0 flex items-center">
          <span v-if="!esFinDeSemana"
            class="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-green-500/10 text-green-400 border border-green-500/20">
            <span class="w-2.5 h-2.5 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            Taller Operativo
          </span>
          <span v-else
            class="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-red-500/10 text-red-400 border border-red-500/20">
            <span class="w-2.5 h-2.5 bg-red-500 rounded-full mr-2"></span>
            Taller Cerrado
          </span>
        </div>
      </div>

      <!-- 2. Acciones Rápidas -->
      <div>
        <h2 class="text-lg font-bold neutro-font mb-3">Acciones rápidas</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button @click="irAChequeoCompleto"
            class="flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-white neutro-secondary hover:bg-white/5 transition-colors border border-white/5 shadow-sm cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Nuevo Chequeo
          </button>
          <button @click="irACrearCotizacion"
            class="flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-white neutro-secondary hover:bg-white/5 transition-colors border border-white/5 shadow-sm cursor-pointer">
            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
              <path fill-rule="evenodd" d="M8 7V2.221a2 2 0 0 0-.5.365L3.586 6.5a2 2 0 0 0-.365.5H8Zm2 0V2h7a2 2 0 0 1 2 2v.126a5.087 5.087 0 0 0-4.74 1.368v.001l-6.642 6.642a3 3 0 0 0-.82 1.532l-.74 3.692a3 3 0 0 0 3.53 3.53l3.694-.738a3 3 0 0 0 1.532-.82L19 15.149V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9h5a2 2 0 0 0 2-2Z" clip-rule="evenodd" />
            </svg>
            Cotización Rápida
          </button>
          <button @click="irACrearFinanzas"
            class="flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-white neutro-secondary hover:bg-white/5 transition-colors border border-white/5 shadow-sm cursor-pointer">
            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
              <path fill-rule="evenodd" d="M5.617 2.076a1 1 0 0 1 1.09.217L8 3.586l1.293-1.293a1 1 0 0 1 1.414 0L12 3.586l1.293-1.293a1 1 0 0 1 1.414 0L16 3.586l1.293-1.293A1 1 0 0 1 19 3v18a1 1 0 0 1-1.707.707L16 20.414l-1.293 1.293a1 1 0 0 1-1.414 0L12 20.414l-1.293 1.293a1 1 0 0 1-1.414 0L8 20.414l-1.293 1.293A1 1 0 0 1 5 21V3a1 1 0 0 1 .617-.924ZM9 7a1 1 0 0 0 0 2h6a1 1 0 1 0 0-2H9Z" clip-rule="evenodd" />
            </svg>
            Gasto / Ingreso
          </button>
          <button @click="irACrearDeuda"
            class="flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-white neutro-secondary hover:bg-white/5 transition-colors border border-white/5 shadow-sm cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Ver Deudas
          </button>
        </div>
      </div>

      <!-- 3. KPIs Principales -->
      <div>
        <h2 class="text-lg font-bold neutro-font mb-3">Métricas Generales</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <!-- KPI 1: Ocupación -->
          <div @click="VehiculosEnTaller" class="neutro-primary rounded-2xl p-5 border border-white/10 hover:bg-white/5 transition-colors cursor-pointer">
            <div class="flex items-center justify-between mb-4">
              <div class="p-2.5 rounded-lg bg-blue-500/20 text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span class="text-xs font-bold px-2 py-1 bg-white/10 rounded-full text-white/80">Ocupación</span>
            </div>
            <h3 class="text-3xl font-black text-white">{{ vehiculosEnTaller }} <span class="text-sm font-medium text-white/50">/ {{ capacidadMaxima }}</span></h3>
            <div class="mt-3 w-full bg-white/10 rounded-full h-1.5">
              <div class="bg-blue-500 h-1.5 rounded-full" :style="{ width: `${Math.min((vehiculosEnTaller / capacidadMaxima) * 100, 100)}%` }"></div>
            </div>
          </div>

          <!-- KPI 2: Listos para Entregar -->
          <div @click="ListoParaEntregar" class="neutro-primary rounded-2xl p-5 border border-white/10 hover:bg-white/5 transition-colors cursor-pointer">
            <div class="flex items-center justify-between mb-4">
              <div class="p-2.5 rounded-lg bg-green-500/20 text-green-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span class="text-xs font-bold px-2 py-1 bg-white/10 rounded-full text-white/80">Para entregar</span>
            </div>
            <h3 class="text-3xl font-black text-white">{{ otPorEntregar }}</h3>
            <p class="text-sm font-medium text-white/60 mt-2">Vehículos listos</p>
          </div>

          <!-- KPI 3: Efectividad Comercial -->
          <div class="neutro-primary rounded-2xl p-5 border border-white/10">
            <div class="flex items-center justify-between mb-4">
              <div class="p-2.5 rounded-lg bg-yellow-500/20 text-yellow-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span class="text-xs font-bold px-2 py-1 bg-white/10 rounded-full text-white/80">Aprobación</span>
            </div>
            <h3 class="text-3xl font-black text-white">{{ porcentajeAprobadas }}%</h3>
            <p class="text-sm font-medium text-white/60 mt-2">Global</p>
          </div>
        </div>
      </div>

      <!-- 4. Columnas Detalladas -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- Columna Operativa -->
        <div class="space-y-6">
          <div class="neutro-primary rounded-2xl border border-white/10 overflow-hidden h-full">
            <div class="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 class="font-bold text-white">Trabajo Reciente</h3>
              <button @click="verTablero" class="text-xs font-bold text-blue-400 hover:text-blue-300">Ver todas</button>
            </div>
            <div class="p-4">
              <div v-if="trabajoReciente.length === 0" class="text-center py-6 text-white/50 text-sm">
                No hay trabajo reciente.
              </div>
              <div v-else class="space-y-3">
                <div v-for="ot in trabajoReciente" :key="ot.id" @click="verOT(ot.id)"
                  class="neutro-secondary p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between">
                  <div class="flex-1 min-w-0">
                    <p class="font-bold text-white text-sm">Ficha #{{ ot.id_ficha }} - OT #{{ ot.id }}</p>
                    <p class="text-xs text-white/60 truncate mt-0.5">
                      {{ ot.vehiculo?.marca }} {{ ot.vehiculo?.modelo }} ({{ ot.vehiculo?.patente }})
                    </p>
                  </div>
                  <div class="ml-4 mr-2">
                    <span class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-center block"
                      :style="{ backgroundColor: handleEstados(ot.estado_actual_id).color, color: handleEstados(ot.estado_actual_id).texto }">
                      {{ handleEstados(ot.estado_actual_id).estado }}
                    </span>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Columna Financiera -->
        <div class="space-y-6">
          <div class="neutro-primary rounded-2xl border border-white/10 overflow-hidden h-full">
            <div class="p-4 border-b border-white/10">
              <h3 class="font-bold text-white">Resumen Comercial</h3>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-2 gap-4">
                <div class="neutro-secondary p-4 rounded-xl border border-white/5 text-center flex flex-col justify-center">
                  <span class="text-xs font-bold text-white/60 uppercase tracking-wider block mb-2">Presupuestos Hoy</span>
                  <span class="text-2xl font-black text-white">{{ presupuestosHoy }}</span>
                </div>
                <div class="neutro-secondary p-4 rounded-xl border border-white/5 text-center flex flex-col justify-center">
                  <span class="text-xs font-bold text-white/60 uppercase tracking-wider block mb-2">Ticket Promedio</span>
                  <span class="text-xl font-black text-green-400">{{ formatoMoneda(ticketPromedio) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>
