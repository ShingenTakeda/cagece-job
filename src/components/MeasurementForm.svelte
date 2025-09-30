<script>
	export let addMeasurement;

	let meterNumber = '';
	let currentReading = '';
	let previousReading = '';
	let consumption = 0;
	let location = '';
	let notes = '';
	let isValid = false;

	$: {
		if (currentReading && previousReading) {
			consumption = parseFloat(currentReading) - parseFloat(previousReading);
			isValid = consumption >= 0 && meterNumber.trim() !== '';
		} else {
			consumption = 0;
			isValid = false;
		}
	}

	function handleSubmit() {
		if (!isValid) return;

		const measurement = {
			meterNumber: meterNumber.trim(),
			currentReading: parseFloat(currentReading),
			previousReading: parseFloat(previousReading),
			consumption: consumption,
			location: location.trim(),
			notes: notes.trim()
		};

		addMeasurement(measurement);
		
		// Reset form
		meterNumber = '';
		currentReading = '';
		previousReading = '';
		location = '';
		notes = '';
		
		// Show success message
		alert('Medição registrada com sucesso!');
	}

	function calculateConsumption() {
		if (currentReading && previousReading) {
			consumption = parseFloat(currentReading) - parseFloat(previousReading);
		}
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

				<div class="form-group">
					<label class="form-label" for="location">
						Localização
					</label>
					<input
						id="location"
						type="text"
						class="form-input"
						bind:value={location}
						placeholder="Ex: Residência, Comércio, etc."
					/>
				</div>
			</div>

			<div class="grid grid-2">
				<div class="form-group">
					<label class="form-label" for="previousReading">
						Leitura Anterior (m³) *
					</label>
					<input
						id="previousReading"
						type="number"
						step="0.001"
						class="form-input"
						bind:value={previousReading}
						placeholder="Ex: 123.456"
						required
					/>
				</div>

				<div class="form-group">
					<label class="form-label" for="currentReading">
						Leitura Atual (m³) *
					</label>
					<input
						id="currentReading"
						type="number"
						step="0.001"
						class="form-input"
						bind:value={currentReading}
						placeholder="Ex: 125.789"
						required
					/>
				</div>
			</div>

			<div class="form-group">
				<label class="form-label">Consumo Calculado</label>
				<div class="consumption-display">
					<span class="consumption-value">
						{consumption.toFixed(3)} m³
					</span>
					<span class="consumption-liters">
						({(consumption * 1000).toFixed(0)} litros)
					</span>
				</div>
			</div>

			<div class="form-group">
				<label class="form-label" for="notes">
					Observações
				</label>
				<textarea
					id="notes"
					class="form-input"
					bind:value={notes}
					placeholder="Observações sobre a medição..."
					rows="3"
				></textarea>
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
						currentReading = '';
						previousReading = '';
						location = '';
						notes = '';
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
			<li>Anote a leitura atual com precisão (3 casas decimais)</li>
			<li>O consumo é calculado automaticamente: Leitura Atual - Leitura Anterior</li>
			<li>Se a leitura atual for menor que a anterior, verifique se houve troca do hidrômetro</li>
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
