import axios from 'axios'
import { API_VERSION } from '@/configs/api'

// Avisos de pedido novo como notificacao do celular (Web Push). Passos do navegador:
// service worker -> permissao (precisa de toque do usuario) -> inscricao -> envia pro servidor.

export function pushSuportado() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function ehIphone() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function instaladoNaTela() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function chaveParaBytes(base64) {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4)
    const bruto = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
    return Uint8Array.from([...bruto].map((c) => c.charCodeAt(0)))
}

async function registrarServiceWorker() {
    return navigator.serviceWorker.register('/service-worker.js')
}

/**
 * 'nao-suportado' | 'instalar-iphone' | 'bloqueado' | 'desativado' | 'ativo'
 */
export async function estadoPush() {
    if (ehIphone() && !instaladoNaTela()) return 'instalar-iphone'
    if (!pushSuportado()) return 'nao-suportado'
    if (Notification.permission === 'denied') return 'bloqueado'

    const registro = await navigator.serviceWorker.getRegistration('/service-worker.js')
    const inscricao = registro ? await registro.pushManager.getSubscription() : null

    return Notification.permission === 'granted' && inscricao ? 'ativo' : 'desativado'
}

async function enviarInscricao(inscricao) {
    await axios.post(`${API_VERSION}/staff/push/subscribe`, inscricao.toJSON())
}

// Precisa rodar dentro de um toque do usuario (exigencia do iPhone e do Chrome)
export async function ativarPush() {
    const permissao = await Notification.requestPermission()
    if (permissao !== 'granted') throw new Error('permissao-negada')

    const registro = await registrarServiceWorker()
    await navigator.serviceWorker.ready

    const { data } = await axios.get(`${API_VERSION}/staff/push/key`)

    const inscricao =
        (await registro.pushManager.getSubscription()) ||
        (await registro.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: chaveParaBytes(data.public_key),
        }))

    await enviarInscricao(inscricao)
}

export async function desativarPush() {
    const registro = await navigator.serviceWorker.getRegistration('/service-worker.js')
    const inscricao = registro ? await registro.pushManager.getSubscription() : null
    if (!inscricao) return

    await axios.delete(`${API_VERSION}/staff/push/subscribe`, { data: { endpoint: inscricao.endpoint } })
    await inscricao.unsubscribe()
}

// Ao abrir o painel: se este celular ja tem avisos ativos, reenvia a inscricao para o usuario logado agora
// (cobre quem troca de login no mesmo celular e inscricoes que o servidor apagou).
export async function sincronizarPush() {
    try {
        if (!pushSuportado() || Notification.permission !== 'granted') return
        const registro = await navigator.serviceWorker.getRegistration('/service-worker.js')
        const inscricao = registro ? await registro.pushManager.getSubscription() : null
        if (inscricao) await enviarInscricao(inscricao)
    } catch (e) {
        // sincronizar e so uma garantia: nunca atrapalha o painel
    }
}

export async function testarPush() {
    const { data } = await axios.post(`${API_VERSION}/staff/push/test`)
    return data.enviados
}
