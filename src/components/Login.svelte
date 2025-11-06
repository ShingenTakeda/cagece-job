<script>
  import { createEventDispatcher } from 'svelte';

  const dispatcher = createEventDispatcher();

  let username = '';
  let password = '';
  let errorMessage = '';

  const MOCK_USER = {
    username: 'admin',
    password: 'admin123'
  };

  function submitLogin() {
    errorMessage = '';

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      errorMessage = 'Informe usuario e senha.';
      return;
    }

    const isValidUser =
      trimmedUsername.toLowerCase() === MOCK_USER.username &&
      password === MOCK_USER.password;

    if (!isValidUser) {
      errorMessage = 'Credenciais invalidas. Tente novamente.';
      return;
    }

    dispatcher('login', { username: trimmedUsername });
    username = '';
    password = '';
  }
</script>

<section class="login-wrapper">
  <div class="background-ornament top"></div>
  <div class="background-ornament bottom"></div>

  <div class="login-card">
    <h1 class="login-title">Acesse sua conta</h1>
    <p class="login-subtitle">Use admin / admin123 para testar.</p>

    <form class="login-form" on:submit|preventDefault={submitLogin}>
      <div class="form-group">
        <label class="form-label" for="login-username">Usuario</label>
        <input
          id="login-username"
          name="username"
          class="form-input"
          type="text"
          bind:value={username}
          autocomplete="username"
          required
        />
      </div>

      <div class="form-group">
        <label class="form-label" for="login-password">Senha</label>
        <input
          id="login-password"
          name="password"
          class="form-input"
          type="password"
          bind:value={password}
          autocomplete="current-password"
          required
        />
      </div>

      {#if errorMessage}
        <p id="login-error" class="error-message">{errorMessage}</p>
      {/if}

      <button class="login-button" type="submit">Entrar</button>
    </form>
  </div>
</section>

<style>
  .login-wrapper {
    position: relative;
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 2rem;
    background: linear-gradient(135deg, #667eea 0%, #3b82f6 45%, #0ea5e9 100%);
    overflow: hidden;
  }

  .background-ornament {
    position: absolute;
    border-radius: 999px;
    filter: blur(0);
    opacity: 0.35;
    pointer-events: none;
    z-index: 0;
    background: radial-gradient(circle at center, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0) 70%);
  }

  .background-ornament.top {
    width: 420px;
    height: 420px;
    top: -180px;
    right: -120px;
  }

  .background-ornament.bottom {
    width: 520px;
    height: 520px;
    bottom: -260px;
    left: -120px;
    opacity: 0.25;
  }

  .login-card {
    width: min(420px, 100%);
    background: rgba(255, 255, 255, 0.92);
    border-radius: 18px;
    box-shadow: 0 30px 60px rgba(15, 23, 42, 0.25);
    padding: 2.75rem 2.25rem;
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.6);
    position: relative;
    z-index: 1;
  }

  .login-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 1px solid rgba(102, 126, 234, 0.2);
    pointer-events: none;
  }

  .login-card::after {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 120px;
    height: 4px;
    border-radius: 999px;
    background: linear-gradient(90deg, #34d399 0%, #4CAF50 55%, #2dd4bf 100%);
  }

  .login-title {
    font-size: 1.8rem;
    margin: 0 0 0.35rem;
    text-align: center;
    color: #0f172a;
  }

  .login-subtitle {
    text-align: center;
    margin: 0 0 2.25rem;
    color: #1f3c88;
    font-size: 0.95rem;
    font-weight: 500;
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-label {
    font-weight: 600;
    color: #1e293b;
  }

  .form-input {
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.55);
    padding: 0.85rem 1rem;
    font-size: 1rem;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    background: rgba(255, 255, 255, 0.95);
  }

  .form-input:focus {
    border-color: #4CAF50;
    box-shadow: 0 0 0 4px rgba(76, 175, 80, 0.18);
    outline: none;
  }

  .login-button {
    border: none;
    border-radius: 14px;
    padding: 0.9rem 1rem;
    font-size: 1rem;
    font-weight: 600;
    color: #f8fafc;
    background: linear-gradient(135deg, #4CAF50 0%, #2dd4bf 55%, #38bdf8 100%);
    box-shadow: 0 18px 30px rgba(45, 212, 191, 0.35);
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .login-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 22px 36px rgba(59, 130, 246, 0.35);
  }

  .error-message {
    margin: -0.25rem 0 0;
    color: #dc2626;
    font-size: 0.95rem;
    text-align: center;
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  @media (max-width: 480px) {
    .login-wrapper {
      padding: 1.5rem;
    }

    .login-card {
      padding: 2.1rem 1.6rem;
    }

    .background-ornament.top {
      width: 320px;
      height: 320px;
      top: -140px;
      right: -140px;
    }

    .background-ornament.bottom {
      width: 360px;
      height: 360px;
      bottom: -220px;
      left: -160px;
    }

    .login-title {
      font-size: 1.6rem;
    }
  }
</style>
