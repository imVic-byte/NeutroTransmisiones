import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user.js'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('../views/dashboard.vue'),
      meta: { 
        requiresAuth: true
       }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Sesion/login.vue'),
      meta: { requiresAuth: false }
    },
    {
      path:'/configuracion',
      name:'configuracion',
      component: () => import('../views/Panel/config.vue'),
      meta: { requiresAuth: true }
    },
    {
      path:'/agenda',
      name:'agenda',
      component: () => import('../views/Agenda/agendaMain.vue'),
      meta: { requiresAuth: true }
    },
    {
      path:'/inventario',
      name:'inventario',
      component: () => import('../views/Inventario/inventarioMain.vue'),
      meta: {requiresAuth: true}
    },
    {
      path:'/neutro-transmisiones',
      name:'neutro-transmisiones',
      component: () => import('../views/Panel/neutroT.vue'),
      meta: {requiresAuth: true}
    },
    {
      path:'/finanzas',
      name:'finanzas',
      component: () => import('../views/Finanzas/finanzasMain.vue'),
      meta: {requiresAuth: true}
    },
    {
      path:'/finanzas/crear',
      name:'finanzasCrear',
      component: () => import('../views/Finanzas/finanzasCrear.vue'),
      meta: {requiresAuth: true}
    },
    {
      path:'/finanzas/editar/:id',
      name:'finanzasEditar',
      component: () => import('../views/Finanzas/finanzasEditar.vue'),
      meta: {requiresAuth: true}
    },
    {
      path:'/finanzas/ver/:id',
      name:'finanzasVer',
      component: () => import('../views/Finanzas/finanzasVer.vue'),
      meta: {requiresAuth: true}
    }
  ],
})

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  if (!userStore.initialized) {
    await userStore.initializeAuth()
  }
  const isAuthenticated = !!userStore.user
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
    return
  }
  if (isAuthenticated && (to.path === '/login' || to.path === '/register')) {
    next('/')
    return
  }
  next()
})
export default router