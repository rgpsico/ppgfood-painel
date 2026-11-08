import axios from 'axios'
import { API_VERSION } from '@/configs/api'

export default {
    state: {
        tables: [],
        ordersWithoutTable: [],
        // true quando o backend ja filtrou a lista para um atendente (so os guarda-sois que ele atende)
        onlyServing: false,
        loading: false,
        // identify da mesa que acabou de receber um pedido novo, pra piscar na tela
        blinkingTable: null,

        historyOrders: [],
        historyLoading: false,
    },

    mutations: {
        SET_BOARD(state, { tables, ordersWithoutTable, onlyServing }) {
            state.tables = tables
            state.ordersWithoutTable = ordersWithoutTable
            state.onlyServing = !!onlyServing
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

                // Atendente: o guarda-sol do cliente novo ainda nao estava na lista dele, entra agora
                if (state.onlyServing) {
                    state.tables = [...state.tables, { ...order.table, order }]
                    state.blinkingTable = order.table.identify
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

            // Atendente so lista guarda-sol com cliente dele (ou cadastrado por ele): entregue, sai da lista
            if (state.onlyServing) {
                state.tables = state.tables.filter((t) => t.order || t.mine)
            }

            state.ordersWithoutTable = state.ordersWithoutTable.filter(
                (o) => o.identify !== identify
            )
        },

        // Pedido atendido ("working") continua no quadro, so muda de status (e para de tocar)
        SET_ORDER_STATUS(state, { identify, status }) {
            const table = state.tables.find((t) => t.order && t.order.identify === identify)
            if (table) {
                table.order = { ...table.order, status }
            }

            state.ordersWithoutTable = state.ordersWithoutTable.map((o) =>
                o.identify === identify ? { ...o, status } : o
            )
        },

        SET_HISTORY(state, orders) {
            state.historyOrders = orders
        },

        SET_HISTORY_LOADING(state, loading) {
            state.historyLoading = loading
        },

        ADD_TABLES(state, tables) {
            // Ponto cadastrado pelo atendente ja e dele ("mine"): fica no quadro dele
            state.tables = [...state.tables, ...tables.map((t) => ({ ...t, order: null, mine: state.onlyServing }))]
        },

        UPDATE_TABLE(state, updated) {
            const table = state.tables.find((t) => t.identify === updated.identify)
            if (table) {
                table.name = updated.name
                table.tipo = updated.tipo
            }
        },

        REMOVE_TABLE(state, identify) {
            state.tables = state.tables.filter((t) => t.identify !== identify)
        },

        SET_TABLE_BEACH_POSITION(state, { identify, row, col }) {
            const table = state.tables.find((t) => t.identify === identify)
            if (table) {
                table.beach_row = row
                table.beach_col = col
            }
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
                        onlyServing: response.data.only_serving,
                    })
                })
                .finally(() => commit('SET_LOADING', false))
        },

        // Mesma carga do loadBoard, mas sem o spinner: serve pra ressincronizar em segundo plano
        refreshBoard({ commit }) {
            return axios.get(`${API_VERSION}/staff/orders-board`)
                .then((response) => {
                    commit('SET_BOARD', {
                        tables: response.data.tables,
                        ordersWithoutTable: response.data.orders_without_table,
                        onlyServing: response.data.only_serving,
                    })
                })
        },

        loadReport({}, { period, from, to }) {
            const params = { period }
            if (period === 'custom') {
                params.from = from
                params.to = to
            }
            return axios.get(`${API_VERSION}/staff/reports`, { params }).then((response) => response.data)
        },

        // Outro aparelho mudou o status de um pedido: este painel acompanha (e o alarme para onde ja foi atendido)
        applyStatusEvent({ commit, dispatch }, { identify, status }) {
            if (status === 'done') {
                commit('REMOVE_DELIVERED_ORDER', identify)
            } else if (status === 'open') {
                // pedido reaberto: volta pro quadro com os dados completos
                return dispatch('loadBoard')
            } else {
                commit('SET_ORDER_STATUS', { identify, status })
            }
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
                    } else {
                        commit('SET_ORDER_STATUS', { identify, status })
                    }
                    return response.data.data
                })
        },

        updateTablePosition({}, { identify, positionX, positionY }) {
            return axios.patch(`${API_VERSION}/staff/tables/${identify}/position`, {
                position_x: positionX,
                position_y: positionY,
            })
        },

        // tipo: 'guarda_sol' | 'cadeira'. Sem nome o backend numera sozinho; quantidade cria varios.
        listAllTables() {
            return axios.get(`${API_VERSION}/staff/tables`).then((response) => response.data.data)
        },

        createTables({ commit }, { tipo, nome, quantidade }) {
            return axios.post(`${API_VERSION}/staff/tables`, {
                tipo,
                nome: nome || undefined,
                quantidade: quantidade || undefined,
            }).then((response) => {
                commit('ADD_TABLES', response.data.data)
                return response.data.data
            })
        },

        updateTable({ commit }, { identify, nome, tipo }) {
            return axios.put(`${API_VERSION}/staff/tables/${identify}`, { nome, tipo })
                .then((response) => {
                    commit('UPDATE_TABLE', response.data.data)
                    return response.data.data
                })
        },

        deleteTable({ commit }, identify) {
            return axios.delete(`${API_VERSION}/staff/tables/${identify}`)
                .then(() => commit('REMOVE_TABLE', identify))
        },

        updateTableBeachPosition({ commit }, { identify, row, col }) {
            return axios.patch(`${API_VERSION}/staff/tables/${identify}/beach-position`, {
                beach_row: row,
                beach_col: col,
            }).then(() => {
                commit('SET_TABLE_BEACH_POSITION', { identify, row, col })
            })
        },
    },
}
