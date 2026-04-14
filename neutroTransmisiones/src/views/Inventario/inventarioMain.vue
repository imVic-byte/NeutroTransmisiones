<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useInterfaz } from '@/stores/interfaz'
import navbar from '@/components/componentes/navbar.vue'
import volver from '@/components/componentes/volver.vue'
const uiStore = useInterfaz()

// ─── Estado ───
const productos = ref([])
const busqueda = ref('')
const categoriaActiva = ref('Todos')
const ordenActivo = ref('nombre')
const showModal = ref(false)
const showDeleteModal = ref(false)
const modoEdicion = ref(false)
const productoSeleccionado = ref(null)

const formulario = ref({
  nombre: '',
  categoria: '',
  cantidad: 0,
  precio: 0,
  descripcion: '',
  stock_minimo: 5
})

// ─── Categorías ───
const categorias = computed(() => {
  const cats = [...new Set(productos.value.map(p => p.categoria).filter(Boolean))]
  return ['Todos', ...cats.sort()]
})

// ─── Estadísticas ───
const stats = computed(() => {
  const total = productos.value.length
  const sinStock = productos.value.filter(p => p.cantidad === 0).length
  const stockBajo = productos.value.filter(p => p.cantidad > 0 && p.cantidad <= (p.stock_minimo || 5)).length
  const valorTotal = productos.value.reduce((acc, p) => acc + (p.precio * p.cantidad), 0)
  return { total, sinStock, stockBajo, valorTotal }
})

// ─── Filtrado y Ordenado ───
const productosFiltrados = computed(() => {
  let resultado = [...productos.value]

  // Filtro por búsqueda
  if (busqueda.value) {
    const term = busqueda.value.toLowerCase()
    resultado = resultado.filter(p =>
      p.nombre?.toLowerCase().includes(term) ||
      p.categoria?.toLowerCase().includes(term) ||
      p.descripcion?.toLowerCase().includes(term)
    )
  }

  // Filtro por categoría
  if (categoriaActiva.value !== 'Todos') {
    resultado = resultado.filter(p => p.categoria === categoriaActiva.value)
  }

  // Ordenamiento
  resultado.sort((a, b) => {
    switch (ordenActivo.value) {
      case 'nombre': return (a.nombre || '').localeCompare(b.nombre || '')
      case 'cantidad-asc': return a.cantidad - b.cantidad
      case 'cantidad-desc': return b.cantidad - a.cantidad
      case 'precio-asc': return a.precio - b.precio
      case 'precio-desc': return b.precio - a.precio
      default: return 0
    }
  })

  return resultado
})

// ─── Nivel de stock ───
const getNivelStock = (producto) => {
  if (producto.cantidad === 0) return 'sin-stock'
  if (producto.cantidad <= (producto.stock_minimo || 5)) return 'stock-bajo'
  return 'stock-ok'
}

const getEtiquetaStock = (producto) => {
  const nivel = getNivelStock(producto)
  if (nivel === 'sin-stock') return 'Agotado'
  if (nivel === 'stock-bajo') return 'Stock bajo'
  return 'Disponible'
}

// ─── CRUD ───
const cargarProductos = async () => {
  uiStore.showLoading()
  try {
    const { data, error } = await supabase
      .from('inventario')
      .select('*')
      .order('nombre', { ascending: true })

    if (error) throw error
    productos.value = data || []
  } catch (error) {
    console.error('Error al cargar inventario:', error)
  } finally {
    uiStore.hideLoading()
  }
}

const abrirModalNuevo = () => {
  modoEdicion.value = false
  formulario.value = {
    nombre: '',
    categoria: '',
    cantidad: 0,
    precio: 0,
    descripcion: '',
    stock_minimo: 5
  }
  showModal.value = true
}

const abrirModalEdicion = (producto) => {
  modoEdicion.value = true
  productoSeleccionado.value = producto
  formulario.value = {
    nombre: producto.nombre || '',
    categoria: producto.categoria || '',
    cantidad: producto.cantidad || 0,
    precio: producto.precio || 0,
    descripcion: producto.descripcion || '',
    stock_minimo: producto.stock_minimo || 5
  }
  showModal.value = true
}

const cerrarModal = () => {
  showModal.value = false
  productoSeleccionado.value = null
}

const guardarProducto = async () => {
  if (!formulario.value.nombre) return

  uiStore.showLoading()
  try {
    if (modoEdicion.value && productoSeleccionado.value) {
      const { error } = await supabase
        .from('inventario')
        .update({
          nombre: formulario.value.nombre.toUpperCase(),
          categoria: formulario.value.categoria,
          cantidad: Number(formulario.value.cantidad),
          precio: Number(formulario.value.precio),
          descripcion: formulario.value.descripcion,
          stock_minimo: Number(formulario.value.stock_minimo)
        })
        .eq('id', productoSeleccionado.value.id)

      if (error) throw error
    } else {
      const { error } = await supabase
        .from('inventario')
        .insert([{
          nombre: formulario.value.nombre.toUpperCase(),
          categoria: formulario.value.categoria,
          cantidad: Number(formulario.value.cantidad),
          precio: Number(formulario.value.precio),
          descripcion: formulario.value.descripcion,
          stock_minimo: Number(formulario.value.stock_minimo)
        }])

      if (error) throw error
    }

    cerrarModal()
    await cargarProductos()
  } catch (error) {
    console.error('Error al guardar producto:', error)
    alert('Error al guardar: ' + error.message)
  } finally {
    uiStore.hideLoading()
  }
}

const confirmarEliminar = (producto) => {
  productoSeleccionado.value = producto
  showDeleteModal.value = true
}

const eliminarProducto = async () => {
  if (!productoSeleccionado.value) return

  uiStore.showLoading()
  try {
    const { error } = await supabase
      .from('inventario')
      .delete()
      .eq('id', productoSeleccionado.value.id)

    if (error) throw error

    showDeleteModal.value = false
    productoSeleccionado.value = null
    await cargarProductos()
  } catch (error) {
    console.error('Error al eliminar:', error)
    alert('Error al eliminar: ' + error.message)
  } finally {
    uiStore.hideLoading()
  }
}

const formatearPrecio = (precio) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0
  }).format(precio || 0)
}

const onBuscar = (valor) => {
  busqueda.value = valor
}

onMounted(() => {
  cargarProductos()
})
</script>

<template>
  <div class="min-h-screen neutro-background font-sans neutro-font pb-24">
    <!-- Navbar -->
    <navbar subtitulo="Inventario" class="navbar" searchInput="true" @buscar="onBuscar" />

    <div class="px-5 pt-4">
      <volver />
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid px-5 mt-2">
      <div class="stat-card stat-total">
        <div class="stat-icon-wrap bg-blue-100 dark:bg-blue-900/40">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="stat-icon text-blue-600 dark:text-blue-400">
            <path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-number">{{ stats.total }}</span>
          <span class="stat-label">Productos</span>
        </div>
      </div>

      <div class="stat-card stat-warning">
        <div class="stat-icon-wrap bg-amber-100 dark:bg-amber-900/40">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="stat-icon text-amber-600 dark:text-amber-400">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-number">{{ stats.stockBajo }}</span>
          <span class="stat-label">Stock bajo</span>
        </div>
      </div>

      <div class="stat-card stat-danger">
        <div class="stat-icon-wrap bg-red-100 dark:bg-red-900/40">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="stat-icon text-red-600 dark:text-red-400">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-number">{{ stats.sinStock }}</span>
          <span class="stat-label">Agotados</span>
        </div>
      </div>

      <div class="stat-card stat-value">
        <div class="stat-icon-wrap bg-emerald-100 dark:bg-emerald-900/40">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="stat-icon text-emerald-600 dark:text-emerald-400">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-number stat-number-small">{{ formatearPrecio(stats.valorTotal) }}</span>
          <span class="stat-label">Valor total</span>
        </div>
      </div>
    </div>

    <!-- Filtros y Controles -->
    <div class="controls-section px-5 mt-5">
      <div class="controls-top">
        <div class="categories-scroll">
          <button
            v-for="cat in categorias"
            :key="cat"
            @click="categoriaActiva = cat"
            :class="['cat-chip', { 'cat-chip-active': categoriaActiva === cat }]"
          >
            {{ cat }}
          </button>
        </div>
        <button @click="abrirModalNuevo" class="btn-agregar" id="btn-agregar-producto">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span class="btn-agregar-text">Agregar</span>
        </button>
      </div>

      <!-- Ordenar -->
      <div class="sort-row mt-3">
        <label class="sort-label">Ordenar:</label>
        <select v-model="ordenActivo" class="sort-select" id="select-orden">
          <option value="nombre">Nombre A-Z</option>
          <option value="cantidad-asc">Menor stock</option>
          <option value="cantidad-desc">Mayor stock</option>
          <option value="precio-asc">Menor precio</option>
          <option value="precio-desc">Mayor precio</option>
        </select>
      </div>
    </div>

    <!-- Lista de Productos -->
    <div class="product-list px-5 mt-4">
      <!-- Estado vacío -->
      <div v-if="productosFiltrados.length === 0" class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" class="empty-icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
        </svg>
        <p class="empty-title">Sin resultados</p>
        <p class="empty-subtitle">No se encontraron productos con los filtros actuales</p>
      </div>

      <!-- Cards de productos -->
      <div
        v-for="producto in productosFiltrados"
        :key="producto.id"
        class="product-card"
        @click="abrirModalEdicion(producto)"
      >
        <div class="product-card-header">
          <div class="product-main-info">
            <h3 class="product-name">{{ producto.nombre }}</h3>
            <span v-if="producto.categoria" class="product-category">{{ producto.categoria }}</span>
          </div>
          <span :class="['stock-badge', getNivelStock(producto)]">
            {{ getEtiquetaStock(producto) }}
          </span>
        </div>

        <div class="product-details">
          <div class="detail-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="detail-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
            <span class="detail-value">{{ producto.cantidad }} uds</span>
          </div>
          <div class="detail-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="detail-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span class="detail-value">{{ formatearPrecio(producto.precio) }}</span>
          </div>
          <div v-if="producto.ubicacion" class="detail-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="detail-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            <span class="detail-value">{{ producto.ubicacion }}</span>
          </div>
        </div>

        <!-- Barra de progreso de stock -->
        <div class="stock-bar-container">
          <div
            class="stock-bar"
            :class="getNivelStock(producto)"
            :style="{ width: Math.min((producto.cantidad / Math.max(producto.stock_minimo * 3, 1)) * 100, 100) + '%' }"
          ></div>
        </div>

        <!-- Botón de eliminar -->
        <button
          class="btn-delete-inline"
          @click.stop="confirmarEliminar(producto)"
          title="Eliminar producto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </button>
      </div>
    </div>

    <!-- ═══════ MODAL AGREGAR / EDITAR ═══════ -->
    <div v-if="showModal" class="modal-overlay" @click.self="cerrarModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">{{ modoEdicion ? 'Editar Producto' : 'Nuevo Producto' }}</h3>
          <button @click="cerrarModal" class="modal-close">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Nombre *</label>
            <input
              v-model="formulario.nombre"
              type="text"
              class="form-input"
              placeholder="Ej: FILTRO DE ACEITE"
              id="input-nombre"
            />
          </div>

          <div class="">
            <div class="form-group">
              <label class="form-label">Categoría</label>
              <input
                v-model="formulario.categoria"
                type="text"
                class="form-input"
                placeholder="Ej: Filtros"
                id="input-categoria"
                list="categorias-list"
              />
              <datalist id="categorias-list">
                <option v-for="cat in categorias.filter(c => c !== 'Todos')" :key="cat" :value="cat" ></option>
              </datalist>
            </div>
          </div>

          <div class="form-row form-row-triple">
            <div class="form-group">
              <label class="form-label">Cantidad</label>
              <input
                v-model.number="formulario.cantidad"
                type="number"
                min="0"
                class="form-input"
                id="input-cantidad"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Precio ($)</label>
              <input
                v-model.number="formulario.precio"
                type="number"
                min="0"
                step="0.01"
                class="form-input"
                id="input-precio"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Stock mín.</label>
              <input
                v-model.number="formulario.stock_minimo"
                type="number"
                min="0"
                class="form-input"
                id="input-stock-minimo"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Descripción</label>
            <textarea
              v-model="formulario.descripcion"
              class="form-input form-textarea"
              rows="2"
              placeholder="Observaciones adicionales..."
              id="input-descripcion"
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="cerrarModal" class="btn-modal-cancel" id="btn-cancelar">Cancelar</button>
          <button @click="guardarProducto" class="btn-modal-save" id="btn-guardar">
            {{ modoEdicion ? 'Actualizar' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════ MODAL CONFIRMAR ELIMINAR ═══════ -->
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
      <div class="modal-card modal-card-small">
        <div class="modal-delete-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-red-500">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <h3 class="modal-delete-title">¿Eliminar producto?</h3>
        <p class="modal-delete-desc">
          Se eliminará <strong>{{ productoSeleccionado?.nombre }}</strong> del inventario. Esta acción no se puede deshacer.
        </p>
        <div class="modal-footer">
          <button @click="showDeleteModal = false" class="btn-modal-cancel" id="btn-cancelar-eliminar">Cancelar</button>
          <button @click="eliminarProducto" class="btn-modal-delete" id="btn-confirmar-eliminar">Eliminar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════ */
.navbar {
  position: sticky;
  top: 0;
  z-index: 1000;
}

/* ═══════════════════════════════════════
   STATS CARDS
   ═══════════════════════════════════════ */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 16px;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.dark .stat-card {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.stat-icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon {
  width: 22px;
  height: 22px;
}

.stat-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-number {
  font-size: 1.4rem;
  font-weight: 800;
  line-height: 1.1;
  color: var(--neutro-font);
}

.stat-number-small {
  font-size: 1rem;
}

.stat-label {
  font-size: 0.72rem;
  font-weight: 500;
  opacity: 0.65;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--neutro-font);
}

/* ═══════════════════════════════════════
   FILTROS / CONTROLES
   ═══════════════════════════════════════ */
.controls-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.categories-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  flex: 1;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.categories-scroll::-webkit-scrollbar {
  display: none;
}

.cat-chip {
  white-space: nowrap;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
  border: 1.5px solid rgba(75, 121, 74, 0.3);
  background: transparent;
  color: var(--neutro-font);
  cursor: pointer;
  transition: all 0.25s ease;
}

.cat-chip:hover {
  border-color: var(--neutro-primary);
  background: rgba(75, 121, 74, 0.08);
}

.cat-chip-active {
  background: var(--neutro-primary);
  color: #fff;
  border-color: var(--neutro-primary);
}

.btn-agregar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 12px;
  background: var(--neutro-primary);
  color: #fff;
  font-weight: 600;
  font-size: 0.85rem;
  border: none;
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(51, 87, 49, 0.3);
}

.btn-agregar:hover {
  background: var(--neutro-primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(51, 87, 49, 0.4);
}

.btn-agregar:active {
  transform: translateY(0);
}

.sort-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-label {
  font-size: 0.78rem;
  font-weight: 600;
  opacity: 0.6;
  color: var(--neutro-font);
}

.sort-select {
  padding: 5px 10px;
  border-radius: 8px;
  border: 1.5px solid rgba(75, 121, 74, 0.25);
  background: transparent;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--neutro-font);
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
}

.sort-select:focus {
  border-color: var(--neutro-primary);
}

.dark .sort-select {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.15);
}

/* ═══════════════════════════════════════
   PRODUCT LIST
   ═══════════════════════════════════════ */
.product-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.product-card {
  position: relative;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.25s ease;
}

.dark .product-card {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.product-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  border-color: rgba(75, 121, 74, 0.3);
}

.dark .product-card:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  border-color: rgba(75, 121, 74, 0.4);
}

.product-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}

.product-main-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.product-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--neutro-font);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-category {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--neutro-primary);
  background: rgba(75, 121, 74, 0.1);
  padding: 2px 8px;
  border-radius: 6px;
  width: fit-content;
}

.dark .product-category {
  background: rgba(75, 121, 74, 0.2);
  color: #7cc47a;
}

.stock-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  flex-shrink: 0;
}

.stock-badge.stock-ok {
  background: #dcfce7;
  color: #166534;
}

.dark .stock-badge.stock-ok {
  background: rgba(22, 163, 74, 0.2);
  color: #86efac;
}

.stock-badge.stock-bajo {
  background: #fef3c7;
  color: #92400e;
}

.dark .stock-badge.stock-bajo {
  background: rgba(245, 158, 11, 0.2);
  color: #fcd34d;
}

.stock-badge.sin-stock {
  background: #fecaca;
  color: #991b1b;
}

.dark .stock-badge.sin-stock {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

.product-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 10px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.detail-icon {
  width: 15px;
  height: 15px;
  opacity: 0.5;
  color: var(--neutro-font);
}

.detail-value {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--neutro-font);
  opacity: 0.8;
}

/* Stock bar */
.stock-bar-container {
  height: 4px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 4px;
  overflow: hidden;
}

.dark .stock-bar-container {
  background: rgba(255, 255, 255, 0.08);
}

.stock-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.stock-bar.stock-ok {
  background: linear-gradient(90deg, #22c55e, #16a34a);
}

.stock-bar.stock-bajo {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.stock-bar.sin-stock {
  background: linear-gradient(90deg, #ef4444, #dc2626);
  width: 100% !important;
  opacity: 0.3;
}

/* Delete inline button */
.btn-delete-inline {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--neutro-font);
  opacity: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.product-card:hover .btn-delete-inline {
  opacity: 0.4;
}

.btn-delete-inline:hover {
  opacity: 1 !important;
  background: #fecaca;
  color: #dc2626;
}

.dark .btn-delete-inline:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
}

.empty-icon {
  width: 64px;
  height: 64px;
  opacity: 0.2;
  color: var(--neutro-font);
  margin-bottom: 1rem;
}

.empty-title {
  font-size: 1.1rem;
  font-weight: 700;
  opacity: 0.5;
  color: var(--neutro-font);
  margin-bottom: 4px;
}

.empty-subtitle {
  font-size: 0.85rem;
  opacity: 0.35;
  color: var(--neutro-font);
}

/* ═══════════════════════════════════════
   MODALS
   ═══════════════════════════════════════ */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  align-items: flex-end;
  z-index: 9999;
  padding: 0;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.modal-card {
  background: var(--neutro-background);
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.2);
}

.modal-card-small {
  padding: 2rem;
  text-align: center;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 20px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.dark .modal-header {
  border-color: rgba(255, 255, 255, 0.08);
}

.modal-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--neutro-font);
}

.modal-close {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: none;
  background: rgba(0, 0, 0, 0.06);
  color: var(--neutro-font);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.dark .modal-close {
  background: rgba(255, 255, 255, 0.1);
}

.modal-close:hover {
  background: rgba(0, 0, 0, 0.12);
}

.modal-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.55;
  color: var(--neutro-font);
}

.form-input {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1.5px solid rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--neutro-font);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  width: 100%;
  box-sizing: border-box;
}

.dark .form-input {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.12);
}

.form-input:focus {
  border-color: var(--neutro-primary);
  box-shadow: 0 0 0 3px rgba(75, 121, 74, 0.12);
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-row-triple {
  grid-template-columns: 1fr 1fr 1fr;
}

.modal-footer {
  display: flex;
  gap: 10px;
  padding: 16px 20px 24px;
}

.btn-modal-cancel {
  flex: 1;
  padding: 12px;
  border-radius: 14px;
  border: 1.5px solid rgba(0, 0, 0, 0.1);
  background: transparent;
  color: var(--neutro-font);
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.dark .btn-modal-cancel {
  border-color: rgba(255, 255, 255, 0.15);
}

.btn-modal-cancel:hover {
  background: rgba(0, 0, 0, 0.04);
}

.btn-modal-save {
  flex: 1;
  padding: 12px;
  border-radius: 14px;
  border: none;
  background: var(--neutro-primary);
  color: #fff;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(51, 87, 49, 0.3);
}

.btn-modal-save:hover {
  background: var(--neutro-primary-hover);
  box-shadow: 0 4px 12px rgba(51, 87, 49, 0.4);
}

.btn-modal-delete {
  flex: 1;
  padding: 12px;
  border-radius: 14px;
  border: none;
  background: #ef4444;
  color: #fff;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.btn-modal-delete:hover {
  background: #dc2626;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

/* ═══════════════════════════════════════
   DELETE MODAL EXTRAS
   ═══════════════════════════════════════ */
.modal-delete-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #fef2f2;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.dark .modal-delete-icon {
  background: rgba(239, 68, 68, 0.15);
}

.modal-delete-title {
  font-size: 1.15rem;
  font-weight: 800;
  margin-bottom: 8px;
  color: var(--neutro-font);
}

.modal-delete-desc {
  font-size: 0.85rem;
  opacity: 0.6;
  color: var(--neutro-font);
  margin-bottom: 20px;
  line-height: 1.4;
}

/* ═══════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════ */
@media (min-width: 640px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .modal-overlay {
    align-items: center;
    padding: 1rem;
  }

  .modal-card {
    border-radius: 24px;
    max-width: 480px;
  }
}

@media (max-width: 380px) {
  .btn-agregar-text {
    display: none;
  }

  .btn-agregar {
    padding: 8px 10px;
  }

  .form-row-triple {
    grid-template-columns: 1fr 1fr;
  }
}
</style>