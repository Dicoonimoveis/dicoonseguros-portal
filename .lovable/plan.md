# Dashboard Admin completo + Importação de apólice com IA

Vou expandir o `/dashboard-admin` existente com **9 seções funcionais** e uma **nova tela de importação inteligente** (`/admin/importar-apolice`) ligada à IA do Lovable.

## Escopo

### Backend (Supabase)
- **Storage**: usar bucket `policy-documents` já existente para PDFs.
- **Migração SQL**:
  - Função RPC `admin_create_client(...)` que cria usuário em `auth.users` + `profiles` + `user_roles` (cliente) usando service role via server function.
  - Tabela `import_settings` (alertas automáticos: 60/30/15/7/0 dias) por admin.
  - Tabela `broker_settings` (dados da corretora: nome, email, whatsapp, horário) — singleton.
- **Server functions** (`createServerFn` com `requireSupabaseAuth` + checagem `has_role(admin)`):
  - `adminCreateClient` — cria cliente novo (auth + profile + role).
  - `adminCreatePolicy` — cria apólice + upload de PDF.
  - `adminImportSpreadsheet` — processa linhas xlsx/csv.
  - `extractPolicyFromDocument` — chama Lovable AI Gateway (`google/gemini-2.5-pro`, suporta PDF/imagem) e retorna JSON com os campos.
  - `adminListClients`, `adminListPolicies`, `adminListClaims`, `adminListAllDocuments`.

### Frontend (`src/routes/dashboard-admin.tsx`)
Refatorar em sub-componentes (um arquivo por seção em `src/components/admin/`):
1. **Dashboard** — 4 métricas + 2 alertas + tabela urgentes + tabela últimos clientes.
2. **Clientes** — busca, filtros, tabela, modal "Novo cliente", drawer "Ver perfil".
3. **Apólices** — tabela + modal "Nova apólice" com upload PDF + botão "Importar planilha".
4. **Vencimentos** — alertas + tabelas com botão WhatsApp por linha + card de alertas automáticos persistidos.
5. **Sinistros** — tabela + modal "Registrar sinistro" + drawer "Gerenciar".
6. **Documentos** — lista agrupada por cliente, filtros, botão "Anexar documento".
7. **Importar planilha** — drag-and-drop, prévia, "Baixar modelo" (xlsx via `xlsx`), botão "Processar".
8. **Relatórios** — 6 cards com geração/exportação.
9. **Configurações** — dados corretora + tabela usuários + alterar senha.

No menu lateral, abaixo de "Dashboard", botão verde destacado **"Importar apólice"** que abre `/admin/importar-apolice`.

### `/admin/importar-apolice` — Fluxo IA em 4 etapas
- **Etapa 1**: upload PDF/JPG/PNG (até 20 MB) com botões "Enviar PDF", "Usar câmera" (input capture), "Escanear documento".
- **Etapa 2**: tela de processamento com preview do arquivo, animação de scan-line, barra de progresso verde e mensagens dinâmicas rotativas. Chama `extractPolicyFromDocument` que envia o arquivo (base64) ao Lovable AI Gateway.
- **Etapa 3**: lookup automático por CPF/CNPJ → card verde (cliente encontrado) ou amarelo (novo). Formulário em 2 seções com campos preenchidos pela IA destacados em verde (`#F0FFF8` / borda `#A8E6CE`) + tag "IA".
- **Etapa 4**: tela de sucesso com 3 cards-resumo e 3 botões de ação. Ao confirmar: cria cliente (se novo), cria apólice, faz upload do PDF para storage.

### Decisão IA
Vou usar **Lovable AI Gateway com `google/gemini-2.5-pro`** (vision + PDF nativo, sem custo extra de API key) em vez da API Anthropic direta — não exige chave do usuário. Se preferir Claude, ative o connector Anthropic.

## Detalhes técnicos
- Dependências novas: `xlsx` (geração/leitura de planilhas).
- Cores: `#1D9E75` (primária), `#25D366` (WhatsApp), `#F0F2F5` (fundo), `#7C3AED` (badge admin).
- WhatsApp link: `https://wa.me/message/HCHOQ3CXMLGFG1`.
- Toda escrita admin protegida por `has_role(auth.uid(), 'admin')` no servidor.
- RLS já permite admin ler tudo (políticas existentes).

## Fora do escopo (entrega depois se quiser)
- Envio real de e-mail com credenciais ao novo cliente (precisa configurar email domain).
- Implementação completa de relatórios PDF — vou entregar exportação .xlsx funcional e cards de relatório com dados; PDF customizado pode ficar para depois.
- Scanner de documento físico (TWAIN) — botão abre o mesmo fluxo de câmera, sem suporte real a scanner USB.

Posso prosseguir?