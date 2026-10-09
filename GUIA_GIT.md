# Guia de Git do CRAS — para futuras melhorias e correções

O projeto agora usa **Git** para guardar o histórico de tudo. Assim, cada
melhoria ou correção fica registrada e você pode **voltar atrás** se algo der
errado. Este guia é simples, feito para quem nunca usou Git.

---

## 🔎 O que é e por que serve

- O Git tira uma "foto" (chamada **commit**) do sistema a cada mudança.
- Se uma alteração nova quebrar algo, dá para **voltar** para uma foto anterior.
- Guarda a história: quem mudou, o quê e quando.

---

## ✅ O que JÁ está pronto

- O repositório Git foi **criado** dentro da pasta do código (`source`).
- O arquivo **`.gitignore`** já está configurado para **NÃO** versionar:
  - `node_modules/` (bibliotecas — se recriam sozinhas)
  - `dist/` (build — se gera de novo)
  - **`.env`** (contém as chaves secretas do Supabase — nunca deve ir para o Git)
  - `pkg/` (pasta temporária do empacotamento)
- O arquivo **`.env.example`** é versionado (serve de modelo, sem segredos).
- O **primeiro commit** já foi feito com todo o sistema atual.

---

## 📝 Comandos do dia a dia (na pasta do código)

### Ver o que mudou
```bash
git status
```

### Salvar uma alteração (fazer um commit)
```bash
git add -A
git commit -m "Descreva aqui o que mudou"
```
Exemplo de mensagem boa: `"Corrige erro ao salvar agendamento"`.

### Ver o histórico
```bash
git log --oneline
```

### Voltar atrás (desfazer mudanças ainda NÃO commitadas)
```bash
git restore .
```

### Voltar para uma versão antiga (com cuidado)
```bash
git log --oneline        # anote o código (hash) da versão desejada
git checkout <hash>      # ver como estava naquela versão
```

---

## ☁️ Guardar na nuvem (GitHub — recomendado)

Assim o código fica seguro fora do computador e fácil de compartilhar.

1. Crie uma conta grátis em https://github.com
2. Crie um repositório **privado** (ex.: `cras-delfinopolis`).
3. No computador, dentro da pasta do código, rode o que o GitHub mostrar:
```bash
git remote add origin https://github.com/SEU-USUARIO/cras-delfinopolis.git
git branch -M main
git push -u origin main
```
4. Daí em diante, depois de cada commit, é só:
```bash
git push
```

> ⚠️ **Use repositório PRIVADO.** Mesmo com o `.env` fora do Git, o código do
> sistema é interno e não deve ficar público.

---

## 🔄 Fluxo recomendado para uma melhoria/correção futura

1. `git status` — ver como está tudo.
2. Fazer a alteração no código.
3. Testar: `npm install` (1ª vez) e `npm run build`.
4. `git add -A` e `git commit -m "o que mudou"`.
5. (Se usar GitHub) `git push`.
6. Se algo quebrar, dá para voltar ao commit anterior sem perder nada.

---

## ❗ Regra de ouro

- **Nunca** coloque o arquivo `.env` (chaves do Supabase) no Git. Ele já está
  protegido pelo `.gitignore` — não remova essa linha.
