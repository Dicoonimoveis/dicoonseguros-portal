# Configuração de DNS — E-mail Transacional Dicoon Seguros

## Objetivo

Configurar o subdomínio `mail.dicoonseguros.com.br` para envio de e-mails
transacionais com máxima entregabilidade, usando SPF, DKIM e DMARC.

> **Por que um subdomínio dedicado?**
> Isolar o envio de e-mail transacional no subdomínio `mail.` garante que qualquer
> problema de reputação de envio não afete o domínio principal `dicoonseguros.com.br`.

---

## Pré-requisitos

- Conta no [Resend](https://resend.com) (plano gratuito já suporta domínios customizados)
- Acesso ao painel DNS do seu registrador de domínio (ex: Registro.br, GoDaddy, Cloudflare)

---

## Passo 1 — Verificar o domínio no Resend

1. Acesse [resend.com/domains](https://resend.com/domains)
2. Clique em **Add Domain**
3. Digite: `mail.dicoonseguros.com.br`
4. O Resend irá gerar os registros DNS necessários (DKIM especificamente)
5. Copie os valores gerados — você precisará deles na Etapa 2

---

## Passo 2 — Registros DNS a adicionar

Adicione os seguintes registros no painel de DNS do seu provedor de domínio.
**Atenção:** substitua os valores de DKIM pelos que o Resend gerar para você.

---

### SPF — Autoriza o Resend a enviar pelo subdomínio

| Campo | Valor |
|-------|-------|
| **Tipo** | TXT |
| **Nome / Host** | `mail` |
| **Valor** | `v=spf1 include:_spf.resend.com ~all` |
| **TTL** | 3600 (1 hora) |

> O `~all` (softfail) é recomendado ao invés de `-all` (hardfail) para não bloquear
> e-mails legítimos durante a fase de configuração. Após confirmar entregabilidade,
> pode mudar para `-all`.

---

### DKIM — Assina criptograficamente os e-mails

O Resend gera uma chave DKIM única para cada domínio verificado.
Após adicionar o domínio no Resend, você verá algo como:

| Campo | Valor |
|-------|-------|
| **Tipo** | TXT |
| **Nome / Host** | `resend._domainkey.mail` |
| **Valor** | `v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GN...` (gerado pelo Resend) |
| **TTL** | 3600 |

⚠️ **Copie o valor exato fornecido pelo Resend — não use o exemplo acima.**

---

### DMARC — Política de autenticação e relatórios

| Campo | Valor |
|-------|-------|
| **Tipo** | TXT |
| **Nome / Host** | `_dmarc` (no domínio raiz, não no subdomínio mail.) |
| **Valor** | `v=DMARC1; p=quarantine; rua=mailto:contato.dicoonseguros@gmail.com; adkim=r; aspf=r` |
| **TTL** | 3600 |

**Significado dos parâmetros:**
- `p=quarantine` → E-mails que falhem na autenticação vão para spam (não são rejeitados)
- `rua=mailto:...` → Relatórios DMARC agregados enviados ao seu e-mail
- `adkim=r` → Alinhamento DKIM relaxado (recomendado)
- `aspf=r` → Alinhamento SPF relaxado (recomendado)

> **Fase de rollout:**
> 1. Comece com `p=none` (monitoramento apenas, nenhum e-mail é bloqueado)
> 2. Após 2 semanas analisando os relatórios, mude para `p=quarantine`
> 3. Quando confortável, mude para `p=reject` (máxima proteção)

---

## Passo 3 — Configurar Variável de Ambiente no Supabase

Após verificar o domínio no Resend:

1. Acesse [app.supabase.com](https://app.supabase.com) → seu projeto
2. Vá em **Settings** → **Edge Functions**
3. Adicione a variável de ambiente:

```
RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxx
```

4. Também adicione (se ainda não tiver):

```
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOi...
```

---

## Passo 4 — Habilitar tracking desabilitado no Resend

Para e-mails transacionais, é **recomendado desabilitar rastreamento**:

1. No Resend Dashboard → **Settings** → **Email**
2. Desative **Click tracking** e **Open tracking**
3. Ou, por domínio: na tela de configuração do domínio `mail.dicoonseguros.com.br`,
   desabilite o tracking.

---

## Passo 5 — Verificação dos registros

Use as ferramentas abaixo para confirmar que os registros estão corretos:

| Ferramenta | URL | O que verifica |
|---|---|---|
| MXToolbox SPF | https://mxtoolbox.com/spf.aspx | Valida o SPF |
| MXToolbox DKIM | https://mxtoolbox.com/dkim.aspx | Valida o DKIM |
| MXToolbox DMARC | https://mxtoolbox.com/dmarc.aspx | Valida o DMARC |
| Mail Tester | https://www.mail-tester.com | Score geral de spam (meta: 10/10) |
| DNS Checker | https://dnschecker.org | Propagação global dos registros |

---

## Configuração do remetente no código

Após a verificação, os e-mails são enviados com:

```
From:     Dicoon Seguros <noreply@mail.dicoonseguros.com.br>
Reply-To: contato.dicoonseguros@gmail.com
```

- **From:** subdomínio verificado → SPF/DKIM/DMARC passam ✅
- **Reply-To:** e-mail do corretor → clientes respondem direto para você ✅

---

## Timeline estimada

| Etapa | Tempo estimado |
|---|---|
| Verificar domínio no Resend | 15 min |
| Adicionar registros DNS | 10 min |
| Propagação dos registros | 1–24 horas |
| Teste de entregabilidade | 15 min |
| Total | ~2–25 horas |

---

## Template de tickets WhatsApp Business (para quando ativar a API)

Ao submeter templates para aprovação na Meta, use estas categorias e conteúdos:

### Template: `policy_renewal_reminder`
- **Categoria:** UTILITY
- **Idioma:** pt_BR
- **Corpo:**
```
Olá, {{1}}! Sua apólice {{2}} ({{3}}) vence em {{4}}. Para renovar e consultar detalhes, acesse o portal Dicoon Seguros: {{5}}

Em caso de dúvidas, responda esta mensagem.

Dicoon Seguros
```

### Template: `proposal_ready`
- **Categoria:** UTILITY
- **Idioma:** pt_BR
- **Corpo:**
```
Olá, {{1}}! Sua proposta {{2}} na {{3}} para {{4}} está pronta. Valor: R$ {{5}}/ano. Acesse o portal para ver os detalhes e assinar: {{6}}

Qualquer dúvida, responda esta mensagem.

Dicoon Seguros
```

---

*Documento gerado automaticamente — Dicoon Seguros Portal v1.0*
