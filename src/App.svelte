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

	// dados mockados
	const mockData = [
	{
		id: 1,
		date: '2025-01-15T12:00:00Z',
		meterNumber: 'A1001',
		currentReading: 105,
		previousReading: 100,
		consumption: 5,
		location: 'Residência 1',
		notes: 'Consumo normal'
	},
	{
		id: 2,
		date: '2025-02-15T12:00:00Z',
		meterNumber: 'A1001',
		currentReading: 110,
		previousReading: 105,
		consumption: 5,
		location: 'Residência 1',
		notes: 'Consumo regular'
	},
	{
		id: 3,
		date: '2025-03-10T12:00:00Z',
		meterNumber: 'A1002',
		currentReading: 200,
		previousReading: 180,
		consumption: 20,
		location: 'Comércio Central',
		notes: 'Consumo alto'
	},
	{
		id: 4,
		date: '2025-04-12T12:00:00Z',
		meterNumber: 'A1002',
		currentReading: 220,
		previousReading: 200,
		consumption: 20,
		location: 'Comércio Central',
		notes: 'Mês normal'
	},
	{
		id: 5,
		date: '2025-05-18T12:00:00Z',
		meterNumber: 'A1003',
		currentReading: 80,
		previousReading: 60,
		consumption: 20,
		location: 'Escritório',
		notes: 'Consumo constante'
	},
	{
		id: 6,
		date: '2025-06-15T12:00:00Z',
		meterNumber: 'A1003',
		currentReading: 95,
		previousReading: 80,
		consumption: 15,
		location: 'Escritório',
		notes: 'Consumo baixo'
	},
	{
		id: 7,
		date: '2025-07-10T12:00:00Z',
		meterNumber: 'A1004',
		currentReading: 150,
		previousReading: 140,
		consumption: 10,
		location: 'Residência 2',
		notes: 'Consumo regular'
	},
	{
		id: 8,
		date: '2025-08-12T12:00:00Z',
		meterNumber: 'A1004',
		currentReading: 165,
		previousReading: 150,
		consumption: 15,
		location: 'Residência 2',
		notes: 'Consumo alto no verão'
	},
	{
		id: 9,
		date: '2025-09-15T12:00:00Z',
		meterNumber: 'A1005',
		currentReading: 50,
		previousReading: 45,
		consumption: 5,
		location: 'Loja Pequena',
		notes: 'Consumo baixo'
	},
	{
		id: 10,
		date: '2025-10-10T12:00:00Z',
		meterNumber: 'A1005',
		currentReading: 60,
		previousReading: 50,
		consumption: 10,
		location: 'Loja Pequena',
		notes: 'Consumo moderado'
	},
	{
		id: 11,
		date: '2025-11-12T12:00:00Z',
		meterNumber: 'A1001',
		currentReading: 115,
		previousReading: 110,
		consumption: 5,
		location: 'Residência 1',
		notes: 'Consumo normal'
	},
	{
		id: 12,
		date: '2025-11-15T12:00:00Z',
		meterNumber: 'A1002',
		currentReading: 240,
		previousReading: 220,
		consumption: 20,
		location: 'Comércio Central',
		notes: 'Consumo constante'
	},
	{
		id: 13,
		date: '2025-11-18T12:00:00Z',
		meterNumber: 'A1003',
		currentReading: 110,
		previousReading: 95,
		consumption: 15,
		location: 'Escritório',
		notes: 'Leitura normal'
	},
	{
		id: 14,
		date: '2025-11-20T12:00:00Z',
		meterNumber: 'A1004',
		currentReading: 180,
		previousReading: 165,
		consumption: 15,
		location: 'Residência 2',
		notes: 'Consumo alto'
	},
	{
		id: 15,
		date: '2025-11-25T12:00:00Z',
		meterNumber: 'A1005',
		currentReading: 70,
		previousReading: 60,
		consumption: 10,
		location: 'Loja Pequena',
		notes: 'Consumo dentro do esperado'
	}
	];


	const FORCE_RESET = true;

	// Load data from localStorage on mount
	onMount(() => {

		if (FORCE_RESET) {
			localStorage.removeItem('cagece-measurements');
		}

		const savedMeasurements = localStorage.getItem('cagece-measurements');
		if (savedMeasurements) {
			measurements = JSON.parse(savedMeasurements);
		} else {
			measurements = mockData;
			localStorage.setItem('cagece-measurements', JSON.stringify(measurements));
		}
		updateStats();
	});

	function updateStats() {
		if (measurements.length === 0) {
			totalConsumption = 0;
			averageConsumption = 0;
			lastMeasurement = null;
			return;
		}
		totalConsumption = measurements.reduce((sum, m) => sum + m.consumption, 0);
		averageConsumption = totalConsumption / measurements.length;
		lastMeasurement = measurements[measurements.length - 1];
	}

	function addMeasurement(measurement) {
		measurements = [
			...measurements,
			{
				...measurement,
				id: Date.now(),
				date: new Date().toISOString()
			}
		];

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
