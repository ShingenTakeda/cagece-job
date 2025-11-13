<script>
	export let measurements;
	export let totalConsumption;
	export let averageConsumption;
	export let lastMeasurement;

	$: recentMeasurements = measurements.slice(-5).reverse();
</script>

<div class="dashboard">
	<h1 class="mb-4">Dashboard - Medição de Água</h1>
	
	<!-- Statistics Cards -->
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
			<div class="stat-label">Média de Consumo (L)</div>
		</div>
		
		<div class="stat-card">
			<div class="stat-value">
				{#if lastMeasurement}
					{lastMeasurement.consumption.toFixed(1)}
				{:else}
					0
				{/if}
			</div>
			<div class="stat-label">Última Medição (L)</div>
		</div>
	</div>

	<!-- Recent Measurements -->
	<div class="card">
		<h2 class="mb-3">Medições Recentes</h2>
		
		{#if recentMeasurements.length === 0}
			<div class="text-center">
				<p class="mb-3">Nenhuma medição registrada ainda.</p>
				<p>Clique em "Nova Medição" para começar!</p>
			</div>
		{:else}
			<div class="table-container">
				<table class="table">
					<thead>
						<tr>
							<th>Data</th>
							<th>Hidrômetro</th>
							<th>Consumo (L)</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						{#each recentMeasurements as measurement}
							<tr>
								<td>{new Date(measurement.date).toLocaleDateString('pt-BR')}</td>
								<td>{measurement.meterNumber}</td>
								<td>{measurement.consumption.toFixed(1)}</td>
								<td>
									<span class="badge" class:success={measurement.consumption <= averageConsumption} class:danger={measurement.consumption > averageConsumption * 1.5}>
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
	<div class="card">
		<h2 class="mb-3">Ações Rápidas</h2>
		<div class="grid grid-3">
			<button class="btn" on:click={() => window.location.hash = '#measurement'}>
				📝 Nova Medição
			</button>
			<button class="btn btn-secondary" on:click={() => window.location.hash = '#history'}>
				📋 Ver Histórico
			</button>
			<button class="btn btn-secondary" on:click={() => window.location.hash = '#reports'}>
				📈 Gerar Relatório
			</button>
		</div>
	</div>
</div>

<style>
	.dashboard {
		padding: 2rem 0;
	}
	
	.table-container {
		overflow-x: auto;
	}
	
	.badge {
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
	}
	
	.badge.success {
		background: #d4edda;
		color: #155724;
	}
	
	.badge.danger {
		background: #f8d7da;
		color: #721c24;
	}
	
	.badge:not(.success):not(.danger) {
		background: #fff3cd;
		color: #856404;
	}
</style>
