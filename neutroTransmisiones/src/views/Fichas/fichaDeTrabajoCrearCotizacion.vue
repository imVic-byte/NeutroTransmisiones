<script setup>
import { ref, computed, onMounted } from "vue";
import navbar from "../../components/componentes/navbar.vue";
import { useRouter, useRoute } from "vue-router";
import { supabase } from "../../lib/supabaseClient.js";
import modal from "../../components/componentes/modal.vue";
import { useInterfaz } from '@/stores/interfaz.js'
import volver from '../../components/componentes/volver.vue'
import { formatearDinero } from '@/js/formateadores.js'
import { verificarServicio } from '../../js/handleServicios.js'

const router = useRouter();
const route = useRoute();
const interfaz = useInterfaz();
const modalState = ref({ visible: false, titulo: "", mensaje: "", exito: true });
const diagnostico = ref("");
const descuentoPorcentaje = ref('');
const nombre = ref("");
const apellido = ref("");
const codigoPais = ref("+56");
const telefono = ref("");
const correo = ref("");
const servicios = ref([{ descripcion: "", monto: "", cantidad: 1, tipo: 'servicio' }]);
const insumos = ref([{ descripcion: "", monto: "", cantidad: 1, tipo: 'insumo' }]);
const listaInsumos = ref([]);
const ivaBoolean = ref(true);
const desgasteBoolean = ref(false);
const cotizacion_id = ref(null);
const loading = ref(false);
const comentarios = ref('');

const catalogoServicios = ref([])
const autocompletadoActivo = ref(-1)

// Funciones para Servicios
const agregarServicio = () => {
  servicios.value.push({ descripcion: "", monto: "", cantidad: 1, tipo: 'servicio' });
};
const eliminarServicio = (index) => {
  if (servicios.value.length > 1) {
    servicios.value.splice(index, 1);
  }
};

const abrirAutocompletado = (index) => {
  autocompletadoActivo.value = index;
};
const cerrarAutocompletado = () => {
  setTimeout(() => {
    autocompletadoActivo.value = -1;
  }, 150);
};

const sugerenciasFiltradas = computed(() => {
  if (autocompletadoActivo.value < 0) return [];
  const query = (servicios.value[autocompletadoActivo.value]?.descripcion || '').toLowerCase().trim();
  if (!query) return catalogoServicios.value;
  return catalogoServicios.value.filter(s => s.nombre.toLowerCase().includes(query));
});

const seleccionarServicio = (servicio, index) => {
  servicios.value[index].descripcion = servicio.nombre;
  servicios.value[index].monto = servicio.precio;
  autocompletadoActivo.value = -1;
};

// Funciones para Insumos
const autocompletadoInsumosActivo = ref(-1);
const agregarInsumo = () => {
  insumos.value.push({ descripcion: "", monto: "", cantidad: 1, tipo: 'insumo' });
};
const eliminarInsumo = (index) => {
  if (insumos.value.length > 1) {
    insumos.value.splice(index, 1);
  }
};

const abrirAutocompletadoInsumo = (index) => {
  autocompletadoInsumosActivo.value = index;
};
const cerrarAutocompletadoInsumo = () => {
  setTimeout(() => {
    autocompletadoInsumosActivo.value = -1;
  }, 150);
};

const sugerenciasInsumosFiltradas = computed(() => {
  if (autocompletadoInsumosActivo.value < 0) return [];
  const query = (insumos.value[autocompletadoInsumosActivo.value]?.descripcion || '').toLowerCase().trim();
  if (!query) return listaInsumos.value;
  return listaInsumos.value.filter(s => (s.nombre || '').toLowerCase().includes(query));
});

const seleccionarInsumo = (insumo, index) => {
  insumos.value[index].inventario_id = insumo.id;
  insumos.value[index].descripcion = insumo.nombre;
  insumos.value[index].monto = insumo.precio_venta;
  insumos.value[index].stock_actual = Number(insumo.stock) || 0;
  autocompletadoInsumosActivo.value = -1;
  validarStock(index);
};

const validarStock = (index) => {
  const item = insumos.value[index];
  if (item.tipo === 'insumo' && item.stock_actual !== undefined) {
    if (item.cantidad > item.stock_actual) {
      item.cantidad = item.stock_actual;
      item.stockSuperado = true;
      setTimeout(() => { item.stockSuperado = false; }, 3000);
    } else {
      item.stockSuperado = false;
    }
  }
};

const cargarServicios = async () => {
  const { data } = await supabase
    .from('servicios')
    .select('nombre, precio')
    .eq('activo', true)
    .order('nombre', { ascending: true })
  if (data) catalogoServicios.value = data
}

const toCamelCase = (texto) => {
  if (!texto) return ''
  return texto.trim().split(/\s+/).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ')
}

const validarFormulario = () => {
  const validServicios = servicios.value.filter(s => s.descripcion && s.descripcion.trim() !== "");
  const validInsumos = insumos.value.filter(i => i.descripcion && i.descripcion.trim() !== "");
  const allItems = [...validServicios, ...validInsumos];
  if (allItems.length === 0) {
    modalState.value = { visible: true, titulo: "Sin ítems", mensaje: "Debe agregar al menos un servicio o insumo con descripción.", exito: false };
    return false;
  }
  for (const item of allItems) {
    if (item.monto === "" || isNaN(Number(item.monto)) || Number(item.monto) < 0) {
      modalState.value = { visible: true, titulo: "Monto inválido", mensaje: `El ítem "${item.descripcion}" tiene un monto inválido.`, exito: false };
      return false;
    }
    if (!item.cantidad || Number(item.cantidad) < 1) {
      modalState.value = { visible: true, titulo: "Cantidad inválida", mensaje: `El ítem "${item.descripcion}" debe tener una cantidad de al menos 1.`, exito: false };
      return false;
    }
    if (item.tipo === 'insumo') {
      const existe = listaInsumos.value.some(inv => inv.nombre === item.descripcion);
      if (!existe) {
        modalState.value = { visible: true, titulo: "Insumo inválido", mensaje: `El insumo "${item.descripcion}" no se ha encontrado en el inventario. Asegúrate de seleccionarlo de la lista.`, exito: false };
        return false;
      }
    }
  }
  const dsc = Number(descuentoPorcentaje.value) || 0
  if (dsc < 0 || dsc > 100) {
    modalState.value = { visible: true, titulo: "Descuento inválido", mensaje: "El descuento debe estar entre 0% y 100%.", exito: false };
    return false;
  }
  if (totales.value.total_final <= 0) {
    modalState.value = { visible: true, titulo: "Total inválido", mensaje: "El total final debe ser mayor a $0.", exito: false };
    return false;
  }
  return true;
};



const totales = computed(() => {
  const validServicios = servicios.value.filter(s => s.descripcion && s.descripcion.trim() !== "");
  const validInsumos = insumos.value.filter(i => i.descripcion && i.descripcion.trim() !== "");
  const allItems = [...validServicios, ...validInsumos];
  const subtotal = allItems.reduce((acc, item) => acc + ((Number(item.monto) || 0) * (Number(item.cantidad) || 1)), 0);
  const dsc = descuentoPorcentaje.value || 0;
  const subtotal_con_descuento = subtotal - (subtotal * (dsc / 100));
  
  const montoDesgaste = desgasteBoolean.value ? Math.trunc(subtotal_con_descuento * 0.03) : 0;
  const total_neto = subtotal_con_descuento + montoDesgaste;
  
  const pctIva = ivaBoolean.value ? 19 : 0;
  const iva = Math.trunc(total_neto * (pctIva / 100));
  const total_final = total_neto + iva;

  return { subtotal, descuento: dsc, montoDesgaste, total_neto, iva, total_final };
});

const enviarFormulario = async () => {
  if (!validarFormulario()) return;
  interfaz.showLoadingOverlay()
  loading.value = true;
  try {    
    // Validación segura en el backend para insumos
    const validServicios = servicios.value.filter(s => s.descripcion && s.descripcion.trim() !== "");
    const validInsumos = insumos.value.filter(i => i.descripcion && i.descripcion.trim() !== "");

    for (const item of validInsumos) {
      if (item.inventario_id) {
        const { data: inventarioData, error: inventarioError } = await supabase
          .from('inventario')
          .select('stock')
          .eq('id', item.inventario_id)
          .single();
        if (inventarioError) throw inventarioError;
        
        const stockReal = Number(inventarioData.stock) || 0;
        if (item.cantidad > stockReal) {
          modalState.value = { 
            visible: true, 
            titulo: "Stock Insuficiente", 
            mensaje: `Se ha ingresado una cantidad mayor al stock actual en: ${item.descripcion}. Stock disponible: ${stockReal}.`, 
            exito: false 
          };
          loading.value = false;
          interfaz.hideLoadingOverlay();
          return;
        }
      }
    }

    // Verificar y actualizar catálogo de servicios (solo para los que son tipo 'servicio')
    await Promise.all(validServicios.map(async (item) => {
      await verificarServicio({ nombre: item.descripcion, precio: item.monto });
    }));

    const { data, error } = await supabase.from('cotizaciones_ficha')
    .insert({
      ficha_id: route.params.id,
      comentario: comentarios.value,
      subtotal: totales.value.subtotal,
      descuento: totales.value.descuento,
      total_neto: totales.value.total_neto,
      iva: totales.value.iva,
      total_final: totales.value.total_final
    })
    .select('id')
    .single();
    if (error) throw error;
    
    let itemsAGuardar = [...validServicios, ...validInsumos];
    if (desgasteBoolean.value && totales.value.montoDesgaste > 0) {
      itemsAGuardar.push({
        descripcion: 'Desgaste Insumos (3%)',
        monto: totales.value.montoDesgaste,
        cantidad: 1,
        tipo: 'servicio'
      });
    }

    const {data:detalles,error:detallesError} = await supabase.from('detalle_cotizaciones_ficha')
    .insert(itemsAGuardar.map((item) => ({
      cotizacion_id: data.id,
      descripcion: item.descripcion,
      monto: item.monto,
      cantidad: item.cantidad || 1,
      tipo: item.tipo
    })))
    if (detallesError) throw detallesError;
    modalState.value = { visible: true, titulo: "¡Éxito!", mensaje: "Cotización creada correctamente.", exito: true };
  } catch (err) {
    console.error(err);
    modalState.value = { visible: true, titulo: "Error", mensaje: "No se pudo guardar la cotización.", exito: false };
  } finally {
    loading.value = false;
    interfaz.hideLoadingOverlay()
  }
};

const redirigir = () => {
  if (modalState.value.exito) {
    router.push({ name: "ficha-de-trabajo", params: { id: route.params.id } });
  } else {    
    modalState.value.visible = false;
  }
};
const cargarDatosFicha = async (id) => {
  try {
    const { data, error } = await supabase
      .from('ficha_de_trabajo')
      .select('*, cliente(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (data) {
      if (data.cliente) {
        nombre.value = data.cliente.nombre;
        apellido.value = data.cliente.apellido;
      }
      diagnostico.value = data.motivo_ingreso || '';
    }
  } catch (error) {
    console.error('Error cargando datos de la ficha:', error);
    modalState.value = { visible: true, titulo: "Error", mensaje: "No se pudieron cargar los datos de la ficha.", exito: false };
  }
};

const cargarCotizacionClonada = async (cotizacionId) => {
  try {
    const { data: cotData, error } = await supabase
      .from('cotizaciones_ficha')
      .select('*, detalle_cotizaciones_ficha(*)')
      .eq('id', cotizacionId)
      .single();
    if (error) throw error;
    if (cotData) {
      comentarios.value = cotData.comentario || '';
      descuentoPorcentaje.value = cotData.descuento || 0;
      ivaBoolean.value = cotData.iva > 0;
      if (cotData.detalle_cotizaciones_ficha && cotData.detalle_cotizaciones_ficha.length > 0) {
        let detallesClon = [...cotData.detalle_cotizaciones_ficha];
        const indexDesgaste = detallesClon.findIndex(d => d.descripcion && d.descripcion.includes('Desgaste Insumos'));
        if (indexDesgaste !== -1) {
            desgasteBoolean.value = true;
            detallesClon.splice(indexDesgaste, 1);
        } else {
            desgasteBoolean.value = false;
        }

        const svcs = detallesClon.filter(d => d.tipo !== 'insumo');
        const ins = detallesClon.filter(d => d.tipo === 'insumo');

        servicios.value = svcs.length > 0 ? svcs.map(det => ({
          descripcion: det.descripcion,
          monto: det.monto,
          cantidad: det.cantidad,
          tipo: 'servicio'
        })) : [{ descripcion: "", monto: "", cantidad: 1, tipo: 'servicio' }];

        insumos.value = ins.length > 0 ? ins.map(det => ({
          descripcion: det.descripcion,
          monto: det.monto,
          cantidad: det.cantidad,
          tipo: 'insumo'
        })) : [{ descripcion: "", monto: "", cantidad: 1, tipo: 'insumo' }];
      }
    }
  } catch (err) {
    console.error('Error al cargar la cotización a modificar:', err);
  }
};

const cargarInventario = async () => {
  try {
    const { data, error } = await supabase.from('inventario').select('id, nombre, precio_venta, stock').eq('estado', true);
    if (!error && data) {
      // Filtrar aquellos que tengan nombre para evitar errores
      listaInsumos.value = data.filter(i => i.nombre);
    }
  } catch (err) {
    console.error('Error al cargar inventario:', err);
  }
};

onMounted(async () => {
  interfaz.showLoading()
  const fichaId = route.params.id;
  if (fichaId) {
    await cargarDatosFicha(fichaId);
  }
  
  const clonarId = route.query.clonar_cotizacion;
  if (clonarId) {
    await cargarCotizacionClonada(clonarId);
  }

  await cargarServicios();
  await cargarInventario();
  interfaz.hideLoading()
});
</script>

<template>
  <div class="neutro-background min-h-screen font-sans">
    <navbar titulo="NeutroTransmisiones" subtitulo="Nueva Cotización" class="navbar sticky top-0 z-50 shadow-sm" />

    <div class="mx-auto p-4 max-w-7xl pb-28 pt-8">
      <volver ruta="ficha-de-trabajo" :params="{ id: route.params.id }" />
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 rounded-lg">

        <div class="lg:col-span-7 space-y-12 neutro-secondary rounded-xl">

          <!-- CLIENTE -->
          <section>
            <h2
              class="text-2xl w-full neutro-primary neutro-font border-b-2 border-yellow-400 rounded-t-lg p-2 inline-block pb-1 mb-6">
              Cliente
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 px-3">
              <div class="group relative">
                <label
                  class="block text-xs font-bold neutro-font uppercase tracking-wide mb-1 transition-colors group-focus-within:text-blue-800">Nombre</label>
                <p class="neutro-font">{{toCamelCase(nombre) }}</p>
              </div>
              <div class="group">
                <label
                  class="block text-xs font-bold neutro-font uppercase tracking-wide mb-1 transition-colors group-focus-within:text-blue-800">Apellido</label>
                <p class="neutro-font">{{toCamelCase(apellido) }}</p>
              </div>
              <div class="md:col-span-2 group">
                <label
                  class="block text-xs font-bold neutro-font uppercase tracking-wide mb-1 transition-colors group-focus-within:text-blue-800">Diagnóstico
                  / Descripción</label>
                <p class="neutro-font">{{ diagnostico }}</p>
              </div>
              <div>
                <label class="block text-xs font-bold neutro-font uppercase tracking-wide mb-1 transition-colors group-focus-within:text-blue-800">Comentarios adicionales</label>
                <input type="text" class="w-full py-2 neutro-secondary neutro-font border-b border-gray-100 focus:border-blue-900 focus:outline-none text-sm" placeholder="Comentarios adicionales" autocomplete="off" />
              </div>
            </div>
            </section>
          <section>
            <h2
              class="text-2xl w-full font-light neutro-primary neutro-font border-b-2 border-yellow-400 rounded-t-lg p-2 inline-block pb-1 mb-6">
              Servicios
            </h2>
            <div class="space-y-4 px-3">
              <div v-for="(item, index) in servicios" :key="index" class="animate-fadeIn relative"
                :style="{ zIndex: autocompletadoActivo === index ? 20 : 0 }">
                <div class="flex flex-col md:flex-row gap-4 items-start md:items-end w-full">
                  <div class="w-full md:flex-1 group relative">
                    <label class="block text-xs neutro-font mb-0.5">Descripción</label>
                    <input v-model="item.descripcion" type="text"
                      class="w-full py-2 neutro-secondary neutro-font border-b border-gray-100 focus:border-blue-900 focus:outline-none text-sm"
                      placeholder="Buscar servicio..." @focus="abrirAutocompletado(index)" @blur="cerrarAutocompletado()"
                      @input="abrirAutocompletado(index)" autocomplete="off" />
                    <!-- Dropdown autocompletado -->
                    <div v-if="autocompletadoActivo === index && sugerenciasFiltradas.length > 0"
                      class="absolute z-30 left-0 right-0 top-full mt-1 neutro-secondary border border-gray-100 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      <button v-for="servicio in sugerenciasFiltradas" :key="servicio.nombre" type="button"
                        class="w-full px-3 py-2.5 text-left neutro-secondary-100 hover:bg-blue-50 flex justify-between items-center gap-2 text-sm transition-colors cursor-pointer"
                        @mousedown.prevent="seleccionarServicio(servicio, index)">
                        <span class="truncate neutro-font">{{ servicio.nombre }}</span>
                        <span class="text-xs font-semibold neutro-font whitespace-nowrap">{{
                          formatearDinero(servicio.precio) }}</span>
                      </button>
                    </div>
                  </div>
                  
                  <div class="flex items-end gap-4 w-full md:w-auto">
                    <div class="flex-1 md:w-28 group">
                      <label class="block text-xs neutro-font mb-0.5">P. Unit.</label>
                      <input v-model.number="item.monto" type="number"
                        class="w-full py-2 neutro-secondary neutro-font border-b border-gray-100 focus:border-blue-900 focus:outline-none text-sm text-right"
                        placeholder="$0" />
                    </div>
                    <div class="w-20 md:w-16 group">
                      <label class="block text-xs neutro-font mb-0.5">Cant.</label>
                      <input v-model.number="item.cantidad" type="number" min="1"
                        class="w-full py-2 neutro-secondary neutro-font border-b border-gray-100 focus:border-blue-900 focus:outline-none text-sm text-center"
                        placeholder="1" />
                    </div>
                    <div class="flex-1 md:w-28 text-right pb-2">
                      <label class="block text-xs neutro-font mb-0.5">Total</label>
                      <span class="text-sm font-semibold neutro-font">{{ formatearDinero((Number(item.monto) || 0) * (Number(item.cantidad) || 1)) }}</span>
                    </div>
                    <button @click="eliminarServicio(index)" class="neutro-font hover:text-red-500 pb-2 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clip-rule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              <button @click="agregarServicio"
                class="mt-4 text-sm font-bold neutro-primary neutro-font px-2 py-1 rounded-sm mb-2 hover:text-blue-600 flex items-center gap-2 transition-colors">
                <span class="text-xl ">+</span> Agregar otro servicio
              </button>
            </div>
          </section>

          <section class="mt-4">
            <h2
              class="text-2xl w-full font-light neutro-primary neutro-font border-b-2 border-yellow-400 rounded-t-lg p-2 inline-block pb-1 mb-6">
              Insumos del inventario
            </h2>
            <div class="space-y-4 px-3">
              <div v-for="(item, index) in insumos" :key="index" class="animate-fadeIn relative"
                :style="{ zIndex: autocompletadoInsumosActivo === index ? 20 : 0 }">
                <div class="flex flex-col md:flex-row gap-4 items-start md:items-end w-full">
                  <div class="w-full md:flex-1 group relative">
                    <label class="block text-xs neutro-font mb-0.5">Descripción</label>
                    <input v-model="item.descripcion" type="text"
                      class="w-full py-2 neutro-secondary neutro-font border-b border-gray-100 focus:border-blue-900 focus:outline-none text-sm"
                      placeholder="Buscar insumo..." @focus="abrirAutocompletadoInsumo(index)" @blur="cerrarAutocompletadoInsumo()"
                      @input="abrirAutocompletadoInsumo(index)" autocomplete="off" />
                    <!-- Dropdown autocompletado -->
                    <div v-if="autocompletadoInsumosActivo === index && sugerenciasInsumosFiltradas.length > 0"
                      class="absolute z-30 left-0 right-0 top-full mt-1 neutro-secondary border border-gray-100 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      <button v-for="insumo in sugerenciasInsumosFiltradas" :key="insumo.nombre" type="button"
                        class="w-full px-3 py-2.5 text-left neutro-secondary-100 hover:bg-blue-50 flex justify-between items-center gap-2 text-sm transition-colors cursor-pointer"
                        @mousedown.prevent="seleccionarInsumo(insumo, index)">
                        <span class="truncate neutro-font">{{ insumo.nombre }}</span>
                        <span class="text-xs font-semibold neutro-font whitespace-nowrap">{{
                          formatearDinero(insumo.precio_venta) }}</span>
                      </button>
                    </div>
                  </div>
                  
                  <div class="flex items-end gap-4 w-full md:w-auto">
                    <div class="flex-1 md:w-28 group">
                      <label class="block text-xs neutro-font mb-0.5">P. Unit.</label>
                      <input v-model.number="item.monto" type="number"
                        class="w-full py-2 neutro-secondary neutro-font border-b border-gray-100 focus:border-blue-900 focus:outline-none text-sm text-right"
                        placeholder="$0" disabled />
                    </div>
                    <div class="w-20 md:w-16 group relative">
                      <label class="block text-xs neutro-font mb-0.5">Cant.</label>
                      <input v-model.number="item.cantidad" type="number" min="1"
                        @input="validarStock(index)"
                        class="w-full py-2 neutro-secondary neutro-font border-b border-gray-100 focus:border-blue-900 focus:outline-none text-sm text-center"
                        placeholder="1" />
                        <span v-if="item.stockSuperado" class="absolute -bottom-5 left-0 text-[10px] text-red-500 font-bold whitespace-nowrap">
                          Stock superado
                        </span>
                    </div>
                    <div class="flex-1 md:w-28 text-right pb-2">
                      <label class="block text-xs neutro-font mb-0.5">Total</label>
                      <span class="text-sm font-semibold neutro-font">{{ formatearDinero((Number(item.monto) || 0) * (Number(item.cantidad) || 1)) }}</span>
                    </div>
                    <button @click="eliminarInsumo(index)" class="neutro-font hover:text-red-500 pb-2 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clip-rule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <button @click="agregarInsumo"
                class="mt-4 text-sm font-bold neutro-primary neutro-font px-2 py-1 rounded-sm mb-2 hover:text-blue-600 flex items-center gap-2 transition-colors">
                <span class="text-xl ">+</span> Agregar otro insumo
              </button>
            </div>
          </section>

        </div>

        <!-- RESUMEN / TOTALES -->
        <div class="lg:col-span-5 relative">
          <div class="neutro-secondary shadow-xl sticky top-24 rounded-xl">
            <h2
              class="text-2xl w-full font-light neutro-primary neutro-font border-b-2 border-yellow-400 rounded-t-lg p-2 inline-block pb-1 mb-6">
              Resumen
            </h2>
            <div class="space-y-4 mb-8 px-3">
              <div class="flex justify-between text-sm">
                <span class="neutro-font">Subtotal</span>
                <span class="font-medium neutro-font">{{ formatearDinero(totales.subtotal) }}</span>
              </div>
              <div class="flex justify-between items-center text-sm">
                <span class="neutro-font">Descuento</span>
                <div class="flex items-center gap-1 border-b border-gray-100 w-16">
                  <input v-model.number="descuentoPorcentaje" type="number"
                    class="w-full text-right text-sm neutro-font focus:outline-none" placeholder="0" />
                  <span class="text-xs font-bold neutro-font">%</span>
                </div>
              </div>
              <div class="flex justify-between items-center text-sm">
                <span class="neutro-font">Desgaste Insumos</span>
                <div class="flex flex-col items-end gap-1">
                  <button @click="desgasteBoolean = !desgasteBoolean"
                    class="text-xs font-bold px-2 py-0.5 rounded transition-colors"
                    :class="desgasteBoolean ? 'bg-blue-100 text-blue-800' : 'neutro-secondary neutro-font'">
                    {{ desgasteBoolean ? '+3%' : 'No aplicar' }}
                  </button>
                  <p class="text-xs neutro-font">Presionar para cambiar</p>
                </div>
              </div>
              <div v-if="desgasteBoolean" class="flex justify-between text-sm border-t pt-2">
                <span class="neutro-font">Monto Desgaste</span>
                <span class="font-medium neutro-font">{{ formatearDinero(totales.montoDesgaste) }}</span>
              </div>
              <div class="flex justify-between items-center text-sm border-t pt-4">
                <span class="neutro-font">Impuesto (IVA)</span>
                <div class="flex flex-col items-end gap-1">
                  <button @click="ivaBoolean = !ivaBoolean"
                    class="text-xs font-bold px-2 py-0.5 rounded transition-colors"
                    :class="ivaBoolean ? 'bg-blue-100 text-blue-800' : 'neutro-secondary neutro-font'">
                    {{ ivaBoolean ? '19%' : 'Exento' }}
                  </button>
                  <p class="text-xs neutro-font">Presionar para cambiar</p>
                </div>
              </div>
              <div class="flex justify-between text-sm border-t pt-4 ">
                <span class="neutro-font">Monto IVA</span>
                <span class="font-medium neutro-font">{{ formatearDinero(totales.iva) }}</span>
              </div>
            </div>

            <div class="flex justify-between items-center mb-8 px-3">
              <span class="text-xs font-bold neutro-font tracking-widest uppercase">Total Estimado</span>
              <div class="text-right">
                <p class="text-3xl font-bold neutro-font">{{ formatearDinero(totales.total_final) }}</p>
              </div>
            </div>

            <button @click="enviarFormulario"
              class="w-full neutro-primary neutro-font text-sm font-bold py-4 mb-4 px-4 rounded-b-lg hover:bg-blue-800 transition-all flex justify-center items-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              :disabled="loading">
              <span v-if="loading">Procesando...</span>
              <span v-else>EMITIR COTIZACIÓN</span>
              <svg v-if="!loading" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <modal v-if="modalState.visible" :titulo="modalState.titulo" :mensaje="modalState.mensaje"
        :exito="modalState.exito" @cerrar="redirigir" />
    </div>
  </div>
</template>

<style scoped>
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type=number] {
  -moz-appearance: textfield;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out forwards;
}
</style>
