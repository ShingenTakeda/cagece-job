<script>
	import { onMount } from 'svelte';
	import Header from './components/Header.svelte';
	import Dashboard from './components/Dashboard.svelte';
	import MeasurementForm from './components/MeasurementForm.svelte';
	import History from './components/History.svelte';
	import Reports from './components/Reports.svelte';

	let currentView = 'dashboard';
	let measurements = [];
	let totalConsumption = 0;
	let averageConsumption = 0;
	let lastMeasurement = null;

	// Load data from localStorage on mount
	onMount(() => {
		const savedMeasurements = localStorage.getItem('cagece-measurements');
		if (savedMeasurements) {
			measurements = JSON.parse(savedMeasurements);
			updateStats();
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
</script>

<main>
	<Header {currentView} {setView} />
	
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

<style>
	main {
		min-height: 100vh;
		padding-bottom: 2rem;
	}
</style>
