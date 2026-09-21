<template>
  <div class="board-page">
    <header class="board-header">
      <div>
        <h1>{{ me ? me.tenant_name : "" }}</h1>
        <p class="header-subtitle">Painel de recebimento de pedidos</p>
      </div>
      <button class="btn-logout" @click="doLogout">Sair</button>
    </header>

    <div class="sea" v-if="!loading">
      <div class="table-grid">
        <div
          v-for="table in tables"
          :key="table.identify"
          class="umbrella-card"
          :class="{
            'has-order': table.order,
            blinking: blinkingTable === table.identify,
          }"
          @click="openDetails(table.order)"
        >
          <i class="fa-solid fa-umbrella-beach umbrella-icon"></i>
          <span class="table-name">{{ table.name }}</span>
          <span v-if="table.order" class="order-badge">
            {{ table.order.products.length }}
            {{ table.order.products.length === 1 ? "item" : "itens" }}
          </span>
        </div>
      </div>

      <div v-if="tables.length === 0" class="empty-state">
        Nenhum guarda-sol/cadeira cadastrado ainda.
      </div>

      <div class="no-table-orders" v-if="ordersWithoutTable.length > 0">
        <h2>Pedidos sem guarda-sol (delivery / retirada)</h2>
        <div class="table-grid">
          <div
            v-for="order in ordersWithoutTable"
            :key="order.identify"
            class="umbrella-card no-table has-order"
            @click="openDetails(order)"
          >
            <i class="fa-solid fa-bag-shopping umbrella-icon"></i>
            <span class="table-name">{{ order.client ? order.client.name : "Pedido" }}</span>
            <span class="order-badge">
              {{ order.products.length }}
              {{ order.products.length === 1 ? "item" : "itens" }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="loading-state">Carregando...</div>

    <audio ref="alertSound" :src="alertSoundUrl" preload="auto"></audio>

    <b-modal
      id="modal-order-details"
      hide-footer
      :title="selectedOrder ? `Pedido ${selectedOrder.identify}` : ''"
    >
      <div v-if="selectedOrder">
        <p>
          <strong>Local:</strong>
          {{ selectedOrder.table && selectedOrder.table.name ? selectedOrder.table.name : "Sem guarda-sol (delivery/retirada)" }}
        </p>
        <p v-if="selectedOrder.client"><strong>Cliente:</strong> {{ selectedOrder.client.name }}</p>
        <p><strong>Status:</strong> {{ selectedOrder.status_label }}</p>
        <p><strong>Horário:</strong> {{ selectedOrder.date_br }}</p>

        <hr />

        <ul class="order-products">
          <li v-for="product in selectedOrder.products" :key="product.identify">
            {{ product.quantity }}x {{ product.title }}
          </li>
        </ul>

        <p v-if="selectedOrder.comment"><strong>Comentário:</strong> {{ selectedOrder.comment }}</p>

        <hr />

        <p class="order-total"><strong>Total: R$ {{ selectedOrder.total }}</strong></p>
      </div>
    </b-modal>
  </div>
</template>

<script>
import { mapState, mapActions, mapMutations } from "vuex";
import echo from "@/echo";
import { SOCKET_URL } from "@/configs/api";

export default {
  name: "Board",

  data() {
    return {
      selectedOrder: null,
      alertSoundUrl: `${SOCKET_URL}/mp3/alert.wav`,
    };
  },

  computed: {
    ...mapState({
      me: (state) => state.auth.me,
      tables: (state) => state.board.tables,
      ordersWithoutTable: (state) => state.board.ordersWithoutTable,
      loading: (state) => state.board.loading,
      blinkingTable: (state) => state.board.blinkingTable,
    }),
  },

  mounted() {
    this.loadBoard();
    this.connectRealtime();
  },

  beforeDestroy() {
    if (this.me) {
      echo.leaveChannel(`order-created.${this.me.tenant_id}`);
    }
  },

  methods: {
    ...mapActions(["loadBoard", "logout"]),
    ...mapMutations(["APPLY_NEW_ORDER", "CLEAR_BLINK"]),

    connectRealtime() {
      if (!this.me) return;

      echo.channel(`order-created.${this.me.tenant_id}`).listen("OrderCreated", (e) => {
        this.APPLY_NEW_ORDER(e.order);
        this.$refs.alertSound.play().catch(() => {});

        setTimeout(() => this.CLEAR_BLINK(), 6000);
      });
    },

    openDetails(order) {
      if (!order) return;
      this.selectedOrder = order;
      this.$bvModal.show("modal-order-details");
    },

    doLogout() {
      this.logout().then(() => {
        this.$router.push({ name: "login" });
      });
    },
  },
};
</script>

<style scoped>
.board-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f4d9a0 0%, #f4d9a0 20%, #1a8fc4 20%, #0a4d78 100%);
  display: flex;
  flex-direction: column;
}

.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.9);
}

.board-header h1 {
  font-size: 20px;
  margin: 0;
  color: #0a4d78;
}

.header-subtitle {
  margin: 0;
  font-size: 13px;
  color: #6c757d;
}

.btn-logout {
  border: none;
  background: transparent;
  color: #0a4d78;
  font-weight: 600;
  cursor: pointer;
}

.sea {
  flex: 1;
  padding: 32px 24px;
}

.table-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 20px;
}

.umbrella-card {
  background: rgba(255, 255, 255, 0.85);
  border-radius: 12px;
  padding: 20px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.15s ease;
  position: relative;
}

.umbrella-card:hover {
  transform: translateY(-4px);
}

.umbrella-icon {
  font-size: 32px;
  color: #d4820a;
}

.umbrella-card.no-table .umbrella-icon {
  color: #0a4d78;
}

.table-name {
  font-weight: 600;
  color: #333;
  text-align: center;
}

.umbrella-card.has-order {
  background: #fff3cd;
  box-shadow: 0 0 0 2px #ffc107;
}

.order-badge {
  font-size: 12px;
  background: #ffc107;
  color: #333;
  padding: 2px 8px;
  border-radius: 10px;
}

.umbrella-card.blinking {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% {
    box-shadow: 0 0 0 2px #ffc107;
  }
  50% {
    box-shadow: 0 0 0 6px #dc3545;
    transform: scale(1.05);
  }
}

.no-table-orders {
  margin-top: 40px;
}

.no-table-orders h2 {
  color: #fff;
  font-size: 16px;
  margin-bottom: 16px;
}

.empty-state,
.loading-state {
  color: #fff;
  text-align: center;
  padding: 60px 20px;
  font-size: 15px;
}

.order-products {
  padding-left: 20px;
}

.order-total {
  font-size: 18px;
}
</style>
