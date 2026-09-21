import Login from '@/pages/Login'
import Board from '@/pages/Board'
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
        path: '*',
        redirect: '/',
    },
]

export default routes
