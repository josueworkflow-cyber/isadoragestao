# 🚀 Guia de Deploy (Easypanel / VPS)

Este guia explica como colocar seu Dashboard Comercial online usando Easypanel ou qualquer VPS com Docker.

## 1. Configuração do Easypanel

1. **Crie um novo projeto** no seu painel Easypanel.
2. **Adicione um serviço "App"**:
   - Conecte ao seu repositório GitHub.
   - O Easypanel detectará o `Dockerfile` automaticamente.
3. **Adicione um serviço "Database"**:
   - Escolha **PostgreSQL**.
   - O Easypanel fornecerá uma `DATABASE_URL`.
4. **Variáveis de Ambiente (Environment Variables)**:
   No serviço do App, adicione as seguintes variáveis:
   - `DATABASE_URL`: (Copie a URL do seu serviço de PostgreSQL do Easypanel)
   - `PORT`: `3000`

## 2. Preparação do Banco de Dados

Como o projeto usa **Prisma**, você precisa rodar as migrações no banco de dados da produção.

No Easypanel, você pode acessar o **Console/Terminal** do seu App e rodar:
```bash
npm run migrate:deploy --prefix backend
```

## 3. Estrutura de Arquivos

- **Dockerfile**: Já configurado na raiz para instalar dependências, gerar o cliente Prisma e servir o frontend.
- **Frontend**: Servido automaticamente pelo backend na porta 3000.

## 4. Dicas de Produção

- Certifique-se de que o volume para o banco de dados PostgreSQL está configurado para não perder dados em reinicializações.
- Use o domínio fornecido pelo Easypanel ou configure o seu próprio com SSL (habilitado por padrão no Easypanel).

---
*Gerado automaticamente pelo Antigravity.*
