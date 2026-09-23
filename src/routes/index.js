import Vue from 'vue'
import VueRouter from 'vue-router'
import routes from './routes.map'
import { TOKEN_NAME } from '@/configs/api'

Vue.use(VueRouter)

const router = new VueRouter({
    mode: 'history',
    routes,
})

// Handoff de login vindo do cadastro rapido de barraca (ppgfood-front):
// chega como painel.../?token=XXX, guarda o token e limpa a URL
router.beforeEach((to, from, next) => {
    if (to.query.token) {
        localStorage.setItem(TOKEN_NAME, to.query.token)
        next({ path: to.path, query: {} })
        return
    }
    next()
})

export default router
