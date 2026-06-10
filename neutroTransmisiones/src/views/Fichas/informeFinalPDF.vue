<script setup>
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useRoute } from 'vue-router';
import { useInterfaz } from '@/stores/interfaz';
import Navbar from '@/components/componentes/navbar.vue';
import html2pdf from 'html2pdf.js';
import Volver from '@/components/componentes/volver.vue';
const route = useRoute()
const router = useRouter()
const interfaz = useInterfaz()
const loading = ref(true);
const datosEmpresa = ref({})
const datosFicha = ref({})
const informeFinal = ref({})

const traerDatosEmpresa = async () => {
  const {data, error} = await supabase.from('neutro_t').select('*').eq('id', 1).single()
  if (data) {
    datosEmpresa.value = data
  }
  if (error) {
    console.error('Error al traer datos de la empresa:', error)
  }
}

const traerEmail = async () => {
  const {data, error} = await supabase.from('neutro_email').select('*').eq('prioritario',true).single()
  if (data) {
    datosEmpresa.value.email = data.email
  }
  if (error) {
    console.error('Error al traer datos de la empresa:', error)
  }
}

const traerTelefono = async () => {
  const {data,error} = await supabase.from('neutro_telefono').select('*').eq('prioritario',true).maybeSingle()
  if (data) {
    datosEmpresa.value.telefono = data.telefono || ''
  }
  if (error) {
    datosEmpresa.value.telefono = ''
  }
}


const traerCuenta = async () => {
  const {data,error} = await supabase.from('neutro_cuentas').select('*').eq('favorito',true).maybeSingle()
  if (data) {
    datosEmpresa.value.cuenta = data
  }
  if (error) {
    datosEmpresa.value.cuenta = null
  }
}

const traerFicha = async () => {
  const {data, error} = await supabase.from('ficha_de_trabajo').select('*,orden_trabajo(*,vehiculo(*),ot_bitacora(*,ot_fotos(*)),ot_fotos_ingreso(*))').eq('id', route.params.id).single()
  if (data) {
    datosFicha.value = data
  }
  if (error) {
    console.error('Error al traer datos de la ficha:', error)
  }
}

const traerCliente = async () => {
  const {data, error} = await supabase.from('cliente').select('*').eq('id', datosFicha.value?.id_cliente).single()
  if (data) {
    datosFicha.value.cliente = data
  }
  if (error) {
    console.error('Error al traer datos del cliente:', error)
  }
}

const traerInformeFinal = async () => {
  const {data, error} = await supabase.from('informe_final').select('*').eq('id_ficha', datosFicha.value?.id).single()
  if (data) {
    informeFinal.value = data
  }
  if (error) {
    console.error('Error al traer datos del informe final:', error)
  }
}


const formatoFecha = (fecha) => {
  if (!fecha) return '---';
  return new Date(fecha).toLocaleDateString('es-CL');
};

const formatoFechaYHora = (fecha) => {
  if (!fecha) return '---';
  return new Date(fecha).toLocaleString('es-CL');
};



const generarInformeFinal = async () => {
  if (!datosFicha.value) {
    console.error('Falta ficha para generar el informe final')
    return
  }
  const {data, error} = await supabase
    .from('informe_final')
    .insert({
      id_cliente: datosFicha.value.cliente.id,
      id_ficha: datosFicha.value.id,
      numero_folio: datosFicha.value.numero_folio
    })
    .select()
    .single()
  if (error) {
    console.error('Error al generar informe final:', error)
  }
  if (data) {
    informeFinal.value = data
  }
  const {error:errorInformeFinal} = await supabase.from('ficha_de_trabajo').update({informe_final:true}).eq('id',datosFicha.value.id)
  if (errorInformeFinal) {
    console.error('Error al generar informe final:', errorInformeFinal)
  }
}

const convertirImagenABase64 = async (url) => {
  try {
    const response = await fetch(url + '?t=' + new Date().getTime());
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return url;
  }
};

const procesarImagenesParaPDF = async () => {
  if (!datosFicha.value || !datosFicha.value.orden_trabajo) return;
  
  for (const ot of datosFicha.value.orden_trabajo) {
    // 1. Fotos de ingreso
    if (ot.ot_fotos_ingreso) {
      for (const item of ot.ot_fotos_ingreso) {
        if (item.url) item.url = await convertirImagenABase64(item.url);
      }
    }
    // 2. Fotos de bitácora
    if (ot.ot_bitacora) {
      for (const entry of ot.ot_bitacora) {
        if (entry.fotos) {
          for (const foto of entry.fotos) {
            if (foto.url) foto.url = await convertirImagenABase64(foto.url);
          }
        }
      }
    }
  }
};

const handleVerificarInformeFinal = async () => {
  const {data, error} = await supabase.from('informe_final').select('*').eq('id_ficha', route.params.id)
  if (error) {
    console.error('Error al verificar informe final:', error)
    return false
  }
  return data && data.length > 0
}



const generarPDF = () => {
  window.print()
}


const estados = ref([])

const obtenerEstados = async () => {
  const {data, error} = await supabase.from('tabla_estados_ficha').select('*')
  if (error) {
    console.error('Error al obtener estados:', error)
    estados.value = []
  }
  estados.value = data
}

const handleEstados = (estado) => {
  const estadoEncontrado = estados.value.find(e => e.id === estado)
  return estadoEncontrado ? {estado: estadoEncontrado.estado, color: estadoEncontrado.color} : {estado: 'Estado Desconocido', color: '#000000'}
}

const datosCargados = ref(false)

onMounted(async () => {
  interfaz.showLoadingOverlay()
  await traerDatosEmpresa()
  await traerEmail()
  await traerTelefono()
  await obtenerEstados()
  await traerCuenta()
  await traerFicha()
  await traerCliente()
  const existeInformeFinal = await handleVerificarInformeFinal()
  if (!existeInformeFinal) {
    await generarInformeFinal()
  }
  await traerInformeFinal()
  await procesarImagenesParaPDF()
  datosCargados.value = true
  interfaz.hideLoadingOverlay();
})
</script>
<template>
  <div class="min-h-screen pb-20 neutro-background font-sans print:absolute print:inset-0 print:z-[9999] print:bg-white">
    
    <div class="print:hidden">
      <Navbar :titulo="'Ficha N°' + (datosFicha?.numero_folio || '...')" subtitulo="Informe Final" class="navbar" />
      <div class="mt-4 flex w-[70%] mx-auto justify-between">
        <Volver />
        <button @click="generarPDF" class="ml-4 px-4 py-2 bg-[#234723] text-white rounded-lg transition-colors">
          Generar PDF
        </button>
      </div>
    </div>

    <div class="mx-auto mt-5 w-full px-2 lg:px-0 pb-4">
    <div 
      id="elemento-a-imprimir" 
      class="mx-auto overflow-hidden w-full max-w-[21cm] bg-white shadow-md print:w-full print:max-w-none print:m-0 print:border-none print:shadow-none"
    >
      <div class="px-4 py-2  mx-auto text-xs font-sans leading-normal">
        <div class="flex flex-col items-center justify-center min-h-[90vh] text-center">
          <!-- Logo y branding -->
          <div class="mb-8">
            <span class="w-32 h-32 rounded-full overflow-hidden mx-auto block">
              <img class="w-full h-full object-contain" src="@/img/Logo.jpg" alt="Logo">
            </span>
            <h1 class="text-4xl font-black tracking-tighter italic text-[#234723] mt-4">NeutroTransmisiones</h1>
            <p class="font-bold uppercase text-[13px] tracking-[0.3em] text-[#4b5563] mt-1">Servicios Mecánicos</p>
          </div>

          <!-- Título del documento -->
          <div class="mb-8">
            <div class="inline-block text-white px-8 py-3 rounded-lg">
              <h2 class="text-2xl font-bold tracking-wide uppercase text-[#234723]">Informe Final</h2>
            </div>
            <div class="mt-3">
              <p class="text-lg font-mono font-bold text-[#dc2626]">Folio N° {{ datosFicha?.numero_folio || '...' }}</p>
              <p class="text-sm text-[#6b7280] mt-1">{{ formatoFecha(informeFinal?.created_at) }}</p>
              <div :style="{backgroundColor: handleEstados(datosFicha?.estado).color}" class="mt-2 inline-block text-white px-3 py-1 rounded font-bold text-[11px] uppercase">
                {{ handleEstados(datosFicha?.estado).estado }}
              </div>
            </div>
          </div>

          <!-- Separador -->
          <div class="w-24 h-1 bg-[#234723] rounded mx-auto mb-8"></div>

          <!-- Info empresa y cliente lado a lado -->
          <div class="grid grid-cols-1 sm:grid-cols-2 [.is-exporting_&]:grid-cols-2 gap-6 sm:gap-10 [.is-exporting_&]:gap-10 text-left w-full max-w-lg mx-auto mb-8">
            <div>
              <h3 class="font-bold border-b-2 border-[#234723] mb-2 pb-1 text-[11px] uppercase text-[#234723]">De: NeutroTransmisiones</h3>
              <ul class="space-y-1 text-[#374151] text-xs">
                <li><span class="font-bold text-[#111827]">Dirección:</span> {{ datosEmpresa?.direccion || '...' }}</li>
                <li><span class="font-bold text-[#111827]">Ciudad:</span> {{ datosEmpresa?.ciudad || '...' }}</li>
                <li><span class="font-bold text-[#111827]">Teléfono:</span> {{ datosEmpresa?.telefono || 'Sin Teléfono' }}</li>
                <li><span class="font-bold text-[#111827]">Email:</span> {{ datosEmpresa?.email || '...' }}</li>
              </ul>
            </div>
            <div>
              <h3 class="font-bold border-b-2 border-[#234723] mb-2 pb-1 text-[11px] uppercase text-[#234723]">Para: Cliente</h3>
              <ul class="space-y-1 text-[#374151] text-xs">
                <li>
                  <span class="font-bold text-[#111827]">Cliente:</span>
                  {{ datosFicha?.cliente ? (datosFicha.cliente.nombre + ' ' + datosFicha.cliente.apellido) : 'Sin Nombre' }}
                </li>
                <li>
                  <span class="font-bold text-[#111827]">Teléfono:</span>
                  {{ datosFicha?.cliente ? ('+' + datosFicha.cliente.codigo_pais + ' ' + datosFicha.cliente.telefono) : 'Sin Teléfono' }}
                </li>
                <li>
                  <span class="font-bold text-[#111827]">Email:</span>
                  {{ datosFicha?.cliente?.email || 'Sin Email' }}
                </li>
              </ul>
            </div>
          </div>

          <!-- Motivo de ingreso -->
          <div class="w-full max-w-lg mx-auto text-left mb-6">
            <h3 class="font-bold border-b-2 border-[#234723] mb-2 pb-1 text-[11px] uppercase text-[#234723]">Motivo de Ingreso</h3>
            <p class="text-sm text-[#374151] leading-relaxed">{{ datosFicha?.motivo_ingreso || 'No especificado' }}</p>
            <p class="text-xs text-[#6b7280] mt-1">Fecha de Ingreso: {{ formatoFechaYHora(datosFicha?.fecha_ingreso) }}</p>
            <p class="text-xs text-[#6b7280] mt-1">Origen: {{ datosFicha?.origen_ingreso || 'No especificado' }}</p>
          </div>

          <!-- Vehículos -->
          <div class="w-full max-w-lg mx-auto text-left mb-8">
            <h3 class="font-bold border-b-2 border-[#234723] mb-2 pb-1 text-[11px] uppercase text-[#234723]">Vehículos</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 [.is-exporting_&]:grid-cols-2 gap-3">
              <div v-for="orden in datosFicha?.orden_trabajo" :key="orden.id" class="p-3 rounded-lg border border-[#e2e8f0] bg-[#f8fafc]">
                <p class="font-bold uppercase text-sm text-[#234723]">
                  {{ orden.vehiculo.marca }} {{ orden.vehiculo.modelo }} {{ orden.vehiculo.anio }}
                </p>
                <p class="text-xs mt-1 text-[#4b5563]">
                  Patente: <span class="font-bold px-1 rounded bg-[#fef9c3]">{{ orden.vehiculo.patente }}</span>
                </p>
                <p class="text-[10px] mt-1 text-[#6b7280]">KM: {{ orden.kilometraje_inicial || '---' }}</p>
                <p class="text-[10px] mt-0.5 text-[#6b7280]">Diagnóstico: {{ orden.diagnostico || '---' }}</p>
              </div>
            </div>
          </div>

          <!-- Firmas -->
          <div class="flex flex-col sm:flex-row [.is-exporting_&]:flex-row gap-8 sm:gap-16 [.is-exporting_&]:gap-16 justify-center items-center mt-4">
            <div class="text-center w-36">
              <div class="h-12 border-b-2 border-[#d1d5db] mb-1"></div>
              <p class="text-[9px] font-bold text-[#9ca3af] uppercase">Firma Taller</p>
            </div>
            <div class="text-center w-36">
              <div class="h-12 border-b-2 border-[#d1d5db] mb-1"></div>
              <p class="text-[9px] font-bold text-[#9ca3af] uppercase">Firma Cliente</p>
            </div>
          </div>

          <!-- Footer portada -->
          <div class="mt-8 text-center">
            <p class="text-[9px] uppercase tracking-widest font-bold text-[#9ca3af]">NeutroTransmisiones • Soluciones Automotrices de Confianza</p>
          </div>
        </div>
        <template v-for="ot in datosFicha?.orden_trabajo" :key="ot.id" >
          <div class="bg-white relative" style="page-break-before: always;">
            <div class="w-full h-2 bg-[#234723]"></div>
            
            <div class="p-5">
              <div class="flex justify-between items-end border-b border-[#e5e7eb] pb-2 mb-4">
                <div>
                   <h2 class="text-xl font-bold uppercase tracking-tight text-[#234723]">Informe Técnico Detallado</h2>
                   <p class="text-xs text-[#6b7280]">Anexo de inspección visual y bitácora de hallazgos</p>
                </div>
                <div class="text-right">
                   <p class="text-[10px] font-mono text-[#9ca3af]">OT-{{ ot.id }} / {{ ot.vehiculo.marca }} {{ ot.vehiculo.modelo }}</p>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-12 [.is-exporting_&]:grid-cols-12 gap-4 mb-6">
                <div class="col-span-1 sm:col-span-4 [.is-exporting_&]:col-span-4 rounded-lg p-3 border shadow-sm break-inside-avoid bg-[#f8fafc] border-[#f1f5f9]">
                   <h4 class="font-bold uppercase text-[10px] mb-2 border-b pb-1 text-[#234723] border-[#e2e8f0]">Inventario & Accesorios</h4>
                   <ul class="space-y-1 text-[11px]">
                     <li class="flex justify-between items-center">
                        <span class="text-[#475569]">Documentos</span>
                        <span :class="ot.trae_documentos ? 'text-[#16a34a] font-bold' : 'text-[#9ca3af]'">{{ ot.trae_documentos ? 'Sí' : 'No' }}</span>
                      </li>
                      <li class="flex justify-between items-center">
                        <span class="text-[#475569]">Llaves</span>
                        <span :class="ot.trae_llaves ? 'text-[#16a34a] font-bold' : 'text-[#9ca3af]'">{{ ot.trae_llaves ? 'Sí' : 'No' }}</span>
                      </li>
                      <li class="flex justify-between items-center">
                        <span class="text-[#475569]">Candado Seg.</span>
                        <span :class="ot.trae_candado_seguridad ? 'text-[#16a34a] font-bold' : 'text-[#9ca3af]'">{{ ot.trae_candado_seguridad ? 'Sí' : 'No' }}</span>
                      </li>
                      <li class="flex justify-between items-center">
                        <span class="text-[#475569]">Panel Radio</span>
                        <span :class="ot.trae_panel_radio ? 'text-[#16a34a] font-bold' : 'text-[#9ca3af]'">{{ ot.trae_panel_radio ? 'Sí' : 'No' }}</span>
                      </li>
                      <li class="flex justify-between items-center">
                        <span class="text-[#475569]">Rueda Rep.</span>
                        <span :class="ot.trae_rueda_repuesto ? 'text-[#16a34a] font-bold' : 'text-[#9ca3af]'">{{ ot.trae_rueda_repuesto ? 'Sí' : 'No' }}</span>
                      </li>
                      <li class="flex justify-between items-center">
                        <span class="text-[#475569]">Encendedor</span>
                        <span :class="ot.trae_encendedor ? 'text-[#16a34a] font-bold' : 'text-[#9ca3af]'">{{ ot.trae_encendedor ? 'Sí' : 'No' }}</span>
                      </li>
                   </ul>
                </div>
                
                <div class="col-span-1 sm:col-span-8 [.is-exporting_&]:col-span-8 break-inside-avoid">
                  <div class="grid grid-cols-1 sm:grid-cols-2 [.is-exporting_&]:grid-cols-2 gap-4 mb-3">
                     <div class="border rounded shadow-sm text-center p-2 bg-[#f8fafc] border-[#f1f5f9]">
                        <span class="block text-[9px] font-bold uppercase tracking-widest text-[#94a3b8]">Kilometraje</span>
                        <span class="block text-lg font-bold mt-0.5 text-[#234723]">{{ ot.kilometraje_inicial || '0' }} km</span>
                     </div>
                     <div class="border rounded shadow-sm text-center p-2 bg-[#f8fafc] border-[#f1f5f9]">
                        <span class="block text-[9px] font-bold uppercase tracking-widest text-[#94a3b8]">Combustible</span>
                        <div class="w-full rounded-full h-2 mt-1.5 mb-1 bg-[#e5e7eb]">
                          <div class="h-2 rounded-full bg-[#22c55e]" :style="{ width: (ot.combustible_inicial || 0) + '%' }"></div>
                        </div>
                        <span class="block text-[11px] font-bold text-[#234723]">{{ ot.combustible_inicial || '0' }}%</span>
                     </div>
                  </div>

                  <div v-if="ot.ot_fotos_ingreso && ot.ot_fotos_ingreso.length > 0">
                     <h4 class="font-bold uppercase text-[10px] mb-1 text-[#234723]">Registro Fotográfico de Ingreso</h4>
                     <div class="flex gap-2 overflow-hidden h-24 p-1 rounded border bg-[#f1f5f9] border-[#e2e8f0]">
                        <div v-for="(item, index) in ot.ot_fotos_ingreso.slice(0, 3)" :key="index" class="relative w-1/3 h-full">
                           <img :src="item.url" class="absolute inset-0 w-full h-full object-cover rounded-sm border border-[#cbd5e1]">
                        </div>
                     </div>
                  </div>
                  <div v-else class="h-24 rounded border border-dashed flex items-center justify-center bg-[#f8fafc] border-[#cbd5e1]">
                     <span class="text-xs text-[#94a3b8]">Sin registro fotográfico de ingreso</span>
                  </div>
                </div>
              </div>

              <div class="mt-4">
                 <h3 class="flex items-center gap-3 text-sm font-bold uppercase border-b-2 pb-1 mb-3 break-inside-avoid text-[#234723] border-[#234723]">
                    Bitácora de hallazgos
                 </h3>

                 <div v-if="ot.ot_bitacora && ot.ot_bitacora.length > 0">
                    <div v-for="(item, index) in ot.ot_bitacora.filter(e => e.observacion)" :key="index" class="flex gap-3 mb-4 break-inside-avoid">
                       <div class="flex flex-col items-center">
                          <div class="w-2 h-2 rounded-full mt-2 bg-[#234723]"></div>
                          <div class="w-px flex-grow my-1 bg-[#e2e8f0]" v-if="index !== ot.ot_bitacora.length - 1"></div>
                       </div>
                       <div class="flex-1 border border-l-4 p-3 rounded shadow-sm bg-white border-[#f3f4f6] border-l-[#234723]">
                          <div class="flex justify-between items-start mb-2">
                             <p class="text-[11px] font-bold uppercase text-[#1f2937]">Hallazgo {{ index + 1 }}</p>
                             <span class="text-[9px] px-2 py-0.5 rounded font-mono text-[#9ca3af] bg-[#f9fafb]">{{ formatoFecha(item.created_at) }}</span>
                          </div>
                          <p class="text-[11px] leading-snug mb-3 text-[#4b5563]">{{ item.observacion }}</p>
                          
                          <div v-if="item.ot_fotos && item.ot_fotos.length > 0" class="flex gap-2 mt-1 pt-2 border-t border-dashed border-[#f3f4f6]">
                             <img v-for="(foto, fIdx) in item.ot_fotos" :key="fIdx" :src="foto.url" class="w-20 h-20 object-cover rounded border shadow-sm border-[#e5e7eb]">
                          </div>
                       </div>
                    </div>
                 </div>
                 
                 <div v-else class="text-center py-2 rounded border border-dashed break-inside-avoid bg-[#f8fafc] border-[#f1f5f9]">
                    <p class="text-xs italic text-[#94a3b8]">No se registraron hallazgos adicionales para este vehículo.</p>
                 </div>
              </div>

              <div class="mt-6 pt-4 text-center border-t break-inside-avoid border-[#f3f4f6]">
                <p class="text-[9px] uppercase tracking-widest font-bold text-[#9ca3af]">
                  NeutroTransmisiones • Soluciones Automotrices de Confianza
                </p>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
    </div>
  </div>
</template>

<style scoped>
.html2pdf__page-break {
  page-break-before: always;
  break-before: always;
  height: 0;
  display: block;
}

#elemento-a-imprimir {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
</style>