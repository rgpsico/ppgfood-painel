import axios from 'axios'
import { API_VERSION } from '@/configs/api'

export default {
    state: {
        tables: [],
        ordersWithoutTable: [],
        loading: false,
        // identify da mesa que acabou de receber um pedido novo, pra piscar na tela
        blinkingTable: null,
    },

    mutations: {
        SET_BOARD(state, { tables, ordersWithoutTable }) {
            state.tables = tables
            state.ordersWithoutTable = ordersWithoutTable
        },

        SET_LOADING(state, loading) {
            state.loading = loading
        },

        APPLY_NEW_ORDER(state, order) {
            if (order.table && order.table.identify) {
                const table = state.tables.find((t) => t.identify === order.table.identify)
                if (table) {
                    table.order = order
                    state.blinkingTable = table.identify
                    return
                }
            }

            state.ordersWithoutTable = [order, ...state.ordersWithoutTable]
        },

        CLEAR_BLINK(state) {
            state.blinkingTable = null
        },
    },

    actions: {
        loadBoard({ commit }) {
            commit('SET_LOADING', true)
            return axios.get(`${API_VERSION}/staff/orders-board`)
                .then((response) => {
                    commit('SET_BOARD', {
                        tables: response.data.tables,
                        ordersWithoutTable: response.data.orders_without_table,
                    })
                })
                .finally(() => commit('SET_LOADING', false))
        },
    },
}
