# MAGISTER — Agenda docente

**O teu tempo. A tua escola.**

Aplicação web instalável (telemóvel, tablet e computador) para professores: calendário, horário letivo semanal, tarefas, TPC pedidos, perfil, logótipos e sincronização opcional com o Google Drive.

🔗 **Abrir a aplicação:** https://lamancha-dev.github.io/magister/

Versão atual: **4.5**

## Como está organizado este repositório

| Onde | O que é |
|---|---|
| `index.html` | A aplicação (página principal) |
| `drive-sync.js` | Sincronização com o Google Drive |
| `sw.js` | Permite usar a aplicação sem Internet |
| `manifest.webmanifest` | Nome e ícones para instalar a aplicação |
| `icon.svg`, `icon-192.png`, `icon-512.png` | Ícones da aplicação |
| `aejd-logo.png` | Logótipo da escola (predefinido) |
| `fonte/` | Tipo de letra da palavra MAGISTER (Poppins, licença SIL Open Font License) |
| `documentacao/` | Instruções: leia-me, como publicar, configurar o Google Drive, histórico de versões |
| `imagens-extra/` | Logótipos da MAGISTER em alta resolução (não usados pela aplicação) |

> Os ficheiros da aplicação têm de ficar na raiz (pasta principal) para o GitHub Pages funcionar.

## Instalar

- **iPhone:** abrir o endereço no Safari → Partilhar → Adicionar ao ecrã principal.
- **Android:** abrir no Chrome → menu ⋮ → Instalar aplicação.
- **Windows:** abrir no Edge → menu → Aplicações → Instalar este site como aplicação.

## Dados

Os dados ficam guardados no dispositivo de cada professor. A aplicação não envia dados para o GitHub. Para os ter em vários dispositivos, usar **Perfil e dados → Sincronização com Google Drive** (cada professor com a sua conta) ou exportar cópias de segurança (.json).

Mais pormenores em [`documentacao/`](documentacao/).
