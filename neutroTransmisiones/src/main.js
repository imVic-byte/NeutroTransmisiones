import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css';
const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Toast, {
  position: "top-center",
  timeout: 3000,
  closeOnClick: true,
  rtl: false,
  draggable: true,
  draggablePercent: 0.6,
  pauseOnHover: true,
  pauseOnFocusLoss: true,
  newestOnTop: true,
  maxToasts: 20,
  transition: "Vue-Toastification__bounce",
  closeButton: false,
  icon: false,
  rtl: false,
  toastClassName: "toast-success",
  errorClassName: "toast-error",
  warningClassName: "toast-warning",
  infoClassName: "toast-info",
})
app.mount('#app')
