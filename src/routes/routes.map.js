import Login from '@/pages/Login'
import Board from '@/pages/Board'
import SuperAdmin from '@/pages/SuperAdmin'
import store from '@/store'

const routes = [
    {
        path: '/login',
        component: Login,
        name: 'login',
    },
    {
        path: '/',
        component: Board,
        name: 'board',
        beforeEnter: (to, from, next) => {
            if (store.state.auth.authenticated) {
                next()
            } else {
                store.dispatch('getMe').then(() => {
                    next(store.state.auth.authenticated ? undefined : { name: 'login' })
                })
            }
        },
    },
    {
        path: '/super-admin',
        component: SuperAdmin,
        name: 'super-admin',
        beforeEnter: (to, from, next) => {
            const liberar = () => {
                const me = store.state.auth.me
                next(store.state.auth.authenticated && me && me.is_super_admin ? undefined : { path: '/' })
            }
            if (store.state.auth.authenticated) {
                liberar()
            } else {
                store.dispatch('getMe').then(liberar)
            }
        },
    },
    {
        path: '*',
        redirect: '/',
    },
]

export default routes
