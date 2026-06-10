<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import { useRoute } from 'vue-router';
import { useInterfaz } from '@/stores/interfaz';
import Navbar from '@/components/componentes/navbar.vue';
import html2pdf from 'html2pdf.js';
import Volver from '@/components/componentes/volver.vue';
import { subirFacturas } from '@/js/subirFacturas.js';
const route = useRoute()
const interfaz = useInterfaz()

const formatoPesos = (valor) => {
  if (valor === undefined || valor === null) return '$0';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(valor);
};

const formatoFechaYHora = (fecha) => {
  if (!fecha) return '---';
  return new Date(fecha).toLocaleString('es-CL');
};

const formatoFecha = (fecha) => {
  if (!fecha) return '---';
  return new Date(fecha).toLocaleDateString('es-CL');
};

const TotalItem = (item) => {
  return formatoPesos(Number(item.monto) * Number(item.cantidad))
};

const datosEmpresa = ref({})
const datosFicha = ref({})
const cotizaciones = ref({})
const presupuesto = ref({})

const traerDatosEmpresa = async () => {
  const {data, error} = await supabase.from('neutro_t').select('*').eq('id', 1).maybeSingle()
  if (data) {
    datosEmpresa.value = data
  }
  if (error) {
    console.error('Error al traer datos de la empresa:', error)
  }
}

const traerEmail = async () => {
  const {data, error} = await supabase.from('neutro_email').select('*').eq('prioritario',true).maybeSingle()
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
  const {data, error} = await supabase.from('ficha_de_trabajo').select('*,orden_trabajo(*,vehiculo(*))').eq('id', route.params.id).single()
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

const traerCotizaciones = async () => {
  const {data, error} = await supabase.from('cotizaciones_ficha').select('*,detalle_cotizaciones_ficha(*)').eq('ficha_id', datosFicha.value?.id).eq('estado', 2)
  if (data) {
    cotizaciones.value = data
  }
  if (error) {
    console.error('Error al traer datos de las cotizaciones:', error)
  }
}

const traerPresupuesto = async () => {
  const {data, error} = await supabase.from('presupuesto_ficha').select('*').eq('id_ficha', datosFicha.value?.id).maybeSingle()
  if (data) {
    presupuesto.value = data
  }
  if (error) {
    console.error('Error al traer datos del presupuesto:', error)
  }
}

const subtotalAgregado = ref(0)
const totalNetoAgregado = ref(0)
const ivaAgregado = ref(0)
const totalFinalAgregado = ref(0)
const totalFinalFinal = ref(0)

const cargarTotales = async() => {
  await nextTick()
  subtotalAgregado.value = cotizaciones.value.reduce((sum, c) => sum + (c.subtotal || 0), 0)
  totalNetoAgregado.value = cotizaciones.value.reduce((sum, c) => sum + (c.total_neto || 0), 0)
  ivaAgregado.value = cotizaciones.value.reduce((sum, c) => sum + (c.iva || 0), 0)
  totalFinalAgregado.value = cotizaciones.value.reduce((sum, c) => sum + (c.total_final || 0), 0)
  totalFinalFinal.value = totalFinalAgregado.value
}

const generarPresupuesto = async () => {
  if (!datosFicha.value || !cotizaciones.value || cotizaciones.value.length === 0) {
    return
  }
  const {data, error} = await supabase
    .from('presupuesto_ficha')
    .insert({
      total_final: totalFinalFinal.value,
      id_ficha: datosFicha.value.id,
      id_cuenta: datosEmpresa.value.cuenta?.id,
      total_final: totalFinalFinal.value
      })  
    .select()
    .single()
  if (error) {
    return
  }
  presupuesto.value = data
  await nextTick()
  await supabase
    .from('ficha_de_trabajo')
    .update({presupuesto:true})
    .eq('id', datosFicha.value.id)
  const folio = datosFicha.value?.numero_folio || datosFicha.value?.id || 'sin-folio';
  const opciones = {
    margin:       0,
    filename:     `Presupuesto_Folio_${folio}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  const original = document.getElementById('elemento-a-imprimir');
  
  const clon = original.cloneNode(true);
  clon.id = 'elemento-exportacion';
  clon.classList.add('is-exporting');
  clon.style.width = '210mm';
  clon.style.minWidth = '210mm';
  clon.style.position = 'absolute';
  clon.style.left = '-9999px';
  clon.style.top = '0';
  document.body.appendChild(clon);

  const pdfBlob = await html2pdf().set(opciones).from(clon).output('blob');
  document.body.removeChild(clon);

  const { exito, url, error:errorFactura } = await subirFacturas(data.id, pdfBlob)
  if (!exito) {
    console.error('Error al subir la factura:', errorFactura)
    return
  }
  if (datosFicha.value.cliente?.email && url) {
    try {
      await supabase.functions.invoke('enviar-presupuesto', {
        body: {
          emailCliente: datosFicha.value.cliente.email,
          nombreCliente: datosFicha.value.cliente.nombre,
          apellidoCliente: datosFicha.value.cliente.apellido,
          urlPdf: url,
          folio: folio
        }
      })
    } catch (err) {
    }
  }
}

const generarPDF = () => {
  window.print()
}

const handleVerificarPresupuesto = async () => {
  const {data, error} = await supabase.from('presupuesto_ficha').select('*').eq('id_ficha', route.params.id)
  if (error) {
    console.error('Error al verificar presupuesto:', error)
    return false
  }
  return data && data.length > 0
}

const datosCargados = ref(false)

onMounted(async () => {
  interfaz.showLoading()
  await traerDatosEmpresa()
  await traerEmail()
  await traerTelefono()
  await traerCuenta()
  await traerFicha()
  await traerCliente()
  await traerCotizaciones()
  await cargarTotales()
  const existe = await handleVerificarPresupuesto()
  if (!existe) {
    await generarPresupuesto()
  }
  await traerPresupuesto()
  datosCargados.value = true
  interfaz.hideLoading()
})
</script>

<template>
  <div class="neutro-background min-h-screen font-sans">
    <div class="print:hidden mb-10">
    <Navbar :titulo="'Ficha N°' + (datosFicha?.id || '...')" subtitulo="Presupuesto" class="navbar"/>
    <div class="mt-4 flex w-[70%] mx-auto justify-between">
      <Volver />
      <button @click="generarPDF" class="ml-4 px-4 py-2 bg-[#234723] text-white rounded-lg hover:bg-[#234723]/80 transition-colors">
        Generar PDF
      </button>
    </div>
    </div>
  <div v-show="datosCargados" class="mx-auto w-full px-2 sm:px-0">
  <div 
    id="elemento-a-imprimir" 
    class="bg-[#ffffff] text-[#000000] w-full max-w-[21cm] p-4 sm:p-2 mx-auto text-xs font-sans leading-normal shadow-md print:shadow-none print:w-full print:max-w-none"
    style="background-color: #ffffff;"
  >
    <!-- Header -->
    <div class="flex flex-col sm:flex-row [.is-exporting_&]:flex-row justify-between border-b-4 border-[#234723] pb-4 mb-2 gap-4">
      
      <div class="flex flex-col sm:flex-row [.is-exporting_&]:flex-row items-center sm:items-start [.is-exporting_&]:items-start gap-2 text-center sm:text-left [.is-exporting_&]:text-left">
        <span class="w-24 h-24 rounded-full flex justify-center items-center overflow-hidden">
            <img class="w-[85%] h-[85%] object-fill" src="../../img/Logo.jpg" alt="Logo">
        </span>
        <div>
            <h1 class="text-2xl font-black text-[#234723] tracking-tighter italic">NeutroTransmisiones</h1>
            <p class="text-[#4b5563] font-bold uppercase text-[11px] tracking-widest mt-1">Servicios Mecánicos</p>
        </div>
      </div>

      <div class="text-center sm:text-right [.is-exporting_&]:text-right">
        <h2 class="text-lg font-bold text-[#234723]">Presupuesto</h2>
        <p class="text-md font-mono text-[#dc2626] font-bold">
           Folio N° {{ presupuesto?.numero_folio || '---' }}
        </p>
        <p class="text-[#6b7280] mt-1 text-[11px]">
            Fecha: {{ formatoFecha(presupuesto?.created_at) }}
        </p>
      </div>
    </div>
    <div v-if="cotizaciones.length === 0" class="p-10 text-center border-2 border-dashed border-red-300 rounded-xl my-10">
      <p class="text-red-500 font-bold">No hay cotizaciones aprobadas para previsualizar.</p>
      <p class="text-gray-500 text-xs mt-2">Asegúrate de que al menos una cotización esté aprobada para ver el presupuesto.</p>
    </div>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 [.is-exporting_&]:grid-cols-2 gap-6 sm:gap-10 [.is-exporting_&]:gap-10 mb-8">
      <div>
        <h3 class="font-bold text-[#234723] border-b border-[#cbd5e1] mb-2 pb-1 text-[11px] uppercase">De: NeutroTransmisiones</h3>
        <ul class="text-[#374151] space-y-1">
          <li><span class="font-bold text-[#111827]">Dirección:</span> {{ datosEmpresa?.direccion || '...' }}</li>
          <li><span class="font-bold text-[#111827]">Ciudad:</span> {{ datosEmpresa?.ciudad || '...' }}</li>
          <li><span class="font-bold text-[#111827]">Teléfono:</span> {{ datosEmpresa?.telefono || 'Sin Teléfono' }}</li>
          <li><span class="font-bold text-[#111827]">Email:</span> {{ datosEmpresa?.email || '...' }}</li>
        </ul>
      </div>

      <div>
        <h3 class="font-bold text-[#234723] border-b border-[#cbd5e1] mb-2 pb-1 text-[11px] uppercase">Para: Cliente</h3>
        <ul class="text-[#374151] space-y-1">
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
    <h3 v-if="cotizaciones.length > 0" class="font-bold text-[#234723] border-b border-[#cbd5e1] mb-2 pb-1 text-[11px] uppercase">Resumen</h3>
    <div v-if="cotizaciones.length > 0" class="mb-4 flex flex-col sm:flex-row [.is-exporting_&]:flex-row justify-between gap-4">
      <ul class="text-[#374151] flex-col w-full sm:w-[53%] [.is-exporting_&]:w-[53%] space-y-2">
        <li>
          <span class="font-bold text-left align-left text-[#111827] text-start block">Motivo Ingreso:</span> 
          <p>{{ datosFicha?.motivo_ingreso || '---' }}</p>
        </li>
        <li>
          <span class="font-bold text-left align-left text-[#111827] text-start block">Fecha Ingreso:</span> 
          <p>{{ formatoFechaYHora(datosFicha?.fecha_ingreso) }}</p>
        </li>
      </ul>
      <ul class="text-[#374151] flex-col w-full h-full align-top">
        <li>
          <span class="font-bold text-left align-left text-[#111827] text-start block">Lista de vehiculos:</span> 
          <p class="mt-1 uppercase" v-for="orden in datosFicha?.orden_trabajo" :key="orden.id">
            - {{ orden.vehiculo.marca }} {{ orden.vehiculo.modelo }} 
            <span class="p-1 mt-1 font-bold text-[#234723] rounded-lg"> {{ orden.vehiculo.patente }} </span>
          </p>
        </li>
      </ul>
    </div>

    <!-- Tabla de items: una sección por cotización -->
    <div v-if="cotizaciones.length > 0" class="mb-8 border border-[#e5e7eb] rounded-lg w-full overflow-x-auto">
      <table class="w-full text-left border-collapse min-w-[500px] [.is-exporting_&]:min-w-0">
        <thead>
          <tr class="bg-[#234723] text-[#ffffff] text-[10px] uppercase tracking-wider">
            <th class="p-3 font-semibold">Descripción del Servicio / Repuesto</th>
            <th class="p-3 text-right w-28">Precio Unitario</th>
            <th class="p-3 text-right w-28">Cantidad</th>
            <th class="p-3 text-right w-28">Total</th>
          </tr>
        </thead>
        <tbody class="text-[#1f2937] text-[11px]">
          <template v-for="(cot, i) in cotizaciones" :key="cot.id">
            <!-- Separador con título si hay más de una cotización -->
            <tr v-if="i >= 0" class="bg-[#f1f5f9]">
              <td colspan="4" class="p-2 font-bold text-[#234723] text-[10px] uppercase tracking-wider">
                Cotización N°{{ cot.id }}
                <span v-if="cot.comentario" class="font-normal text-[#6b7280] ml-2">— {{ cot.comentario }}</span>
              </td>
            </tr>
            <tr 
              v-for="(item, index) in cot.detalle_cotizaciones_ficha || []" 
              :key="cot.id + '-' + index"
              class="bg-[#ffffff] shadow-lg border-b border-[#234723]"
            >
              <td class="p-3 font-medium text-[#234723]">{{ item.descripcion }}</td>
              <td class="p-3 text-right font-bold">{{ formatoPesos(item.monto) }}</td>
              <td class="p-3 text-right font-bold">{{ item.cantidad }}</td>
              <td class="p-3 text-right font-bold">{{ TotalItem(item) }}</td>
            </tr>
          </template>
          <tr v-if="cotizaciones.reduce((sum, c) => sum + (c.detalle_cotizaciones_datosFicha?.length || 0), 0) < 5" class="h-24">
            <td colspan="4"></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="cotizaciones.length > 0" class="flex flex-col sm:flex-row [.is-exporting_&]:flex-row justify-between items-start gap-8">
      
      <div v-if="cuentaSeleccionada" class="w-full sm:w-3/5 [.is-exporting_&]:w-3/5 bg-[#f8fafc] p-4 rounded-lg border border-[#e2e8f0]">
        <h4 class="font-bold text-[#234723] uppercase text-[10px] mb-2 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-[#234723]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          Datos de Transferencia
        </h4>
        <div class="text-[10px] text-[#475569] grid grid-cols-2 gap-x-4 gap-y-1">
          <p><span class="font-bold">Banco:</span> {{ cuentaSeleccionada.banco }}</p>
          <p><span class="font-bold">Tipo:</span> {{ cuentaSeleccionada.tipo_cuenta }}</p>
          <p><span class="font-bold">RUT:</span> {{ cuentaSeleccionada.rut_titular }}</p>
          <p><span class="font-bold">Titular:</span> {{ cuentaSeleccionada.titular }}</p>
          <p><span class="font-bold">N° Cuenta:</span> {{ cuentaSeleccionada.numero_cuenta }}</p>
        </div>
      </div>

      <div :class="cuentaSeleccionada ? 'w-full sm:w-2/5 [.is-exporting_&]:w-2/5' : 'w-full sm:w-2/5 [.is-exporting_&]:w-2/5 sm:ml-auto [.is-exporting_&]:ml-auto'">
        <div class="flex justify-between items-center py-2 border-b border-[#e5e7eb] text-[#374151]">
          <span class="font-medium">Subtotal</span>
          <span>{{ formatoPesos(subtotalAgregado) }}</span>
        </div>
        
        <div class="flex justify-between items-center py-2 border-b border-[#e5e7eb] text-[#374151]">
          <span class="font-medium">Total Neto</span>
          <span>{{ formatoPesos(totalNetoAgregado) }}</span>
        </div>
        <div class="flex justify-between items-center py-2 border-b border-[#e5e7eb] text-[#374151]">
          <span class="font-medium">IVA 19%</span>
          <span>{{ formatoPesos(ivaAgregado) }}</span>
        </div>
        <div v-for="cotizacion in cotizaciones" :key="cotizacion.id">
          <div v-if="cotizacion.descuento > 0" class="flex justify-between items-center py-2 border-b border-[#e5e7eb] text-[#374151]">
            <span class="font-medium">Descuento</span>
            <span>{{cotizacion.descuento}}%</span>
          </div>
        </div>
        <div class="flex justify-between items-center bg-[#234723] text-[#ffffff] p-3 rounded mt-2">
          <span class="font-bold text-md">TOTAL</span>
          <span class="font-bold text-md">{{ formatoPesos(totalFinalFinal) }}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-16 text-center border-t border-[#e5e7eb] pt-4">
      <p class="text-[#9ca3af] text-[9px] uppercase tracking-wide">
        Gracias por su preferencia - NeutroTransmisiones
      </p>
    </div>

  </div>
  </div>
  </div>
</template>

<style scoped>
/* REGLA DE ORO: Forzar impresión exacta de colores */
#elemento-a-imprimir {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  color-adjust: exact !important;
}
</style>


