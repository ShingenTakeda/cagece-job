<script>
	import { onMount } from 'svelte';
	import Chart from 'chart.js/auto';
	
	export let measurements = [];
	export let totalConsumption = 0;
	export let averageConsumption = 0;

	let selectedPeriod = 'all';
	let chartData = [];
	let monthlyData = [];
	let weeklyData = [];

	// Tarifa por metro cúbico
	let ratePerM3 = (() => {
		if (typeof localStorage !== 'undefined') {
			const savedRate = localStorage.getItem('ratePerM3');
			if (savedRate) return parseFloat(savedRate);
		}
		return 6.90; // padrão R$/m³
	})();

	let totalCost = 0;
	let averageCost = 0;

	let lineChartEl;
	let pieChartEl;
	let lineChartInstance;
	let pieChartInstance;

	// Inicialização
	onMount(() => {
		const savedRate = localStorage.getItem('ratePerM3');
		if (savedRate) ratePerM3 = parseFloat(savedRate);
		renderCharts();
	});

	// Reatividade
	$: updateChartData();        // atualiza chartData baseado no selectedPeriod
	$: updateCosts();            // atualiza os custos
	$: localStorage.setItem('ratePerM3', ratePerM3);
	$: trend = getConsumptionTrend();
	$: topConsumers = getTopConsumers();
	$: if (chartData.length) renderCharts(); // redesenha gráficos

	// Atualizar custos 
	function updateCosts() {
	if (!measurements.length) {
		totalCost = 0;
		averageCost = 0;
		return;
	}
	// consumo  em m³
	totalCost = totalConsumption * ratePerM3;
	averageCost = averageConsumption * ratePerM3;
}

	// Agrupar dados para gráficos
	function updateChartData() {
		if (!measurements.length) {
			chartData = [];
			monthlyData = [];
			return;
		}

		// Agrupar por mês
		const monthly = {};
		measurements.forEach(m => {
			const date = new Date(m.date);
			const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
			if (!monthly[monthKey]) monthly[monthKey] = { month: monthKey, consumption: 0, count: 0 };
			monthly[monthKey].consumption += m.consumption;
			monthly[monthKey].count += 1;
		});
		monthlyData = Object.values(monthly).sort((a,b) => a.month.localeCompare(b.month));

		// Definir chartData de acordo com o período selecionado
		if (selectedPeriod === 'monthly') chartData = monthlyData;
		else chartData = measurements.slice(-10).reverse();
	}

	// Tendência de consumo
	function getConsumptionTrend() {
		if (measurements.length < 2) return 'Estável';
		const recent = measurements.slice(-3);
		const older = measurements.slice(-6,-3);
		if (!recent.length || !older.length) return 'Estável';
		const recentAvg = recent.reduce((sum,m)=>sum+m.consumption,0)/recent.length;
		const olderAvg = older.reduce((sum,m)=>sum+m.consumption,0)/older.length;
		const change = ((recentAvg - olderAvg)/olderAvg)*100;
		if (change > 10) return 'Aumento';
		if (change < -10) return 'Redução';
		return 'Estável';
	}

	// Top consumidores
	function getTopConsumers() {
		const consumers = {};
		measurements.forEach(m => {
			const key = m.meterNumber || 'Desconhecido';
			if (!consumers[key]) consumers[key] = { meterNumber: key, location: m.location, totalConsumption: 0, count: 0 };
			consumers[key].totalConsumption += m.consumption;
			consumers[key].count += 1;
		});
		return Object.values(consumers)
			.sort((a,b)=>b.totalConsumption-a.totalConsumption)
			.slice(0,5);
	}

	// Renderizar gráficos
	function renderCharts() {
		if (!measurements.length) return;

		// Gráfico de linha (mensal)
		let labels = [];
		let values = [];

		if (selectedPeriod === 'monthly') {
		labels = chartData.map(m => m.month);
		values = chartData.map(m => m.consumption);
		} else {
		// últimas 10 medições
		labels = chartData.map(m => m.date.split('T')[0]);
		values = chartData.map(m => m.consumption);
		}
		if(lineChartInstance) lineChartInstance.destroy();
		lineChartInstance = new Chart(lineChartEl, {
			type: 'line',
			data: {
				labels,
				datasets: [{
					label:'Consumo (m³)',
					data: values,
					borderColor:'#007bff',
					backgroundColor:'rgba(0,123,255,0.2)',
					tension:0.3,
					fill:true
				}]
			},
			options: {
				responsive:true,
				plugins:{ legend:{ display:false } },
				scales:{ y:{ beginAtZero:true } }
			}
		});

		// Gráfico de pizza (top consumidores)
		const consumers = {};
		measurements.forEach(m=>{
			const key = m.meterNumber||'Desconhecido';
			if(!consumers[key]) consumers[key]=0;
			consumers[key]+=m.consumption;
		});
		const sorted = Object.entries(consumers).sort((a,b)=>b[1]-a[1]).slice(0,5);
		if(pieChartInstance) pieChartInstance.destroy();
		pieChartInstance = new Chart(pieChartEl, {
			type:'pie',
			data:{ labels:sorted.map(([k])=>k), datasets:[{ data:sorted.map(([_,v])=>v), backgroundColor:['#4CAF50','#FFC107','#2196F3','#FF5722','#9C27B0'] }] },
			options:{ responsive:true, plugins:{ legend:{ position:'bottom' } } }
		});
	}

	// Exportar relatório JSON
	function exportReport() {
		const report = {
			generatedAt: new Date().toISOString(),
			tariffPerM3: ratePerM3,
			summary:{ totalMeasurements: measurements.length, totalConsumption, totalCost, averageConsumption, averageCost, trend:getConsumptionTrend() },
			monthlyData,
			weeklyData,
			topConsumers: getTopConsumers()
		};
		const dataBlob = new Blob([JSON.stringify(report,null,2)], {type:'application/json'});
		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `relatorio-agua-${new Date().toISOString().split('T')[0]}.json`;
		link.click();
		URL.revokeObjectURL(url);
	}
</script>

<div class="reports">
	<div class="card">
		<div class="reports-header">
			<h1 class="mb-3">Relatórios e Análises</h1>

			<!-- <div class="rate-config">
				<span class="form-label">Tarifa (R$/m³):</span>
				<input type="number" step="0.01" class="form-input small" bind:value={ratePerM3} on:input={updateCosts} />
			</div> -->

			<!-- <div class="period-selector">
				<span class="form-label">Período de Análise:</span>
				<select class="form-select" bind:value={selectedPeriod}>
					<option value="all">Últimas 10 Medições</option>
					<option value="monthly">Por Mês</option>
				</select>
			</div> -->
		</div>

		{#if !measurements.length}
			<div class="empty-state">
				<div class="empty-icon">📊</div>
				<h3>Nenhum dado disponível</h3>
				<p>Registre algumas medições para gerar relatórios.</p>
			</div>
		{:else}
			<div class="cards">
				<div class="card-item">
					<h2>Total de Consumo</h2>
					<p>{totalConsumption.toFixed(1)} m³</p>
					<small>({(totalConsumption * 1000).toFixed(0)} litros)</small>
				</div>
				<div class="card-item">
					<h2>Custo Estimado</h2>
					<p>R$ {totalCost.toFixed(2)}</p>
				</div>
				<div class="card-item">
					<h2>Média</h2>
					<p>{averageConsumption.toFixed(1)} m³</p>
					<small>({(averageConsumption * 1000).toFixed(0)} litros)</small>
				</div>
				<div class="card-item">
					<h2>Tendência</h2>
					<p class={trend}>{trend}</p>
				</div>
			</div>

			<div class="charts">
				<div class="chart-wrapper full-width">
					<h3>Consumo ao longo do tempo</h3>
					<canvas bind:this={lineChartEl}></canvas>
				</div>

				<div class="chart-row">
					<div class="chart-wrapper">
						<h3>Top 5 Consumidores</h3>
						<canvas bind:this={pieChartEl}></canvas>
					</div>
				</div>
			</div>

			<div class="table-wrapper">
				<h3>Maiores Consumidores</h3>
				<table>
					<thead>
						<tr>
							<th>Medidor</th>
							<th>Localização</th>
							<th>Total Consumido (m³)</th>
						</tr>
					</thead>
					<tbody>
						{#each topConsumers as consumer}
							<tr>
								<td>{consumer.meterNumber}</td>
								<td>{consumer.location}</td>
								<td>{consumer.totalConsumption.toFixed(3)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="export-button">
				<button class="btn" on:click={exportReport}>Exportar Relatório JSON</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.reports { padding: 1rem; font-family: sans-serif; max-width: 1200px; margin:auto; }
	.cards { display: grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap:1rem; margin-bottom:2rem; }
	.card-item { background:#f5f5f5; padding:1rem; border-radius:8px; text-align:center; }
	.card-item h2 { font-size:1rem; margin-bottom:.5rem; }
	.card-item p { font-size:1.2rem; font-weight:bold; }
	.charts { display:flex; flex-wrap:wrap; gap:2rem; margin-bottom:2rem; }
	.chart-wrapper { flex:1; min-width:300px; }
	table { width:100%; border-collapse:collapse; margin-bottom:1rem; }
	th,td { padding:.5rem; border:1px solid #ddd; text-align:left; }
	.period-selector, .rate-config { margin-bottom:1rem; }
	.export-button { text-align:right; }
	.empty-state { text-align:center; padding:2rem; color:#777; }
	.empty-icon { font-size:3rem; margin-bottom:1rem; }
	.increasing { color:green; font-weight:bold; }
	.decreasing { color:red; font-weight:bold; }
	.stable { color:#333; }
</style>
