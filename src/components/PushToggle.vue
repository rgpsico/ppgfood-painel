<template>
  <div v-if="estado !== 'nao-suportado' && estado !== 'carregando'" class="push-toggle">
    <template v-if="estado === 'ativo'">
      <span class="push-on"><i class="fa-solid fa-bell"></i> Avisos ativos</span>
      <button type="button" class="push-link" :disabled="ocupado" @click="testar">Testar</button>
      <button type="button" class="push-link" :disabled="ocupado" @click="desativar">Desativar</button>
    </template>

    <button v-else-if="estado === 'desativado'" type="button" class="push-btn" :disabled="ocupado" @click="ativar">
      <i class="fa-solid fa-bell"></i> {{ ocupado ? "Ativando..." : "Ativar avisos" }}
    </button>

    <button v-else-if="estado === 'bloqueado'" type="button" class="push-btn push-warn" @click="$bvModal.show('modal-push-bloqueado')">
      <i class="fa-solid fa-bell-slash"></i> Avisos bloqueados
    </button>

    <button v-else-if="estado === 'instalar-iphone'" type="button" class="push-btn" @click="$bvModal.show('modal-push-iphone')">
      <i class="fa-solid fa-bell"></i> Receber avisos no iPhone
    </button>

    <b-modal id="modal-push-iphone" title="Avisos no iPhone" hide-footer>
      <p>No iPhone, o aviso de pedido só funciona com o painel <strong>instalado na tela inicial</strong>:</p>
      <ol class="passos">
        <li>Abra este painel no <strong>Safari</strong>.</li>
        <li>Toque no botão <strong>Compartilhar</strong> (o quadrado com a seta pra cima).</li>
        <li>Escolha <strong>Adicionar à Tela de Início</strong> e confirme.</li>
        <li>Abra o painel pelo <strong>novo ícone</strong> (um guarda-sol) e toque em <strong>Ativar avisos</strong>.</li>
      </ol>
      <p class="nota">Precisa do iOS 16.4 ou mais novo. Depois de ativar, o pedido novo aparece na tela de bloqueio.</p>
    </b-modal>

    <b-modal id="modal-push-bloqueado" title="Avisos bloqueados" hide-footer>
      <p>Este celular está com as notificações do painel <strong>bloqueadas</strong>. Para liberar:</p>
      <ol class="passos">
        <li>Abra os <strong>Ajustes/Configurações</strong> do celular.</li>
        <li>Procure <strong>Notificações</strong> e o app/navegador do painel.</li>
        <li>Ligue <strong>Permitir notificações</strong> e volte aqui.</li>
      </ol>
    </b-modal>
  </div>
</template>

<script>
import { estadoPush, ativarPush, desativarPush, testarPush } from "@/push";

export default {
  name: "PushToggle",

  data() {
    return { estado: "carregando", ocupado: false };
  },

  async mounted() {
    this.estado = await estadoPush();
  },

  methods: {
    async ativar() {
      this.ocupado = true;
      try {
        await ativarPush();
        this.$vToastify.success("Pode fazer o teste pelo botão Testar.", "Avisos ativados");
      } catch (e) {
        if (e.message !== "permissao-negada") {
          this.$vToastify.error("Não foi possível ativar os avisos, tente de novo", "Erro");
        }
      } finally {
        this.estado = await estadoPush();
        this.ocupado = false;
      }
    },

    async desativar() {
      this.ocupado = true;
      try {
        await desativarPush();
        this.$vToastify.success("Este celular não recebe mais avisos", "Avisos desativados");
      } catch (e) {
        this.$vToastify.error("Não foi possível desativar, tente de novo", "Erro");
      } finally {
        this.estado = await estadoPush();
        this.ocupado = false;
      }
    },

    async testar() {
      this.ocupado = true;
      try {
        await testarPush();
        this.$vToastify.success("Veja a notificação no celular (pode levar alguns segundos)", "Teste enviado");
      } catch (e) {
        this.$vToastify.error("Não deu pra enviar o teste. Desative e ative os avisos de novo.", "Erro");
      } finally {
        this.ocupado = false;
      }
    },
  },
};
</script>

<style scoped>
.push-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.push-btn {
  border: 2px solid #0a4d78;
  background: #fff;
  color: #0a4d78;
  font-weight: 600;
  font-size: 13px;
  padding: 7px 12px;
  border-radius: 8px;
  cursor: pointer;
}

.push-warn {
  border-color: #b02a37;
  color: #b02a37;
}

.push-on {
  font-size: 13px;
  font-weight: 600;
  color: #1c7c3a;
}

.push-link {
  border: none;
  background: transparent;
  color: #0a4d78;
  font-size: 12px;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
}

.passos {
  padding-left: 20px;
}

.passos li {
  margin-bottom: 8px;
}

.nota {
  font-size: 12px;
  color: #6c757d;
}
</style>
