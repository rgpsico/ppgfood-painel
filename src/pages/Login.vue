<template>
  <div class="login-page">
    <div class="login-card">
      <h1>Painel de Pedidos</h1>
      <p class="subtitle">Entre com sua conta da loja</p>

      <form @submit.prevent="submit">
        <div class="form-group">
          <label for="email">E-mail</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="form-control"
            required
            autofocus
          />
        </div>

        <div class="form-group">
          <label for="password">Senha</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="form-control"
            required
          />
        </div>

        <p v-if="error" class="error-message">{{ error }}</p>

        <button type="submit" class="btn-login" :disabled="loading">
          {{ loading ? "Entrando..." : "Entrar" }}
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { mapActions } from "vuex";

export default {
  name: "Login",

  data() {
    return {
      email: "",
      password: "",
      loading: false,
      error: "",
    };
  },

  methods: {
    ...mapActions(["login"]),

    submit() {
      this.error = "";
      this.loading = true;

      this.login({ email: this.email, password: this.password })
        .then(() => {
          this.$router.push({ name: "board" });
        })
        .catch((err) => {
          this.error =
            err.response && err.response.status === 401
              ? "E-mail ou senha incorretos."
              : "Não foi possível entrar. Tente novamente.";
        })
        .finally(() => {
          this.loading = false;
        });
    },
  },
};
</script>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #0d6ea3 0%, #0a4d78 100%);
}

.login-card {
  background: #fff;
  border-radius: 12px;
  padding: 40px;
  width: 100%;
  max-width: 360px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

h1 {
  font-size: 22px;
  margin-bottom: 4px;
  color: #0a4d78;
}

.subtitle {
  color: #6c757d;
  margin-bottom: 24px;
  font-size: 14px;
}

.form-group {
  margin-bottom: 16px;
}

label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #333;
}

.form-control {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ced4da;
  border-radius: 8px;
  font-size: 15px;
}

.error-message {
  color: #dc3545;
  font-size: 13px;
  margin-bottom: 16px;
}

.btn-login {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: #0d6ea3;
  color: #fff;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
}

.btn-login:disabled {
  opacity: 0.7;
  cursor: default;
}
</style>
