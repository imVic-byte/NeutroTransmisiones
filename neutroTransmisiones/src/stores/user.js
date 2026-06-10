// stores/user.js
import { defineStore } from 'pinia'
import { supabase } from '../lib/supabaseClient.js'
import { useInterfaz } from './interfaz.js'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    loading: false,
    initialized: false,
    subscription: null
  }),

  getters: {
    isAuthenticated: (state) => !!state.user
  },

  actions: {
    async initializeAuth() {
      if (this.subscription) return 

      const uiStore = useInterfaz()
      this.loading = true

      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          this.user = session.user
          if (window.OneSignal) window.OneSignal.login(session.user.id)
        }

        const { data: authData } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session?.user) {
            if (session.user.id !== this.user?.id) {
              this.user = session.user
              if (window.OneSignal) window.OneSignal.login(session.user.id)
            }
          } else {
            this.user = null
            if (window.OneSignal) window.OneSignal.logout()
          }
        })

        this.subscription = authData.subscription

      } catch (error) {
        console.error('Error Auth:', error)
      } finally {
        this.loading = false
        this.initialized = true 
        uiStore.hideLoading()
      }
    },

    async signIn(email, password) {
      const uiStore = useInterfaz()
      this.loading = true
      uiStore.showLoading() 

      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        
        this.user = data.user
        if (window.OneSignal) window.OneSignal.login(data.user.id)
        
        return true
      } catch (error) {
        throw error
      } finally {
        this.loading = false
        uiStore.hideLoading()
      }
    },

    async signOut() {
        const uiStore = useInterfaz()
        uiStore.showLoading()
        try {
            await supabase.auth.signOut()
            this.user = null
            if (window.OneSignal) window.OneSignal.logout()
        } catch(e) {
            console.error(e)
        } finally {
            uiStore.hideLoading()
        }
    }
  }
})