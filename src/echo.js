import Echo from 'laravel-echo'
import io from 'socket.io-client'
import { SOCKET_URL } from './configs/api'

window.io = io

export default new Echo({
    broadcaster: 'socket.io',
    host: SOCKET_URL,
    transports: ['websocket', 'polling'],
})
