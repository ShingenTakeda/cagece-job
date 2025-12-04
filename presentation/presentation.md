---
title: HidroLógica - Serviço de Medição de Água
author: Gemini
---

Um sistema web moderno para medição e controle de consumo de água.

<!-- end_slide -->

---

# Dashboard Interativo

- **Visualização de estatísticas** e medições recentes.
- Acesso rápido às principais funcionalidades.

<!-- end_slide -->

---

# Registro de Medições

- Formulário **intuitivo** para registrar leituras do hidrômetro.
- **Cálculo automático** do consumo.

<!-- end_slide -->

---

# Histórico Completo

- Visualização e gerenciamento de **todas as medições**.
- **Filtros** para busca e ordenação.
- **Exportação de dados** em formato JSON.

<!-- end_slide -->

---

# Relatórios e Análises

- **Gráficos e análises** de consumo por período.
- Identificação de tendências e maiores consumidores.

<!-- end_slide -->

---

# Stack do Projeto

- **Svelte 3**: Para um frontend reativo e performático.
- **Go**: Para um backend robusto e escalável.
- **SQLite**: Como banco de dados principal.
- **Docker**: Para orquestração e deploy.

<!-- end_slide -->

---

# Arquitetura Geral

O projeto HidroLógica é composto por um frontend em Svelte, um backend em Go e um banco de dados SQLite, orquestrados via Docker.

<!-- end_slide -->

---

# Frontend com Svelte

O frontend é construído com Svelte, um framework que compila o código para JavaScript vanilla, resultando em uma aplicação rápida. Ele é responsável pela interface do usuário e interação.

```javascript
// src/App.svelte
<script>
  import Login from "./components/Login.svelte";
  import Dashboard from "./components/Dashboard.svelte";
  import { user } from "./auth.js";
</script>

<main>
  {#if $user}
    <Dashboard />
  {:else}
    <Login />
  {/if}
</main>
```

<!-- end_slide -->

---

# Backend com Go

A API REST desenvolvida em Go oferece endpoints para todas as operações da aplicação, como autenticação, manipulação de dados de usuários e medições, e funcionalidades avançadas como predições de consumo e comparação.

```go
// backend/main.go
func main() {
	// ...
	mux := http.NewServeMux()
	mux.HandleFunc("/api/login", loginHandler)
	mux.Handle("/api/measurements", authMiddleware(http.HandlerFunc(measurementsHandler)))
	mux.HandleFunc("/api/measurements/", measurementHandler)
	mux.Handle("/api/measurements/predict", authMiddleware(http.HandlerFunc(predictionHandler)))
	mux.HandleFunc("/api/users", usersHandler)
	mux.HandleFunc("/api/users/", userHandler)
	mux.Handle("/api/comparison", authMiddleware(http.HandlerFunc(comparisonHandler)))

	log.Println("Server starting on port 8081...")
	log.Fatal(http.ListenAndServe(":8081", corsMiddleware(mux)))
}
```

<!-- end_slide -->

---

# Banco de Dados: SQLite

Utilizamos SQLite para um banco de dados leve e serverless, ideal para a portabilidade e facilidade de configuração que o Docker nos proporciona. Ele armazena todas as informações de usuários, medições e aparelhos.

```sql
CREATE TABLE IF NOT EXISTS measurements (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER,
    "meterNumber" TEXT,
    "currentReading" REAL,
    "previousReading" REAL,
    "consumption" REAL,
    "price" REAL,
    "location" TEXT,
    "notes" TEXT,
    "timestamp" DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
```

<!-- end_slide -->

---

# Próximas Funcionalidades

- [ ] Sincronização com servidor remoto
- [ ] Notificações de consumo alto
- [ ] Gráficos mais avançados
- [ ] Backup automático
- [ ] Múltiplos usuários
- [ ] Relatórios em PDF

<!-- end_slide -->

---

# Fim

Obrigado!
