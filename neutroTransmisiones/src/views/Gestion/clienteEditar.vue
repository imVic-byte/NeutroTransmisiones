<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import navbar from '../../components/componentes/navbar.vue'
import volver from '../../components/componentes/volver.vue'
import { useInterfaz } from '../../stores/interfaz.js'
import { supabase } from '../../lib/supabaseClient.js'
import { formatearRut, validarDigitoRut } from '@/js/validarRut.js'

const route = useRoute()
const router = useRouter()
const interfaz = useInterfaz()

const formulario = reactive({
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  codigo_pais: '56',
  rut: '',
  direccion: ''
})

const errores = reactive({
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  rut: ''
})

const cargando = ref(false)
const cargandoDatos = ref(true)
const mostrarModal = ref(false)
const estadoModal = reactive({ mensaje: '', tipo: '' })

// --- Helpers ---
const toCamelCase = (str) => {
  if (!str) return ''
  return str
    .toLowerCase()
    .trim()
    .replace(/\b\w/g, (l) => l.toUpperCase())
}

const onRutInput = () => {
  formulario.rut = formatearRut(formulario.rut)
  errores.rut = ''
}

const filtrarTelefono = (event) => {
  formulario.telefono = event.target.value.replace(/\D/g, '').slice(0, 9)
  errores.telefono = ''
}

// --- Validación ---
const validarFormulario = () => {
  let valido = true
  // Resetear errores
  Object.keys(errores).forEach(k => errores[k] = '')

  // Validar nombre
  const nombre = String(formulario.nombre || '').trim()
  if (!nombre) {
    errores.nombre = 'El nombre es obligatorio.'
    valido = false
  } else if (nombre.length < 2) {
    errores.nombre = 'El nombre debe tener al menos 2 caracteres.'
    valido = false
  }

  // Validar apellido
  const apellido = String(formulario.apellido || '').trim()
  if (!apellido) {
    errores.apellido = 'El apellido es obligatorio.'
    valido = false
  } else if (apellido.length < 2) {
    errores.apellido = 'El apellido debe tener al menos 2 caracteres.'
    valido = false
  }

  // Validar email
  const email = String(formulario.email || '').trim()
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      errores.email = 'El formato del correo no es válido.'
      valido = false
    }
  }

  // Validar teléfono
  const telefono = String(formulario.telefono || '').trim()
  if (telefono) {
    if (telefono.length < 8 || telefono.length > 9) {
      errores.telefono = 'El teléfono debe tener entre 8 y 9 dígitos.'
      valido = false
    }
  }

  // Validar RUT
  const rut = String(formulario.rut || '').trim()
  if (rut) {
    const rutLimpio = rut.replace(/[.\-]/g, '')
    if (rutLimpio.length < 8) {
      errores.rut = 'El RUT debe tener al menos 8 caracteres.'
      valido = false
    } else if (!validarDigitoRut(rut)) {
      errores.rut = 'El RUT ingresado no es válido (dígito verificador incorrecto).'
      valido = false
    }
  }

  return valido
}

// --- Cargar datos ---
const cargarCliente = async () => {
  try {
    cargandoDatos.value = true
    const { data, error } = await supabase
      .from('cliente')
      .select('*')
      .eq('id', route.params.id)
      .single()

    if (error) throw error
    if (!data) throw new Error('Cliente no encontrado')

    formulario.nombre = data.nombre || ''
    formulario.apellido = data.apellido || ''
    formulario.email = data.email || ''
    formulario.telefono = data.telefono || ''
    formulario.codigo_pais = data.codigo_pais || '56'
    formulario.rut = data.rut || ''
    formulario.direccion = data.direccion || ''
  } catch (error) {
    console.error(error)
    estadoModal.mensaje = 'No se pudo cargar los datos del cliente.'
    estadoModal.tipo = 'error'
    mostrarModal.value = true
  } finally {
    cargandoDatos.value = false
  }
}

// --- Guardar cambios ---
const guardarCambios = async () => {
  if (!validarFormulario()) return

  cargando.value = true
  try {
    const { error } = await supabase
      .from('cliente')
      .update({
        nombre: formulario.nombre.trim().toUpperCase(),
        apellido: formulario.apellido.trim().toUpperCase(),
        email: formulario.email.trim().toLowerCase() || null,
        telefono: formulario.telefono || null,
        codigo_pais: formulario.codigo_pais || '56',
        rut: formulario.rut.trim() || null,
        direccion: formulario.direccion.trim() || null
      })
      .eq('id', route.params.id)

    if (error) throw error

    estadoModal.mensaje = 'Los datos del cliente se han actualizado correctamente.'
    estadoModal.tipo = 'success'
    mostrarModal.value = true
  } catch (error) {
    console.error(error)
    estadoModal.mensaje = `Error al actualizar el cliente: ${error.message}`
    estadoModal.tipo = 'error'
    mostrarModal.value = true
  } finally {
    cargando.value = false
  }
}

const cerrarModal = () => {
  mostrarModal.value = false
  if (estadoModal.tipo === 'success') {
    router.push({ name: 'ver-cliente', params: { id: route.params.id } })
  }
}

onMounted(async () => {
  interfaz.showLoading()
  await cargarCliente()
  interfaz.hideLoading()
})
</script>

<template>
  <div class="min-h-screen neutro-background pb-25 font-sans">
    <navbar class="navbar" titulo="Editar Cliente" subtitulo="Gestión de información de clientes"></navbar>

    <div class="max-w-2xl mx-auto mt-6 px-4 sm:px-0 sm:mt-10">
      <volver></volver>

      <div v-if="!cargandoDatos" class="neutro-secondary rounded-2xl shadow-2xl overflow-hidden">
        <div class="neutro-primary p-8 sm:p-10 text-center relative border-b-4 border-yellow-500">
          <h2 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Editar Cliente</h2>
          <p class="text-white opacity-95 text-base mt-3 max-w-lg mx-auto leading-relaxed">
            Modifica los datos generales del cliente. No se alterarán los vehículos o registros asociados.
          </p>
          <div class="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50"></div>
        </div>

        <form @submit.prevent="guardarCambios" class="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 sm:p-10">
          <!-- Nombre -->
          <div class="space-y-2 group">
            <label class="block text-sm font-bold text-white transition-colors group-focus-within:text-yellow-500">
              Nombre <span class="text-red-400">*</span>
            </label>
            <input v-model="formulario.nombre" type="text" placeholder="Ej: JUAN"
              class="w-full border-2 rounded-xl p-3.5 neutro-secondary text-white focus:border-yellow-500 focus:ring-0 focus:outline-none transition-all text-base font-medium placeholder-gray-500"
              :class="errores.nombre ? 'border-red-400' : 'border-gray-700'" />
            <p v-if="errores.nombre" class="text-red-400 text-xs font-semibold">{{ errores.nombre }}</p>
          </div>

          <!-- Apellido -->
          <div class="space-y-2 group">
            <label class="block text-sm font-bold text-white transition-colors group-focus-within:text-yellow-500">
              Apellido <span class="text-red-400">*</span>
            </label>
            <input v-model="formulario.apellido" type="text" placeholder="Ej: PÉREZ"
              class="w-full border-2 rounded-xl p-3.5 neutro-secondary text-white focus:border-yellow-500 focus:ring-0 focus:outline-none transition-all text-base font-medium placeholder-gray-500"
              :class="errores.apellido ? 'border-red-400' : 'border-gray-700'" />
            <p v-if="errores.apellido" class="text-red-400 text-xs font-semibold">{{ errores.apellido }}</p>
          </div>

          <!-- RUT -->
          <div class="space-y-2 group">
            <label class="block text-sm font-bold text-white transition-colors group-focus-within:text-yellow-500">
              RUT
            </label>
            <input v-model="formulario.rut" @input="onRutInput" type="text" placeholder="Ej: 12.345.678-9" maxlength="12"
              class="w-full border-2 rounded-xl p-3.5 neutro-secondary text-white focus:border-yellow-500 focus:ring-0 focus:outline-none transition-all text-base font-medium placeholder-gray-500"
              :class="errores.rut ? 'border-red-400' : 'border-gray-700'" />
            <p v-if="errores.rut" class="text-red-400 text-xs font-semibold">{{ errores.rut }}</p>
          </div>

          <!-- Correo Electrónico -->
          <div class="space-y-2 group">
            <label class="block text-sm font-bold text-white transition-colors group-focus-within:text-yellow-500">
              Correo electrónico
            </label>
            <input v-model="formulario.email" type="text" placeholder="Ej: cliente@correo.com"
              class="w-full border-2 rounded-xl p-3.5 neutro-secondary text-white focus:border-yellow-500 focus:ring-0 focus:outline-none transition-all text-base font-medium placeholder-gray-500"
              :class="errores.email ? 'border-red-400' : 'border-gray-700'" />
            <p v-if="errores.email" class="text-red-400 text-xs font-semibold">{{ errores.email }}</p>
          </div>

          <!-- Teléfono -->
          <div class="space-y-2 group md:col-span-2">
            <label class="block text-sm font-bold text-white transition-colors group-focus-within:text-yellow-500">
              Teléfono
            </label>
            <div class="flex gap-3">
              <div class="relative w-1/4 min-w-[90px]">
                <select v-model="formulario.codigo_pais"
                  class="w-full border-2 border-gray-700 rounded-xl p-3.5 neutro-secondary text-white focus:border-yellow-500 focus:ring-0 focus:outline-none transition-all cursor-pointer appearance-none text-base font-medium">
                  <option value="56">+56 (CL)</option>
                  <option value="54">+54 (AR)</option>
                  <option value="1">+1 (US)</option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-white">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
              <input :value="formulario.telefono" @input="filtrarTelefono" type="text" inputmode="numeric" placeholder="Ej: 912345678"
                class="w-full border-2 rounded-xl p-3.5 neutro-secondary text-white focus:border-yellow-500 focus:ring-0 focus:outline-none transition-all text-base font-medium placeholder-gray-500"
                :class="errores.telefono ? 'border-red-400' : 'border-gray-700'" />
            </div>
            <p v-if="errores.telefono" class="text-red-400 text-xs font-semibold">{{ errores.telefono }}</p>
          </div>

          <!-- Dirección -->
          <div class="space-y-2 group md:col-span-2">
            <label class="block text-sm font-bold text-white transition-colors group-focus-within:text-yellow-500">
              Dirección
            </label>
            <input v-model="formulario.direccion" type="text" placeholder="Ej: Av. Las Condes 1234, Santiago"
              class="w-full border-2 border-gray-700 rounded-xl p-3.5 neutro-secondary text-white focus:border-yellow-500 focus:ring-0 focus:outline-none transition-all text-base font-medium placeholder-gray-500" />
          </div>

          <!-- Botón de Envío (Bloqueable) -->
          <div class="md:col-span-2 mt-6">
            <button type="submit" :disabled="cargando"
              class="w-full neutro-primary text-white font-extrabold py-4 rounded-xl hover:opacity-90 hover:shadow-lg transform active:scale-95 transition-all duration-200 disabled:opacity-75 disabled:cursor-not-allowed disabled:transform-none flex justify-center items-center gap-3 text-lg cursor-pointer">
              <svg v-if="cargando" class="animate-spin h-6 w-6 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ cargando ? 'Guardando Cambios...' : 'Guardar Cambios' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de Resultado -->
    <div v-if="mostrarModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="neutro-secondary rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-700">
        <div class="p-6 text-center">
          <div class="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" :class="estadoModal.tipo === 'success' ? 'bg-green-950' : 'bg-red-955'">
            <svg v-if="estadoModal.tipo === 'success'" class="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <svg v-else class="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-white mb-2">
            {{ estadoModal.tipo === 'success' ? '¡Actualizado!' : 'Error' }}
          </h3>
          <p class="text-sm text-white leading-relaxed">{{ estadoModal.mensaje }}</p>
        </div>
        <div class="p-4 flex justify-center border-t border-gray-700">
          <button @click="cerrarModal" class="w-full py-3 rounded-xl font-bold transition-transform active:scale-95 neutro-primary text-white cursor-pointer">
            {{ estadoModal.tipo === 'success' ? 'Ver Cliente' : 'Cerrar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 40;
}
</style>
