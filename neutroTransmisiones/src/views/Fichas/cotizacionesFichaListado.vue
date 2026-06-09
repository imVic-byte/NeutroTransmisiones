<script setup>
import { ref } from 'vue'
import navbar from "../../components/componentes/navbar.vue"
import listadoCotizaciones from "../../components/fichas/listadoCotizaciones.vue"

const textoBusquedaGlobal = ref('')

const handleBusqueda = (texto) => {
  textoBusquedaGlobal.value = texto
}
</script>

<template>
  <div class="neutro-background min-h-screen font-sans">
    <navbar 
      titulo="NeutroTransmisiones" 
      subtitulo="Cotizaciones" 
      class="navbar sticky top-0 z-50 shadow-sm"
      searchInput="true"
      @buscar="handleBusqueda"
    />

    <div class="mx-auto p-4 max-w-7xl pb-28 pt-8">
      <!-- Componente de Listado Oficial -->
      <listadoCotizaciones :busqueda="textoBusquedaGlobal" />
    </div>
  </div>
</template>
