<script>
	import { onMount } from 'svelte';
	
	export let measurements;
	export let totalConsumption;
	export let averageConsumption;

	let selectedPeriod = 'all';
	let chartData = [];
	let monthlyData = [];
	let weeklyData = [];

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
			const date = new Date(measurement.date);
			const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
			
			if (!monthly[monthKey]) {
				monthly[monthKey] = {
					month: monthKey,
					consumption: 0,
					count: 0
				};
			}
			
			monthly[monthKey].consumption += measurement.consumption;
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
				count: 0
			};
		}

		measurements.forEach(measurement => {
			const date = new Date(measurement.date);
			const weekStart = new Date(date);
			weekStart.setDate(weekStart.getDate() - weekStart.getDay());
			weekStart.setHours(0, 0, 0, 0);
			
			const weekKey = weekStart.toISOString().split('T')[0];
			if (weekly[weekKey]) {
				weekly[weekKey].consumption += measurement.consumption;
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
					location: measurement.location,
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

<div class="reports">
	<div class="card">
		<div class="reports-header">
			<h1 class="mb-3">Relatórios e Análises</h1>
			
			<div class="period-selector">
				<label class="form-label">Período de Análise:</label>
				<select class="form-select" bind:value={selectedPeriod}>
					<option value="all">Últimas 10 Medições</option>
					<option value="weekly">Por Semana</option>
					<option value="monthly">Por Mês</option>
				</select>
			</div>
		</div>

		{#if measurements.length === 0}
			<div class="empty-state">
				<div class="empty-icon">📊</div>
				<h3>Nenhum dado disponível</h3>
				<p>Registre algumas medições para gerar relatórios.</p>
			</div>
		{:else}
			<!-- Summary Cards -->
			<div class="stats-grid">
				<div class="stat-card">
					<div class="stat-value">{measurements.length}</div>
					<div class="stat-label">Total de Medições</div>
				</div>
				
				<div class="stat-card">
					<div class="stat-value">{totalConsumption.toFixed(1)}</div>
					<div class="stat-label">Consumo Total (L)</div>
				</div>
				
				<div class="stat-card">
					<div class="stat-value">{averageConsumption.toFixed(1)}</div>
					<div class="stat-label">Média (L)</div>
				</div>
				
				<div class="stat-card">
					<div class="stat-value trend" class:increasing={trend === 'increasing'} class:decreasing={trend === 'decreasing'}>
						{#if trend === 'increasing'}
							📈 Crescendo
						{:else if trend === 'decreasing'}
							📉 Diminuindo
						{:else}
							➡️ Estável
						{/if}
					</div>
					<div class="stat-label">Tendência</div>
				</div>
			</div>

			<!-- Chart Data -->
			<div class="card">
				<h2 class="mb-3">
					{#if selectedPeriod === 'monthly'}
						Consumo Mensal
					{:else if selectedPeriod === 'weekly'}
						Consumo Semanal
					{:else}
						Últimas Medições
					{/if}
				</h2>
				
				{#if chartData.length > 0}
					<div class="chart-container">
						{#each chartData as item, index}
							<div class="chart-bar">
								<div class="bar-label">
									{#if selectedPeriod === 'monthly'}
										{item.month}
									{:else if selectedPeriod === 'weekly'}
										{new Date(item.week).toLocaleDateString('pt-BR')}
									{:else}
										{new Date(item.date).toLocaleDateString('pt-BR')}
									{/if}
								</div>
								<div class="bar-container">
									<div 
										class="bar" 
										style="width: {Math.max(5, (item.consumption / Math.max(...chartData.map(d => d.consumption)) * 100))}%"
									></div>
									<span class="bar-value">
										{item.consumption.toFixed(1)} L
										{#if item.count > 1}
											<small>({item.count} medições)</small>
										{/if}
									</span>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-center text-muted">Nenhum dado disponível para o período selecionado.</p>
				{/if}
			</div>

			<!-- Top Consumers -->
			{#if topConsumers.length > 0}
				<div class="card">
					<h2 class="mb-3">Maiores Consumidores</h2>
					<div class="table-container">
						<table class="table">
							<thead>
								<tr>
									<th>Hidrômetro</th>
									<th>Localização</th>
									<th>Consumo Total (L)</th>
									<th>Medições</th>
									<th>Média (L)</th>
								</tr>
							</thead>
							<tbody>
								{#each topConsumers as consumer}
									<tr>
										<td>{consumer.meterNumber}</td>
										<td>{consumer.location || '-'}</td>
										<td><strong>{consumer.totalConsumption.toFixed(1)}</strong></td>
										<td>{consumer.count}</td>
										<td>{(consumer.totalConsumption / consumer.count).toFixed(1)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}

			<!-- Export Actions -->
			<div class="card">
				<h2 class="mb-3">Exportar Relatório</h2>
				<div class="export-actions">
					<button class="btn" on:click={exportReport}>
						📊 Exportar Relatório Completo
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.reports {
		padding: 2rem 0;
	}
	
	.reports-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
		margin-bottom: 2rem;
	}
	
	.period-selector {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.trend.increasing {
		color: #dc3545;
	}
	
	.trend.decreasing {
		color: #28a745;
	}
	
	.chart-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	
	.chart-bar {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	
	.bar-label {
		min-width: 120px;
		font-size: 0.9rem;
		color: #666;
	}
	
	.bar-container {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	
	.bar {
		height: 20px;
		background: linear-gradient(90deg, #4CAF50, #45a049);
		border-radius: 10px;
		transition: all 0.3s ease;
	}
	
	.bar-value {
		min-width: 100px;
		font-weight: 600;
		color: #333;
	}
	
	.export-actions {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}
	
	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
		color: #666;
	}
	
	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}
	
	@media (max-width: 768px) {
		.reports-header {
			flex-direction: column;
			align-items: stretch;
		}
		
		.period-selector {
			justify-content: space-between;
		}
		
		.chart-bar {
			flex-direction: column;
			align-items: stretch;
			gap: 0.5rem;
		}
		
		.bar-label {
			min-width: auto;
		}
	}
</style>
