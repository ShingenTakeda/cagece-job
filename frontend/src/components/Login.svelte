<script>
    import { auth } from './../auth.js';

    let email = '';
    let password = '';
    let error = '';

    async function login() {
        try {
            const response = await fetch('http://localhost:8080/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                auth.login(data.token);
            } else {
                error = 'Invalid credentials';
            }
        } catch (e) {
            error = 'An error occurred';
        }
    }
</script>

<div class="max-w-md mx-auto mt-10 p-8 bg-white rounded-lg shadow-md">
    <h2 class="text-3xl font-bold text-center mb-6 text-gray-800">Login</h2>
    <form on:submit|preventDefault={login} class="flex flex-col space-y-4">
        <input type="email" bind:value={email} placeholder="Email" required class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="password" bind:value={password} placeholder="Password" required class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" class="bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition-colors font-semibold">Login</button>
        {#if error}
            <p class="text-red-500 text-center">{error}</p>
        {/if}
    </form>
</div>


