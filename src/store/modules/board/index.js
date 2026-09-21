import axios from 'axios'
import { API_VERSION } from '@/configs/api'

export default {
    state: {
        tables: [],
        ordersWithoutTable: [],
        loading: false,
        // identify da mesa que acabou de receber um pedido novo, pra piscar na tela
        blinkingTable: null,

        historyOrders: [],
        historyLoading: false,
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

        // Pedido entregue sai do quadro ao vivo (que so mostra pendentes)
        REMOVE_DELIVERED_ORDER(state, identify) {
            const table = state.tables.find((t) => t.order && t.order.identify === identify)
            if (table) {
                table.order = null
            }

            state.ordersWithoutTable = state.ordersWithoutTable.filter(
                (o) => o.identify !== identify
            )
        },

        SET_HISTORY(state, orders) {
            state.historyOrders = orders
        },

        SET_HISTORY_LOADING(state, loading) {
            state.historyLoading = loading
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

        loadHistory({ commit }, { status, table } = {}) {
            commit('SET_HISTORY_LOADING', true)
            return axios.get(`${API_VERSION}/staff/orders`, {
                params: { status, table: table || undefined },
            })
                .then((response) => {
                    commit('SET_HISTORY', response.data.data)
                })
                .finally(() => commit('SET_HISTORY_LOADING', false))
        },

        getOrdersByTable({}, tableIdentify) {
            return axios.get(`${API_VERSION}/staff/orders`, {
                params: { status: 'all', table: tableIdentify },
            }).then((response) => response.data.data)
        },

        updateOrderStatus({ commit }, { identify, status }) {
            return axios.patch(`${API_VERSION}/staff/orders/${identify}/status`, { status })
                .then((response) => {
                    if (status === 'done') {
                        commit('REMOVE_DELIVERED_ORDER', identify)
                    }
                    return response.data.data
                })
        },
    },
}
