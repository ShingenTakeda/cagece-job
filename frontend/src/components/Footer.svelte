<script>
  const currentYear = new Date().getFullYear();
</script>

<footer class="bg-gray-800 text-white mt-auto">
  <div class="container mx-auto px-4 py-8">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
      <!-- Sobre -->
      <div>
        <h3 class="text-lg font-semibold mb-4 text-blue-400">HidroLógica</h3>
        <p class="text-gray-300 text-sm">
          Sistema moderno de medição e controle de consumo de água, desenvolvido
          para facilitar o gerenciamento e análise de recursos hídricos.
        </p>
      </div>

      <!-- Links Rápidos -->
      <div>
        <h3 class="text-lg font-semibold mb-4 text-blue-400">Links Rápidos</h3>
        <ul class="space-y-2 text-sm">
          <li>
            <a
              href="#dashboard"
              class="text-gray-300 hover:text-blue-400 transition-colors"
            >
              Painel
            </a>
          </li>
          <li>
            <a
              href="#measurement"
              class="text-gray-300 hover:text-blue-400 transition-colors"
            >
              Nova Medição
            </a>
          </li>
          <li>
            <a
              href="#history"
              class="text-gray-300 hover:text-blue-400 transition-colors"
            >
              Histórico
            </a>
          </li>
          <li>
            <a
              href="#reports"
              class="text-gray-300 hover:text-blue-400 transition-colors"
            >
              Relatórios
            </a>
          </li>
        </ul>
      </div>

      <!-- Recursos -->
      <div>
        <h3 class="text-lg font-semibold mb-4 text-blue-400">Recursos</h3>
        <ul class="space-y-2 text-sm">
          <li class="text-gray-300">Dashboard Interativo</li>
          <li class="text-gray-300">Registro de Medições</li>
          <li class="text-gray-300">Análises e Gráficos</li>
          <li class="text-gray-300">Exportação de Dados</li>
          <li class="text-gray-300">Previsão de Consumo</li>
        </ul>
      </div>

      <!-- Contato e Informações -->
      <div>
        <h3 class="text-lg font-semibold mb-4 text-blue-400">Informações</h3>
        <ul class="space-y-2 text-sm text-gray-300">
          <li class="flex items-center">
            <span>suporte@mediagua.com.br</span>
          </li>
          <li class="flex items-center">
            <span>(85) 3000-0000</span>
          </li>
          <li class="flex items-center">
            <span>Fortaleza, CE - Brasil</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Divider -->
    <div class="border-t border-gray-700 mt-8 pt-6">
      <div
        class="flex flex-col md:flex-row justify-between items-center text-sm text-gray-400"
      >
        <div class="mb-4 md:mb-0">
          <p>&copy; {currentYear} Mediagua. Todos os direitos reservados.</p>
        </div>
        <div class="flex space-x-4">
          <a href="#privacy" class="hover:text-blue-400 transition-colors">
            Política de Privacidade
          </a>
          <span class="text-gray-600">|</span>
          <a href="#terms" class="hover:text-blue-400 transition-colors">
            Termos de Uso
          </a>
          <span class="text-gray-600">|</span>
          <a href="#help" class="hover:text-blue-400 transition-colors">
            Ajuda
          </a>
        </div>
      </div>
    </div>

    <!-- Developed by -->
    <div class="text-center mt-4 text-xs text-gray-500">
      <p>Desenvolvido para um melhor gerenciamento de recursos hídricos</p>
    </div>
  </div>
</footer>

<style>
  footer {
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  }
</style>
