<script>
	export let addMeasurement;
	export let setView;

	let meterNumber = '';
	let consumption = '';
	let isValid = false;

	$: {
		isValid = consumption && meterNumber.trim() !== '';
	}

	function handleSubmit() {
		if (!isValid) return;

		const measurement = {
			meterNumber: meterNumber.trim(),
			consumption: parseFloat(consumption),
		};

		addMeasurement(measurement);
		
		// Reset form
		meterNumber = '';
		consumption = '';
		
		setView('dashboard');
	}
</script>

<div class="measurement-form">
	<div class="card">
		<h1 class="mb-4">Nova Medição de Água</h1>
		
		<form on:submit|preventDefault={handleSubmit}>
			<div class="grid grid-2">
				<div class="form-group">
					<label class="form-label" for="meterNumber">
						Número do Hidrômetro *
					</label>
					<input
						id="meterNumber"
						type="text"
						class="form-input"
						bind:value={meterNumber}
						placeholder="Ex: 123456789"
						required
					/>
				</div>

			</div>

			<div class="grid grid-2">
				<div class="form-group">
					<label class="form-label" for="consumption">
						Consumo (L) *
					</label>
					<input
						id="consumption"
						type="number"
						step="0.1"
						class="form-input"
						bind:value={consumption}
						placeholder="Ex: 123.4"
						required
					/>
				</div>
			</div>

			<div class="form-actions">
				<button 
					type="submit" 
					class="btn" 
					disabled={!isValid}
				>
					💾 Salvar Medição
				</button>
				
				<button 
					type="button" 
					class="btn btn-secondary"
					on:click={() => {
						meterNumber = '';
						consumption = '';
					}}
				>
					🔄 Limpar
				</button>
			</div>
		</form>
	</div>

	<!-- Help Section -->
	<div class="card">
		<h3 class="mb-3">💡 Dicas para Medição</h3>
		<ul class="help-list">
			<li>Certifique-se de que o hidrômetro está visível e legível</li>
			<li>Anote o consumo com precisão</li>
			<li>Registre observações importantes como vazamentos ou irregularidades</li>
		</ul>
	</div>
</div>

<style>
	.measurement-form {
		padding: 2rem 0;
	}
	
	.consumption-display {
		background: #f8f9fa;
		padding: 1rem;
		border-radius: 8px;
		border: 2px solid #e1e5e9;
		text-align: center;
	}
	
	.consumption-value {
		font-size: 1.5rem;
		font-weight: bold;
		color: #4CAF50;
		display: block;
		margin-bottom: 0.5rem;
	}
	
	.consumption-liters {
		color: #666;
		font-size: 0.9rem;
	}
	
	.form-actions {
		display: flex;
		gap: 1rem;
		margin-top: 2rem;
	}
	
	.help-list {
		list-style: none;
		padding: 0;
	}
	
	.help-list li {
		padding: 0.5rem 0;
		border-bottom: 1px solid #e1e5e9;
		position: relative;
		padding-left: 1.5rem;
	}
	
	.help-list li:before {
		content: "✓";
		position: absolute;
		left: 0;
		color: #4CAF50;
		font-weight: bold;
	}
	
	.help-list li:last-child {
		border-bottom: none;
	}
	
	.btn:disabled {
		background: #ccc;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}
	
	.btn:disabled:hover {
		background: #ccc;
		transform: none;
	}
</style>
