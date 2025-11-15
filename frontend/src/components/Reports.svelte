<script>
	import { onMount } from 'svelte';
	import Comparison from './Comparison.svelte';
	import { auth } from '../auth.js';
	
	export let measurements;
	export let totalConsumption;
	export let averageConsumption;
	export let totalPrice;

	let selectedPeriod = 'all';
	let chartData = [];
	let monthlyData = [];
	let weeklyData = [];
	let comparisonData = null;

	onMount(async () => {
		await getComparisonData();
	});

	async function getComparisonData() {
		const token = localStorage.getItem('token');
		if (!token) return;

		try {
			const response = await fetch('http://localhost:8081/api/comparison', {
				headers: {
					'Authorization': token
				}
			});

			if (response.ok) {
				comparisonData = await response.json();
			}
		} catch (error) {
			console.error('Error fetching comparison data:', error);
		}
	}

	$: {
		updateChartData();
	}

	function updateChartData() {
		if (measurements.length === 0) {
			chartData = [];
			monthlyData = [];
			weeklyData = [];
			return;
		}

		// Group by month
		const monthly = {};
		measurements.forEach(measurement => {
			const date = new Date(measurement.timestamp);
			const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
			
			if (!monthly[monthKey]) {
				monthly[monthKey] = {
					month: monthKey,
					consumption: 0,
					price: 0,
					count: 0
				};
			}
			
			monthly[monthKey].consumption += measurement.consumption;
			monthly[monthKey].price += measurement.price;
			monthly[monthKey].count += 1;
		});

		monthlyData = Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));

		// Group by week (last 8 weeks)
		const weekly = {};
		const now = new Date();
		for (let i = 7; i >= 0; i--) {
			const weekStart = new Date(now);
			weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 7 * i));
			weekStart.setHours(0, 0, 0, 0);
			
			const weekEnd = new Date(weekStart);
			weekEnd.setDate(weekEnd.getDate() + 6);
			weekEnd.setHours(23, 59, 59, 999);
			
			const weekKey = weekStart.toISOString().split('T')[0];
			weekly[weekKey] = {
				week: weekKey,
				consumption: 0,
				price: 0,
				count: 0
			};
		}

		measurements.forEach(measurement => {
			const date = new Date(measurement.timestamp);
			const weekStart = new Date(date);
			weekStart.setDate(weekStart.getDate() - weekStart.getDay());
			weekStart.setHours(0, 0, 0, 0);
			
			const weekKey = weekStart.toISOString().split('T')[0];
			if (weekly[weekKey]) {
				weekly[weekKey].consumption += measurement.consumption;
				weekly[weekKey].price += measurement.price;
				weekly[weekKey].count += 1;
			}
		});

		weeklyData = Object.values(weekly).sort((a, b) => a.week.localeCompare(b.week));

		// Update chart data based on selected period
		if (selectedPeriod === 'monthly') {
			chartData = monthlyData;
		} else if (selectedPeriod === 'weekly') {
			chartData = weeklyData;
		} else {
			chartData = measurements.slice(-10).reverse();
		}
	}

	function getConsumptionTrend() {
		if (measurements.length < 2) return 'stable';
		
		const recent = measurements.slice(-3);
		const older = measurements.slice(-6, -3);
		
		if (recent.length === 0 || older.length === 0) return 'stable';
		
		const recentAvg = recent.reduce((sum, m) => sum + m.consumption, 0) / recent.length;
		const olderAvg = older.reduce((sum, m) => sum + m.consumption, 0) / older.length;
		
		const change = ((recentAvg - olderAvg) / olderAvg) * 100;
		
		if (change > 10) return 'increasing';
		if (change < -10) return 'decreasing';
		return 'stable';
	}

	function getTopConsumers() {
		const consumers = {};
		measurements.forEach(measurement => {
			const key = measurement.meterNumber;
			if (!consumers[key]) {
				consumers[key] = {
					meterNumber: key,
					totalConsumption: 0,
					count: 0
				};
			}
			consumers[key].totalConsumption += measurement.consumption;
			consumers[key].count += 1;
		});
		
		return Object.values(consumers)
			.sort((a, b) => b.totalConsumption - a.totalConsumption)
			.slice(0, 5);
	}

	function exportReport() {
		const report = {
			generatedAt: new Date().toISOString(),
			summary: {
				totalMeasurements: measurements.length,
				totalConsumption: totalConsumption,
				averageConsumption: averageConsumption,
				trend: getConsumptionTrend()
			},
			monthlyData: monthlyData,
			weeklyData: weeklyData,
			topConsumers: getTopConsumers()
		};

		const dataStr = JSON.stringify(report, null, 2);
		const dataBlob = new Blob([dataStr], {type: 'application/json'});
		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `cagece-relatorio-${new Date().toISOString().split('T')[0]}.json`;
		link.click();
		URL.revokeObjectURL(url);
	}

	$: trend = getConsumptionTrend();
	$: topConsumers = getTopConsumers();
</script>

<div class="p-6">
	<div class="bg-white p-6 rounded-lg shadow-md mb-8">
		<div class="flex justify-between items-center flex-wrap gap-4 mb-6">
			<h1 class="text-3xl font-bold text-gray-800">Relatórios e Análises</h1>
			
			<div class="flex items-center gap-2">
				<label class="block text-sm font-medium text-gray-700">Período de Análise:</label>
				<select class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" bind:value={selectedPeriod}>
					<option value="all">Últimas 10 Medições</option>
					<option value="weekly">Por Semana</option>
					<option value="monthly">Por Mês</option>
				</select>
			</div>
		</div>

		{#if measurements.length === 0}
			<div class="text-center py-12 text-gray-600">
				<div class="text-5xl mb-4">📊</div>
				<h3 class="text-xl font-semibold mb-2">Nenhum dado disponível</h3>
				<p class="text-gray-500">Registre algumas medições para gerar relatórios.</p>
			</div>
		{:else}
			<!-- Summary Cards -->
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
					<div class="text-4xl font-bold text-blue-600 mb-1">R$ {totalPrice.toFixed(2)}</div>
					<div class="text-sm text-gray-500 uppercase">Preço Total</div>
				</div>
				
				<div class="bg-white p-5 rounded-lg shadow-md text-center">
					<div class="text-4xl font-bold text-blue-600 mb-1">{averageConsumption.toFixed(1)}</div>
					<div class="text-sm text-gray-500 uppercase">Média (L)</div>
				</div>
				
				<div class="bg-white p-5 rounded-lg shadow-md text-center">
					<div class="text-4xl font-bold mb-1 flex items-center justify-center gap-2" class:text-red-500={trend === 'increasing'} class:text-green-500={trend === 'decreasing'} class:text-gray-600={trend === 'stable'}>
						{#if trend === 'increasing'}
							📈 Crescendo
						{:else if trend === 'decreasing'}
							📉 Diminuindo
						{:else}
							➡️ Estável
						{/if}
					</div>
					<div class="text-sm text-gray-500 uppercase">Tendência</div>
				</div>
			</div>

			<!-- Chart Data -->
			<div class="bg-white p-6 rounded-lg shadow-md mb-8">
				<h2 class="text-2xl font-semibold mb-4 text-gray-700">
					{#if selectedPeriod === 'monthly'}
						Consumo Mensal
					{:else if selectedPeriod === 'weekly'}
						Consumo Semanal
					{:else}
						Últimas Medições
					{/if}
				</h2>
				
				{#if chartData.length > 0}
					<div class="flex flex-col gap-4">
						{#each chartData as item, index}
							<div class="flex items-center gap-4">
								<div class="min-w-[120px] text-sm text-gray-600">
									{#if selectedPeriod === 'monthly'}
										{item.month}
									{:else if selectedPeriod === 'weekly'}
										{new Date(item.week).toLocaleDateString('pt-BR')}
									{:else}
										{new Date(item.timestamp).toLocaleDateString('pt-BR')}
									{/if}
								</div>
								<div class="flex-1 flex items-center gap-4">
									<div 
										class="h-5 bg-blue-500 rounded-full" 
										style="width: {Math.max(5, (item.consumption / Math.max(...chartData.map(d => d.consumption)) * 100))}%"
									></div>
									<span class="min-w-[100px] font-semibold text-gray-800">
										{item.consumption.toFixed(1)} L (R$ {item.price.toFixed(2)})
										{#if item.count > 1}
											<small>({item.count} medições)</small>
										{/if}
									</span>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-center text-gray-500 py-8">Nenhum dado disponível para o período selecionado.</p>
				{/if}
			</div>

			<!-- Top Consumers -->
			{#if topConsumers.length > 0}
				<div class="bg-white p-6 rounded-lg shadow-md mb-8">
					<h2 class="text-2xl font-semibold mb-4 text-gray-700">Maiores Consumidores</h2>
					<div class="overflow-x-auto">
						<table class="min-w-full bg-white">
							<thead>
								<tr class="bg-gray-200">
									<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hidrômetro</th>
									<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consumo Total (L)</th>
									<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medições</th>
									<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Média (L)</th>
								</tr>
							</thead>
							<tbody>
								{#each topConsumers as consumer}
									<tr>
										<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{consumer.meterNumber}</td>
										<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-800"><strong>{consumer.totalConsumption.toFixed(1)}</strong></td>
										<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{consumer.count}</td>
										<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{(consumer.totalConsumption / consumer.count).toFixed(1)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}

			<!-- Comparison -->
			{#if comparisonData}
				<div class="bg-white p-6 rounded-lg shadow-md">
					<Comparison currentUserConsumption={averageConsumption} averageConsumption={comparisonData.averageConsumption} />
				</div>
			{/if}

			<!-- Export Actions -->
			<div class="bg-white p-6 rounded-lg shadow-md">
				<h2 class="text-2xl font-semibold mb-4 text-gray-700">Exportar Relatório</h2>
				<div class="flex gap-4 flex-wrap">
					<button class="bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition-colors font-semibold" on:click={exportReport}>
						📊 Exportar Relatório Completo
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>


