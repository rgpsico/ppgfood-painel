<template>
  <div class="board-page">
    <header class="board-header">
      <div>
        <h1>{{ me ? me.tenant_name : "" }}</h1>
        <p class="header-subtitle">Painel de recebimento de pedidos</p>
      </div>
      <button class="btn-logout" @click="doLogout">Sair</button>
    </header>

    <div class="tabs">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'live' }"
        @click="activeTab = 'live'"
      >
        Ao vivo
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'history' }"
        @click="showHistory"
      >
        Histórico
      </button>
    </div>

    <div class="sea" v-if="activeTab === 'live' && !loading">
      <div class="view-switch" v-if="tables.length > 0">
        <button
          class="view-switch-btn"
          :class="{ active: viewMode === 'map' }"
          @click="setViewMode('map')"
        >
          <i class="fa-solid fa-map-location-dot"></i> Mapa
        </button>
        <button
          class="view-switch-btn"
          :class="{ active: viewMode === 'list' }"
          @click="setViewMode('list')"
        >
          <i class="fa-solid fa-list"></i> Lista
        </button>
      </div>

      <p class="beach-hint" v-if="tables.length > 0 && viewMode === 'map'">
        Toque em um guarda-sol para ver os pedidos. Arraste pra reorganizar o mapa.
      </p>

      <div
        v-if="viewMode === 'map'"
        class="beach-canvas"
        ref="beachCanvas"
        :style="{ minHeight: beachHeight + 'px' }"
      >
        <div
          v-for="table in tablesWithPosition"
          :key="table.identify"
          class="umbrella-card"
          :class="{
            'has-order': table.order,
            blinking: blinkingTable === table.identify,
            dragging: dragging && dragging.identify === table.identify,
          }"
          :style="cardStyle(table)"
          @mousedown="startDrag($event, table)"
          @touchstart="startDrag($event, table)"
        >
          <i class="fa-solid fa-umbrella-beach umbrella-icon"></i>
          <span class="table-name">{{ table.name }}</span>
          <span v-if="table.order" class="order-badge">
            {{ table.order.products.length }}
            {{ table.order.products.length === 1 ? "item" : "itens" }}
          </span>
        </div>
      </div>

      <div v-else-if="viewMode === 'list'" class="table-list">
        <div
          v-for="table in tablesSorted"
          :key="table.identify"
          class="table-list-row"
          :class="{
            'has-order': table.order,
            blinking: blinkingTable === table.identify,
          }"
          @click="openTableOrders(table)"
        >
          <i class="fa-solid fa-umbrella-beach list-icon"></i>
          <span class="list-name">{{ table.name }}</span>
          <span class="list-status">
            <span class="status-dot" :class="table.order ? 'dot-order' : 'dot-free'"></span>
            <template v-if="table.order">
              {{ table.order.products.length }}
              {{ table.order.products.length === 1 ? "item" : "itens" }}
            </template>
            <template v-else>Livre</template>
          </span>
          <i class="fa-solid fa-chevron-right list-arrow"></i>
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

    <div class="history" v-else-if="activeTab === 'history'">
      <div class="history-filters">
        <div class="filter-group">
          <label>Status</label>
          <select v-model="filterStatus" class="form-control" @change="showHistory">
            <option value="pending">Pendentes</option>
            <option value="delivered">Entregues</option>
            <option value="all">Todos</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Guarda-sol / cadeira</label>
          <select v-model="filterTable" class="form-control" @change="showHistory">
            <option value="">Todos</option>
            <option v-for="table in tables" :key="table.identify" :value="table.identify">
              {{ table.name }}
            </option>
          </select>
        </div>
      </div>

      <div v-if="historyLoading" class="loading-state">Carregando...</div>

      <table v-else class="history-table">
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Local</th>
            <th>Status</th>
            <th>Horário</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="order in historyOrders"
            :key="order.identify"
            @click="openDetails(order)"
          >
            <td>{{ order.identify }}</td>
            <td>{{ order.table && order.table.name ? order.table.name : "Sem mesa" }}</td>
            <td>
              <span class="status-pill" :class="`status-${order.status}`">{{ order.status_label }}</span>
            </td>
            <td>{{ order.date_br }}</td>
            <td>R$ {{ order.total }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="!historyLoading && historyOrders.length === 0" class="empty-state">
        Nenhum pedido encontrado com esse filtro.
      </div>
    </div>

    <div v-else class="loading-state">Carregando...</div>

    <audio ref="alertSound" :src="alertSoundUrl" preload="auto"></audio>

    <b-modal
      id="modal-table-orders"
      hide-footer
      :title="tableOrdersModal.table ? `Pedidos - ${tableOrdersModal.table.name}` : ''"
    >
      <div v-if="tableOrdersModal.loading" class="loading-state loading-state-dark">
        Carregando...
      </div>

      <div v-else>
        <table v-if="tableOrdersModal.orders.length > 0" class="history-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Status</th>
              <th>Horário</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="order in tableOrdersModal.orders"
              :key="order.identify"
              @click="openDetailsFromTableOrders(order)"
            >
              <td>{{ order.identify }}</td>
              <td>
                <span class="status-pill" :class="`status-${order.status}`">{{ order.status_label }}</span>
              </td>
              <td>{{ order.date_br }}</td>
              <td>R$ {{ order.total }}</td>
            </tr>
          </tbody>
        </table>

        <p v-else class="empty-state empty-state-dark">
          Nenhum pedido registrado nesse guarda-sol ainda.
        </p>
      </div>
    </b-modal>

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

        <button
          class="btn-status"
          :class="selectedOrder.status === 'done' ? 'btn-undo' : 'btn-deliver'"
          :disabled="updatingStatus"
          @click="toggleDelivered"
        >
          {{
            updatingStatus
              ? "Salvando..."
              : selectedOrder.status === "done"
              ? "Marcar como pendente"
              : "Marcar como entregue"
          }}
        </button>
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
      activeTab: "live",
      filterStatus: "pending",
      filterTable: "",
      updatingStatus: false,
      tableOrdersModal: {
        table: null,
        orders: [],
        loading: false,
      },
      dragging: null,
      liveDragPos: null,
      windowWidth: window.innerWidth,
      viewMode: localStorage.getItem("painel_view_mode") || "map",
    };
  },

  computed: {
    ...mapState({
      me: (state) => state.auth.me,
      tables: (state) => state.board.tables,
      ordersWithoutTable: (state) => state.board.ordersWithoutTable,
      loading: (state) => state.board.loading,
      blinkingTable: (state) => state.board.blinkingTable,
      historyOrders: (state) => state.board.historyOrders,
      historyLoading: (state) => state.board.historyLoading,
    }),

    // Menos colunas em telas estreitas, senao os cards de 110px
    // se sobrepoem no celular
    gridColumns() {
      if (this.windowWidth < 480) return 2;
      if (this.windowWidth < 768) return 3;
      return 5;
    },

    // Guarda-sois sem posicao salva ainda entram numa grade padrao,
    // ate o staff arrastar cada um pro lugar certo no mapa
    tablesWithPosition() {
      const columns = this.gridColumns;
      return this.tables.map((table, index) => {
        let x = table.position_x;
        let y = table.position_y;

        if (x === null || x === undefined || y === null || y === undefined) {
          const col = index % columns;
          const row = Math.floor(index / columns);
          x = 12 + col * (76 / (columns - 1 || 1));
          y = 15 + row * 20;
        }

        return { ...table, x, y };
      });
    },

    // Cresce conforme o numero de guarda-sois, pra ter espaco suficiente
    // pra arrastar sem ficar tudo espremido
    beachHeight() {
      const rows = Math.ceil(this.tables.length / this.gridColumns) || 1;
      return Math.max(420, 160 + rows * 160);
    },

    // Guarda-sois em ordem (1, 2, 3...10, nao 1, 10, 2...) pra tela de lista
    tablesSorted() {
      return [...this.tables].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true })
      );
    },
  },

  mounted() {
    this.loadBoard();
    this.connectRealtime();
    window.addEventListener("resize", this.onResize);
  },

  beforeDestroy() {
    if (this.me) {
      echo.leaveChannel(`order-created.${this.me.tenant_id}`);
    }

    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("mousemove", this.onDragMove);
    window.removeEventListener("touchmove", this.onDragMove);
    window.removeEventListener("mouseup", this.endDrag);
    window.removeEventListener("touchend", this.endDrag);
  },

  methods: {
    ...mapActions([
      "loadBoard",
      "logout",
      "loadHistory",
      "updateOrderStatus",
      "getOrdersByTable",
      "updateTablePosition",
    ]),
    ...mapMutations(["APPLY_NEW_ORDER", "CLEAR_BLINK"]),

    showHistory() {
      this.activeTab = "history";
      this.loadHistory({ status: this.filterStatus, table: this.filterTable });
    },

    toggleDelivered() {
      const newStatus = this.selectedOrder.status === "done" ? "open" : "done";
      this.updatingStatus = true;

      this.updateOrderStatus({ identify: this.selectedOrder.identify, status: newStatus })
        .then((updatedOrder) => {
          this.selectedOrder = updatedOrder;
          this.$vToastify.success(
            newStatus === "done" ? "Pedido marcado como entregue" : "Pedido marcado como pendente",
            "Pronto"
          );
          if (this.activeTab === "history") {
            this.loadHistory({ status: this.filterStatus, table: this.filterTable });
          }
          if (this.tableOrdersModal.table) {
            this.getOrdersByTable(this.tableOrdersModal.table.identify).then((orders) => {
              this.tableOrdersModal.orders = orders;
            });
          }
        })
        .catch(() => {
          this.$vToastify.error("Não foi possível atualizar o status", "Erro");
        })
        .finally(() => {
          this.updatingStatus = false;
        });
    },

    onResize() {
      this.windowWidth = window.innerWidth;
    },

    setViewMode(mode) {
      this.viewMode = mode;
      try {
        localStorage.setItem("painel_view_mode", mode);
      } catch (e) {
        // localStorage indisponivel - segue sem persistir
      }
    },

    connectRealtime() {
      if (!this.me) return;

      echo.channel(`order-created.${this.me.tenant_id}`).listen("OrderCreated", (e) => {
        this.APPLY_NEW_ORDER(e.order);
        this.$refs.alertSound.play().catch(() => {});

        const local =
          e.order.table && e.order.table.name ? e.order.table.name : "Delivery/retirada";

        // canTimeout: false pra o toast so sumir quando o staff clicar -
        // e o clique (que dispara o dismiss) e o gatilho pra abrir o pedido
        this.$vToastify.success({
          title: "Novo pedido!",
          body: `${local} — toque para ver o pedido`,
          canTimeout: false,
          callback: () => this.openDetails(e.order),
        });

        setTimeout(() => this.CLEAR_BLINK(), 6000);
      });
    },

    openDetails(order) {
      if (!order) return;
      this.selectedOrder = order;
      this.$bvModal.show("modal-order-details");
    },

    openTableOrders(table) {
      this.tableOrdersModal.table = table;
      this.tableOrdersModal.orders = [];
      this.tableOrdersModal.loading = true;
      this.$bvModal.show("modal-table-orders");

      this.getOrdersByTable(table.identify)
        .then((orders) => {
          this.tableOrdersModal.orders = orders;
        })
        .catch(() => {
          this.$vToastify.error("Não foi possível carregar os pedidos", "Erro");
        })
        .finally(() => {
          this.tableOrdersModal.loading = false;
        });
    },

    openDetailsFromTableOrders(order) {
      this.$bvModal.hide("modal-table-orders");
      this.openDetails(order);
    },

    doLogout() {
      this.logout().then(() => {
        this.$router.push({ name: "login" });
      });
    },

    cardStyle(table) {
      if (this.liveDragPos && this.liveDragPos.identify === table.identify) {
        return {
          left: `${this.liveDragPos.left}px`,
          top: `${this.liveDragPos.top}px`,
        };
      }

      return {
        left: `${table.x}%`,
        top: `${table.y}%`,
      };
    },

    startDrag(event, table) {
      event.preventDefault();
      const rect = this.$refs.beachCanvas.getBoundingClientRect();
      const point = event.touches ? event.touches[0] : event;

      this.dragging = {
        identify: table.identify,
        rect,
        startClientX: point.clientX,
        startClientY: point.clientY,
        moved: false,
      };

      this.liveDragPos = {
        identify: table.identify,
        left: point.clientX - rect.left,
        top: point.clientY - rect.top,
      };

      window.addEventListener("mousemove", this.onDragMove);
      window.addEventListener("touchmove", this.onDragMove, { passive: false });
      window.addEventListener("mouseup", this.endDrag);
      window.addEventListener("touchend", this.endDrag);
    },

    onDragMove(event) {
      if (!this.dragging) return;
      event.preventDefault();

      const point = event.touches ? event.touches[0] : event;
      const rect = this.dragging.rect;

      const distance =
        Math.abs(point.clientX - this.dragging.startClientX) +
        Math.abs(point.clientY - this.dragging.startClientY);
      if (distance > 4) {
        this.dragging.moved = true;
      }

      this.liveDragPos = {
        identify: this.dragging.identify,
        left: point.clientX - rect.left,
        top: point.clientY - rect.top,
      };
    },

    endDrag() {
      if (!this.dragging) return;

      const { identify, rect, moved } = this.dragging;
      const table = this.tables.find((t) => t.identify === identify);

      window.removeEventListener("mousemove", this.onDragMove);
      window.removeEventListener("touchmove", this.onDragMove);
      window.removeEventListener("mouseup", this.endDrag);
      window.removeEventListener("touchend", this.endDrag);

      if (!moved) {
        this.dragging = null;
        this.liveDragPos = null;
        if (table) this.openTableOrders(table);
        return;
      }

      const positionX = Math.min(100, Math.max(0, (this.liveDragPos.left / rect.width) * 100));
      const positionY = Math.min(100, Math.max(0, (this.liveDragPos.top / rect.height) * 100));

      if (table) {
        table.position_x = positionX;
        table.position_y = positionY;
      }

      this.dragging = null;
      this.liveDragPos = null;

      this.updateTablePosition({ identify, positionX, positionY }).catch(() => {
        this.$vToastify.error("Não foi possível salvar a posição", "Erro");
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

.view-switch {
  display: inline-flex;
  gap: 4px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 16px;
}

.view-switch-btn {
  border: none;
  background: transparent;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  color: #6c757d;
  cursor: pointer;
}

.view-switch-btn.active {
  background: #0a4d78;
  color: #fff;
}

.table-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.table-list-row {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 10px;
  padding: 14px 18px;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.table-list-row:hover {
  transform: translateX(4px);
}

.table-list-row.has-order {
  background: #fff3cd;
  box-shadow: 0 0 0 2px #ffc107;
}

.table-list-row.blinking {
  animation: blink 1s infinite;
}

.list-icon {
  font-size: 22px;
  color: #d4820a;
  width: 24px;
  text-align: center;
}

.list-name {
  font-weight: 600;
  color: #333;
  flex: 1;
}

.list-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6c757d;
  font-weight: 600;
}

.status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.dot-free {
  background: #28a745;
}

.status-dot.dot-order {
  background: #ffc107;
}

.list-arrow {
  color: #adb5bd;
  font-size: 13px;
}

.beach-hint {
  color: #fff;
  text-align: center;
  margin-bottom: 16px;
  font-size: 14px;
}

.beach-canvas {
  position: relative;
  min-height: 480px;
  background: linear-gradient(180deg, #f4d9a0 0%, #f4d9a0 12%, #1a8fc4 12%, #0e6ea3 100%);
  border-radius: 16px;
  margin-bottom: 20px;
  overflow: hidden;
}

.beach-canvas .umbrella-card {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 110px;
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.beach-canvas .umbrella-card:hover {
  transform: translate(-50%, -50%);
}

.beach-canvas .umbrella-card.dragging {
  cursor: grabbing;
  z-index: 10;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

@media (max-width: 768px) {
  .beach-canvas .umbrella-card {
    width: 84px;
    padding: 12px 6px;
    gap: 4px;
  }

  .beach-canvas .umbrella-icon {
    font-size: 22px;
  }

  .beach-canvas .table-name {
    font-size: 12px;
  }

  .beach-canvas .order-badge {
    font-size: 10px;
    padding: 1px 6px;
  }
}

@media (max-width: 480px) {
  .beach-canvas .umbrella-card {
    width: 68px;
    padding: 8px 4px;
  }

  .beach-canvas .umbrella-icon {
    font-size: 18px;
  }

  .beach-canvas .table-name {
    font-size: 10px;
  }

  .sea {
    padding: 20px 12px;
  }
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

.btn-status {
  width: 100%;
  margin-top: 16px;
  padding: 10px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
}

.btn-status:disabled {
  opacity: 0.7;
  cursor: default;
}

.btn-deliver {
  background: #28a745;
}

.btn-undo {
  background: #6c757d;
}

.tabs {
  display: flex;
  gap: 8px;
  padding: 0 24px;
  background: rgba(255, 255, 255, 0.9);
}

.tab-btn {
  border: none;
  background: transparent;
  padding: 12px 16px;
  font-weight: 600;
  color: #6c757d;
  cursor: pointer;
  border-bottom: 3px solid transparent;
}

.tab-btn.active {
  color: #0a4d78;
  border-bottom-color: #0a4d78;
}

.history {
  flex: 1;
  padding: 24px;
}

.history-filters {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
  color: #fff;
}

.filter-group .form-control {
  padding: 8px 12px;
  border-radius: 6px;
  border: none;
  min-width: 200px;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 10px;
  overflow: hidden;
}

.history-table th,
.history-table td {
  padding: 10px 14px;
  text-align: left;
  font-size: 14px;
}

.history-table thead {
  background: #0a4d78;
  color: #fff;
}

.history-table tbody tr {
  cursor: pointer;
  border-top: 1px solid #eee;
}

.history-table tbody tr:hover {
  background: #f4f9fc;
}

.status-pill {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.status-open,
.status-working,
.status-delivering {
  background: #ffc107;
  color: #333;
}

.status-done {
  background: #28a745;
}

.status-rejected,
.status-canceled {
  background: #dc3545;
}

.loading-state-dark,
.empty-state-dark {
  color: #333;
}
</style>
