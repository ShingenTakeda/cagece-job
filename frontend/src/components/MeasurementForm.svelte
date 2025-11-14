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

<div class="p-6">
	<div class="bg-white p-6 rounded-lg shadow-md mb-8">
		<h1 class="text-3xl font-bold mb-6 text-gray-800">Nova Medição de Água</h1>
		
		<form on:submit|preventDefault={handleSubmit} class="space-y-6">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="flex flex-col">
					<label class="block text-sm font-medium text-gray-700 mb-1" for="meterNumber">
						Número do Hidrômetro *
					</label>
					<input
						id="meterNumber"
						type="text"
						class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						bind:value={meterNumber}
						placeholder="Ex: 123456789"
						required
					/>
				</div>

			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="flex flex-col">
					<label class="block text-sm font-medium text-gray-700 mb-1" for="consumption">
						Consumo (L) *
					</label>
					<input
						id="consumption"
						type="number"
						step="0.1"
						class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						bind:value={consumption}
						placeholder="Ex: 123.4"
						required
					/>
				</div>
			</div>

			<div class="flex space-x-4 mt-6">
				<button 
					type="submit" 
					class="bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed" 
					disabled={!isValid}
				>
					💾 Salvar Medição
				</button>
				
				<button 
					type="button" 
					class="bg-gray-200 text-gray-800 p-3 rounded-md hover:bg-gray-300 transition-colors font-semibold"
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
	<div class="bg-white p-6 rounded-lg shadow-md">
		<h3 class="text-xl font-semibold mb-3 text-gray-700">💡 Dicas para Medição</h3>
		<ul class="list-none p-0 m-0 space-y-2">
			<li class="flex items-center text-gray-700">✓ Certifique-se de que o hidrômetro está visível e legível</li>
			<li class="flex items-center text-gray-700">✓ Anote o consumo com precisão</li>
			<li class="flex items-center text-gray-700">✓ Registre observações importantes como vazamentos ou irregularidades</li>
		</ul>
	</div>
</div>


