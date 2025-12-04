#!/bin/bash

echo "🚀 Instalando HidroLógica - Serviço de Medição de Água"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale Node.js 14+ primeiro."
    echo "   Visite: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "❌ Node.js versão 14+ é necessário. Versão atual: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) encontrado"

# Install dependencies
echo "📦 Instalando dependências..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependências instaladas com sucesso!"
    echo ""
    echo "🎉 Instalação concluída!"
    echo ""
    echo "Para iniciar o servidor de desenvolvimento:"
    echo "  npm run dev"
    echo ""
    echo "Para gerar a versão de produção:"
    echo "  npm run build"
    echo ""
    echo "Acesse: http://localhost:5000"
else
    echo "❌ Erro ao instalar dependências"
    exit 1
fi
