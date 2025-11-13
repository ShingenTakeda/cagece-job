<script>
	export let currentView;
	export let setView;
</script>

<header class="header">
	<div class="container">
		<div class="header-content">
			<div class="logo">
				💧 Mediagua - Serviço de Medição de Água
			</div>
			
			<nav class="nav">
				<button 
					class="nav-link" 
					class:active={currentView === 'dashboard'}
					on:click={() => setView('dashboard')}
				>
					📊 Dashboard
				</button>
				<button 
					class="nav-link" 
					class:active={currentView === 'measurement'}
					on:click={() => setView('measurement')}
				>
					📝 Nova Medição
				</button>
				<button 
					class="nav-link" 
					class:active={currentView === 'history'}
					on:click={() => setView('history')}
				>
					📋 Histórico
				</button>
				<button 
					class="nav-link" 
					class:active={currentView === 'reports'}
					on:click={() => setView('reports')}
				>
					📈 Relatórios
				</button>
			</nav>
		</div>
	</div>
</header>

<style>
	.nav-link {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 16px;
	}
</style>
