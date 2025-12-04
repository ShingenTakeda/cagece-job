<script>
  import { auth } from "./../auth.js";
  export let currentView;
  export let setView;
  export let isAuthenticated;

  function logout() {
    auth.logout();
  }
</script>

<header class="bg-blue-600 text-white p-4 shadow-md">
  <div class="container mx-auto">
    <div class="flex justify-between items-center">
      <div class="text-2xl font-bold">
        HidroLógica - Serviço de Medição de Água
      </div>

      <nav class="flex space-x-4">
        {#if isAuthenticated}
          <button
            class="px-3 py-2 rounded-md hover:bg-blue-700 transition-colors"
            class:bg-blue-700={currentView === "dashboard"}
            on:click={() => setView("dashboard")}
          >
            Painel
          </button>
          <button
            class="px-3 py-2 rounded-md hover:bg-blue-700 transition-colors"
            class:bg-blue-700={currentView === "measurement"}
            on:click={() => setView("measurement")}
          >
            Nova Medição
          </button>
          <button
            class="px-3 py-2 rounded-md hover:bg-blue-700 transition-colors"
            class:bg-blue-700={currentView === "history"}
            on:click={() => setView("history")}
          >
            Histórico
          </button>
          <button
            class="px-3 py-2 rounded-md hover:bg-blue-700 transition-colors"
            class:bg-blue-700={currentView === "reports"}
            on:click={() => setView("reports")}
          >
            Relatórios
          </button>
          <button
            class="px-3 py-2 rounded-md hover:bg-blue-700 transition-colors"
            on:click={logout}
          >
            Logout
          </button>
        {:else}
          <button
            class="px-3 py-2 rounded-md hover:bg-blue-700 transition-colors"
            class:bg-blue-700={currentView === "signup"}
            on:click={() => setView("signup")}
          >
            Cadastre-se
          </button>
        {/if}
      </nav>
    </div>
  </div>
</header>
