<script setup>
import { ref, computed, onMounted } from 'vue'
import navbar from '../../components/componentes/navbar.vue'
import { useInterfaz } from '../../stores/interfaz.js'
import { supabase } from '../../lib/supabaseClient.js'
import TallerConfig from './taller.vue'
import volver from '@/components/componentes/volver.vue'
const interfaz = useInterfaz()
const tabActiva = ref('empresa')
const tabs = [
  { id: 'empresa', label: 'Empresa', icon: 'building' },
  { id: 'taller', label: 'Taller', icon: 'box' },
  { id: 'servicios', label: 'Servicios', icon: 'cog' },
  { id: 'cuentas', label: 'Cuentas Bancarias', icon: 'bank' },
]

// ── Empresa ──
const empresa = ref({
  nombre_fantasia: '',
  razon_social: '',
  rut: '',
  giro: '',
  direccion: '',
  ciudad: '',
  region: '',
  web: '',
  telefonos: [
    { valor: '', prioritario: false },
  ],
  emails: [
    { valor: '', prioritario: false },
  ],
  
})
const editandoEmpresa = ref(false)
const empresaBackup = ref(null)

const iniciarEdicionEmpresa = () => {
  empresaBackup.value = JSON.parse(JSON.stringify(empresa.value))
  editandoEmpresa.value = true
}
const cancelarEdicionEmpresa = () => {
  empresa.value = JSON.parse(JSON.stringify(empresaBackup.value))
  editandoEmpresa.value = false
}

const setPrioritarioEmail = (index) => {
  empresa.value.emails.forEach((e, i) => e.prioritario = i === index)
}

const talleres = ref([])

const servicios = ref([])
const mostrarModalServicio = ref(false)
const servicioEditando = ref(null)
const nuevoServicio = ref({ nombre: '', precio: 0, activo: true })
const guardandoServicio = ref(false)
const guardandoCuenta = ref(false)

const obtenerServicios = async () => {
  const { data, error } = await supabase
    .from('servicios')
    .select('*')
    .order('nombre', { ascending: true })
  if (error) {
    console.error('Error al obtener los servicios:', error)
    return
  }
  if (data && data.length > 0) {
    servicios.value = data.map(s => ({
      id: s.id,
      nombre: s.nombre,
      precio: s.precio,
      activo: s.activo
    }))
  }
}

const abrirModalServicio = (servicio = null) => {
  if (servicio) {
    servicioEditando.value = servicio.id
    nuevoServicio.value = { ...servicio }
  } else {
    servicioEditando.value = null
    nuevoServicio.value = { nombre: '', precio: 0, activo: true }
  }
  mostrarModalServicio.value = true
}

const cerrarModalServicio = () => {
  mostrarModalServicio.value = false
  servicioEditando.value = null
}

const guardarServicio = async () => {
  if (guardandoServicio.value) return
  guardandoServicio.value = true
  try {
    let errorResponse;
    if (servicioEditando.value) {
      const { id, ...payload } = nuevoServicio.value;
      const { error } = await supabase
        .from('servicios')
        .update(payload)
        .eq('id', servicioEditando.value);
      errorResponse = error;
    } else {
      const { error } = await supabase
        .from('servicios')
        .insert(nuevoServicio.value);
      errorResponse = error;
    }

    if (errorResponse) {
      console.error('Error al guardar el servicio:', errorResponse)
      return
    }
    await obtenerServicios()
    cerrarModalServicio()
  } finally {
    guardandoServicio.value = false
  }
}

const eliminarServicio = (id) => {
  abrirConfirmacion('¿Estás seguro de que deseas eliminar este servicio?', async () => {
    const { error } = await supabase
      .from('servicios')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('Error al eliminar el servicio:', error)
      return
    }
    servicios.value = servicios.value.filter(s => s.id !== id)
  })
}

// ── Cuentas Bancarias ──
const cuentas = ref([])
const mostrarModalCuenta = ref(false)
const cuentaEditando = ref(null)
const nuevaCuenta = ref({ banco: '', tipo_cuenta: 'Cuenta Corriente', numero_cuenta: '', titular: '', rut_titular: '' })
const bancos = [
  { "codigo": "875", "nombre": "Mercado Pago" },
  { "codigo": "001", "nombre": "Banco de Chile" },
  { "codigo": "009", "nombre": "Banco Internacional" },
  { "codigo": "012", "nombre": "Banco Estado" },
  { "codigo": "016", "nombre": "Banco de Crédito e Inversiones (BCI)" },
  { "codigo": "028", "nombre": "Banco BICE" },
  { "codigo": "031", "nombre": "Banco Santander Chile" },
  { "codigo": "037", "nombre": "Scotiabank Chile" },
  { "codigo": "039", "nombre": "Banco Itaú Chile" },
  { "codigo": "049", "nombre": "Banco Security" },
  { "codigo": "051", "nombre": "Banco Falabella" },
  { "codigo": "053", "nombre": "Banco Ripley" },
  { "codigo": "055", "nombre": "Banco Consorcio" }
]

const obtenerCuentas = async () => {
  const { data, error } = await supabase
    .from('neutro_cuentas')
    .select('*')
    .order('banco', { ascending: true })
  if (error) {
    console.error('Error al obtener cuentas bancarias:', error)
    return
  }
  if (data) {
    cuentas.value = data
    // Garantizar que siempre haya una cuenta favorita
    const hayFavorito = cuentas.value.some(c => c.favorito)
    if (!hayFavorito && cuentas.value.length > 0) {
      await setFavoritoCuenta(cuentas.value[0].id)
    }
  }
}

const abrirModalCuenta = (cuenta = null) => {
  if (cuenta) {
    cuentaEditando.value = cuenta.id
    nuevaCuenta.value = { ...cuenta }
  } else {
    cuentaEditando.value = null
    nuevaCuenta.value = { banco: '', tipo_cuenta: 'Cuenta Corriente', numero_cuenta: '', titular: '', rut_titular: '' }
  }
  mostrarModalCuenta.value = true
}
const cerrarModalCuenta = () => {
  mostrarModalCuenta.value = false
  cuentaEditando.value = null
}
const guardarCuenta = async () => {
  if (guardandoCuenta.value) return
  guardandoCuenta.value = true
  try {
    const payload = {
      banco: nuevaCuenta.value.banco,
      tipo_cuenta: nuevaCuenta.value.tipo_cuenta,
      numero_cuenta: nuevaCuenta.value.numero_cuenta,
      titular: nuevaCuenta.value.titular,
      rut_titular: nuevaCuenta.value.rut_titular,
    }
    let errorResponse, responseData;

    if (cuentaEditando.value) {
      const { error, data } = await supabase
        .from('neutro_cuentas')
        .update(payload)
        .eq('id', cuentaEditando.value)
        .select()
        .single()
      errorResponse = error;
      responseData = data;
    } else {
      const { error, data } = await supabase
        .from('neutro_cuentas')
        .insert(payload)
        .select()
        .single()
      errorResponse = error;
      responseData = data;
    }

    if (errorResponse) {
      console.error('Error al guardar cuenta bancaria:', errorResponse)
      return
    }
    await obtenerCuentas()
    if (cuentas.value.length === 1 && responseData) {
      await setFavoritoCuenta(responseData.id)
    }
    cerrarModalCuenta()
  } finally {
    guardandoCuenta.value = false
  }
}

const setFavoritoCuenta = async (id) => {
  // Quitar favorito de todas
  const { error: errorReset } = await supabase
    .from('neutro_cuentas')
    .update({ favorito: false })
    .neq('id', 0)
  if (errorReset) {
    console.error('Error al resetear favoritos:', errorReset)
    return
  }
  // Marcar la seleccionada
  const { error } = await supabase
    .from('neutro_cuentas')
    .update({ favorito: true })
    .eq('id', id)
  if (error) {
    console.error('Error al marcar cuenta como favorita:', error)
    return
  }
  // Actualizar estado local
  cuentas.value.forEach(c => c.favorito = c.id === id)
}

const eliminarCuenta = (id) => {
  abrirConfirmacion('¿Estás seguro de que deseas eliminar esta cuenta bancaria?', async () => {
    const eraFavorita = cuentas.value.find(c => c.id === id)?.favorito
    const { error } = await supabase
      .from('neutro_cuentas')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('Error al eliminar cuenta bancaria:', error)
      return
    }
    cuentas.value = cuentas.value.filter(c => c.id !== id)
    if (eraFavorita && cuentas.value.length > 0) {
      await setFavoritoCuenta(cuentas.value[0].id)
    }
  })
}

// ── Computed: validación formulario cuenta ──
const cuentaFormValido = computed(() => {
  return (
    nuevaCuenta.value.banco.trim() !== '' &&
    nuevaCuenta.value.numero_cuenta.trim() !== '' &&
    nuevaCuenta.value.titular.trim() !== '' &&
    nuevaCuenta.value.rut_titular.trim() !== ''
  )
})

// ── Modal de confirmación ──
const mostrarConfirmacion = ref(false)
const confirmacionMensaje = ref('')
let confirmacionCallback = null

const abrirConfirmacion = (mensaje, callback) => {
  confirmacionMensaje.value = mensaje
  confirmacionCallback = callback
  mostrarConfirmacion.value = true
}
const cerrarConfirmacion = () => {
  mostrarConfirmacion.value = false
  confirmacionCallback = null
}
const ejecutarConfirmacion = async () => {
  if (confirmacionCallback) await confirmacionCallback()
  cerrarConfirmacion()
}

const formatoMoneda = (valor) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0
  }).format(valor)
}

const obtenerDatosEmpresa = async () => {
  // Datos principales
  const { data, error } = await supabase
    .from('neutro_t')
    .select('*')
    .maybeSingle()
  if (error) {
    console.error('Error al obtener los datos de la empresa:', error)
    return
  }
  if (data) {
    empresa.value.nombre_fantasia = data.nombre_fantasia || ''
    empresa.value.razon_social = data.razon_social || ''
    empresa.value.rut = data.rut || ''
    empresa.value.giro = data.giro || ''
    empresa.value.direccion = data.direccion || ''
    empresa.value.ciudad = data.ciudad || ''
    empresa.value.region = data.region || ''
    empresa.value.web = data.web || ''
  }
  else {
    const { error: insertError } = await supabase
      .from('neutro_t')
      .insert({ nombre_fantasia: '', razon_social: '', rut: '', giro: '', direccion: '', ciudad: '', region: '', web: '' })
    if (insertError) {
      console.error('Error al crear registro inicial de empresa:', insertError)
    }
  }
  const { data: emails } = await supabase
    .from('neutro_email')
    .select('*')
  if (emails && emails.length > 0) {
    empresa.value.emails = emails.map(e => ({
      id: e.id,
      valor: e.email,
      prioritario: e.prioritario || false
    }))
    const prioIndex = empresa.value.emails.findIndex(e => e.prioritario)
    empresa.value.emails.forEach((e, i) => e.prioritario = i === (prioIndex >= 0 ? prioIndex : 0))
  }
  const { data: tels } = await supabase
    .from('neutro_telefono')
    .select('*')
  if (tels && tels.length > 0) {
    empresa.value.telefonos = tels.map(t => ({
      id: t.id,
      valor: extraerNumeroSinPrefijo(t.telefono || ''),
      prioritario: t.prioritario || false
    }))
    const prioIndex = empresa.value.telefonos.findIndex(t => t.prioritario)
    empresa.value.telefonos.forEach((t, i) => t.prioritario = i === (prioIndex >= 0 ? prioIndex : 0))
  }
}

const guardarEmpresa = async () => {
  editandoEmpresa.value = false
  const { data, error } = await supabase
    .from('neutro_t')
    .update({
        rut: empresa.value.rut,
        nombre_fantasia: empresa.value.nombre_fantasia,
        razon_social: empresa.value.razon_social,
        giro: empresa.value.giro,
        direccion: empresa.value.direccion,
        ciudad: empresa.value.ciudad,
        region: empresa.value.region,
        web: empresa.value.web
    })
    .eq('id', 1)
  if (error) {
    console.error('Error al guardar la empresa:', error)
  } else {
    await guardarEmails()
    await guardarTelefonos()
  }
}

const guardarEmails = async () => {
  // Borrar los existentes
  await supabase.from('neutro_email').delete().neq('id', 0)
  // Insertar los que tengan valor
  const emailsValidos = empresa.value.emails.filter(e => e.valor.trim() !== '')
  if (emailsValidos.length === 0) return
  const prioIndex = emailsValidos.findIndex(e => e.prioritario)
  emailsValidos.forEach((e, i) => e.prioritario = i === (prioIndex >= 0 ? prioIndex : 0))
  const filas = emailsValidos.map(e => ({
    email: e.valor,
    prioritario: e.prioritario
  }))
  const { error } = await supabase.from('neutro_email').insert(filas)
  if (error) console.error('Error al guardar los emails:', error)
}

const guardarTelefonos = async () => {
  // Borrar los existentes
  await supabase.from('neutro_telefono').delete().neq('id', 0)
  // Insertar los que tengan valor
  const telsValidos = empresa.value.telefonos.filter(t => t.valor.trim() !== '')
  if (telsValidos.length === 0) return
  const prioIndex = telsValidos.findIndex(t => t.prioritario)
  telsValidos.forEach((t, i) => t.prioritario = i === (prioIndex >= 0 ? prioIndex : 0))
  const filas = telsValidos.map(t => ({
    telefono: t.valor.replace(/\D/g, '').slice(-8),
    prioritario: t.prioritario
  }))
  const { error } = await supabase.from('neutro_telefono').insert(filas)
  if (error) console.error('Error al guardar los telefonos:', error)
}

const agregarTelefono = () => {
  empresa.value.telefonos.push({ valor: '', prioritario: false })
}

// Extrae los últimos 8 dígitos del teléfono (sin el prefijo +569)
const extraerNumeroSinPrefijo = (telefono) => {
  const soloDigitos = telefono.replace(/\D/g, '')
  // Si tiene 11 dígitos (569XXXXXXXX), tomar los últimos 8
  if (soloDigitos.length >= 9) return soloDigitos.slice(-8)
  return soloDigitos
}
const eliminarTelefono = async (index) => {
  const tel = empresa.value.telefonos[index]
  const era_prioritario = tel.prioritario
  // Si tiene id de BD, eliminar de Supabase
  if (tel.id) {
    const { error } = await supabase.from('neutro_telefono').delete().eq('id', tel.id)
    if (error) console.error('Error al eliminar el teléfono:', error)
  }
  empresa.value.telefonos.splice(index, 1)
  if (era_prioritario && empresa.value.telefonos.length > 0) {
    empresa.value.telefonos[0].prioritario = true
  }
}

const setPrioritarioTelefono = (index) => {
  empresa.value.telefonos.forEach((t, i) => t.prioritario = i === index)
}

// ── Emails ──
const agregarEmail = () => {
  empresa.value.emails.push({ valor: '', prioritario: false })
}
const eliminarEmail = async (index) => {
  const em = empresa.value.emails[index]
  const era_prioritario = em.prioritario
  // Si tiene id de BD, eliminar de Supabase
  if (em.id) {
    const { error } = await supabase.from('neutro_email').delete().eq('id', em.id)
    if (error) console.error('Error al eliminar el email:', error)
  }
  empresa.value.emails.splice(index, 1)
  if (era_prioritario && empresa.value.emails.length > 0) {
    empresa.value.emails[0].prioritario = true
  }
}
onMounted(async () => {
  interfaz.showLoading()
  await obtenerDatosEmpresa()
  await obtenerServicios()
  await obtenerCuentas()
  interfaz.hideLoading()
})
</script>

<template>
  <div class="neutro-background">
    <navbar class="navbar" titulo="NeutroTransmisiones" subtitulo="Gestión del Sistema" />

    <div class="neutro-background min-h-screen pb-30">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 pt-4">

      <!-- Header -->
      <div class="mb-6 hidden sm:block">
        <volver />
        <h1 class="text-2xl font-bold neutro-font">Gestión NeutroTransmisiones</h1>
        <p class="text-sm neutro-font mt-1">Administra la configuración general de los datos de la App.</p>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="tabActiva = tab.id"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer"
          :class="tabActiva === tab.id
            ? 'neutro-primary text-white shadow-md'
            : 'neutro-secondary text-white border border-gray-500 hover:opacity-80'"
        >
          <!-- Building icon -->
          <svg v-if="tab.icon === 'building'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <!-- Cog icon -->
          <svg v-if="tab.icon === 'cog'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <!-- Bank icon -->
          <svg v-if="tab.icon === 'bank'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4" />
          </svg>
          <!-- Box icon -->
          <svg v-if="tab.icon === 'box'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          {{ tab.label }}
        </button>
      </div>

      <!-- ═══════════════════ TAB: EMPRESA ═══════════════════ -->
      <div v-if="tabActiva === 'empresa'">
        <div class="neutro-primary text-white rounded-xl shadow-sm border border-gray-700 overflow-hidden">
          <!-- Header de la tarjeta -->
          <div class="bg-black/20 p-5 flex justify-between items-center">
            <div class="flex items-center gap-3">
              <div class="p-2.5 neutro-secondary/10 rounded-full text-white">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h2 class="text-lg font-bold text-white">Datos de la Empresa</h2>
                <p class="text-white text-sm">Información general y contacto</p>
              </div>
            </div>
            <button
              v-if="!editandoEmpresa"
              @click="iniciarEdicionEmpresa"
              class="px-4 py-2 neutro-secondary text-white rounded-lg text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity"
            >
              Editar
            </button>
          </div>
          <div class="p-6 space-y-8">
            <!-- 1. Identidad Legal y Comercial -->
            <div>
              <h3 class="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-gray-700 pb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Identidad Legal y Comercial
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label class="block">
                  <span class="text-xs text-white uppercase font-bold tracking-wide">RUT Empresa</span>
                  <input v-if="editandoEmpresa" v-model="empresa.rut" type="text" class="mt-1 block w-full rounded-lg border border-gray-600 px-3 py-2.5 text-sm bg-black/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="RUT Empresa" />
                  <p v-else class="mt-1 text-white font-medium text-sm bg-black/20 rounded-lg px-3 py-2.5 border border-gray-700">{{ empresa.rut || '—' }}</p>
                </label>
                <label class="block">
                  <span class="text-xs text-white uppercase font-bold tracking-wide">Razón Social</span>
                  <input v-if="editandoEmpresa" v-model="empresa.razon_social" type="text" class="mt-1 block w-full rounded-lg border border-gray-600 px-3 py-2.5 text-sm bg-black/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="Razón Social" />
                  <p v-else class="mt-1 text-white font-medium text-sm bg-black/20 rounded-lg px-3 py-2.5 border border-gray-700">{{ empresa.razon_social || '—' }}</p>
                </label>
                <label class="block">
                  <span class="text-xs text-white uppercase font-bold tracking-wide">Giro</span>
                  <input v-if="editandoEmpresa" v-model="empresa.giro" type="text" class="mt-1 block w-full rounded-lg border border-gray-600 px-3 py-2.5 text-sm bg-black/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="Giro" />
                  <p v-else class="mt-1 text-white font-medium text-sm bg-black/20 rounded-lg px-3 py-2.5 border border-gray-700">{{ empresa.giro || '—' }}</p>
                </label>
                <label class="block">
                  <span class="text-xs text-white uppercase font-bold tracking-wide">Nombre de Fantasía</span>
                  <input v-if="editandoEmpresa" v-model="empresa.nombre_fantasia" type="text" class="mt-1 block w-full rounded-lg border border-gray-600 px-3 py-2.5 text-sm bg-black/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="Nombre de Fantasía" />
                  <p v-else class="mt-1 text-white font-medium text-sm bg-black/20 rounded-lg px-3 py-2.5 border border-gray-700">{{ empresa.nombre_fantasia || '—' }}</p>
                </label>
              </div>
            </div>

            <!-- 2. Ubicación -->
            <div>
              <h3 class="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-gray-700 pb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Ubicación
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label class="block md:col-span-2">
                  <span class="text-xs text-white uppercase font-bold tracking-wide">Dirección</span>
                  <input v-if="editandoEmpresa" v-model="empresa.direccion" type="text" class="mt-1 block w-full rounded-lg border border-gray-600 px-3 py-2.5 text-sm bg-black/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="Dirección" />
                  <p v-else class="mt-1 text-white font-medium text-sm bg-black/20 rounded-lg px-3 py-2.5 border border-gray-700">{{ empresa.direccion || '—' }}</p>
                </label>
                <label class="block">
                  <span class="text-xs text-white uppercase font-bold tracking-wide">Ciudad</span>
                  <input v-if="editandoEmpresa" v-model="empresa.ciudad" type="text" class="mt-1 block w-full rounded-lg border border-gray-600 px-3 py-2.5 text-sm bg-black/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="Ciudad" />
                  <p v-else class="mt-1 text-white font-medium text-sm bg-black/20 rounded-lg px-3 py-2.5 border border-gray-700">{{ empresa.ciudad || '—' }}</p>
                </label>
                <label class="block">
                  <span class="text-xs text-white uppercase font-bold tracking-wide">Región</span>
                  <input v-if="editandoEmpresa" v-model="empresa.region" type="text" class="mt-1 block w-full rounded-lg border border-gray-600 px-3 py-2.5 text-sm bg-black/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="Región" />
                  <p v-else class="mt-1 bg-black/20 text-white font-medium text-sm rounded-lg px-3 py-2.5 border border-gray-700">{{ empresa.region || '—' }}</p>
                </label>
              </div>
            </div>

            <!-- 3. Contacto y Presencia Digital -->
            <div>
              <h3 class="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-gray-700 pb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                Contacto y Presencia Digital
              </h3>
              <div class="mb-5">
                <label class="block">
                  <span class="text-xs text-white uppercase font-bold tracking-wide">Sitio Web</span>
                  <input v-if="editandoEmpresa" v-model="empresa.web" type="url" class="mt-1 block w-full rounded-lg border border-gray-600 px-3 py-2.5 text-sm bg-black/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="https://www.ejemplo.cl" />
                  <p v-else class="mt-1 text-blue-400 font-medium text-sm bg-black/20 rounded-lg px-3 py-2.5 border border-gray-700">{{ empresa.web || '—' }}</p>
                </label>
              </div>

              <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <!-- Teléfonos -->
                <div class="neutro-primary p-5 rounded-xl border border-gray-700">
                  <div class="flex justify-between items-center mb-4">
                    <span class="text-xs text-white uppercase font-bold tracking-wide flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg> Teléfonos</span>
                    <button v-if="editandoEmpresa" @click="agregarTelefono" class="text-xs text-blue-400 font-bold hover:underline cursor-pointer flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
                      Agregar
                    </button>
                  </div>
                  <div class="space-y-3">
                    <div v-for="(tel, index) in empresa.telefonos" :key="'tel-'+index" class="flex items-center gap-2">
                      <button
                        @click="editandoEmpresa && setPrioritarioTelefono(index)"
                        class="flex-shrink-0 p-1 rounded-full transition"
                        :class="editandoEmpresa ? 'cursor-pointer hover:bg-gray-800' : 'cursor-default'"
                        :title="tel.prioritario ? 'Prioritario' : 'Marcar como prioritario'"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" :class="tel.prioritario ? 'text-yellow-500' : 'text-gray-500'" :fill="tel.prioritario ? 'currentColor' : 'none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                      <div class="flex-1">
                        <div v-if="editandoEmpresa" class="flex items-center rounded-lg border border-gray-600 bg-black/20 overflow-hidden">
                          <span class="px-3 py-2 text-sm text-gray-400 font-semibold select-none border-r border-gray-600 bg-gray-900/50">+569 </span>
                          <input
                            v-model="tel.valor"
                            type="tel"
                            maxlength="8"
                            class="block w-full px-3 py-2 text-sm text-white focus:outline-none transition bg-transparent"
                            placeholder="12345678"
                            @input="tel.valor = tel.valor.replace(/\D/g, '').slice(0, 8)"
                          />
                        </div>
                        <p v-else class="text-white font-medium text-sm bg-black/20 border border-gray-700 rounded-lg px-3 py-2">
                          {{ tel.valor ? '+569 ' + tel.valor : '—' }}
                        </p>
                      </div>
                      <span v-if="!editandoEmpresa && tel.prioritario" class="text-[10px] font-bold text-yellow-500 uppercase px-2 py-0.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 whitespace-nowrap">Principal</span>
                      <button v-if="editandoEmpresa && empresa.telefonos.length > 1" @click="eliminarTelefono(index)" class="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button> 
                    </div>
                  </div>
                </div>

                <!-- Emails -->
                <div class="neutro-primary p-5 rounded-xl border border-gray-700">
                  <div class="flex justify-between items-center mb-4">
                    <span class="text-xs text-white uppercase font-bold tracking-wide flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg> Emails</span>
                    <button v-if="editandoEmpresa" @click="agregarEmail" class="text-xs text-blue-400 font-bold hover:underline cursor-pointer flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
                      Agregar
                    </button>
                  </div>
                  <div class="space-y-3">
                    <div v-for="(em, index) in empresa.emails" :key="'em-'+index" class="flex items-center gap-2">
                      <button
                        @click="editandoEmpresa && setPrioritarioEmail(index)"
                        class="flex-shrink-0 p-1 rounded-full transition"
                        :class="editandoEmpresa ? 'cursor-pointer hover:bg-gray-800' : 'cursor-default'"
                        :title="em.prioritario ? 'Prioritario' : 'Marcar como prioritario'"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" :class="em.prioritario ? 'text-yellow-500' : 'text-gray-500'" :fill="em.prioritario ? 'currentColor' : 'none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                      <div class="flex-1">
                        <input
                          v-if="editandoEmpresa"
                          v-model="em.valor"
                          type="email"
                          class="block w-full rounded-lg border border-gray-600 bg-black/20 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                          placeholder="contacto@NeutroTransmisiones.cl"
                        />
                        <p v-else class="text-white font-medium text-sm bg-black/20 border border-gray-700 rounded-lg px-3 py-2">
                          {{ em.valor || '—' }}
                        </p>
                      </div>
                      <span v-if="!editandoEmpresa && em.prioritario" class="text-[10px] font-bold text-yellow-500 uppercase px-2 py-0.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 whitespace-nowrap">Principal</span>
                      <button v-if="editandoEmpresa && empresa.emails.length > 1" @click="eliminarEmail(index)" class="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Botones de acción -->
            <div v-if="editandoEmpresa" class="flex justify-end gap-3 mt-6 pt-5 border-t border-gray-100">
              <button @click="cancelarEdicionEmpresa" class="px-5 py-2.5 neutro-secondary text-white rounded-lg text-sm font-semibold hover:opacity-80 transition cursor-pointer">
                Cancelar
              </button>
              <button @click="guardarEmpresa" class="px-5 py-2.5 neutro-secondary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition cursor-pointer">
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════════ TAB: TALLER ═══════════════════ -->
      <div v-if="tabActiva === 'taller'">
        <TallerConfig />
      </div>

      <!-- ═══════════════════ TAB: SERVICIOS ═══════════════════ -->
      <div v-if="tabActiva === 'servicios'">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h2 class="text-lg font-bold neutro-font neutro-font">Catálogo de Servicios</h2>
            <p class="text-sm neutro-font neutro-font">Define los servicios que ofrece tu taller</p>
          </div>
          <button @click="abrirModalServicio()" class="px-4 py-2.5 neutro-secondary text-white rounded-lg text-sm font-semibold cursor-pointer hover:opacity-90 transition flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Agregar
          </button>
        </div>

        <!-- Empty state -->
        <div v-if="servicios.length === 0" class="neutro-secondary rounded-xl p-10 text-center border border-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-white/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p class="text-white/60 font-semibold">No hay servicios registrados</p>
          <p class="text-white/40 text-sm mt-1">Agrega el primer servicio para comenzar.</p>
        </div>

        <template v-else>
          <!-- Mobile: Cards -->
          <div class="md:hidden space-y-3">
            <div
              v-for="servicio in servicios"
              :key="'card-srv-' + servicio.id"
              class="neutro-secondary rounded-xl shadow-sm p-4 space-y-3 border border-gray-700"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="p-2 bg-blue-100 text-blue-600 rounded-full shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span class="text-sm font-semibold text-white truncate">{{ servicio.nombre }}</span>
                </div>
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
                  :class="servicio.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                >
                  <span class="w-1.5 h-1.5 mr-1 rounded-full" :class="servicio.activo ? 'bg-green-400' : 'bg-red-400'"></span>
                  {{ servicio.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </div>
              <div class="border-t border-gray-700 pt-2 flex items-center justify-between">
                <span class="text-sm font-bold text-white">{{ formatoMoneda(servicio.precio) }}</span>
                <div class="flex gap-1">
                  <button @click="abrirModalServicio(servicio)" class="p-2 text-white hover:text-blue-400 rounded-lg transition cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button @click="eliminarServicio(servicio.id)" class="p-2 text-white hover:text-red-400 rounded-lg transition cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Desktop: Table -->
          <div class="hidden md:block neutro-primary text-white rounded-xl shadow-sm border border-gray-700 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-800">
                <thead class="neutro-primary text-white">
                  <tr>
                    <th class="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">Servicio</th>
                    <th class="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">Precio</th>
                    <th class="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">Estado</th>
                    <th class="px-6 py-3 text-right text-sm font-medium uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody class="neutro-secondary divide-y divide-gray-800">
                  <tr v-for="servicio in servicios" :key="servicio.id" class="hover:opacity-80 transition-colors">
                    <td class="px-6 py-4 max-w-[200px]">
                      <div class="flex items-center gap-3">
                        <div class="p-2 bg-blue-100 text-blue-600 rounded-full shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <span class="text-sm font-medium text-white truncate">{{ servicio.nombre }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                      {{ formatoMoneda(servicio.precio) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        :class="servicio.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                      >
                        <span class="w-1.5 h-1.5 mr-1.5 rounded-full" :class="servicio.activo ? 'bg-green-400' : 'bg-red-400'"></span>
                        {{ servicio.activo ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right">
                      <div class="flex justify-end gap-1">
                        <button @click="abrirModalServicio(servicio)" class="p-2 text-white hover:text-blue-900 hover:bg-blue-400 rounded-lg transition cursor-pointer">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button @click="eliminarServicio(servicio.id)" class="p-2 text-white hover:text-red-600 hover:bg-red-500 rounded-lg transition cursor-pointer">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>

      <!-- ═══════════════════ TAB: CUENTAS BANCARIAS ═══════════════════ -->
      <div v-if="tabActiva === 'cuentas'">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h2 class="text-lg font-bold neutro-font neutro-font">Cuentas Bancarias</h2>
            <p class="text-sm neutro-font">Administra las cuentas de la empresa</p>
          </div>
          <button @click="abrirModalCuenta()" class="px-4 py-2.5 neutro-secondary text-white rounded-lg text-sm font-semibold cursor-pointer hover:opacity-90 transition flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Agregar
          </button>
        </div>

        <!-- Empty state -->
        <div v-if="cuentas.length === 0" class="neutro-secondary rounded-xl p-10 text-center border border-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-white/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4" />
          </svg>
          <p class="text-white/60 font-semibold">No hay cuentas bancarias registradas</p>
          <p class="text-white/40 text-sm mt-1">Agrega la primera cuenta bancaria de la empresa.</p>
        </div>

        <template v-else>
          <!-- Mobile: Cards -->
          <div class="md:hidden space-y-3">
            <div
              v-for="cuenta in cuentas"
              :key="'card-cta-' + cuenta.id"
              class="neutro-secondary rounded-xl shadow-sm p-4 space-y-3 border border-gray-700"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="p-2 bg-green-100 text-green-600 rounded-full shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4" />
                    </svg>
                  </div>
                  <div class="min-w-0">
                    <div class="text-sm font-semibold text-white truncate">{{ cuenta.banco }}</div>
                    <div class="text-xs text-white/70">{{ cuenta.tipo_cuenta }}</div>
                  </div>
                </div>
                <button
                  @click="setFavoritoCuenta(cuenta.id)"
                  class="cursor-pointer transition-all duration-200 text-xl shrink-0"
                  :class="cuenta.favorito ? 'text-yellow-400 scale-110' : 'text-gray-500 hover:text-yellow-300'"
                >
                  {{ cuenta.favorito ? '★' : '☆' }}
                </button>
              </div>

              <div class="border-t border-gray-700 pt-2 space-y-1">
                <div class="flex justify-between text-xs">
                  <span class="text-white/50">N° Cuenta</span>
                  <span class="text-white font-mono">{{ cuenta.numero_cuenta }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-white/50">Titular</span>
                  <span class="text-white truncate ml-4 text-right">{{ cuenta.titular }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-white/50">RUT</span>
                  <span class="text-white">{{ cuenta.rut_titular }}</span>
                </div>
              </div>

              <div class="flex justify-end gap-1 pt-1 border-t border-gray-700">
                <button @click="abrirModalCuenta(cuenta)" class="p-2 text-white hover:text-blue-400 rounded-lg transition cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button @click="eliminarCuenta(cuenta.id)" class="p-2 text-white hover:text-red-400 rounded-lg transition cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Desktop: Table -->
          <div class="hidden md:block neutro-primary text-white rounded-xl shadow-sm border border-gray-700 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-800 text-sm">
                <thead class="neutro-primary text-white">
                  <tr>
                    <th class="px-6 py-3 text-center text-sm font-medium uppercase tracking-wider w-12">★</th>
                    <th class="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">Banco</th>
                    <th class="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">Tipo</th>
                    <th class="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">N° Cuenta</th>
                    <th class="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">Titular</th>
                    <th class="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">RUT</th>
                    <th class="px-6 py-3 text-right text-sm font-medium uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody class="neutro-secondary divide-y divide-gray-800">
                  <tr v-for="cuenta in cuentas" :key="cuenta.id" class="hover:opacity-80 transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        @click="setFavoritoCuenta(cuenta.id)"
                        class="cursor-pointer transition-all duration-200 text-xl"
                        :class="cuenta.favorito ? 'text-yellow-400 scale-110' : 'text-gray-500 hover:text-yellow-300'"
                        :title="cuenta.favorito ? 'Cuenta principal' : 'Marcar como principal'"
                      >
                        {{ cuenta.favorito ? '★' : '☆' }}
                      </button>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center gap-3">
                        <div class="p-2 bg-green-100 text-green-600 rounded-full shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4" />
                          </svg>
                        </div>
                        <span class="font-medium text-white">{{ cuenta.banco }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-white">{{ cuenta.tipo_cuenta }}</td>
                    <td class="px-6 py-4 whitespace-nowrap font-mono text-white">{{ cuenta.numero_cuenta }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-white max-w-[150px] truncate">{{ cuenta.titular }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-white">{{ cuenta.rut_titular }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right">
                      <div class="flex justify-end gap-1">
                        <button @click="abrirModalCuenta(cuenta)" class="p-2 text-white hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button @click="eliminarCuenta(cuenta.id)" class="p-2 text-white hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>

    </div>
  </div>

  <!-- ═══════════════════ MODAL SERVICIO ═══════════════════ -->
  <Teleport to="body">
    <div v-if="mostrarModalServicio" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="cerrarModalServicio"></div>
      <div class="relative neutro-primary text-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div class="neutro-primary p-5">
          <h3 class="text-lg font-bold text-white">{{ servicioEditando ? 'Editar Servicio' : 'Nuevo Servicio' }}</h3>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="text-xs text-white uppercase font-bold">Nombre del Servicio</label>
            <input v-model="nuevoServicio.nombre" type="text" class="mt-1 block w-full neutro-primary text-white rounded-lg border border-gray-100 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Ej: Cambio de Aceite" />
          </div>
          <div>
            <label class="text-xs text-white uppercase font-bold">Precio (CLP)</label>
            <input v-model.number="nuevoServicio.precio" type="number" min="0" class="mt-1 block w-full neutro-primary text-white rounded-lg border border-gray-100 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div class="flex items-center gap-2">
            <input v-model="nuevoServicio.activo" type="checkbox" id="servicioActivo" class="rounded" />
            <label for="servicioActivo" class="text-sm text-white font-medium">Servicio activo</label>
          </div>
        </div>
        <div class="px-6 pb-6 flex justify-end gap-3">
          <button @click="cerrarModalServicio" :disabled="guardandoServicio" class="px-4 py-2.5 neutro-secondary text-white rounded-lg text-sm font-semibold hover:opacity-80 transition cursor-pointer">Cancelar</button>
          <button @click="guardarServicio" :disabled="guardandoServicio" class="px-4 py-2.5 neutro-secondary text-white rounded-lg text-sm font-semibold transition flex items-center gap-2" :class="guardandoServicio ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'">
            <svg v-if="guardandoServicio" class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            {{ guardandoServicio ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ═══════════════════ MODAL CUENTA BANCARIA ═══════════════════ -->
  <Teleport to="body">
    <div v-if="mostrarModalCuenta" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="cerrarModalCuenta"></div>
      <div class="relative neutro-primary text-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div class="neutro-primary p-5">
          <h3 class="text-lg font-bold text-white">{{ cuentaEditando ? 'Editar Cuenta' : 'Nueva Cuenta Bancaria' }}</h3>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="text-xs text-white uppercase font-bold">Banco</label>
            <select v-model="nuevaCuenta.banco" class="mt-1 block w-full rounded-lg neutro-primary text-white border border-gray-100 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option v-for="banco in bancos" :key="banco.codigo" :value="banco.nombre">{{ banco.nombre }}</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-white uppercase font-bold">Tipo de Cuenta</label>
            <select v-model="nuevaCuenta.tipo_cuenta" class="mt-1 block w-full rounded-lg neutro-primary text-white border border-gray-100 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="Cuenta Corriente">Cuenta Corriente</option>
              <option value="Cuenta Vista">Cuenta Vista</option>
              <option value="Cuenta de Ahorro">Cuenta de Ahorro</option>
              <option value="Cuenta RUT">Cuenta RUT</option>
              <option value="Personal">Personal</option>
              <option value="Vendedor/Empresa">Vendedor/Empresa</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-white uppercase font-bold">Número de Cuenta</label>
            <input v-model="nuevaCuenta.numero_cuenta" type="text" class="mt-1 block w-full rounded-lg neutro-primary text-white border border-gray-100 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Ej: 12345678" />
          </div>
          <div>
            <label class="text-xs text-white uppercase font-bold">Titular</label>
            <input v-model="nuevaCuenta.titular" type="text" class="mt-1 block w-full rounded-lg neutro-primary text-white border border-gray-100 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Nombre del titular" />
          </div>
          <div>
            <label class="text-xs text-white uppercase font-bold">RUT Titular</label>
            <input v-model="nuevaCuenta.rut_titular" type="text" class="mt-1 block w-full rounded-lg neutro-primary text-white border border-gray-100 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="12.345.678-9" />
          </div>
        </div>
        <div class="px-6 pb-6 flex justify-end gap-3">
          <button @click="cerrarModalCuenta" :disabled="guardandoCuenta" class="px-4 py-2.5 neutro-secondary text-white rounded-lg text-sm font-semibold hover:opacity-80 transition cursor-pointer">Cancelar</button>
          <button @click="guardarCuenta" :disabled="!cuentaFormValido || guardandoCuenta" class="px-4 py-2.5 neutro-secondary text-white rounded-lg text-sm font-semibold transition flex items-center gap-2" :class="(cuentaFormValido && !guardandoCuenta) ? 'hover:opacity-90 cursor-pointer' : 'opacity-40 cursor-not-allowed'">
            <svg v-if="guardandoCuenta" class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            {{ guardandoCuenta ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ═══════════════════ MODAL CONFIRMACIÓN ═══════════════════ -->
  <Teleport to="body">
    <div v-if="mostrarConfirmacion" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="cerrarConfirmacion"></div>
      <div class="relative neutro-secondary rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
        <div class="p-6 text-center">
          <div class="mx-auto w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-white mb-2">Confirmar eliminación</h3>
          <p class="text-sm text-white/80 leading-relaxed">{{ confirmacionMensaje }}</p>
        </div>
        <div class="p-4 flex gap-3 border-t border-gray-700">
          <button @click="cerrarConfirmacion" class="flex-1 py-2.5 rounded-xl font-semibold text-sm neutro-primary text-white hover:opacity-80 transition cursor-pointer">Cancelar</button>
          <button @click="ejecutarConfirmacion" class="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-red-600 text-white hover:bg-red-700 transition cursor-pointer">Eliminar</button>
        </div>
      </div>
    </div>
  </Teleport>
  </div>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 40;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>