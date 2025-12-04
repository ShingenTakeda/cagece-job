<script>
  export let measurements;
  export let deleteMeasurement;

  let searchTerm = "";
  let sortBy = "date";
  let sortOrder = "desc";

  $: filteredMeasurements = measurements
    .filter((measurement) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return measurement.meterNumber.toLowerCase().includes(term);
    })
    .sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "date":
          aValue = new Date(a.timestamp);
          bValue = new Date(b.timestamp);
          break;
        case "consumption":
          aValue = a.consumption;
          bValue = b.consumption;
          break;
        case "price":
          aValue = a.price;
          bValue = b.price;
          break;
        case "meterNumber":
          aValue = a.meterNumber;
          bValue = b.meterNumber;
          break;
        default:
          aValue = a.timestamp;
          bValue = b.timestamp;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  function handleDelete(id) {
    if (confirm("Tem certeza que deseja excluir esta medição?")) {
      deleteMeasurement(id);
    }
  }

  function exportData() {
    const dataStr = JSON.stringify(measurements, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cagece-medicoes-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="p-6">
  <div class="bg-white p-6 rounded-lg shadow-md mb-8">
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-4 text-gray-800">
        Histórico de Medições
      </h1>

      <div class="flex flex-wrap items-center gap-4 mb-6">
        <div class="flex-grow">
          <input
            type="text"
            class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar por hidrômetro, localização ou observações..."
            bind:value={searchTerm}
          />
        </div>

        <div class="flex gap-2">
          <select
            class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            bind:value={sortBy}
          >
            <option value="date">Data</option>
            <option value="consumption">Consumo</option>
            <option value="price">Preço</option>
            <option value="meterNumber">Hidrômetro</option>
          </select>

          <select
            class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            bind:value={sortOrder}
          >
            <option value="desc">Decrescente</option>
            <option value="asc">Crescente</option>
          </select>
        </div>

        <button
          class="bg-gray-200 text-gray-800 p-3 rounded-md hover:bg-gray-300 transition-colors font-semibold"
          on:click={exportData}
        >
          Exportar Dados
        </button>
      </div>
    </div>

    {#if measurements.length === 0}
      <div class="text-center py-12 text-gray-600">
        <div class="text-5xl mb-4">📊</div>
        <h3 class="text-xl font-semibold mb-2">Nenhuma medição encontrada</h3>
        <p class="text-gray-500">
          Comece registrando sua primeira medição de água.
        </p>
      </div>
    {:else if filteredMeasurements.length === 0}
      <div class="text-center py-12 text-gray-600">
        <div class="text-5xl mb-4">🔍</div>
        <h3 class="text-xl font-semibold mb-2">Nenhum resultado encontrado</h3>
        <p class="text-gray-500">Tente ajustar os filtros de busca.</p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="min-w-full bg-white">
          <thead>
            <tr class="bg-gray-200">
              <th
                class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >Data</th
              >
              <th
                class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >Hidrômetro</th
              >
              <th
                class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >Consumo (L)</th
              >
              <th
                class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >Preço (R$)</th
              >
              <th
                class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >Ações</th
              >
            </tr>
          </thead>
          <tbody>
            {#each filteredMeasurements as measurement}
              <tr>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                  {new Date(measurement.timestamp).toLocaleDateString("pt-BR")}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-800"
                  >{measurement.meterNumber}</td
                >
                <td
                  class="px-4 py-3 whitespace-nowrap text-sm text-gray-800 text-center"
                >
                  <strong>{measurement.consumption.toFixed(1)}</strong>
                </td>
                <td
                  class="px-4 py-3 whitespace-nowrap text-sm text-gray-800 text-center"
                >
                  <strong>{measurement.price.toFixed(2)}</strong>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                  <button
                    class="bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600 transition-colors text-xs"
                    on:click={() => handleDelete(measurement.id)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="icon icon-tabler icons-tabler-outline icon-tabler-trash"
                      ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
                        d="M4 7l16 0"
                      /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path
                        d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"
                      /><path
                        d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"
                      /></svg
                    >
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div
        class="text-center mt-6 pt-4 border-t border-gray-200 text-gray-600 text-sm"
      >
        <p class="text-gray-600 text-sm">
          Mostrando {filteredMeasurements.length} de {measurements.length} medições
        </p>
      </div>
    {/if}
  </div>
</div>
