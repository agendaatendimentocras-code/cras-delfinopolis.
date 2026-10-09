# Como colocar o sistema CRAS no ar para os profissionais testarem

O sistema é um site (SPA em React) que conversa com o Supabase (nuvem).
A pasta **`dist/`** (dentro do pacote) já contém o sistema **pronto e compilado** —
as credenciais do Supabase já vão embutidas nela. Basta "servir" essa pasta.

Existem duas formas. A **Opção A (online)** é a mais fácil para todos acessarem
de qualquer computador. A **Opção B (rede local)** deixa tudo dentro do CRAS.

---

## ✅ Opção A — Hospedagem online grátis (recomendada)

Assim cada profissional acessa por um link, de qualquer computador com internet.

### Netlify Drop (mais simples, sem instalar nada)
1. Acesse: https://app.netlify.com/drop
2. Arraste a pasta **`dist`** para dentro da página.
3. Em segundos o Netlify gera um link (ex.: `https://cras-delfinopolis.netlify.app`).
4. Compartilhe esse link com os profissionais.

> O arquivo `_redirects` já está incluído na pasta `dist`, então as páginas
> internas (Agenda, Chat, etc.) abrem corretamente ao atualizar.

### Vercel (alternativa)
1. Crie uma conta em https://vercel.com
2. "Add New → Project" e envie a pasta `dist` (ou conecte o repositório).
3. Pronto, você recebe um link público.

---

## 🏢 Opção B — Rede local do CRAS (sem internet externa)

Um computador do CRAS fica como "servidor" e os outros acessam pelo IP dele.
(Todos precisam estar na **mesma rede/Wi‑Fi** do CRAS. Como o sistema usa o
Supabase na nuvem, esse computador "servidor" ainda precisa de internet.)

### Passo 1 — Servir a pasta `dist` em um computador
Escolha **uma** das opções abaixo, dentro da pasta `dist`:

**Com Node.js instalado:**
```bash
npx serve -s dist -l 8080
```
(o `-s` garante que as páginas internas funcionem ao atualizar)

**Com Python instalado (alternativa simples):**
```bash
cd dist
python -m http.server 8080
```

### Passo 2 — Descobrir o IP do computador servidor
No Windows, abra o Prompt de Comando e digite:
```bash
ipconfig
```
Anote o **Endereço IPv4** (ex.: `192.168.0.15`).

### Passo 3 — Acessar dos outros computadores
Nos outros computadores, abra o navegador e digite:
```
http://192.168.0.15:8080
```
(troque pelo IP e porta do seu servidor)

### Observações da Opção B
- **Firewall do Windows:** na primeira vez pode aparecer um aviso pedindo para
  liberar o acesso à rede — clique em **Permitir**. Se não conseguir acessar de
  outro PC, libere a porta (ex.: 8080) no Firewall do Windows.
- O computador servidor precisa ficar **ligado** enquanto os outros usam.
- Para uso permanente (não só teste), o ideal é instalar um servidor como
  **IIS** ou **Nginx** apontando para a pasta `dist`, com um redirecionamento
  de todas as rotas para `index.html`.

---

## 🔄 Importante: atualização do sistema (Service Worker)

O sistema usa cache para funcionar rápido. **Sempre que você publicar uma versão
nova**, peça para cada profissional atualizar assim (uma única vez):

1. Abrir o sistema no navegador.
2. Apertar **F12** → aba **Application** → **Service Workers** → **Unregister**.
3. Fechar e reabrir a página (ou apertar **Ctrl + Shift + R**).

Depois disso a versão mais nova aparece normalmente.

---

## ❓ Dúvidas comuns

- **Precisa de banco de dados no computador?** Não. O banco é o Supabase (nuvem).
- **O login funciona em qualquer computador?** Sim, desde que haja internet.
- **Quero gerar de novo a pasta `dist`?** Com Node.js: `npm install` e depois
  `npm run build` — a pasta `dist` é recriada.
