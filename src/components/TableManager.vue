<template>
  <b-modal id="modal-manage-tables" title="Guarda-sóis e cadeiras" hide-footer size="lg" scrollable @show="carregar">
    <section class="new-box">
      <h3>Cadastrar</h3>

      <div class="tipo-choice">
        <button
          type="button"
          class="tipo-btn"
          :class="{ active: form.tipo === 'guarda_sol' }"
          @click="form.tipo = 'guarda_sol'"
        >
          <i class="fa-solid fa-umbrella-beach"></i>
          <strong>Guarda-sol</strong>
          <small>com as cadeiras dele</small>
        </button>
        <button
          type="button"
          class="tipo-btn"
          :class="{ active: form.tipo === 'cadeira' }"
          @click="form.tipo = 'cadeira'"
        >
          <i class="fa-solid fa-chair"></i>
          <strong>Só cadeira</strong>
          <small>cliente pega só a cadeira</small>
        </button>
      </div>

      <div class="form-row">
        <label class="field">
          <span>Nome (opcional)</span>
          <input v-model="form.nome" type="text" maxlength="60" :placeholder="`Automático: ${sugestao}`" />
        </label>
        <label class="field field-qty">
          <span>Quantidade</span>
          <input v-model.number="form.quantidade" type="number" min="1" max="30" />
        </label>
      </div>

      <p class="hint">
        Sem nome, o painel numera sozinho ({{ sugestao }}). Depois de cadastrar, arraste no mapa
        em <strong>Praia → Organizar mapa</strong>.
      </p>

      <button type="button" class="btn-save" :disabled="saving" @click="criar">
        {{ saving ? "Cadastrando..." : textoBotao }}
      </button>
    </section>

    <section class="list-box">
      <h3>
        Cadastrados
        <small>{{ guardaSois }} guarda-sol · {{ cadeiras }} cadeira</small>
      </h3>

      <p v-if="loadingList" class="empty">Carregando...</p>
      <p v-else-if="tables.length === 0" class="empty">Nada cadastrado ainda.</p>

      <ul v-else class="rows">
        <li v-for="table in sorted" :key="table.identify" class="row">
          <i class="fa-solid row-icon" :class="table.tipo === 'cadeira' ? 'fa-chair' : 'fa-umbrella-beach'"></i>

          <template v-if="editing === table.identify">
            <input v-model="editName" class="edit-input" type="text" maxlength="60" @keyup.enter="salvarNome(table)" />
            <button type="button" class="mini mini-ok" :disabled="busy === table.identify" @click="salvarNome(table)">Salvar</button>
            <button type="button" class="mini" @click="editing = null">Cancelar</button>
          </template>

          <template v-else>
            <span class="row-name">{{ table.name }}</span>
            <span class="row-tipo">{{ table.tipo === "cadeira" ? "Só cadeira" : "Guarda-sol" }}</span>
            <button type="button" class="mini" :disabled="busy === table.identify" @click="trocarTipo(table)">
              Virar {{ table.tipo === "cadeira" ? "guarda-sol" : "cadeira" }}
            </button>
            <button type="button" class="mini" @click="comecarEdicao(table)">Renomear</button>
            <button
              v-if="canDelete && confirmDelete !== table.identify"
              type="button"
              class="mini mini-danger"
              @click="confirmDelete = table.identify"
            >
              Apagar
            </button>
            <template v-else-if="canDelete">
              <button type="button" class="mini mini-danger" :disabled="busy === table.identify" @click="apagar(table)">
                Confirmar
              </button>
              <button type="button" class="mini" @click="confirmDelete = null">Não</button>
            </template>
          </template>
        </li>
      </ul>
    </section>
  </b-modal>
</template>

<script>
import { mapActions } from "vuex";

export default {
  name: "TableManager",

  props: {
    // Atendente cadastra e renomeia, mas so o gerente apaga
    canDelete: { type: Boolean, default: true },
  },

  data() {
    return {
      tables: [],
      loadingList: false,
      form: { tipo: "guarda_sol", nome: "", quantidade: 1 },
      saving: false,
      editing: null,
      editName: "",
      confirmDelete: null,
      busy: null,
    };
  },

  computed: {
    sorted() {
      return [...this.tables].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    },

    guardaSois() {
      return this.tables.filter((t) => t.tipo !== "cadeira").length;
    },

    cadeiras() {
      return this.tables.filter((t) => t.tipo === "cadeira").length;
    },

    rotulo() {
      return this.form.tipo === "cadeira" ? "Cadeira" : "Guarda-sol";
    },

    // Mesma regra do backend: continua do maior numero ja usado com esse prefixo
    sugestao() {
      const prefixo = (this.form.nome || "").trim() || this.rotulo;
      const re = new RegExp("^" + prefixo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " (\\d+)$");
      const maior = this.tables.reduce((max, t) => {
        const m = re.exec(t.name);
        return m ? Math.max(max, parseInt(m[1], 10)) : max;
      }, 0);
      return `${prefixo} ${maior + 1}`;
    },

    textoBotao() {
      const q = Number(this.form.quantidade) || 1;
      const nome = this.form.tipo === "cadeira" ? (q > 1 ? "cadeiras" : "cadeira") : q > 1 ? "guarda-sóis" : "guarda-sol";
      return q > 1 ? `Cadastrar ${q} ${nome}` : `Cadastrar ${nome}`;
    },
  },

  methods: {
    ...mapActions(["listAllTables", "createTables", "updateTable", "deleteTable"]),

    // A lista vem do servidor: o quadro do atendente so tem os pontos que ele atende
    async carregar() {
      this.loadingList = true;
      this.editing = null;
      this.confirmDelete = null;
      try {
        this.tables = await this.listAllTables();
      } catch (e) {
        this.erro(e);
      } finally {
        this.loadingList = false;
      }
    },

    erro(e) {
      const msg =
        e.response && e.response.data
          ? (e.response.data.errors && Object.values(e.response.data.errors)[0][0]) || e.response.data.message
          : null;
      this.$vToastify.error(msg || "Não foi possível salvar, tente de novo", "Erro");
    },

    async criar() {
      const quantidade = Math.min(30, Math.max(1, Number(this.form.quantidade) || 1));
      const nome = this.form.nome.trim();

      this.saving = true;
      try {
        const criados = await this.createTables({ tipo: this.form.tipo, nome, quantidade });
        this.tables = [...this.tables, ...criados];
        this.$vToastify.success(
          criados.length === 1 ? `${criados[0].name} cadastrado` : `${criados.length} cadastrados`,
          "Pronto"
        );
        this.form.nome = "";
        this.form.quantidade = 1;
      } catch (e) {
        this.erro(e);
      } finally {
        this.saving = false;
      }
    },

    trocarNaLista(novo) {
      this.tables = this.tables.map((t) => (t.identify === novo.identify ? { ...t, name: novo.name, tipo: novo.tipo } : t));
    },

    async trocarTipo(table) {
      this.busy = table.identify;
      try {
        const novo = await this.updateTable({ identify: table.identify, tipo: table.tipo === "cadeira" ? "guarda_sol" : "cadeira" });
        this.trocarNaLista(novo);
      } catch (e) {
        this.erro(e);
      } finally {
        this.busy = null;
      }
    },

    comecarEdicao(table) {
      this.editing = table.identify;
      this.editName = table.name;
      this.confirmDelete = null;
    },

    async salvarNome(table) {
      const nome = this.editName.trim();
      if (!nome) return;

      this.busy = table.identify;
      try {
        const novo = await this.updateTable({ identify: table.identify, nome });
        this.trocarNaLista(novo);
        this.editing = null;
      } catch (e) {
        this.erro(e);
      } finally {
        this.busy = null;
      }
    },

    async apagar(table) {
      this.busy = table.identify;
      try {
        await this.deleteTable(table.identify);
        this.tables = this.tables.filter((t) => t.identify !== table.identify);
        this.confirmDelete = null;
        this.$vToastify.success(`${table.name} removido`, "Pronto");
      } catch (e) {
        this.confirmDelete = null;
        this.erro(e);
      } finally {
        this.busy = null;
      }
    },
  },
};
</script>

<style scoped>
h3 {
  font-size: 16px;
  color: #0a4d78;
  margin: 0 0 12px;
}

h3 small {
  margin-left: 8px;
  font-weight: 400;
  color: #6c757d;
  font-size: 12px;
}

.new-box {
  padding-bottom: 20px;
  margin-bottom: 20px;
  border-bottom: 1px solid #e3e8ec;
}

.tipo-choice {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}

.tipo-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 14px 8px;
  min-height: 92px;
  border: 2px solid #d5dde3;
  border-radius: 12px;
  background: #fff;
  color: #333;
  cursor: pointer;
}

.tipo-btn i {
  font-size: 26px;
  color: #d4820a;
  margin-bottom: 4px;
}

.tipo-btn small {
  color: #6c757d;
}

.tipo-btn.active {
  border-color: #0a4d78;
  background: #e8f3fa;
}

.form-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1 1 200px;
  font-size: 13px;
  color: #555;
}

.field-qty {
  flex: 0 0 110px;
}

.field input,
.edit-input {
  border: 1px solid #c4ced6;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 15px;
  min-width: 0;
}

.hint {
  font-size: 12px;
  color: #6c757d;
  margin: 10px 0 14px;
}

.btn-save {
  width: 100%;
  border: none;
  border-radius: 10px;
  padding: 13px;
  font-weight: 700;
  font-size: 15px;
  background: #0a4d78;
  color: #fff;
  cursor: pointer;
}

.btn-save:disabled {
  opacity: 0.6;
}

.empty {
  color: #6c757d;
  font-size: 14px;
}

.rows {
  list-style: none;
  margin: 0;
  padding: 0;
}

.row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 0;
  border-bottom: 1px solid #eef1f4;
}

.row-icon {
  width: 24px;
  text-align: center;
  color: #d4820a;
}

.row-name {
  font-weight: 600;
  flex: 1 1 120px;
}

.row-tipo {
  font-size: 12px;
  color: #6c757d;
}

.edit-input {
  flex: 1 1 140px;
  padding: 6px 10px;
}

.mini {
  border: 1px solid #c4ced6;
  background: #fff;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  color: #0a4d78;
}

.mini-ok {
  background: #0a4d78;
  border-color: #0a4d78;
  color: #fff;
}

.mini-danger {
  color: #b02a37;
  border-color: #e6b8bd;
}
</style>
