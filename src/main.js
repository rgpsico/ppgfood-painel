require('./bootstrap')
import Vue from 'vue'
import App from './App.vue'
import router from './routes'
import store from './store'
import { BootstrapVue } from 'bootstrap-vue'
import VueToastify from 'vue-toastify'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

Vue.config.productionTip = false

Vue.use(BootstrapVue)
Vue.use(VueToastify)

new Vue({
    render: (h) => h(App),
    router,
    store,
}).$mount('#app')
