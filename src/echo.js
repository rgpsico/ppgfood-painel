import Echo from 'laravel-echo'
import io from 'socket.io-client'
import { SOCKET_URL } from './configs/api'

window.io = io

// Canais privados (ex.: pedidos do atendente) autenticam com o mesmo token do painel:
// o echo-server repassa esses headers pro /broadcasting/auth do Laravel.
const authHeaders = {}

export function setEchoToken(token) {
    authHeaders.Authorization = `Bearer ${token}`
}

export default new Echo({
    broadcaster: 'socket.io',
    host: SOCKET_URL,
    transports: ['websocket', 'polling'],
    auth: { headers: authHeaders },
})
