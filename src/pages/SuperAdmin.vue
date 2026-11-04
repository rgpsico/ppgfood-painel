<template>
  <div class="sa-page">
    <header class="sa-header">
      <div>
        <h1>Super admin</h1>
        <p class="sa-sub">
          <span class="sa-dot" :class="erroConexao ? 'erro' : 'ok'"></span>
          {{ erroConexao ? "Sem conexão com o servidor" : atualizado ? `Atualizado ${atualizado}` : "Carregando..." }}
        </p>
      </div>
      <router-link to="/" class="sa-back">← Voltar ao painel</router-link>
    </header>

    <div class="sa-tabs">
      <button :class="{ active: aba === 'servicos' }" @click="aba = 'servicos'">
        Serviços
        <span v-if="saude" class="sa-pill" :class="saude.geral">{{ rotuloGeral }}</span>
      </button>
      <button :class="{ active: aba === 'barracas' }" @click="aba = 'barracas'">
        Barracas <span v-if="barracas" class="sa-count">{{ barracas.totais.barracas }}</span>
      </button>
    </div>

    <!-- ================= SERVIÇOS ================= -->
    <div v-if="aba === 'servicos'">
      <p v-if="!saude" class="sa-empty">Carregando...</p>

      <template v-else>
        <div class="sa-banner" :class="saude.geral">
          <strong>{{ bannerTitulo }}</strong>
          <span>{{ bannerTexto }}</span>
        </div>

        <h2>Sistema</h2>
        <div class="sa-grid">
          <div v-for="s in saude.servicos" :key="s.nome" class="sa-item" :class="s.status">
            <span class="sa-dot" :class="s.status"></span>
            <div class="sa-item-body">
              <strong>{{ s.nome }}</strong>
              <span>{{ s.detalhe }}</span>
            </div>
            <small>{{ s.ms }} ms</small>
          </div>
        </div>

        <h2>Servidor (VPS)</h2>
        <p v-if="!host.disponivel" class="sa-warn">{{ host.motivo }}</p>
        <p v-else-if="host.desatualizado" class="sa-warn erro">
          O coletor do servidor parou de atualizar (último dado há {{ minutos(host.idade_segundos) }}). Containers, sites e backups
          abaixo podem estar desatualizados.
        </p>

        <template v-if="host.disponivel">
          <div class="sa-metrics">
            <div class="sa-metric"><span>No ar há</span><strong>{{ host.uptime_dias }} dias</strong></div>
            <div class="sa-metric">
              <span>Carga (1/5/15 min)</span>
              <strong :class="{ alto: host.carga[0] > host.cpus }">{{ host.carga.join(" / ") }}</strong>
              <small>{{ host.cpus }} CPUs</small>
            </div>
            <div class="sa-metric">
              <span>Memória</span>
              <strong>{{ host.memoria.usada_mb }} / {{ host.memoria.total_mb }} MB</strong>
              <div class="sa-bar"><i :style="{ width: pct(host.memoria.usada_mb, host.memoria.total_mb) + '%' }" :class="{ alto: pct(host.memoria.usada_mb, host.memoria.total_mb) > 90 }"></i></div>
            </div>
            <div class="sa-metric">
              <span>Disco</span>
              <strong>{{ host.disco.usado_gb }} / {{ host.disco.total_gb }} GB</strong>
              <div class="sa-bar"><i :style="{ width: host.disco.pct_usado + '%' }" :class="{ alto: host.disco.pct_usado > 85 }"></i></div>
            </div>
          </div>

          <h2>Sites</h2>
          <div class="sa-grid">
            <div v-for="s in host.sites" :key="s.url" class="sa-item" :class="s.ok ? 'ok' : 'erro'">
              <span class="sa-dot" :class="s.ok ? 'ok' : 'erro'"></span>
              <div class="sa-item-body">
                <strong>{{ s.nome }}</strong>
                <span>{{ s.ok ? "No ar" : s.codigo ? `Respondeu erro ${s.codigo}` : "Não responde" }}</span>
              </div>
              <small>{{ s.ms }} ms</small>
            </div>
          </div>

          <h2>Backups</h2>
          <div class="sa-grid">
            <div v-for="b in host.backups.bancos" :key="b.nome" class="sa-item" :class="statusBackup(b)">
              <span class="sa-dot" :class="statusBackup(b)"></span>
              <div class="sa-item-body">
                <strong>Banco {{ b.nome }}</strong>
                <span>{{ b.arquivo ? `Último backup há ${horas(b.idade_horas)} (${b.tamanho_kb} KB)` : "Nenhum backup encontrado" }}</span>
              </div>
            </div>
            <div class="sa-item" :class="host.backups.offsite_ultimo ? 'ok' : 'aviso'">
              <span class="sa-dot" :class="host.backups.offsite_ultimo ? 'ok' : 'aviso'"></span>
              <div class="sa-item-body">
                <strong>Cópia fora do servidor (GitHub)</strong>
                <span>{{ host.backups.offsite_ultimo || "Ainda não configurada" }}</span>
              </div>
            </div>
          </div>
          <p v-for="f in host.backups.falhas_recentes" :key="f" class="sa-warn erro">{{ f }}</p>

          <h2>Containers</h2>
          <div v-for="grupo in gruposContainers" :key="grupo.sistema" class="sa-group">
            <h3>{{ grupo.sistema }}</h3>
            <div class="sa-grid sa-grid-small">
              <div v-for="c in grupo.itens" :key="c.nome" class="sa-item" :class="statusContainer(c)">
                <span class="sa-dot" :class="statusContainer(c)"></span>
                <div class="sa-item-body">
                  <strong>{{ c.nome }}</strong>
                  <span>
                    {{ c.status }}<template v-if="c.saude"> · {{ c.saude }}</template>
                    <template v-if="c.reinicios"> · reiniciou {{ c.reinicios }}x</template>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <h2>
          Erros do sistema (24 h)
          <span class="sa-count" :class="{ red: saude.erros.ultimas_24h > 0 }">{{ saude.erros.ultimas_24h }}</span>
        </h2>
        <p v-if="!saude.erros.recentes.length" class="sa-empty">Nenhum erro nas últimas 24 horas.</p>
        <ul v-else class="sa-errors">
          <li v-for="(e, i) in saude.erros.recentes" :key="i">
            <time>{{ dataHora(e.em) }}</time>
            <span>{{ e.mensagem }}</span>
          </li>
        </ul>
      </template>
    </div>

    <!-- ================= BARRACAS ================= -->
    <div v-else>
      <p v-if="!barracas" class="sa-empty">Carregando...</p>

      <template v-else>
        <div class="sa-cards">
          <div class="sa-card"><span>Barracas ativas</span><strong>{{ barracas.totais.ativas }} <small>de {{ barracas.totais.barracas }}</small></strong></div>
          <div class="sa-card main"><span>Vendido hoje</span><strong>{{ moeda(barracas.totais.vendido_hoje) }}</strong><small>{{ barracas.totais.pedidos_hoje }} pedido(s)</small></div>
          <div class="sa-card"><span>Vendido no mês</span><strong>{{ moeda(barracas.totais.vendido_mes) }}</strong></div>
          <div class="sa-card warn"><span>Pedidos em andamento</span><strong>{{ barracas.totais.pedidos_em_andamento }}</strong></div>
          <div class="sa-card"><span>Mensalidades (ativas)</span><strong>{{ moeda(barracas.totais.mensalidades) }}</strong></div>
          <div class="sa-card"><span>Clientes cadastrados</span><strong>{{ barracas.totais.clientes }}</strong></div>
        </div>

        <div class="sa-table-wrap">
          <table class="sa-table">
            <thead>
              <tr>
                <th>Barraca</th>
                <th>Plano</th>
                <th class="n">Hoje</th>
                <th class="n">Mês</th>
                <th class="n">Em andamento</th>
                <th class="n">Pedidos</th>
                <th class="n">Guarda-sóis</th>
                <th class="n">Produtos</th>
                <th class="n">Equipe</th>
                <th>Último pedido</th>
                <th>Painel usado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in ordenadas" :key="b.id" :class="{ off: !b.assinatura_ativa }">
                <td>
                  <a :href="b.loja" target="_blank" rel="noopener">{{ b.nome }}</a>
                  <small v-if="b.local">{{ b.local }}</small>
                  <span v-if="!b.assinatura_ativa" class="sa-tag">assinatura inativa</span>
                </td>
                <td>{{ b.plano ? `${b.plano.nome} · ${moeda(b.plano.preco)}` : "—" }}</td>
                <td class="n"><strong>{{ moeda(b.vendido_hoje) }}</strong><small>{{ b.pedidos_hoje }} ped.</small></td>
                <td class="n">{{ moeda(b.vendido_mes) }}</td>
                <td class="n"><span :class="{ hot: b.pedidos_em_andamento > 0 }">{{ b.pedidos_em_andamento }}</span></td>
                <td class="n">{{ b.pedidos_total }}</td>
                <td class="n">{{ b.guarda_sois }}</td>
                <td class="n">{{ b.produtos }}</td>
                <td class="n">{{ b.usuarios }} <small>{{ b.atendentes }} atend. · {{ b.celulares_com_aviso }} cel.</small></td>
                <td>{{ relativo(b.ultimo_pedido) }}</td>
                <td>{{ relativo(b.ultimo_uso_painel) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="sa-note">Toque no nome para abrir a loja. “Painel usado” = último acesso de qualquer usuário da barraca ao painel.</p>
      </template>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import { API_VERSION } from "@/configs/api";

export default {
  name: "SuperAdmin",

  data() {
    return {
      aba: "servicos",
      saude: null,
      barracas: null,
      erroConexao: false,
      atualizado: "",
      timer: null,
    };
  },

  computed: {
    host() {
      return this.saude.host;
    },

    rotuloGeral() {
      return { ok: "tudo certo", aviso: "atenção", erro: "problema" }[this.saude.geral];
    },

    bannerTitulo() {
      return { ok: "Tudo funcionando", aviso: "Atenção: algo merece olhar", erro: "Há problema agora" }[this.saude.geral];
    },

    bannerTexto() {
      const ruins = this.saude.servicos.filter((s) => s.status !== "ok").map((s) => s.nome);
      const foraDoAr = this.host.disponivel ? this.host.sites.filter((s) => !s.ok).map((s) => s.nome) : [];
      const todos = [...ruins, ...foraDoAr];
      return todos.length ? todos.join(" · ") : "Banco, Redis, socket, agendador e avisos respondendo.";
    },

    gruposContainers() {
      const grupos = {};
      this.host.containers.forEach((c) => {
        (grupos[c.sistema] = grupos[c.sistema] || { sistema: c.sistema, itens: [] }).itens.push(c);
      });
      return Object.values(grupos);
    },

    ordenadas() {
      return [...this.barracas.barracas].sort(
        (a, b) => Number(b.assinatura_ativa) - Number(a.assinatura_ativa) || b.vendido_mes - a.vendido_mes || a.nome.localeCompare(b.nome)
      );
    },
  },

  mounted() {
    this.carregar();
    this.timer = setInterval(this.carregar, 15000);
  },

  beforeDestroy() {
    clearInterval(this.timer);
  },

  methods: {
    async carregar() {
      try {
        const [saude, barracas] = await Promise.all([
          axios.get(`${API_VERSION}/staff/admin/saude`),
          axios.get(`${API_VERSION}/staff/admin/barracas`),
        ]);
        this.saude = saude.data;
        this.barracas = barracas.data;
        this.erroConexao = false;
        this.atualizado = new Date().toLocaleTimeString("pt-BR");
      } catch (e) {
        this.erroConexao = true;
        if (e.response && e.response.status === 403) this.$router.replace("/");
      }
    },

    moeda(v) {
      return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    },

    pct(a, b) {
      return b ? Math.round((a / b) * 100) : 0;
    },

    minutos(seg) {
      return seg < 5400 ? `${Math.round(seg / 60)} min` : `${(seg / 3600).toFixed(1)} h`;
    },

    horas(h) {
      return h === null ? "—" : h < 1 ? `${Math.round(h * 60)} min` : `${h} h`;
    },

    relativo(iso) {
      if (!iso) return "—";
      const seg = Math.max(0, (Date.now() - new Date(iso.replace(" ", "T")).getTime()) / 1000);
      if (seg < 90) return "agora";
      if (seg < 5400) return `há ${Math.round(seg / 60)} min`;
      if (seg < 172800) return `há ${Math.round(seg / 3600)} h`;
      return `há ${Math.round(seg / 86400)} dias`;
    },

    dataHora(iso) {
      return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    },

    statusBackup(b) {
      if (!b.arquivo) return "erro";
      return b.idade_horas > 30 ? "erro" : b.idade_horas > 26 ? "aviso" : "ok";
    },

    statusContainer(c) {
      if (c.estado !== "running") return c.deveria_rodar ? "erro" : "parado";
      return c.saude === "unhealthy" ? "erro" : "ok";
    },
  },
};
</script>

<style scoped>
.sa-page {
  min-height: 100vh;
  background: #eef3f6;
  color: #1f2d3a;
  padding: 16px;
  max-width: 1200px;
  margin: 0 auto;
}

.sa-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.sa-header h1 {
  font-size: 22px;
  margin: 0;
  color: #0a4d78;
}

.sa-sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: #5c6b78;
}

.sa-back {
  font-size: 13px;
  font-weight: 600;
  color: #0a4d78;
}

.sa-tabs {
  display: flex;
  gap: 8px;
  margin: 16px 0;
}

.sa-tabs button {
  border: 1px solid #c4ced6;
  background: #fff;
  border-radius: 999px;
  padding: 9px 16px;
  font-weight: 600;
  font-size: 14px;
  color: #0a4d78;
  cursor: pointer;
}

.sa-tabs button.active {
  background: #0a4d78;
  border-color: #0a4d78;
  color: #fff;
}

.sa-pill,
.sa-count {
  display: inline-block;
  margin-left: 6px;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #e1e8ee;
  color: #1f2d3a;
}

.sa-pill.ok { background: #cfeedb; }
.sa-pill.aviso { background: #ffe9a8; }
.sa-pill.erro { background: #f7c4c4; }
.sa-count.red { background: #f7c4c4; }

h2 {
  font-size: 15px;
  color: #0a4d78;
  margin: 24px 0 10px;
}

h3 {
  font-size: 13px;
  color: #5c6b78;
  margin: 12px 0 6px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sa-banner {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px 16px;
  border-radius: 12px;
  color: #fff;
}

.sa-banner.ok { background: #1c7c3a; }
.sa-banner.aviso { background: #b7791f; }
.sa-banner.erro { background: #b02a37; }
.sa-banner span { font-size: 13px; opacity: 0.92; }

.sa-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}

.sa-grid-small {
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}

.sa-item {
  background: #fff;
  border-radius: 10px;
  padding: 11px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-left: 4px solid #1c9c4a;
}

.sa-item.aviso { border-left-color: #d4a017; }
.sa-item.erro { border-left-color: #b02a37; background: #fff5f5; }
.sa-item.parado { border-left-color: #9aa7b2; opacity: 0.75; }

.sa-item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  font-size: 13px;
}

.sa-item-body strong {
  overflow-wrap: anywhere;
}

.sa-item-body span {
  color: #5c6b78;
  overflow-wrap: anywhere;
}

.sa-item small {
  color: #8896a3;
  font-size: 11px;
  white-space: nowrap;
}

.sa-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: 0 0 10px;
  background: #1c9c4a;
  display: inline-block;
}

.sa-dot.aviso { background: #d4a017; }
.sa-dot.erro { background: #b02a37; }
.sa-dot.parado { background: #9aa7b2; }

.sa-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.sa-metric {
  background: #fff;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sa-metric span { font-size: 12px; color: #5c6b78; }
.sa-metric strong { font-size: 16px; font-variant-numeric: tabular-nums; }
.sa-metric strong.alto { color: #b02a37; }
.sa-metric small { color: #8896a3; font-size: 11px; }

.sa-bar {
  height: 7px;
  border-radius: 4px;
  background: #e1e8ee;
  overflow: hidden;
}

.sa-bar i {
  display: block;
  height: 100%;
  background: #1a8fc4;
}

.sa-bar i.alto { background: #b02a37; }

.sa-warn {
  background: #fff3cd;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  margin: 8px 0;
}

.sa-warn.erro { background: #f7d7d7; }

.sa-empty {
  color: #5c6b78;
  font-size: 14px;
}

.sa-errors {
  list-style: none;
  padding: 0;
  margin: 0;
  background: #fff;
  border-radius: 10px;
}

.sa-errors li {
  display: flex;
  gap: 12px;
  padding: 9px 12px;
  border-bottom: 1px solid #eef1f4;
  font-size: 12px;
}

.sa-errors time {
  color: #8896a3;
  white-space: nowrap;
}

.sa-errors span {
  overflow-wrap: anywhere;
}

.sa-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 10px;
}

.sa-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.sa-card span { font-size: 12px; color: #5c6b78; }
.sa-card strong { font-size: 22px; font-variant-numeric: tabular-nums; }
.sa-card small { font-size: 12px; color: #8896a3; font-weight: 400; }
.sa-card.main { background: #0a4d78; }
.sa-card.main span, .sa-card.main small { color: #cfe3f1; }
.sa-card.main strong { color: #fff; }
.sa-card.warn { background: #fff3cd; }

.sa-table-wrap {
  margin-top: 16px;
  overflow-x: auto;
  background: #fff;
  border-radius: 12px;
}

.sa-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 980px;
}

.sa-table th {
  text-align: left;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #5c6b78;
  padding: 10px;
  border-bottom: 1px solid #e1e8ee;
  white-space: nowrap;
}

.sa-table td {
  padding: 10px;
  border-bottom: 1px solid #eef1f4;
  vertical-align: top;
}

.sa-table .n {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.sa-table td small {
  display: block;
  color: #8896a3;
  font-size: 11px;
}

.sa-table tr.off { opacity: 0.6; }
.sa-table a { font-weight: 600; color: #0a4d78; }
.sa-table .hot { color: #b7791f; font-weight: 700; }

.sa-tag {
  display: inline-block;
  font-size: 10px;
  background: #e1e8ee;
  border-radius: 999px;
  padding: 1px 7px;
  margin-top: 2px;
}

.sa-note {
  font-size: 12px;
  color: #5c6b78;
  margin-top: 10px;
}
</style>
