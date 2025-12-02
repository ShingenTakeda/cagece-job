<script>
    export let signUp;

    let newUser = {
        username: '',
        email: '',
        password: '',
        street: '',
        district: '',
    };

    function handleSubmit() {
        signUp(newUser);
        newUser = {
            username: '',
            email: '',
            password: '',
            street: '',
            district: '',
        };
    }
</script>

<div class="max-w-md mx-auto mt-10 p-8 bg-white rounded-lg shadow-md">
    <h2 class="text-3xl font-bold text-center mb-6 text-gray-800">Cadastre-se</h2>

    <div>
        <form on:submit|preventDefault={handleSubmit} class="flex flex-col space-y-4">
            <input type="text" bind:value={newUser.username} placeholder="Nome de usuário" required class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="email" bind:value={newUser.email} placeholder="E-mail" required class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="password" bind:value={newUser.password} placeholder="Senha" required class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="text" bind:value={newUser.street} placeholder="Rua" required class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="text" bind:value={newUser.district} placeholder="Bairro" required class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" class="bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition-colors font-semibold">Cadastre-se</button>
        </form>
    </div>
</div>
