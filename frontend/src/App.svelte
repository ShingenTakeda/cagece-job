<script>
	import { onMount } from 'svelte';
	import Header from './components/Header.svelte';
	import Dashboard from './components/Dashboard.svelte';
	import MeasurementForm from './components/MeasurementForm.svelte';
	import History from './components/History.svelte';
	import Reports from './components/Reports.svelte';
	import Login from './components/Login.svelte';
	import SignUp from './components/SignUp.svelte';
	import { auth } from './auth.js';

	let currentView = 'dashboard';
	let measurements = [];
	let totalConsumption = 0;
	let averageConsumption = 0;
	let lastMeasurement = null;
	const API_URL = 'http://localhost:8080/api/measurements';
	const USER_API_URL = 'http://localhost:8080/api/users';

	let isAuthenticated = false;
	let token = null;
	let currentUser = null; // New state variable for current user

	auth.subscribe(value => {
		isAuthenticated = !!value.token;
		token = value.token;
		if (isAuthenticated) {
			fetchMeasurements();
			fetchCurrentUser(); // Fetch user details after authentication
		} else {
			currentUser = null; // Clear user data on logout
		}
	});

	onMount(() => {
		auth.init();
	});

	async function fetchCurrentUser() {
		try {
			const response = await fetch(`${USER_API_URL}/${token}`, { // Use token as userID
				headers: {
					'Authorization': token // Send token for authorization
				}
			});
			if (response.ok) {
				currentUser = await response.json();
			} else {
				console.error('Failed to fetch current user');
				currentUser = null;
			}
		} catch (error) {
			console.error('Error fetching current user:', error);
			currentUser = null;
		}
	}

	async function fetchMeasurements() {
		try {
			const response = await fetch(API_URL, {
				headers: {
					'Authorization': token
				}
			});
			if (response.ok) {
				measurements = await response.json();
				if (measurements === null) {
					measurements = [];
				}
				updateStats();
			} else {
				console.error('Failed to fetch measurements');
			}
		} catch (error) {
			console.error('Error fetching measurements:', error);
		}
	}

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

	async function addMeasurement(measurement) {
		try {
			const response = await fetch(API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': token
				},
				body: JSON.stringify(measurement),
			});
			if (response.ok) {
				const newMeasurement = await response.json();
				measurements = [...measurements, newMeasurement];
				updateStats();
			} else {
				console.error('Failed to add measurement');
			}
		} catch (error) {
			console.error('Error adding measurement:', error);
		}
	}

	async function deleteMeasurement(id) {
		try {
			const response = await fetch(`${API_URL}/${id}`, {
				method: 'DELETE',
				headers: {
					'Authorization': token
				}
			});
			if (response.ok) {
				measurements = measurements.filter(m => m.id !== id);
				updateStats();
			} else {
				console.error('Failed to delete measurement');
			}
		} catch (error) {
			console.error('Error deleting measurement:', error);
		}
	}

	async function signUp(user) {
		try {
			const response = await fetch(USER_API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(user),
			});
			if (response.ok) {
				setView('login');
			} else {
				console.error('Failed to sign up');
			}
		} catch (error) {
			console.error('Error signing up:', error);
		}
	}

	function setView(view) {
		currentView = view;
	}
</script>

<main class="min-h-screen bg-gray-100">
	<Header {currentView} {setView} {isAuthenticated} />
	
	<div class="container mx-auto p-4">
		{#if isAuthenticated}
			{#if currentView === 'dashboard'}
				<Dashboard 
					{measurements}
					{totalConsumption}
					{averageConsumption}
					{lastMeasurement}
					{setView}
					{currentUser}
				/>
			{:else if currentView === 'measurement'}
				<MeasurementForm {addMeasurement} {setView} />
			{:else if currentView === 'history'}
				<History {measurements} {deleteMeasurement} />
			{:else if currentView === 'reports'}
				<Reports {measurements} {totalConsumption} {averageConsumption} />
			{/if}
		{:else}
			{#if currentView === 'signup'}
				<SignUp {signUp} />
			{:else}
				<Login />
			{/if}
		{/if}
	</div>
</main>


