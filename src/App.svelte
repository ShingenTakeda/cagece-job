<script>
	import { onMount } from 'svelte';
	import Header from './components/Header.svelte';
	import Dashboard from './components/Dashboard.svelte';
	import MeasurementForm from './components/MeasurementForm.svelte';
	import History from './components/History.svelte';
	import Reports from './components/Reports.svelte';
	import Login from './components/Login.svelte';

	let currentView = 'dashboard';
	let measurements = [];
	let totalConsumption = 0;
	let averageConsumption = 0;
	let lastMeasurement = null;
	let isAuthenticated = false;
	let currentUser = null;

	// Load data from localStorage on mount
	onMount(() => {
		const savedMeasurements = localStorage.getItem('cagece-measurements');
		if (savedMeasurements) {
			measurements = JSON.parse(savedMeasurements);
			updateStats();
		}

		const savedUser = localStorage.getItem('cagece-user');
		if (savedUser) {
			try {
				currentUser = JSON.parse(savedUser);
				isAuthenticated = Boolean(currentUser?.username);
			} catch (error) {
				console.warn('Failed to restore user session', error);
				localStorage.removeItem('cagece-user');
			}
		}
	});

	function updateStats() {
		if (measurements.length === 0) {
			totalConsumption = 0;
			averageConsumption = 0;
			lastMeasurement = null;
			return;
		}

		// Calculate total consumption
		totalConsumption = measurements.reduce((sum, measurement) => sum + measurement.consumption, 0);
		
		// Calculate average consumption
		averageConsumption = totalConsumption / measurements.length;
		
		// Get last measurement
		lastMeasurement = measurements[measurements.length - 1];
	}

	function addMeasurement(measurement) {
		measurements = [...measurements, {
			...measurement,
			id: Date.now(),
			date: new Date().toISOString()
		}];
		
		// Save to localStorage
		localStorage.setItem('cagece-measurements', JSON.stringify(measurements));
		
		updateStats();
	}

	function deleteMeasurement(id) {
		measurements = measurements.filter(m => m.id !== id);
		localStorage.setItem('cagece-measurements', JSON.stringify(measurements));
		updateStats();
	}

	function setView(view) {
		currentView = view;
	}

	function handleLogin(event) {
		const { username } = event.detail;
		currentUser = { username };
		isAuthenticated = true;
		localStorage.setItem('cagece-user', JSON.stringify(currentUser));
	}

	function handleLogout() {
		isAuthenticated = false;
		currentUser = null;
		currentView = 'dashboard';
		localStorage.removeItem('cagece-user');
	}
</script>

{#if !isAuthenticated}
	<Login on:login={handleLogin} />
{:else}
	<main>
		<Header {currentView} {setView} />

		<div class="user-bar">
			<span class="user-greeting">Bem-vindo, {currentUser.username}</span>
			<button class="logout-button" type="button" on:click={handleLogout}>
				Sair
			</button>
		</div>

		<div class="container">
			{#if currentView === 'dashboard'}
				<Dashboard 
					{measurements}
					{totalConsumption}
					{averageConsumption}
					{lastMeasurement}
				/>
			{:else if currentView === 'measurement'}
				<MeasurementForm {addMeasurement} />
			{:else if currentView === 'history'}
				<History {measurements} {deleteMeasurement} />
			{:else if currentView === 'reports'}
				<Reports {measurements} {totalConsumption} {averageConsumption} />
			{/if}
		</div>
	</main>
{/if}

<style>
	main {
		min-height: 100vh;
		padding-bottom: 2rem;
	}

	.user-bar {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 1rem;
		margin: 1.35rem auto 0;
		padding: 0.85rem 1.6rem;
		max-width: 1200px;
		background: rgba(255, 255, 255, 0.78);
		border-radius: 18px;
		box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
		backdrop-filter: blur(14px);
		color: #0f172a;
	}

	.user-greeting {
		font-weight: 600;
		letter-spacing: 0.01em;
	}

	.logout-button {
		background: linear-gradient(135deg, #4CAF50 0%, #22c55e 60%, #14b8a6 100%);
		border: none;
		border-radius: 999px;
		color: #f0fdf4;
		cursor: pointer;
		font-weight: 600;
		padding: 0.55rem 1.45rem;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
		box-shadow: 0 12px 24px rgba(34, 197, 94, 0.35);
	}

	.logout-button:hover {
		transform: translateY(-1px);
		box-shadow: 0 18px 30px rgba(20, 184, 166, 0.35);
	}
</style>
