import axios from 'axios'
import { TOKEN_NAME, API_VERSION } from '@/configs/api'

export default {
    state: {
        me: null,
        authenticated: false,
    },

    mutations: {
        SET_ME(state, me) {
            state.me = me
            state.authenticated = true
        },

        LOGOUT(state) {
            state.me = null
            state.authenticated = false
        },
    },

    actions: {
        login({ dispatch }, { email, password }) {
            return axios.post('staff/login', {
                email,
                password,
                device_name: 'painel-web',
            }).then((response) => {
                localStorage.setItem(TOKEN_NAME, response.data.token)
                return dispatch('getMe')
            })
        },

        getMe({ commit }) {
            const token = localStorage.getItem(TOKEN_NAME)
            if (!token) return Promise.resolve()

            return axios.get(`${API_VERSION}/staff/me`)
                .then((response) => {
                    commit('SET_ME', response.data)
                })
                .catch(() => {
                    localStorage.removeItem(TOKEN_NAME)
                })
        },

        logout({ commit }) {
            const token = localStorage.getItem(TOKEN_NAME)
            const finish = () => {
                localStorage.removeItem(TOKEN_NAME)
                commit('LOGOUT')
            }

            if (!token) {
                finish()
                return Promise.resolve()
            }

            return axios.post(`${API_VERSION}/staff/logout`)
                .finally(finish)
        },
    },
}
