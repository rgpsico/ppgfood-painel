<template>
  <div class="beach-map">
    <div class="beach-toolbar">
      <div class="columns-stepper" v-if="!editing">
        <span class="columns-label">Colunas</span>
        <button class="stepper-btn" @click="changeColumns(-1)" :disabled="columns <= minColumns">
          <i class="fa-solid fa-minus"></i>
        </button>
        <span class="columns-value">{{ columns }}</span>
        <button class="stepper-btn" @click="changeColumns(1)" :disabled="columns >= maxColumns">
          <i class="fa-solid fa-plus"></i>
        </button>
      </div>

      <div class="toolbar-actions">
        <button v-if="!editing" class="btn-organize" @click="startEditing">
          <i class="fa-solid fa-arrows-up-down-left-right"></i> Organizar mapa
        </button>
        <template v-else>
          <button class="btn-cancel" :disabled="savingLayout" @click="cancelOrganization">
            Cancelar
          </button>
          <button class="btn-save" :disabled="savingLayout" @click="saveOrganization">
            {{ savingLayout ? "Salvando..." : "Salvar organização" }}
          </button>
        </template>
      </div>
    </div>

    <p class="beach-hint">
      {{
        editing
          ? "Arraste os guarda-sóis pra organizar. Toque não abre pedidos nesse modo."
          : "Toque num guarda-sol pra ver os pedidos."
      }}
    </p>

    <div class="sea-band">
      <div class="sea-foam"></div>
    </div>

    <div class="sand-scroll" ref="sandScroll">
      <div
        class="sand-area"
        ref="grid"
        :style="{
          gridTemplateColumns: `repeat(${columns}, minmax(96px, 1fr))`,
          gridAutoRows: cellHeight + 'px',
          minWidth: columns * 100 + 'px',
        }"
      >
        <div
          v-if="dragState && editing && dropPreview"
          class="drop-target-ghost"
          :style="{ gridRow: dropPreview.row + 1, gridColumn: dropPreview.col + 1 }"
        ></div>

        <div
          v-for="table in positionedTables"
          :key="table.identify"
          class="beach-tile"
          :class="{
            editing: editing,
            dragging: dragState && dragState.identify === table.identify,
            'has-order': table.order,
            blinking: !editing && blinkingTable === table.identify,
          }"
          :style="{ gridRow: table.row + 1, gridColumn: table.col + 1 }"
          @pointerdown="startDrag($event, table)"
        >
          <i class="fa-solid fa-umbrella-beach tile-icon"></i>
          <span class="tile-name">{{ table.name }}</span>
          <span class="tile-status">
            <span class="status-dot" :class="table.order ? 'dot-order' : 'dot-free'"></span>
            <template v-if="table.order">
              {{ table.order.products.length }}
              {{ table.order.products.length === 1 ? "item" : "itens" }}
            </template>
            <template v-else>Livre</template>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapActions } from "vuex";

const STORAGE_KEY = "painel_beach_columns";

export default {
  name: "BeachMap",

  props: {
    tables: {
      type: Array,
      required: true,
    },
    blinkingTable: {
      type: String,
      default: null,
    },
  },

  data() {
    return {
      columns: parseInt(localStorage.getItem(STORAGE_KEY), 10) || 5,
      minColumns: 3,
      maxColumns: 10,
      cellHeight: 110,
      editing: false,
      savingLayout: false,
      localPositions: {},
      dragState: null,
      dropPreview: null,
    };
  },

  computed: {
    // Posicoes usadas pra renderizar: durante edicao usa a copia de
    // trabalho local (pra "Cancelar" poder descartar), fora da edicao
    // deriva sempre da posicao ja salva (com auto-encaixe pra quem
    // ainda nao tem uma).
    positionedTables() {
      const source = this.editing ? this.localPositions : this.autoPositions;
      return this.tables.map((t) => ({
        ...t,
        row: source[t.identify] ? source[t.identify].row : 0,
        col: source[t.identify] ? source[t.identify].col : 0,
      }));
    },

    // Quem ja tem beach_row/beach_col mantem a posicao. Quem ainda nao
    // tem (guarda-sol novo) cai na proxima celula livre em ordem de
    // leitura, sem bagunçar quem ja foi organizado.
    autoPositions() {
      const positions = {};
      const occupied = new Set();

      this.tables.forEach((t) => {
        if (t.beach_row !== null && t.beach_row !== undefined && t.beach_col !== null && t.beach_col !== undefined) {
          positions[t.identify] = { row: t.beach_row, col: t.beach_col };
          occupied.add(`${t.beach_row}-${t.beach_col}`);
        }
      });

      let row = 0;
      let col = 0;
      this.tables.forEach((t) => {
        if (positions[t.identify]) return;

        while (occupied.has(`${row}-${col}`)) {
          col++;
          if (col >= this.columns) {
            col = 0;
            row++;
          }
        }

        positions[t.identify] = { row, col };
        occupied.add(`${row}-${col}`);
        col++;
        if (col >= this.columns) {
          col = 0;
          row++;
        }
      });

      return positions;
    },
  },

  methods: {
    ...mapActions(["updateTableBeachPosition"]),

    changeColumns(delta) {
      const next = this.columns + delta;
      if (next < this.minColumns || next > this.maxColumns) return;
      this.columns = next;
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (e) {
        // localStorage indisponivel - segue sem persistir
      }
    },

    startEditing() {
      this.localPositions = JSON.parse(JSON.stringify(this.autoPositions));
      this.editing = true;
    },

    cancelOrganization() {
      this.localPositions = {};
      this.editing = false;
    },

    async saveOrganization() {
      this.savingLayout = true;
      const entries = Object.entries(this.localPositions);

      try {
        await Promise.all(
          entries.map(([identify, pos]) =>
            this.updateTableBeachPosition({ identify, row: pos.row, col: pos.col })
          )
        );
        this.$vToastify.success("Organização do mapa salva", "Pronto");
        this.editing = false;
      } catch (e) {
        this.$vToastify.error("Não foi possível salvar tudo, tente de novo", "Erro");
      } finally {
        this.savingLayout = false;
      }
    },

    startDrag(event, table) {
      const rect = this.$refs.grid.getBoundingClientRect();

      this.dragState = {
        identify: table.identify,
        startClientX: event.clientX,
        startClientY: event.clientY,
        moved: false,
        gridRect: rect,
      };

      window.addEventListener("pointermove", this.onDragMove);
      window.addEventListener("pointerup", this.endDrag);
    },

    onDragMove(event) {
      if (!this.dragState) return;

      const dx = event.clientX - this.dragState.startClientX;
      const dy = event.clientY - this.dragState.startClientY;
      if (Math.abs(dx) + Math.abs(dy) > 4) {
        this.dragState.moved = true;
      }

      if (!this.editing) return;

      // Rola a pagina sozinho perto da borda, pra dar pra soltar mais
      // embaixo mesmo com a lista comprida
      const margin = 80;
      if (event.clientY > window.innerHeight - margin) {
        window.scrollBy(0, 14);
      } else if (event.clientY < margin) {
        window.scrollBy(0, -14);
      }

      const rect = this.$refs.grid.getBoundingClientRect();
      const cellWidth = rect.width / this.columns;

      const relX = event.clientX - rect.left;
      const relY = event.clientY - rect.top;

      let col = Math.floor(relX / cellWidth);
      let row = Math.floor(relY / this.cellHeight);
      col = Math.max(0, Math.min(this.columns - 1, col));
      row = Math.max(0, row);

      this.dropPreview = { row, col };
    },

    endDrag() {
      if (!this.dragState) return;

      window.removeEventListener("pointermove", this.onDragMove);
      window.removeEventListener("pointerup", this.endDrag);

      const { identify, moved } = this.dragState;
      const table = this.tables.find((t) => t.identify === identify);

      if (!moved) {
        this.dragState = null;
        this.dropPreview = null;
        if (!this.editing && table) {
          this.$emit("open-table", table);
        }
        return;
      }

      if (this.editing && this.dropPreview) {
        this.placeAt(identify, this.dropPreview.row, this.dropPreview.col);
      }

      this.dragState = null;
      this.dropPreview = null;
    },

    // Troca de lugar com quem ja estiver na celula de destino, pra nunca
    // sobrepor dois guarda-sois na mesma posicao
    placeAt(identify, row, col) {
      const current = { ...this.localPositions };
      const occupantId = Object.keys(current).find(
        (id) => id !== identify && current[id].row === row && current[id].col === col
      );

      if (occupantId) {
        current[occupantId] = current[identify];
      }

      current[identify] = { row, col };
      this.localPositions = current;
    },
  },

  beforeDestroy() {
    window.removeEventListener("pointermove", this.onDragMove);
    window.removeEventListener("pointerup", this.endDrag);
  },
};
</script>

<style scoped>
.beach-map {
  display: flex;
  flex-direction: column;
}

.beach-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 10px;
}

.columns-stepper {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 999px;
  padding: 6px 12px;
}

.columns-label {
  font-size: 13px;
  font-weight: 600;
  color: #6c757d;
}

.stepper-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: #0a4d78;
  color: #fff;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stepper-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.columns-value {
  font-weight: 700;
  color: #2c3e50;
  min-width: 14px;
  text-align: center;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.btn-organize,
.btn-save,
.btn-cancel {
  border: none;
  border-radius: 999px;
  padding: 9px 18px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}

.btn-organize {
  background: #0a4d78;
  color: #fff;
}

.btn-save {
  background: #28a745;
  color: #fff;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.9);
  color: #6c757d;
}

.btn-organize:disabled,
.btn-save:disabled,
.btn-cancel:disabled {
  opacity: 0.6;
  cursor: default;
}

.beach-hint {
  color: #fff;
  font-size: 13px;
  text-align: center;
  margin: 0 0 10px;
}

.sea-band {
  position: relative;
  height: 70px;
  background: linear-gradient(180deg, #1a8fc4 0%, #0e6ea3 100%);
  border-radius: 16px 16px 0 0;
  overflow: hidden;
  flex-shrink: 0;
}

.sea-foam {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 22px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 20'%3E%3Cpath d='M0 10 Q 25 0 50 10 T 100 10 T 150 10 T 200 10 V20 H0 Z' fill='%23f4d9a0'/%3E%3C/svg%3E");
  background-repeat: repeat-x;
  background-size: 200px 22px;
  animation: wave-shift 9s linear infinite;
}

@keyframes wave-shift {
  from {
    background-position-x: 0;
  }
  to {
    background-position-x: 200px;
  }
}

.sand-scroll {
  overflow-x: auto;
  border-radius: 0 0 16px 16px;
}

.sand-area {
  position: relative;
  display: grid;
  gap: 14px;
  padding: 24px;
  background-color: #f4d9a0;
  background-image: radial-gradient(rgba(180, 140, 80, 0.18) 1px, transparent 1px);
  background-size: 14px 14px;
}

.beach-tile {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  touch-action: none;
  user-select: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}

.beach-tile:hover {
  transform: translateY(-3px);
}

.beach-tile.editing {
  cursor: grab;
  box-shadow: 0 0 0 2px rgba(10, 77, 120, 0.25);
}

.beach-tile.editing:hover {
  transform: none;
}

.beach-tile.dragging {
  cursor: grabbing;
  opacity: 0.45;
  z-index: 5;
}

.beach-tile.has-order {
  background: #fff3cd;
  box-shadow: 0 0 0 2px #ffc107;
}

.beach-tile.blinking {
  animation: beach-blink 1s infinite;
}

@keyframes beach-blink {
  0%, 100% {
    box-shadow: 0 0 0 2px #ffc107;
  }
  50% {
    box-shadow: 0 0 0 6px #dc3545;
    transform: scale(1.05);
  }
}

.tile-icon {
  font-size: 24px;
  color: #d4820a;
}

.tile-name {
  font-weight: 700;
  font-size: 12px;
  color: #333;
  text-align: center;
}

.tile-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  color: #6c757d;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.dot-free {
  background: #28a745;
}

.status-dot.dot-order {
  background: #ffc107;
}

.drop-target-ghost {
  border: 2px dashed #0a4d78;
  border-radius: 12px;
  background: rgba(10, 77, 120, 0.08);
}

@media (max-width: 480px) {
  .beach-toolbar {
    justify-content: center;
  }
}
</style>
