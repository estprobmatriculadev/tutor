# Guia de Deploy: Do Lovable para GitHub & Vercel

Este guia descreve os passos necessários para tirar o seu projeto **Tutor Insights** do Lovable, enviá-lo para um repositório no **GitHub** e realizar o deploy na **Vercel** com suporte completo a rotas dinâmicas, Server-Side Rendering (SSR) e integração com o Google Sheets.

---

## 📋 Pré-requisitos

Antes de iniciar, certifique-se de ter:
1. Uma conta no [GitHub](https://github.com).
2. Uma conta na [Vercel](https://vercel.com) (conectada com sua conta do GitHub para facilitar).
3. Uma planilha do Google Sheets que você queira ler.
4. O **Node.js** (versão 18 ou superior) instalado em sua máquina (caso queira rodar localmente no futuro).

---

## 🚀 Passo 1: Enviar o Projeto para o GitHub (Manualmente no Navegador)

Como você não tem o Git instalado localmente, você pode subir os arquivos do projeto diretamente pelo site do GitHub:

1. **Criar o repositório no GitHub**:
   - Acesse [github.com](https://github.com) e faça login.
   - No canto superior direito, clique no botão **"+"** e selecione **"New repository"**.
   - Dê um nome ao seu repositório (ex: `tutor-insights`).
   - Escolha se deseja que o repositório seja **Public** (público) ou **Private** (privado).
   - **IMPORTANTE**: Não marque as opções de adicionar README, `.gitignore` ou licença (deixe tudo desmarcado).
   - Clique em **"Create repository"**.

2. **Acessar a área de upload manual**:
   - Na página do repositório recém-criado, procure pelo link **"uploading an existing file"** (localizado logo no primeiro parágrafo de instruções rápidas) e clique nele.

3. **Arrastar e soltar os arquivos do projeto**:
   - Abra o explorador de arquivos do Windows na pasta do seu projeto: `c:\Users\pseudocelomado\Documents\Tutor_Insights`.
   - Selecione **todos** os arquivos e pastas de dentro dessa pasta.
     > [!IMPORTANT]
     > Caso a pasta `node_modules` ou `.vinxi` existam na pasta do projeto, **NÃO** as selecione. Selecione apenas os arquivos de código-fonte (como `src`, `package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`, etc.).
   - **Arraste e solte** todos os arquivos selecionados na área demarcada do GitHub no seu navegador.
   - *Nota: O GitHub tem um limite máximo de 100 arquivos por vez via upload manual no site. Como este projeto sem dependências instaladas possui menos de 30 arquivos, o upload será feito de uma única vez sem problemas!*

4. **Confirmar o upload (Commit)**:
   - No final da página de upload, em **"Commit changes"**, insira um título descritivo (ex: `feat: upload inicial do projeto`).
   - Certifique-se de que a opção "Commit directly to the main branch" está selecionada.
   - Clique no botão verde **"Commit changes"** e aguarde o processamento. Pronto! Seus arquivos foram carregados.

---

## 🌐 Passo 2: Configurar e Implantar na Vercel

1. Acesse o painel da **Vercel** e clique em **Add New > Project**.
2. Na lista de repositórios do GitHub, encontre o repositório `tutor-insights` e clique em **Import**.
3. Na tela de configuração de Deploy:
   - **Framework Preset**: Deixe como `Other` ou `Vite` (a Vercel irá autodetectar a integração com o Nitro/TanStack Start).
   - **Build and Output Settings**: Pode deixar os valores padrão:
     - *Build Command*: `npm run build`
     - *Output Directory*: Padrão (a Vercel lerá automaticamente a pasta `.vercel` gerada pelo nosso plugin customizado).
4. **IMPORTANTE: Variáveis de Ambiente (Environment Variables)**
   Expanda a seção de variáveis de ambiente e adicione as duas chaves a seguir com os valores correspondentes obtidos do arquivo JSON da sua Conta de Serviço:
   
   *   `GOOGLE_SERVICE_ACCOUNT_EMAIL`: O email da conta de serviço (o valor do campo `"client_email"` no JSON).
   *   `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: A chave privada da conta de serviço (o valor do campo `"private_key"` no JSON, incluindo as linhas de início e fim da chave e os caracteres de nova linha se houver).

5. Clique em **Deploy**.
6. Aguarde alguns minutos até a Vercel compilar o projeto e gerar os links de visualização!

---

## 💻 Passo 3: Como Rodar o Projeto Localmente

Se você quiser continuar o desenvolvimento do seu projeto na sua máquina (sem depender do Lovable):

1. Instale as dependências do projeto (execute no diretório raiz):
   ```bash
   npm install
   # ou caso use o Bun:
   bun install
   ```
2. Crie um arquivo chamado `.env` na raiz do projeto para armazenar suas chaves localmente:
   ```env
   GOOGLE_SERVICE_ACCOUNT_EMAIL="seu-email-de-servico@projeto.iam.gserviceaccount.com"
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSuaChavePrivadaAqui\n-----END PRIVATE KEY-----\n"
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   # ou com bun:
   bun run dev
   ```
4. Abra o navegador no endereço indicado (geralmente `http://localhost:3000`).

---

## 🛠️ Detalhes Técnicos da Adaptação

*   **Vite & Nitro**: O projeto original usa `@lovable.dev/vite-tanstack-config`, que por padrão direciona o build para Cloudflare. Nós configuramos explicitamente o plugin `nitro` com `preset: "vercel"` no arquivo `vite.config.ts`. Isso assegura que, ao rodar o comando `npm run build` na Vercel, o compilador gere as funções servíveis da Vercel (Fluid Compute) na estrutura correta, evitando erros 404 ao navegar pelas páginas.
*   **Conector do Google Sheets**: O arquivo `src/lib/observations.functions.ts` realiza chamadas seguras no lado do servidor (através de `createServerFn`) para obter os dados diretamente da API oficial do Google Sheets (`sheets.googleapis.com`). Ele utiliza uma função interna de geração de tokens JWT baseada no módulo nativo `node:crypto` do Node.js para autenticação segura com a Conta de Serviço do Google Cloud. As variáveis de ambiente `GOOGLE_SERVICE_ACCOUNT_EMAIL` e `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` na Vercel são os únicos requisitos para o carregamento seguro dos dados.

---

## 🔑 Como Criar uma Conta de Serviço do Google Cloud

A utilização de uma Conta de Serviço (Service Account) é o método mais seguro para acessar dados do Google Sheets, pois permite manter sua planilha **privada**, compartilhando o acesso apenas com a conta de desenvolvimento. Siga o passo a passo para configurar:

### Passo A: Criar a Conta de Serviço no Google Cloud
1. Acesse o [Google Cloud Console](https://console.cloud.google.com/) e faça login.
2. Selecione o projeto criado anteriormente (ex: `Tutor-Insights-Sheets`) no seletor no topo da tela.
3. Clique no menu lateral (três tracinhos no canto superior esquerdo) e acesse **"IAM e Administrador" > "Contas de serviço"** (IAM & Admin > Service Accounts).
4. Clique no botão **"+ Criar Conta de Serviço"** (+ Create Service Account) no topo.
5. Digite um nome para a conta de serviço (ex: `leitor-sheets`) e clique em **"Criar e Continuar"** (Create and Continue).
6. Na etapa de papéis (roles), você pode clicar diretamente em **"Continuar"** (não é necessário conceder papéis no projeto do Google Cloud, pois o acesso será concedido na própria planilha).
7. Clique em **"Concluído"** (Done).

### Passo B: Gerar a Chave JSON da Conta de Serviço
1. Na lista de Contas de Serviço, clique no email da conta que você acabou de criar.
2. Na parte superior da tela de detalhes, clique na aba **"Chaves"** (Keys).
3. Clique em **"Adicionar Chave" > "Criar nova chave"** (Add Key > Create new key).
4. Certifique-se de que a opção **"JSON"** está marcada e clique em **"Criar"** (Create).
5. O download de um arquivo `.json` começará automaticamente. **Guarde esse arquivo em um local seguro** no seu computador!
6. Abra o arquivo `.json` com o Bloco de Notas ou qualquer editor de texto. Você precisará de duas informações dele:
   - O campo `"client_email"` (este é o email da sua conta de serviço).
   - O campo `"private_key"` (esta é a chave privada longa, começando com `-----BEGIN PRIVATE KEY-----`).

### Passo C: Compartilhar a Planilha do Google Sheets
1. Abra a sua planilha do Google Sheets que contém as respostas do formulário.
2. Clique no botão azul **"Compartilhar"** (Share) no canto superior direito.
3. No campo de adicionar pessoas, insira o **email da sua conta de serviço** (o valor copiado do campo `"client_email"` do JSON).
4. Defina a permissão dele como **"Leitor"** (Viewer).
5. Desmarque a opção de notificar pessoas e clique em **"Compartilhar"** (ou Enviar).
   *Pronto! Agora a sua conta de serviço tem acesso exclusivo de leitura à planilha, enquanto ela permanece privada para o restante da internet.*
