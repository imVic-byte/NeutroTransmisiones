<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../../lib/supabaseClient.js'
import navbar from '../../components/componentes/navbar.vue'
import modal from '../../components/componentes/modal.vue'
import pdf from './cotizacionesPDF.vue'
import html2pdf from 'html2pdf.js'
import { useInterfaz } from '@/stores/interfaz.js'
import volveraFicha from '../../components/componentes/volveraFicha.vue'
import confirmaciones from '@/components/presupuesto/modalConfirmacion.vue'
import volver from '@/components/componentes/volver.vue'
import { formatearFecha, formatearDinero } from '@/js/formateadores.js'

const interfaz = useInterfaz()
const route = useRoute()
const router = useRouter()
const cotizacion = ref(null)
const n_cotizacion = ref(route.query.numero)
const modalState = ref({ visible: false, titulo: "", mensaje: "", exito: true })
const mostrarModalModificar = ref(false)
const confirmada = ref(false)
const isPendiente = computed(() => cotizacion.value.estado === 1 || cotizacion.value.estado === 4)
const cuentasBancarias = ref([])
const cuentaSeleccionada = ref(null)

const camelCase = (texto) => {
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}



const redirigir = () => {
    modalState.value.visible = false;
    if (modalState.value.exito) {
      router.push({ name: "ficha-de-trabajo", params: { id: route.params.id } });
    }
}

const generarPDF = () => {
  const elemento = document.getElementById('elemento-a-imprimir');
  const opciones = {
    margin:       0,
    filename:     `Cotizacion_${cotizacion.value.id}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  html2pdf().set(opciones).from(elemento).save();
}

const confirmarCotizacion = async () => {
  interfaz.showLoading();

  // Validar y descontar stock para insumos
  const insumos = cotizacion.value.detalle_cotizaciones_ficha?.filter(d => d.tipo === 'insumo') || [];
  
  if (insumos.length > 0) {
    const operacionesStock = [];
    
    // Validar primero si todos tienen stock
    for (const insumo of insumos) {
      const { data: invData, error: invError } = await supabase
        .from('inventario')
        .select('id, stock')
        .eq('nombre', insumo.descripcion)
        .single();
        
      if (invError || !invData) {
        interfaz.hideLoading();
        modalState.value = { visible: true, titulo: "Error de Inventario", mensaje: `No se encontró el insumo en el inventario: ${insumo.descripcion}`, exito: false };
        return;
      }
      
      const stockReal = Number(invData.stock) || 0;
      if (insumo.cantidad > stockReal) {
        interfaz.hideLoading();
        modalState.value = { visible: true, titulo: "Stock Insuficiente", mensaje: `Stock insuficiente para ${insumo.descripcion}. Solicitado: ${insumo.cantidad}, Disponible: ${stockReal}`, exito: false };
        return;
      }
      
      operacionesStock.push({
        id: invData.id,
        nuevoStock: stockReal - insumo.cantidad
      });
    }
    
    // Descontamos stock si todo está OK
    for (const op of operacionesStock) {
      await supabase
        .from('inventario')
        .update({ stock: op.nuevoStock })
        .eq('id', op.id);
    }
  }

  const {data,error} = await supabase.from('cotizaciones_ficha').update({estado:2, id_cuenta: cuentaSeleccionada.value.id}).eq('id',route.params.cotizacion_id).select().single()
  interfaz.hideLoading();

  if(data){
    modalState.value.visible = true;
    modalState.value.titulo = "Exito";
    modalState.value.mensaje = "Cotización confirmada";
    modalState.value.exito = true;
    confirmada.value = true;
  }else{
    modalState.value.visible = true;
    modalState.value.titulo = "Error";
    modalState.value.mensaje = error.message;
    modalState.value.exito = false;
  }
}

const descartarCotizacion = () => {
  mostrarModalModificar.value = true;
}

const confirmarDescartar = async (modificar) => {
  mostrarModalModificar.value = false;
  interfaz.showLoading();
  
  await revertirStock();

  const {data, error} = await supabase.from('cotizaciones_ficha').update({estado:3}).eq('id', route.params.cotizacion_id).select().single()
  
  interfaz.hideLoading();
  
  if (error) {
    modalState.value.visible = true;
    modalState.value.titulo = "Error";
    modalState.value.mensaje = error.message;
    modalState.value.exito = false;
    return;
  }
  
  if (modificar) {
    router.push({ name: 'crear-cotizacion-ficha-de-trabajo', params: { id: route.params.id }, query: { clonar_cotizacion: route.params.cotizacion_id } });
  } else {
    modalState.value.visible = true;
    modalState.value.titulo = "Exito";
    modalState.value.mensaje = "Cotización descartada";
    modalState.value.exito = true;
  }
}

const revertirStock = async () => {
  // Solo revertimos stock si la cotizacion estaba en estado 2 (Confirmada)
  if (cotizacion.value && cotizacion.value.estado === 2) {
    const insumosInventario = cotizacion.value.detalle_cotizaciones_ficha.filter(i => i.es_inventario);
    if (insumosInventario.length > 0) {
      for (const insumo of insumosInventario) {
        const { data: invData } = await supabase
          .from('inventario')
          .select('stock')
          .eq('id', insumo.producto_inventario)
          .single();
          
        if (invData) {
          await supabase
            .from('inventario')
            .update({ stock: invData.stock + insumo.cantidad })
            .eq('id', insumo.producto_inventario);
        }
      }
    }
  }
}

const ejecutarBorrador = async () => {
  interfaz.showLoading();
  await revertirStock();

  const {error} = await supabase.from('cotizaciones_ficha').update({estado:1}).eq('id',route.params.cotizacion_id).select().single()
  interfaz.hideLoading();
  if(error){
    modalState.value.visible = true;
    modalState.value.titulo = "Error";
    modalState.value.mensaje = error.message;
    modalState.value.exito = false;
  }else{
    modalState.value.visible = true;
    modalState.value.titulo = "Exito";
    modalState.value.mensaje = "Cotización revertida a borrador";
    modalState.value.exito = true;
  }
}

const cargarDatos = async () => {
    const { data, error } = await supabase
      .from('cotizaciones_ficha')
      .select('*,detalle_cotizaciones_ficha(*),ficha_de_trabajo(*,cliente(*))')
      .eq('id', route.params.cotizacion_id)
      .single()
    if (data) {
        cotizacion.value = data
        confirmada.value = Number(data.estado) === 2
    } else {
        console.log(error)
    }

    const { data: cuentas } = await supabase
      .from('neutro_cuentas')
      .select('*')
      
    if (cuentas && cuentas.length > 0) {
      cuentasBancarias.value = cuentas
      cuentaSeleccionada.value = cuentas.find(c => c.favorito) || cuentas[0]
    }
}

const servicios = computed(() => {
  return cotizacion.value?.detalle_cotizaciones_ficha?.filter(d => d.tipo === 'servicio') || [];
})

const insumos = computed(() => {
  return cotizacion.value?.detalle_cotizaciones_ficha?.filter(d => d.tipo === 'insumo') || [];
})

onMounted(async () => {
    interfaz.showLoading();
    await cargarDatos();
    interfaz.hideLoading();
})
</script>
<template>
<div v-if="cotizacion" class="neutro-background min-h-screen">
    <navbar :titulo="'Cotización #' + cotizacion.id" subtitulo="Detalle de cotización" class="navbar" />
    
    <div class="mx-auto p-4 max-w-5xl pb-28">
        <volver />
        
        <div class="flex flex-col lg:flex-row gap-6 mt-6">
            
            <!-- Columna izquierda -->
            <div class="lg:w-2/3 space-y-6">

                <!-- Info General -->
                <div class="neutro-secondary rounded-xl shadow-sm dark:border border-gray-700 overflow-hidden">
                    <div class="neutro-primary px-6 py-3 border-b border-gray-700 flex justify-between items-center">
                        <h2 class="text-white font-bold text-lg">Información General</h2>
                    </div>
                    
                    <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Cliente -->
                        <div>
                            <h3 class="text-xs font-semibold text-white uppercase tracking-wider mb-3">Datos del Cliente</h3>
                            <div class="space-y-2 text-sm text-white">
                                <p class="flex flex-col">
                                    <span class="text-white text-xs font-bold">Cliente</span>
                                    <span class="text-white">{{ camelCase(cotizacion.ficha_de_trabajo?.cliente?.nombre) + ' ' + camelCase(cotizacion.ficha_de_trabajo?.cliente?.apellido) || 'No registrado' }}</span>
                                </p>
                            </div>
                            <div class="space-y-2 text-sm text-white mt-2">
                              <p class="flex flex-col">
                                <span class="text-white text-xs font-bold">Teléfono</span>
                                <span class="text-white">+{{cotizacion.ficha_de_trabajo?.cliente?.codigo_pais + ' ' + cotizacion.ficha_de_trabajo?.cliente?.telefono || 'No registrado' }}</span>
                              </p>
                              <p class="flex flex-col">
                                <span class="text-white text-xs font-bold">Email</span>
                                <span class="text-white">{{ cotizacion.ficha_de_trabajo?.cliente?.email || 'No registrado' }}</span>
                              </p>
                            </div>
                        </div>

                        <!-- Diagnóstico y fechas -->
                        <div>
                            <h3 class="text-xs font-semibold text-white uppercase tracking-wider mb-3">Detalles</h3>
                            <div class="space-y-2 text-sm text-white">
                                <p>
                                    <span class="block text-xs font-bold text-white">Motivo de Ingreso</span>
                                    <span class="italic text-white">{{ camelCase(cotizacion.ficha_de_trabajo?.motivo_ingreso) || 'No registrado' }}</span>
                                </p>
                                <p>
                                    <span class="block text-xs font-bold text-white">Comentarios adicionales</span>
                                    <span class="italic text-white">{{ cotizacion.ficha_de_trabajo?.comentario || 'No registrado' }}</span>
                                </p>
                                <p>
                                    <span class="block text-xs text-white font-bold">Fecha de Emisión</span>
                                    {{ formatearFecha(cotizacion.created_at) }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Servicios -->
                <div v-if="servicios.length > 0" class="neutro-secondary rounded-xl shadow-sm dark:border border-gray-700 overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-700 neutro-primary">
                        <h3 class="text-white font-bold">Servicios Solicitados</h3>
                    </div>
                    <div class="divide-y divide-gray-800">
                        <div v-for="detalle in servicios" :key="detalle.id" class="px-6 py-4 flex justify-between items-center hover:opacity-80 transition-colors">
                            <span class="text-sm text-white font-medium">{{ camelCase(detalle.descripcion) }}</span>
                            <span class="text-sm font-bold text-white">{{ formatearDinero(detalle.monto) }} x {{ detalle.cantidad }} = {{ formatearDinero(detalle.monto * detalle.cantidad) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Insumos -->
                <div v-if="insumos.length > 0" class="neutro-secondary rounded-xl shadow-sm dark:border border-gray-700 overflow-hidden mt-6">
                    <div class="px-6 py-4 border-b border-gray-700 neutro-primary">
                        <h3 class="text-white font-bold">Insumos del Inventario</h3>
                    </div>
                    <div class="divide-y divide-gray-800">
                        <div v-for="detalle in insumos" :key="detalle.id" class="px-6 py-4 flex justify-between items-center hover:opacity-80 transition-colors">
                            <span class="text-sm text-white font-medium">{{ camelCase(detalle.descripcion) }}</span>
                            <span class="text-sm font-bold text-white">{{ formatearDinero(detalle.monto) }} x {{ detalle.cantidad }} = {{ formatearDinero(detalle.monto * detalle.cantidad) }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Columna derecha -->
            <div class="lg:w-1/3 space-y-6">

                <!-- Resumen Financiero -->
                <div v-if="cotizacion.detalle_cotizaciones_ficha && cotizacion.detalle_cotizaciones_ficha.length > 0" class="neutro-primary rounded-xl shadow-sm dark:border border-gray-700">
                    <h3 class="text-sm font-bold text-white p-3 flex justify-between items-center">Resumen Financiero</h3>
                    
                    <div class="space-y-3 neutro-secondary p-6 rounded-b-xl">
                        <div class="flex justify-between items-center text-sm text-white">
                            <span>Subtotal</span>
                            <span class="font-medium">{{ formatearDinero(cotizacion.subtotal || 0) }}</span>
                        </div>
                        <div class="flex justify-between items-center text-sm text-white">
                            <span>Descuento ({{ cotizacion.descuento || 0 }}%)</span>
                            <span class="text-green-400 font-medium">- {{ formatearDinero((cotizacion.subtotal || 0) * (cotizacion.descuento || 0) / 100) }}</span>
                        </div>
                        <div class="flex justify-between items-center text-sm text-white">
                            <span>Neto</span>
                            <span class="font-medium">{{ formatearDinero(cotizacion.total_neto || 0) }}</span>
                        </div>
                        <div class="flex justify-between items-center text-sm text-white">
                            <span>IVA (19%)</span>
                            <span class="font-medium">{{ formatearDinero(cotizacion.iva || 0) }}</span>
                        </div>
                        
                        <div class="pt-4 mt-2 border-t border-gray-100 flex justify-between items-center">
                            <span class="font-bold text-white text-lg">TOTAL</span>
                            <span class="font-extrabold text-2xl text-white">{{ formatearDinero(cotizacion.total_final || 0) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Acciones -->
                <div class="neutro-secondary rounded-xl shadow-sm dark:border border-gray-700">
                    <h3 class="text-xs rounded-t-xl font-semibold uppercase neutro-primary p-3 flex justify-between items-center text-white tracking-wider mb-4">Acciones</h3>
                    <div class="py-2 px-3 space-y-3 pb-4 flex flex-col justify-between items-center">
                        <button 
                          @click="generarPDF"
                          class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg neutro-primary text-white hover:bg-blue-800 transition-colors text-sm font-medium"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Descargar PDF
                        </button>
                 <confirmaciones :estado="cotizacion.estado" @confirmar="confirmarCotizacion" @descartar="descartarCotizacion" @borrador="ejecutarBorrador"></confirmaciones>
                    </div>
                </div>
            </div>
        </div>
        <div class="fixed left-[-9999px] top-0">
            <pdf :cotizacion="cotizacion" :cuentaSeleccionada="cuentaSeleccionada" :numero="n_cotizacion"/>
        </div>

        <modal 
            v-if="modalState.visible" 
            :titulo="modalState.titulo" 
            :mensaje="modalState.mensaje" 
            :exito="modalState.exito" 
            @cerrar="redirigir" 
        />

        <div v-if="mostrarModalModificar" class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-all duration-300">
            <div class="neutro-primary rounded-2xl p-6 border border-white/10 max-w-sm w-full shadow-2xl animate-modal-entrance">
                <h3 class="text-xl font-bold text-white mb-2">Descartar Cotización</h3>
                <p class="text-white/70 text-sm mb-6">La cotización actual será descartada. ¿Deseas usar esta información como base para crear una nueva (modificarla)?</p>
                
                <div class="flex flex-col gap-3">
                    <button @click="confirmarDescartar(true)" class="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                        Sí, descartar y modificar
                    </button>
                    <button @click="confirmarDescartar(false)" class="w-full py-2.5 rounded-lg neutro-secondary hover:bg-white/10 border border-white/10 text-white font-bold transition-colors">
                        No, solo descartar
                    </button>
                    <button @click="mostrarModalModificar = false" class="w-full py-2 text-sm text-white/50 hover:text-white transition-colors mt-2">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<style scoped>
.badge-aprobada {
  font-size: 0.65rem;
  padding: 0.25rem 0.5rem;
  background: #46e450ec;
  color: #4d4d4d;
  border-radius: 4px;
  text-transform: uppercase;
}

.badge-rechazada {
  font-size: 0.65rem;
  padding: 0.25rem 0.5rem;
  background: #ff4c4c;
  color: #ffffff;
  border-radius: 4px;
  text-transform: uppercase;
}

.badge-pendiente {
  font-size: 0.65rem;
  padding: 0.25rem 0.5rem;
  background: #fbd446fd;
  color: #514d4d;
  font-weight: bold;
  border-radius: 4px;
  text-transform: uppercase;
}

.badge-cerrada {
  font-size: 0.65rem;
  padding: 0.25rem 0.5rem;
  background: #52026f;
  color: #ffffff;
  border-radius: 4px;
  text-transform: uppercase;
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
</style>
