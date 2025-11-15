<script>
	import { onMount } from 'svelte';

	export let measurements;
	export let totalConsumption;
	export let averageConsumption;
	export let lastMeasurement;
	export let setView;
	export let currentUser; // New prop for current user

	let prediction = 0;

	onMount(async () => {
		await fetchPrediction();
	});

	async function fetchPrediction() {
		const token = localStorage.getItem('token');
		if (!token) return;

		try {
			const response = await fetch('http://localhost:8081/api/measurements/predict', {
				headers: {
					'Authorization': token
				}
			});

			if (response.ok) {
				const data = await response.json();
				prediction = data.prediction;
			}
		} catch (error) {
			console.error('Error fetching prediction:', error);
		}
	}

	$: recentMeasurements = measurements.slice(-5).reverse();
</script>

<div class="p-6">
	<h1 class="text-3xl font-bold mb-6 text-gray-800">Dashboard - Medição de Água</h1>
	
	<!-- User Appliances -->
	{#if currentUser && currentUser.appliances && currentUser.appliances.length > 0}
	<div class="bg-white p-6 rounded-lg shadow-md mb-8">
		<h2 class="text-2xl font-semibold mb-4 text-gray-700">Meus Eletrodomésticos</h2>
		<ul class="list-disc list-inside">
			{#each currentUser.appliances as appliance}
				<li>{appliance.name}</li>
			{/each}
		</ul>
	</div>
	{/if}

	<!-- Statistics Cards -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
		<div class="bg-white p-5 rounded-lg shadow-md text-center">
			<div class="text-4xl font-bold text-blue-600 mb-1">{measurements.length}</div>
			<div class="text-sm text-gray-500 uppercase">Total de Medições</div>
		</div>
		
		<div class="bg-white p-5 rounded-lg shadow-md text-center">
			<div class="text-4xl font-bold text-blue-600 mb-1">{totalConsumption.toFixed(1)}</div>
			<div class="text-sm text-gray-500 uppercase">Consumo Total (L)</div>
		</div>
		
		<div class="bg-white p-5 rounded-lg shadow-md text-center">
			<div class="text-4xl font-bold text-blue-600 mb-1">{averageConsumption.toFixed(1)}</div>
			<div class="text-sm text-gray-500 uppercase">Média de Consumo (L)</div>
		</div>
		
		<div class="bg-white p-5 rounded-lg shadow-md text-center">
			<div class="text-4xl font-bold text-blue-600 mb-1">
				{#if lastMeasurement}
					{lastMeasurement.consumption.toFixed(1)}
				{:else}
					0
				{/if}
			</div>
			<div class="text-sm text-gray-500 uppercase">Última Medição (L)</div>
		</div>

		<div class="bg-white p-5 rounded-lg shadow-md text-center">
			<div class="text-4xl font-bold text-blue-600 mb-1">{prediction.toFixed(1)}</div>
			<div class="text-sm text-gray-500 uppercase">Previsão (L)</div>
		</div>
	</div>

	<!-- Recent Measurements -->
	<div class="bg-white p-6 rounded-lg shadow-md mb-8">
		<h2 class="text-2xl font-semibold mb-4 text-gray-700">Medições Recentes</h2>
		
		{#if recentMeasurements.length === 0}
			<div class="text-center text-gray-600 py-8">
				<p class="mb-2">Nenhuma medição registrada ainda.</p>
				<p>Clique em "Nova Medição" para começar!</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="min-w-full bg-white">
					<thead>
						<tr class="bg-gray-200">
							<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
							<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hidrômetro</th>
							<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consumo (L)</th>
							<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preço (R$)</th>
							<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each recentMeasurements as measurement}
							<tr>
								<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{new Date(measurement.timestamp).toLocaleDateString('pt-BR')}</td>
								<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{measurement.meterNumber}</td>
								<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{measurement.consumption.toFixed(1)}</td>
								<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{measurement.price.toFixed(2)}</td>
								<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
									<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full" class:bg-green-100={measurement.consumption <= averageConsumption} class:text-green-800={measurement.consumption <= averageConsumption} class:bg-red-100={measurement.consumption > averageConsumption * 1.5} class:text-red-800={measurement.consumption > averageConsumption * 1.5} class:bg-yellow-100={measurement.consumption > averageConsumption && measurement.consumption <= averageConsumption * 1.5} class:text-yellow-800={measurement.consumption > averageConsumption && measurement.consumption <= averageConsumption * 1.5}>
										{#if measurement.consumption <= averageConsumption}
											Normal
										{:else if measurement.consumption > averageConsumption * 1.5}
											Alto
										{:else}
											Moderado
										{/if}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Quick Actions -->
	<div class="bg-white p-6 rounded-lg shadow-md">
		<h2 class="text-2xl font-semibold mb-4 text-gray-700">Ações Rápidas</h2>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<button class="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition-colors font-semibold" on:click={() => setView('measurement')}>
				📝 Nova Medição
			</button>
			<button class="w-full bg-gray-200 text-gray-800 p-3 rounded-md hover:bg-gray-300 transition-colors font-semibold" on:click={() => setView('history')}>
				📋 Ver Histórico
			</button>
			<button class="w-full bg-gray-200 text-gray-800 p-3 rounded-md hover:bg-gray-300 transition-colors font-semibold" on:click={() => setView('reports')}>
				📈 Gerar Relatório
			</button>
		</div>
	</div>
</div>


