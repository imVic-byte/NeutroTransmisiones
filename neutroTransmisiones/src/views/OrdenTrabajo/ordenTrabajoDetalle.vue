<script setup>
import { ref, onMounted, watch } from 'vue'
import { supabase } from '../../lib/supabaseClient.js'
import { useToast } from 'vue-toastification'
import { handleTransmision, buscarTransmisiones } from '../../js/handleTransmision.js'

const props = defineProps({
  otId: {
    type: String,
    required: true
  }
})

const toast = useToast()
const cargando = ref(false)
const faseActual = ref(1)

const datosTransmision = ref({
  codigos_falla_tcm: '',
  estado_fluido: '',
  prueba_calado_rpm: null,
  presion_linea_ralenti: null,
  presion_linea_carga: null,
  inspeccion_fugas_externas: false,
  checklist_cuerpo_valvulas: 'pendiente',
  checklist_convertidor: 'pendiente',
  holgura_discos: null,
  estado_bomba: 'pendiente',
  estado_planetarios: 'pendiente',
  adaptacion_realizada: false,
  prueba_ruta_ok: false,
  lavado_enfriador: false,
  temperatura_nivelacion: null,
  presion_final_ok: false
})

// --- Transmisión autocomplete ---
const transmisionQuery = ref('')
const sugerenciasTransmision = ref([])
const mostrarSugerencias = ref(false)
const transmisionSeleccionada = ref(null)
let debounceSearch = null

const datosNuevaTransmision = ref({
  modelo_caja: '',
  fabricante: '',
  tipo_fluido: '',
  capacidad_litros: null,
  torque_cuerpo_valvulas_nm: null,
  torque_carter_nm: null,
  notas_tecnicas: ''
})

watch(transmisionQuery, (val) => {
  if (debounceSearch) clearTimeout(debounceSearch)
  if (transmisionSeleccionada.value) {
    sugerenciasTransmision.value = []
    mostrarSugerencias.value = false
    return
  }
  if (!val || val.length < 2) {
    sugerenciasTransmision.value = []
    mostrarSugerencias.value = false
    return
  }
  debounceSearch = setTimeout(async () => {
    sugerenciasTransmision.value = await buscarTransmisiones(val)
    mostrarSugerencias.value = sugerenciasTransmision.value.length > 0
  }, 300)
})

const asociarTransmisionAOT = async (idTransmision) => {
  const { error } = await supabase
    .from('orden_trabajo')
    .update({ id_transmision: idTransmision })
    .eq('id', props.otId)
  if (error) {
    toast.error('Error al asociar la transmisión a la OT')
    return false
  }
  return true
}

const seleccionarTransmision = async (t) => {
  transmisionSeleccionada.value = t
  transmisionQuery.value = t.modelo_caja
  datosNuevaTransmision.value = {
    modelo_caja: t.modelo_caja,
    fabricante: t.fabricante || '',
    tipo_fluido: t.tipo_fluido || '',
    capacidad_litros: t.capacidad_litros,
    torque_cuerpo_valvulas_nm: t.torque_cuerpo_valvulas_nm,
    torque_carter_nm: t.torque_carter_nm,
    notas_tecnicas: t.notas_tecnicas || ''
  }
  mostrarSugerencias.value = false
  await asociarTransmisionAOT(t.id)
  toast.success('Transmisión asociada correctamente')
}

const limpiarTransmision = () => {
  transmisionSeleccionada.value = null
  transmisionQuery.value = ''
  datosNuevaTransmision.value = {
    modelo_caja: '',
    fabricante: '',
    tipo_fluido: '',
    capacidad_litros: null,
    torque_cuerpo_valvulas_nm: null,
    torque_carter_nm: null,
    notas_tecnicas: ''
  }
}

const guardarTransmision = async () => {
  if (!datosNuevaTransmision.value.modelo_caja) {
    toast.error('Debe ingresar el modelo de caja')
    return
  }
  cargando.value = true
  const t = datosNuevaTransmision.value
  const resultado = await handleTransmision(
    t.modelo_caja,
    t.fabricante,
    t.tipo_fluido,
    t.capacidad_litros,
    t.torque_cuerpo_valvulas_nm,
    t.torque_carter_nm,
    t.notas_tecnicas
  )
  if (resultado) {
    transmisionSeleccionada.value = resultado
    transmisionQuery.value = resultado.modelo_caja
    await asociarTransmisionAOT(resultado.id)
    toast.success('Transmisión guardada correctamente')
  } else {
    toast.error('Error al guardar la transmisión')
  }
  cargando.value = false
}

// --- Diagnóstico ---
const cargarDatosExistentes = async () => {
  const { data, error } = await supabase
    .from('ot_transmision_detalle')
    .select('*')
    .eq('ot_id', props.otId)
    .maybeSingle()

  if (error) {
    toast.error('Error al cargar los datos de la transmisión')
    return
  }

  if (data) {
    datosTransmision.value = data
  }
}

const guardarDatosTransmision = async () => {
  cargando.value = true

  const payload = {
    ot_id: props.otId,
    ...datosTransmision.value
  }

  const { error } = await supabase
    .from('ot_transmision_detalle')
    .upsert(payload, { onConflict: 'ot_id' })

  if (error) {
    toast.error('Hubo un problema al guardar los datos')
  } else {
    toast.success('Datos guardados correctamente')
  }

  cargando.value = false
}

const cargarTransmisionAsociada = async () => {
  const { data } = await supabase
    .from('orden_trabajo')
    .select('id_transmision, transmisiones(*)')
    .eq('id', props.otId)
    .single()
  if (data?.transmisiones) {
    transmisionSeleccionada.value = data.transmisiones
    transmisionQuery.value = data.transmisiones.modelo_caja
  }
}

onMounted(async () => {
  await Promise.all([cargarDatosExistentes(), cargarTransmisionAsociada()])
})
</script>
<template>
  <div class="space-y-6">

    <!-- Transmisión: Autocomplete + Formulario -->
    <div class="neutro-secondary rounded-xl shadow-sm dark:border border-gray-700 overflow-hidden">
      <div class="neutro-primary px-6 py-4 flex justify-between items-center">
        <h2 class="neutro-font font-bold text-lg tracking-wide uppercase">Datos de Transmisión</h2>
        <button v-if="transmisionSeleccionada" @click="limpiarTransmision" type="button"
          class="text-xs font-bold text-red-400 hover:text-red-300 transition-colors">
          Limpiar
        </button>
      </div>

      <div class="p-6 space-y-4">
        <!-- Buscador con autocomplete -->
        <div class="space-y-1 relative">
          <label class="text-xs font-bold neutro-font uppercase tracking-wider">Modelo de Caja</label>
          <input
            v-model="transmisionQuery"
            type="text"
            placeholder="Buscar modelo de caja... (ej: 4T65E, 6T70)"
            class="w-full neutro-secondary dark:border border-gray-700 neutro-font rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 font-medium"
            @focus="mostrarSugerencias = sugerenciasTransmision.length > 0"
            @input="datosNuevaTransmision.modelo_caja = transmisionQuery"
          />
          <!-- Dropdown sugerencias -->
          <div v-if="mostrarSugerencias"
            class="absolute z-10 w-full mt-1 neutro-secondary dark:border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
            <button
              v-for="s in sugerenciasTransmision" :key="s.id"
              @click="seleccionarTransmision(s)"
              type="button"
              class="w-full text-left px-4 py-3 neutro-font hover:bg-blue-900/40 transition-colors border-b border-gray-100/30 last:border-0 cursor-pointer"
            >
              <p class="font-bold text-sm">{{ s.modelo_caja }}</p>
              <p class="text-xs opacity-70">{{ s.fabricante || 'Sin fabricante' }} · {{ s.tipo_fluido || 'Sin tipo fluido' }}</p>
            </button>
          </div>
        </div>

        <!-- Info seleccionada o formulario nuevo -->
        <div v-if="transmisionSeleccionada" class="neutro-primary rounded-lg p-4 space-y-3">
          <div class="flex items-center gap-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm font-bold text-green-400">Transmisión encontrada</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="space-y-0.5">
              <span class="text-xs font-bold neutro-font uppercase tracking-wider opacity-70">Fabricante</span>
              <p class="neutro-font text-sm">{{ transmisionSeleccionada.fabricante || '—' }}</p>
            </div>
            <div class="space-y-0.5">
              <span class="text-xs font-bold neutro-font uppercase tracking-wider opacity-70">Tipo Fluido</span>
              <p class="neutro-font text-sm">{{ transmisionSeleccionada.tipo_fluido || '—' }}</p>
            </div>
            <div class="space-y-0.5">
              <span class="text-xs font-bold neutro-font uppercase tracking-wider opacity-70">Capacidad</span>
              <p class="neutro-font text-sm">{{ transmisionSeleccionada.capacidad_litros ? transmisionSeleccionada.capacidad_litros + ' L' : '—' }}</p>
            </div>
            <div class="space-y-0.5">
              <span class="text-xs font-bold neutro-font uppercase tracking-wider opacity-70">Torque C. Válvulas</span>
              <p class="neutro-font text-sm">{{ transmisionSeleccionada.torque_cuerpo_valvulas_nm ? transmisionSeleccionada.torque_cuerpo_valvulas_nm + ' Nm' : '—' }}</p>
            </div>
            <div class="space-y-0.5">
              <span class="text-xs font-bold neutro-font uppercase tracking-wider opacity-70">Torque Cárter</span>
              <p class="neutro-font text-sm">{{ transmisionSeleccionada.torque_carter_nm ? transmisionSeleccionada.torque_carter_nm + ' Nm' : '—' }}</p>
            </div>
            <div v-if="transmisionSeleccionada.notas_tecnicas" class="space-y-0.5 md:col-span-2">
              <span class="text-xs font-bold neutro-font uppercase tracking-wider opacity-70">Notas Técnicas</span>
              <p class="neutro-font text-sm">{{ transmisionSeleccionada.notas_tecnicas }}</p>
            </div>
          </div>
        </div>

        <!-- Formulario para nueva transmisión -->
        <div v-else class="space-y-4">
          <p class="text-xs neutro-font opacity-60">Si no se encontró, complete los datos para registrar una nueva transmisión.</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-xs font-bold neutro-font uppercase tracking-wider">Fabricante</label>
              <input v-model="datosNuevaTransmision.fabricante" type="text" placeholder="Ej: GM, ZF, Aisin..."
                class="w-full neutro-secondary dark:border border-gray-700 neutro-font rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 font-medium" />
            </div>
            <div class="space-y-1">
              <label class="text-xs font-bold neutro-font uppercase tracking-wider">Tipo de Fluido</label>
              <input v-model="datosNuevaTransmision.tipo_fluido" type="text" placeholder="Ej: Dexron VI, ATF+4..."
                class="w-full neutro-secondary dark:border border-gray-700 neutro-font rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 font-medium" />
            </div>
            <div class="space-y-1">
              <label class="text-xs font-bold neutro-font uppercase tracking-wider">Capacidad (Litros)</label>
              <input v-model="datosNuevaTransmision.capacidad_litros" type="number" placeholder="Ej: 7"
                class="w-full neutro-secondary dark:border border-gray-700 neutro-font rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 font-medium" />
            </div>
            <div class="space-y-1">
              <label class="text-xs font-bold neutro-font uppercase tracking-wider">Torque Cuerpo Válvulas (Nm)</label>
              <input v-model="datosNuevaTransmision.torque_cuerpo_valvulas_nm" type="number" placeholder="Ej: 10"
                class="w-full neutro-secondary dark:border border-gray-700 neutro-font rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 font-medium" />
            </div>
            <div class="space-y-1">
              <label class="text-xs font-bold neutro-font uppercase tracking-wider">Torque Cárter (Nm)</label>
              <input v-model="datosNuevaTransmision.torque_carter_nm" type="number" placeholder="Ej: 15"
                class="w-full neutro-secondary dark:border border-gray-700 neutro-font rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 font-medium" />
            </div>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold neutro-font uppercase tracking-wider">Notas Técnicas</label>
            <textarea v-model="datosNuevaTransmision.notas_tecnicas" placeholder="Observaciones adicionales sobre esta transmisión..."
              rows="2"
              class="w-full neutro-secondary dark:border border-gray-700 neutro-font rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 font-medium resize-none"></textarea>
          </div>
          <div class="flex justify-end">
            <button @click="guardarTransmision" type="button" :disabled="cargando || !datosNuevaTransmision.modelo_caja"
              class="neutro-font neutro-primary py-2.5 px-5 rounded-lg font-bold shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer disabled:opacity-50">
              <svg v-if="cargando" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Registrar Transmisión
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Diagnóstico de Transmisión -->
    <div class="neutro-secondary rounded-xl shadow-sm dark:border border-gray-700 overflow-hidden">
      <div class="neutro-primary px-6 py-4 flex justify-between items-center">
        <h2 class="neutro-font font-bold text-lg tracking-wide uppercase">Diagnóstico de Transmisión</h2>
      </div>

      <div class="px-6 pt-4">
        <div class="flex gap-1 neutro-primary rounded-xl p-1 w-fit">
          <button
            type="button"
            @click="faseActual = 1"
            :class="[
              'px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200',
              faseActual === 1
                ? 'neutro-secondary text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            ]"
          >1. Pre-Desarme</button>
          <button
            type="button"
            @click="faseActual = 2"
            :class="[
              'px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200',
              faseActual === 2
                ? 'neutro-secondary text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            ]"
          >2. Mesa de Trabajo</button>
          <button
            type="button"
            @click="faseActual = 3"
            :class="[
              'px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200',
              faseActual === 3
                ? 'neutro-secondary text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            ]"
          >3. Armado y Pruebas</button>
        </div>
      </div>

      <form @submit.prevent="guardarDatosTransmision" class="p-6">
        <div v-show="faseActual === 1" class="space-y-4">
          <div class="space-y-1">
            <label class="text-xs font-bold neutro-font uppercase tracking-wider">Códigos de Falla TCM (DTC)</label>
            <input
              v-model="datosTransmision.codigos_falla_tcm"
              type="text"
              placeholder="Ej: P0700, P0731..."
              class="w-full neutro-secondary dark:border border-gray-700 neutro-font rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 font-medium"
            />
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold neutro-font uppercase tracking-wider">Estado del Fluido al Recibir</label>
            <select
              v-model="datosTransmision.estado_fluido"
              class="w-full neutro-secondary dark:border border-gray-700 neutro-font rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 font-medium"
            >
              <option value="">Seleccione estado...</option>
              <option value="limpio">Limpio / Rojo</option>
              <option value="quemado">Quemado / Oscuro</option>
              <option value="viruta">Con Viruta Metálica</option>
              <option value="contaminado">Contaminado (Agua/Refrigerante)</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold neutro-font uppercase tracking-wider">Prueba de Calado (RPM)</label>
            <input
              v-model="datosTransmision.prueba_calado_rpm"
              type="number"
              placeholder="Ej: 1800"
              class="w-full neutro-secondary dark:border border-gray-700 neutro-font rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 font-medium"
            />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-xs font-bold neutro-font uppercase tracking-wider">Presión de Línea - Ralentí (PSI)</label>
              <input
                v-model="datosTransmision.presion_linea_ralenti"
                type="number"
                placeholder="Ej: 60"
                class="w-full neutro-secondary dark:border border-gray-700 neutro-font rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 font-medium"
              />
            </div>
            <div class="space-y-1">
              <label class="text-xs font-bold neutro-font uppercase tracking-wider">Presión de Línea - Carga (PSI)</label>
              <input
                v-model="datosTransmision.presion_linea_carga"
                type="number"
                placeholder="Ej: 120"
                class="w-full neutro-secondary dark:border border-gray-700 neutro-font rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 font-medium"
              />
            </div>
          </div>
          <label class="flex items-center space-x-3 cursor-pointer p-3 neutro-secondary rounded-lg dark:border border-gray-700 hover:border-blue-400 transition-colors">
            <input type="checkbox" v-model="datosTransmision.inspeccion_fugas_externas" class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500">
            <span class="text-sm font-medium neutro-font">Inspección de fugas externas realizada</span>
          </label>
        </div>

        <div v-show="faseActual === 2" class="space-y-4">
          <p class="text-sm neutro-font opacity-70 mb-2">Checklist de desarme de componentes clave</p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-xs font-bold neutro-font uppercase tracking-wider">Cuerpo de Válvulas</label>
              <select
                v-model="datosTransmision.checklist_cuerpo_valvulas"
                class="w-full neutro-secondary dark:border border-gray-700 neutro-font rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 font-medium"
              >
                <option value="pendiente">Pendiente de revisión</option>
                <option value="bueno">Buen estado</option>
                <option value="rectificar">Requiere rectificación/torno</option>
                <option value="reemplazar">Reemplazo total</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-xs font-bold neutro-font uppercase tracking-wider">Convertidor de Par</label>
              <select
                v-model="datosTransmision.checklist_convertidor"
                class="w-full neutro-secondary dark:border border-gray-700 neutro-font rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 font-medium"
              >
                <option value="pendiente">Pendiente de revisión</option>
                <option value="bueno">Buen estado</option>
                <option value="reparar">Enviar a reparar</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-xs font-bold neutro-font uppercase tracking-wider">Holgura de Discos (mm)</label>
              <input
                v-model="datosTransmision.holgura_discos"
                type="number"
                step="0.01"
                placeholder="Ej: 0.25"
                class="w-full neutro-secondary dark:border border-gray-700 neutro-font rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 font-medium"
              />
            </div>
            <div class="space-y-1">
              <label class="text-xs font-bold neutro-font uppercase tracking-wider">Estado de Bomba</label>
              <select
                v-model="datosTransmision.estado_bomba"
                class="w-full neutro-secondary dark:border border-gray-700 neutro-font rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 font-medium"
              >
                <option value="pendiente">Pendiente de revisión</option>
                <option value="bueno">Buen estado</option>
                <option value="desgaste">Desgaste excesivo</option>
                <option value="reemplazar">Requiere reemplazo</option>
              </select>
            </div>
            <div class="space-y-1 md:col-span-2">
              <label class="text-xs font-bold neutro-font uppercase tracking-wider">Estado de Planetarios</label>
              <select
                v-model="datosTransmision.estado_planetarios"
                class="w-full neutro-secondary dark:border border-gray-700 neutro-font rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 font-medium"
              >
                <option value="pendiente">Pendiente de revisión</option>
                <option value="bueno">Buen estado</option>
                <option value="desgaste">Desgaste en dientes</option>
                <option value="dañado">Daño severo / Rotura</option>
                <option value="reemplazar">Requiere reemplazo</option>
              </select>
            </div>
          </div>
        </div>

        <div v-show="faseActual === 3" class="space-y-4">
          <label class="flex items-center space-x-3 cursor-pointer p-3 neutro-secondary rounded-lg dark:border border-gray-700 hover:border-blue-400 transition-colors">
            <input type="checkbox" v-model="datosTransmision.lavado_enfriador" class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500">
            <span class="text-sm font-medium neutro-font">Lavado de enfriador (cooler) realizado</span>
          </label>
          <div class="space-y-1">
            <label class="text-xs font-bold neutro-font uppercase tracking-wider">Temperatura de Nivelación (°C)</label>
            <input
              v-model="datosTransmision.temperatura_nivelacion"
              type="number"
              step="0.1"
              placeholder="Ej: 40"
              class="w-full neutro-secondary dark:border border-gray-700 neutro-font rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 font-medium"
            />
          </div>
          <label class="flex items-center space-x-3 cursor-pointer p-3 neutro-secondary rounded-lg dark:border border-gray-700 hover:border-blue-400 transition-colors">
            <input type="checkbox" v-model="datosTransmision.adaptacion_realizada" class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500">
            <span class="text-sm font-medium neutro-font">Adaptación y reaprendizaje TCM completado</span>
          </label>
          <label class="flex items-center space-x-3 cursor-pointer p-3 neutro-secondary rounded-lg dark:border border-gray-700 hover:border-blue-400 transition-colors">
            <input type="checkbox" v-model="datosTransmision.presion_final_ok" class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500">
            <span class="text-sm font-medium neutro-font">Presión final verificada y correcta</span>
          </label>
          <label class="flex items-center space-x-3 cursor-pointer p-3 neutro-secondary rounded-lg dark:border border-gray-700 hover:border-blue-400 transition-colors">
            <input type="checkbox" v-model="datosTransmision.prueba_ruta_ok" class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500">
            <span class="text-sm font-medium neutro-font">Prueba de ruta satisfactoria</span>
          </label>
        </div>

        <div class="mt-6 flex justify-end">
          <button
            type="submit"
            :disabled="cargando"
            class="neutro-font neutro-primary py-3 px-6 rounded-lg font-bold shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <svg v-if="cargando" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ cargando ? 'Guardando...' : 'Guardar Datos de Diagnóstico' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>