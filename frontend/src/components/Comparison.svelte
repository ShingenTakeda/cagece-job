<script>
  export let currentUserConsumption;
  export let averageConsumption;
</script>

<div class="bg-white p-6 rounded-lg shadow-md">
  <h2 class="text-2xl font-semibold mb-4 text-gray-700">Comparação de Consumo</h2>
  <p>Seu consumo: {currentUserConsumption.toFixed(1)} L</p>
  <p>Média de consumo de outros usuários com os mesmos eletrodomésticos: {averageConsumption.toFixed(1)} L</p>
</div>
