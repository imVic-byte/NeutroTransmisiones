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
        }

        const { data: authData } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session?.user) {
            if (session.user.id !== this.user?.id) {
              this.user = session.user
            }
          } else {
            this.user = null
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
        } catch(e) {
            console.error(e)
        } finally {
            uiStore.hideLoading()
        }
    }
  }
})