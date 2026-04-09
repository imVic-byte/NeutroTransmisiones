<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'

const router = useRouter()
const userStore = useUserStore()
</script>
<template>
  <nav class="bottom-nav no-print">
    <RouterLink to="/" class="nav-item primero"><span><svg xmlns="http://www.w3.org/2000/svg" fill="none"
          viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      </span>
      <p>Inicio</p>
    </RouterLink>
    <RouterLink to="/configuracion" class="nav-item ultimo"><span><svg
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
          class="size-6">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
        </svg>
      </span>
      <p>Panel</p>
    </RouterLink>
    
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -4px 6px rgba(0, 0, 0, 0.05);
  border-top-right-radius: 20px;
  border-top-left-radius: 20px;
}

@media print {
  .bottom-nav {
    display: none !important;
  }
}

.nav-item {
  text-align: center;
  cursor: pointer;
  color: white;
  transition: color 0.3s;
  width: 100%;
  padding: 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color:#467746
}

.router-link-active {
  color: #ffffff;
  font-weight: bold;
  background-color: #234723;
}

.nav-item span {
  display: block;
  font-size: 24px;
  margin-bottom: 4px;
}

.primero {
  border-radius: 20px 0 0 0;
}

.ultimo {
  border-radius: 0 20px 0 0;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  padding: 1rem;
}

.modal-card {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  max-width: 360px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
}

.modal-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 1rem;
  background-color: #FEF3C7;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-icon svg {
  width: 28px;
  height: 28px;
  color: #D97706;
}

.modal-card h3 {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.modal-card p {
  font-size: 0.9rem;
  color: #64748b;
  margin-bottom: 1.5rem;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-cancelar {
  flex: 1;
  padding: 0.7rem;
  border-radius: 10px;
  border: 2px solid #e2e8f0;
  background: white;
  color: #64748b;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancelar:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.btn-confirmar {
  flex: 1;
  padding: 0.7rem;
  border-radius: 10px;
  border: none;
  background-color: #ef4444;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-confirmar:hover {
  background-color: #dc2626;
}
</style>