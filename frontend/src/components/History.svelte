<script>
	export let measurements;
	export let deleteMeasurement;

	let searchTerm = '';
	let sortBy = 'date';
	let sortOrder = 'desc';

	$: filteredMeasurements = measurements
		.filter(measurement => {
			if (!searchTerm) return true;
			const term = searchTerm.toLowerCase();
			return (
				measurement.meterNumber.toLowerCase().includes(term) ||
				measurement.location.toLowerCase().includes(term) ||
				measurement.notes.toLowerCase().includes(term)
			);
		})
		.sort((a, b) => {
			let aValue, bValue;
			
			switch (sortBy) {
				case 'date':
					aValue = new Date(a.date);
					bValue = new Date(b.date);
					break;
				case 'consumption':
					aValue = a.consumption;
					bValue = b.consumption;
					break;
				case 'meterNumber':
					aValue = a.meterNumber;
					bValue = b.meterNumber;
					break;
				default:
					aValue = a.date;
					bValue = b.date;
			}
			
			if (sortOrder === 'asc') {
				return aValue > bValue ? 1 : -1;
			} else {
				return aValue < bValue ? 1 : -1;
			}
		});

	function handleDelete(id) {
		if (confirm('Tem certeza que deseja excluir esta medição?')) {
			deleteMeasurement(id);
		}
	}

	function exportData() {
		const dataStr = JSON.stringify(measurements, null, 2);
		const dataBlob = new Blob([dataStr], {type: 'application/json'});
		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `cagece-medicoes-${new Date().toISOString().split('T')[0]}.json`;
		link.click();
		URL.revokeObjectURL(url);
	}
</script>

<div class="history">
	<div class="card">
		<div class="history-header">
			<h1 class="mb-3">Histórico de Medições</h1>
			
			<div class="history-controls">
				<div class="search-box">
					<input
						type="text"
						class="form-input"
						placeholder="Buscar por hidrômetro, localização ou observações..."
						bind:value={searchTerm}
					/>
				</div>
				
				<div class="sort-controls">
					<select class="form-select" bind:value={sortBy}>
						<option value="date">Data</option>
						<option value="consumption">Consumo</option>
						<option value="meterNumber">Hidrômetro</option>
					</select>
					
					<select class="form-select" bind:value={sortOrder}>
						<option value="desc">Decrescente</option>
						<option value="asc">Crescente</option>
					</select>
				</div>
				
				<button class="btn btn-secondary" on:click={exportData}>
					📥 Exportar Dados
				</button>
			</div>
		</div>

		{#if measurements.length === 0}
			<div class="empty-state">
				<div class="empty-icon">📊</div>
				<h3>Nenhuma medição encontrada</h3>
				<p>Comece registrando sua primeira medição de água.</p>
			</div>
		{:else if filteredMeasurements.length === 0}
			<div class="empty-state">
				<div class="empty-icon">🔍</div>
				<h3>Nenhum resultado encontrado</h3>
				<p>Tente ajustar os filtros de busca.</p>
			</div>
		{:else}
			<div class="table-container">
				<table class="table">
					<thead>
						<tr>
							<th>Data</th>
							<th>Hidrômetro</th>
							<th>Localização</th>
							<th>Leitura Anterior</th>
							<th>Leitura Atual</th>
							<th>Consumo (L)</th>
							<th>Status</th>
							<th>Ações</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredMeasurements as measurement}
							<tr>
								<td>
									{new Date(measurement.date).toLocaleDateString('pt-BR')}
									<br>
									<small class="text-muted">
										{new Date(measurement.date).toLocaleTimeString('pt-BR')}
									</small>
								</td>
								<td>{measurement.meterNumber}</td>
								<td>{measurement.location || '-'}</td>
								<td>{measurement.previousReading.toFixed(3)} m³</td>
								<td>{measurement.currentReading.toFixed(3)} m³</td>
								<td class="consumption-cell">
									<strong>{measurement.consumption.toFixed(1)}</strong>
									<br>
									<small>({(measurement.consumption * 1000).toFixed(0)} L)</small>
								</td>
								<td>
									<span class="status-badge" class:low={measurement.consumption < 1} class:normal={measurement.consumption >= 1 && measurement.consumption < 5} class:high={measurement.consumption >= 5}>
										{#if measurement.consumption < 1}
											Baixo
										{:else if measurement.consumption < 5}
											Normal
										{:else}
											Alto
										{/if}
									</span>
								</td>
								<td>
									<button 
										class="btn-danger btn-small"
										on:click={() => handleDelete(measurement.id)}
									>
										🗑️
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			
			<div class="history-footer">
				<p class="text-muted">
					Mostrando {filteredMeasurements.length} de {measurements.length} medições
				</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.history {
		padding: 2rem 0;
	}
	
	.history-header {
		margin-bottom: 2rem;
	}
	
	.history-controls {
		display: flex;
		gap: 1rem;
		align-items: center;
		flex-wrap: wrap;
		margin-bottom: 1rem;
	}
	
	.search-box {
		flex: 1;
		min-width: 300px;
	}
	
	.sort-controls {
		display: flex;
		gap: 0.5rem;
	}
	
	.sort-controls select {
		min-width: 120px;
	}
	
	.table-container {
		overflow-x: auto;
		margin: 1rem 0;
	}
	
	.consumption-cell {
		text-align: center;
	}
	
	.status-badge {
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
	}
	
	.status-badge.low {
		background: #d1ecf1;
		color: #0c5460;
	}
	
	.status-badge.normal {
		background: #d4edda;
		color: #155724;
	}
	
	.status-badge.high {
		background: #f8d7da;
		color: #721c24;
	}
	
	.btn-small {
		padding: 6px 12px;
		font-size: 14px;
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
	
	.history-footer {
		text-align: center;
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #e1e5e9;
	}
	
	.text-muted {
		color: #666;
		font-size: 0.9rem;
	}
	
	@media (max-width: 768px) {
		.history-controls {
			flex-direction: column;
			align-items: stretch;
		}
		
		.search-box {
			min-width: auto;
		}
		
		.sort-controls {
			justify-content: space-between;
		}
	}
</style>
