<script setup>
import agenda from '@/views/Agenda/agenda.vue'
import navbar from '@/components/componentes/navbar.vue'
</script>
<template>
    <div class="min-h-screen neutro-background font-sans neutro-font pb-20">
        <navbar subtitulo="Agenda" class="navbar" searchInput="false" />
        <div class="container mx-auto px-6 mt-2">
            <agenda />
        </div>
    </div>
</template>