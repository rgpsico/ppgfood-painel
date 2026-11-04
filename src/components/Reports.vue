<template>
  <div class="reports">
    <div class="rep-toolbar">
      <div class="rep-periods">
        <button
          v-for="p in periodos"
          :key="p.id"
          type="button"
          class="rep-period"
          :class="{ active: periodo === p.id }"
          @click="escolher(p.id)"
        >
          {{ p.nome }}
        </button>
      </div>

      <div class="rep-live" :title="erro ? 'Sem conexão: mostrando o último dado' : 'Atualiza sozinho'">
        <span class="rep-dot" :class="{ off: erro }"></span>
        <span v-if="erro">Sem conexão</span>
        <span v-else-if="dados">Ao vivo · {{ horaAtualizado }}</span>
        <span v-else>Carregando...</span>
      </div>
    </div>

    <div v-if="periodo === 'custom'" class="rep-custom">
      <label>De <input type="date" v-model="de" :max="ate || hoje" @change="carregar()" /></label>
      <label>Até <input type="date" v-model="ate" :min="de" :max="hoje" @change="carregar()" /></label>
    </div>

    <p v-if="erroMsg" class="rep-erro">{{ erroMsg }}</p>

    <div v-if="dados" class="rep-body">
      <div class="rep-cards">
        <div class="rep-card rep-card-main">
          <span class="rep-card-label">Vendido (entregue)</span>
          <strong class="rep-card-value">{{ moeda(dados.resumo.vendido) }}</strong>
          <span v-if="variacao !== null" class="rep-var" :class="variacao >= 0 ? 'up' : 'down'">
            <i :class="variacao >= 0 ? 'fa-solid fa-arrow-trend-up' : 'fa-solid fa-arrow-trend-down'"></i>
            {{ variacao >= 0 ? "+" : "" }}{{ variacao }}% {{ rotuloAnterior }}
          </span>
          <span v-else class="rep-var muted">{{ rotuloAnterior }}: {{ moeda(dados.resumo.vendido_periodo_anterior) }}</span>
        </div>

        <div class="rep-card">
          <span class="rep-card-label">Pedidos entregues</span>
          <strong class="rep-card-value">{{ dados.resumo.pedidos_entregues }}</strong>
        </div>

        <div class="rep-card rep-card-warn">
          <span class="rep-card-label">Em andamento (a receber)</span>
          <strong class="rep-card-value">{{ moeda(dados.resumo.a_receber) }}</strong>
          <span class="rep-var muted">{{ dados.resumo.pedidos_em_andamento }} pedido(s)</span>
        </div>

        <div class="rep-card">
          <span class="rep-card-label">Ticket médio</span>
          <strong class="rep-card-value">{{ moeda(dados.resumo.ticket_medio) }}</strong>
        </div>

        <div class="rep-card">
          <span class="rep-card-label">Tempo até entregar</span>
          <strong class="rep-card-value">{{ tempo }}</strong>
          <span class="rep-var muted">média</span>
        </div>

        <div class="rep-card">
          <span class="rep-card-label">Cancelados</span>
          <strong class="rep-card-value">{{ dados.resumo.pedidos_cancelados }}</strong>
        </div>
      </div>

      <section class="rep-section">
        <h3>Vendas por hora</h3>
        <div v-if="dados.resumo.pedidos_entregues === 0" class="rep-empty">Nenhuma venda entregue neste período ainda.</div>
        <div v-else class="rep-bars">
          <div v-for="h in horasVisiveis" :key="h.hora" class="rep-bar-col" :title="`${h.hora}h: ${moeda(h.vendido)} em ${h.pedidos} pedido(s)`">
            <span class="rep-bar-val">{{ h.vendido > 0 ? curto(h.vendido) : "" }}</span>
            <div class="rep-bar" :style="{ height: altura(h.vendido, maxHora) + '%' }"></div>
            <span class="rep-bar-lbl">{{ h.hora }}h</span>
          </div>
        </div>
      </section>

      <section v-if="dados.por_dia.length" class="rep-section">
        <h3>Vendas por dia</h3>
        <div class="rep-bars rep-bars-days">
          <div v-for="d in dados.por_dia" :key="d.data" class="rep-bar-col" :title="`${dataBr(d.data)}: ${moeda(d.vendido)} em ${d.pedidos} pedido(s)`">
            <span class="rep-bar-val">{{ d.vendido > 0 ? curto(d.vendido) : "" }}</span>
            <div class="rep-bar rep-bar-day" :style="{ height: altura(d.vendido, maxDia) + '%' }"></div>
            <span class="rep-bar-lbl">{{ diaMes(d.data) }}</span>
          </div>
        </div>
      </section>

      <div class="rep-lists">
        <section class="rep-section">
          <h3>Mais vendidos</h3>
          <p v-if="!dados.produtos.length" class="rep-empty">Sem vendas entregues.</p>
          <ol v-else class="rep-list">
            <li v-for="p in dados.produtos" :key="p.produto">
              <span class="rep-list-name">{{ p.produto }}</span>
              <span class="rep-list-qty">{{ p.quantidade }}x</span>
              <strong>{{ moeda(p.vendido) }}</strong>
            </li>
          </ol>
        </section>

        <section class="rep-section">
          <h3>Por atendente</h3>
          <p v-if="!dados.por_atendente.length" class="rep-empty">Sem vendas entregues.</p>
          <ul v-else class="rep-list">
            <li v-for="a in dados.por_atendente" :key="a.atendente">
              <span class="rep-list-name">{{ a.atendente }}</span>
              <span class="rep-list-qty">{{ a.pedidos }} ped.</span>
              <strong>{{ moeda(a.vendido) }}</strong>
            </li>
          </ul>
        </section>

        <section class="rep-section">
          <h3>Por guarda-sol</h3>
          <p v-if="!dados.por_ponto.length" class="rep-empty">Sem vendas entregues.</p>
          <ul v-else class="rep-list">
            <li v-for="p in dados.por_ponto" :key="p.ponto">
              <span class="rep-list-name">{{ p.ponto }}</span>
              <span class="rep-list-qty">{{ p.pedidos }} ped.</span>
              <strong>{{ moeda(p.vendido) }}</strong>
            </li>
          </ul>
        </section>
      </div>

      <p class="rep-note">
        “Vendido” conta só pedidos marcados como <strong>entregues</strong> (o pagamento é na entrega). Pedidos em
        andamento aparecem em “a receber”. Horários de Brasília.
      </p>
    </div>

    <div v-else-if="!erroMsg" class="rep-empty rep-loading">Carregando relatórios...</div>
  </div>
</template>

<script>
import { mapActions } from "vuex";

export default {
  name: "Reports",

  props: {
    // sobe a cada pedido novo / mudanca de status vinda do servidor: recarrega os numeros na hora
    refreshKey: { type: Number, default: 0 },
  },

  data() {
    return {
      periodos: [
        { id: "today", nome: "Hoje" },
        { id: "yesterday", nome: "Ontem" },
        { id: "7d", nome: "7 dias" },
        { id: "month", nome: "Mês" },
        { id: "custom", nome: "Período" },
      ],
      periodo: "today",
      de: "",
      ate: "",
      dados: null,
      erro: false,
      erroMsg: "",
      timer: null,
      debounce: null,
      hoje: new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }),
    };
  },

  computed: {
    horaAtualizado() {
      return new Date(this.dados.atualizado_em).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" });
    },

    variacao() {
      const atual = Number(this.dados.resumo.vendido);
      const anterior = Number(this.dados.resumo.vendido_periodo_anterior);
      if (!anterior) return null;
      return Math.round(((atual - anterior) / anterior) * 100);
    },

    rotuloAnterior() {
      return { today: "vs ontem", yesterday: "vs anteontem" }[this.dados.periodo.tipo] || "vs período anterior";
    },

    tempo() {
      const m = this.dados.resumo.tempo_medio_entrega_min;
      return m === null || m === undefined ? "—" : m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}min`;
    },

    // do primeiro ao ultimo horario com venda (minimo de 6 barras), em vez de 24 barras quase vazias
    horasVisiveis() {
      const comVenda = this.dados.por_hora.filter((h) => h.pedidos > 0).map((h) => h.hora);
      if (!comVenda.length) return [];
      let ini = Math.min(...comVenda);
      let fim = Math.max(...comVenda);
      while (fim - ini < 5 && (ini > 0 || fim < 23)) {
        if (fim < 23) fim++;
        if (fim - ini < 5 && ini > 0) ini--;
      }
      return this.dados.por_hora.filter((h) => h.hora >= ini && h.hora <= fim);
    },

    maxHora() {
      return Math.max(...this.dados.por_hora.map((h) => h.vendido), 0);
    },

    maxDia() {
      return Math.max(...this.dados.por_dia.map((d) => d.vendido), 0);
    },
  },

  watch: {
    refreshKey() {
      // varios eventos seguidos (pedido + status) viram uma consulta so
      clearTimeout(this.debounce);
      this.debounce = setTimeout(() => this.carregar(true), 700);
    },
  },

  mounted() {
    this.carregar();
    // rede de seguranca: se um evento em tempo real se perder, atualiza sozinho a cada 20 s
    this.timer = setInterval(() => this.carregar(true), 20000);
  },

  beforeDestroy() {
    clearInterval(this.timer);
    clearTimeout(this.debounce);
  },

  methods: {
    ...mapActions(["loadReport"]),

    escolher(id) {
      this.periodo = id;
      if (id !== "custom") this.carregar();
      else if (this.de && this.ate) this.carregar();
    },

    async carregar(silencioso = false) {
      if (this.periodo === "custom" && !(this.de && this.ate)) return;

      try {
        this.dados = await this.loadReport({ period: this.periodo, from: this.de, to: this.ate });
        this.erro = false;
        this.erroMsg = "";
      } catch (e) {
        this.erro = true;
        if (!silencioso || !this.dados) {
          const r = e.response && e.response.data;
          this.erroMsg = (r && (r.message || (r.errors && Object.values(r.errors)[0][0]))) || "Não foi possível carregar os relatórios.";
        }
      }
    },

    moeda(v) {
      return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    },

    curto(v) {
      return v >= 1000 ? `${(v / 1000).toFixed(1).replace(".", ",")}k` : Math.round(v);
    },

    altura(v, max) {
      return max > 0 ? Math.max(3, Math.round((v / max) * 100)) : 0;
    },

    dataBr(iso) {
      return iso.split("-").reverse().join("/");
    },

    diaMes(iso) {
      const [, m, d] = iso.split("-");
      return `${d}/${m}`;
    },
  },
};
</script>

<style scoped>
.reports {
  background: rgba(255, 255, 255, 0.96);
  margin: 16px;
  padding: 18px;
  border-radius: 14px;
  color: #1f2d3a;
}

.rep-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.rep-periods {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.rep-period {
  border: 1px solid #c4ced6;
  background: #fff;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #0a4d78;
  cursor: pointer;
}

.rep-period.active {
  background: #0a4d78;
  border-color: #0a4d78;
  color: #fff;
}

.rep-live {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #5c6b78;
}

.rep-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #1c9c4a;
  animation: pulso 1.6s infinite;
}

.rep-dot.off {
  background: #b02a37;
  animation: none;
}

@keyframes pulso {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

.rep-custom {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 12px;
  font-size: 13px;
}

.rep-custom input {
  border: 1px solid #c4ced6;
  border-radius: 8px;
  padding: 6px 8px;
  margin-left: 4px;
}

.rep-erro {
  margin: 14px 0 0;
  color: #b02a37;
  font-size: 14px;
}

.rep-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.rep-card {
  background: #f3f7fa;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rep-card-main {
  grid-column: span 2;
  background: #0a4d78;
  color: #fff;
}

.rep-card-warn {
  background: #fff3cd;
}

.rep-card-label {
  font-size: 12px;
  opacity: 0.8;
}

.rep-card-value {
  font-size: 26px;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.rep-card-main .rep-card-value {
  font-size: 34px;
}

.rep-var {
  font-size: 12px;
}

.rep-var.up { color: #8ff0ae; }
.rep-var.down { color: #ffb4b4; }
.rep-var.muted { opacity: 0.7; }
.rep-card:not(.rep-card-main) .rep-var.muted { color: #5c6b78; opacity: 1; }

.rep-section {
  margin-top: 22px;
}

.rep-section h3 {
  font-size: 15px;
  color: #0a4d78;
  margin: 0 0 10px;
}

.rep-bars {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 180px;
  padding-top: 18px;
  overflow-x: auto;
}

.rep-bar-col {
  flex: 1 0 26px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 3px;
}

.rep-bar {
  width: 100%;
  background: #1a8fc4;
  border-radius: 6px 6px 0 0;
  min-height: 0;
  transition: height 0.3s ease;
}

.rep-bar-day {
  background: #d4820a;
}

.rep-bar-val {
  font-size: 10px;
  color: #5c6b78;
  font-variant-numeric: tabular-nums;
}

.rep-bar-lbl {
  font-size: 11px;
  color: #5c6b78;
}

.rep-lists {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 8px 24px;
}

.rep-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.rep-list li {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #e6ecf0;
  font-size: 14px;
}

.rep-list-name {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

.rep-list-qty {
  color: #5c6b78;
  font-size: 12px;
}

.rep-empty {
  color: #5c6b78;
  font-size: 14px;
  margin: 8px 0;
}

.rep-loading {
  padding: 30px 0;
  text-align: center;
}

.rep-note {
  margin-top: 22px;
  font-size: 12px;
  color: #5c6b78;
}

@media (max-width: 520px) {
  .rep-card-main {
    grid-column: span 1;
  }
}
</style>
