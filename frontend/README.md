# CAGECE - Serviço de Medição de Água

Um sistema web moderno para medição e controle de consumo de água, desenvolvido em Svelte com interface em português brasileiro.

## 🚀 Funcionalidades

- **Dashboard Interativo**: Visualização de estatísticas e medições recentes
- **Registro de Medições**: Formulário intuitivo para registrar leituras do hidrômetro
- **Histórico Completo**: Visualização e gerenciamento de todas as medições
- **Relatórios e Análises**: Gráficos e análises de consumo por período
- **Exportação de Dados**: Exportar medições e relatórios em JSON
- **Interface Responsiva**: Funciona perfeitamente em desktop e mobile

## 🛠️ Tecnologias Utilizadas

- **Svelte 3**: Framework JavaScript reativo
- **Rollup**: Bundler para build da aplicação
- **CSS3**: Estilização moderna com gradientes e animações
- **LocalStorage**: Armazenamento local dos dados

## 📦 Instalação

### Pré-requisitos

- Node.js (versão 14 ou superior)
- npm ou yarn

### Passos para instalação

1. **Clone ou baixe o projeto**
   ```bash
   cd /home/mitsuo/Desktop/cagece
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Execute o servidor de desenvolvimento**
   ```bash
   npm run dev
   ```

4. **Acesse a aplicação**
   Abra seu navegador e acesse: `http://localhost:5000`

## 🚀 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento com hot-reload
- `npm run build` - Gera a versão de produção
- `npm run start` - Inicia o servidor de produção

## 📱 Como Usar

### 1. Dashboard
- Visualize estatísticas gerais do consumo
- Acompanhe as medições mais recentes
- Acesse ações rápidas

### 2. Nova Medição
- Preencha o número do hidrômetro
- Informe a leitura anterior e atual
- O consumo é calculado automaticamente
- Adicione localização e observações

### 3. Histórico
- Visualize todas as medições registradas
- Use filtros de busca e ordenação
- Exporte os dados para análise externa
- Exclua medições incorretas

### 4. Relatórios
- Analise o consumo por período (semanal/mensal)
- Identifique os maiores consumidores
- Visualize tendências de consumo
- Exporte relatórios completos

## 💾 Armazenamento de Dados

Os dados são armazenados localmente no navegador usando `localStorage`. Isso significa que:

- ✅ Os dados ficam salvos entre sessões
- ✅ Não há necessidade de servidor ou banco de dados
- ✅ Funciona offline
- ⚠️ Os dados são específicos do navegador/dispositivo

## 🎨 Interface

A interface foi desenvolvida com foco na usabilidade e acessibilidade:

- **Design Responsivo**: Adapta-se a diferentes tamanhos de tela
- **Cores Intuitivas**: Verde para valores normais, vermelho para alertas
- **Tipografia Clara**: Fonte legível em todos os dispositivos
- **Navegação Simples**: Menu intuitivo com ícones descritivos

## 🔧 Personalização

### Modificar Cores
Edite o arquivo `public/global.css` para alterar o esquema de cores:

```css
:root {
  --primary-color: #4CAF50;
  --secondary-color: #6c757d;
  --danger-color: #dc3545;
}
```

### Adicionar Novos Campos
Para adicionar novos campos ao formulário de medição, edite `src/components/MeasurementForm.svelte`.

## 📊 Estrutura dos Dados

Cada medição contém:

```javascript
{
  id: Number,           // ID único
  date: String,         // Data/hora da medição
  meterNumber: String,  // Número do hidrômetro
  currentReading: Number, // Leitura atual (m³)
  previousReading: Number, // Leitura anterior (m³)
  consumption: Number,  // Consumo calculado (m³)
  location: String,     // Localização
  notes: String         // Observações
}
```

## 🚀 Deploy

Para fazer deploy da aplicação:

1. **Gere a versão de produção**
   ```bash
   npm run build
   ```

2. **Os arquivos estarão na pasta `public/`**
   - `public/build/bundle.js` - JavaScript da aplicação
   - `public/build/bundle.css` - Estilos da aplicação
   - `public/index.html` - Página principal

3. **Faça upload dos arquivos para seu servidor web**

## 🤝 Contribuição

Para contribuir com o projeto:

1. Faça um fork do repositório
2. Crie uma branch para sua feature
3. Faça commit das mudanças
4. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 Suporte

Para dúvidas ou problemas:

1. Verifique se todas as dependências estão instaladas
2. Certifique-se de estar usando Node.js 14+
3. Limpe o cache: `npm cache clean --force`
4. Reinstale as dependências: `rm -rf node_modules && npm install`

## 🔮 Próximas Funcionalidades

- [ ] Sincronização com servidor remoto
- [ ] Notificações de consumo alto
- [ ] Gráficos mais avançados
- [ ] Backup automático
- [ ] Múltiplos usuários
- [ ] Relatórios em PDF

---

**Desenvolvido com ❤️ para a CAGECE - Companhia de Água e Esgoto do Ceará**
