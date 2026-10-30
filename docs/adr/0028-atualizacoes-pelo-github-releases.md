# 0028. Servir os instaladores do app pela GitHub Release, com os manifestos na VPS

- Status: aceito
- Data: 2026-10-29

## Contexto

Cada versão do app desktop (instalador NSIS de ~120 MB, AppImage, `.tar.gz`, `.blockmap`, `.sig` e
os `latest*.yml`) era copiada para `/opt/concord/updates` e servida pelo Caddy da VPS. A cada
deploy, todos os apps baixavam a versão nova da VPS, cujo upload é o mesmo das chamadas e das
lives. O dono decidiu: nada de limitar a velocidade nem de deixar de baixar durante a call (o
download em segundo plano continua como está); os arquivos vão para o GitHub Releases. O repo
`hugoemannuel/concord` é público, então os assets das releases baixam sem login.

Restrições: apps já instalados buscam `<servidor>/updates/latest*.yml` e resolvem os arquivos
relativos a esse endereço; a página de download lê `/updates/latest*.yml` por `fetch` (o GitHub
não manda CORS nos downloads de assets); o `install.sh` do Linux também lê o manifesto pelo
servidor; toda atualização é conferida pela assinatura Ed25519 do dono (`.sig`), que não depende
de onde o arquivo vem.

## Opções consideradas

1. **App com `provider: 'github'` no electron-updater.** Resolve a tag pelo github.com e baixa
   dos assets. Contras: só vale para apps novos (os instalados continuam na VPS), o updater
   próprio do Linux e o `install.sh` precisariam do mesmo, a página de download não lê o
   manifesto sem a API (60 pedidos/h por IP sem login), e a versão "atual" passa a ser a
   release marcada como latest, publicada antes de o backend novo estar no ar.
2. **App com `generic` apontando para `github.com/<repo>/releases/latest/download/`.** Mais
   simples que a 1, mas com os mesmos contras e uma corrida: entre ler o `latest.yml` de uma
   versão e baixar o instalador, uma release nova troca o `latest/download` e o arquivo some (404).
   E o endereço do GitHub fica gravado nos apps: se o repo mudar, só um build novo corrige.
3. **Manifestos na VPS, arquivos pesados na release, com 302 do Caddy (escolhida).** O CI cria a
   release `v<versão>` com todos os arquivos (inclusive os `latest*.yml`, para quem quiser usar o
   GitHub direto) antes de publicar os manifestos na VPS. O Caddy serve os `latest*.yml` do disco
   e responde `302` para `github.com/<repo>/releases/download/v<versão>/<arquivo>` em todo
   `/updates/Salinha-<versão>-…` (a versão sai do nome do arquivo).
4. **Seguir como está (tudo na VPS).** Descartado pelo dono.

## Decisão

Opção 3. Não muda nada nos apps (instalados ou novos), no updater do Linux, no `install.sh` nem
na página de download: o electron-updater, o `net.fetch` do Electron, o `curl -L`/`wget` do
`install.sh` e o navegador seguem o 302 (conferido no código do electron-updater 6.8 e nos
redirects reais do GitHub). O redirect aponta para a release **da versão do arquivo**, que nunca
muda: sem a corrida do `latest/download`. A VPS continua dona da pergunta "qual é a versão atual"
(o manifesto só é publicado depois do backend novo no ar, como antes) e só manda alguns bytes por
checagem.

Sem fallback automático para a VPS no app: o app nem funciona sem o servidor, e quem decide de
onde vêm os arquivos é o Caddy. Se o GitHub falhar, a volta é tirar as duas linhas do `@release`
do Caddyfile: o deploy continua copiando os arquivos da versão atual para `/opt/concord/updates`
(cópia fria, sem tráfego), então a VPS volta a servir na hora, sem build novo.

## Consequências

- O tráfego dos downloads sai da VPS. Os downloads de assets de release pública não contam no
  limite da API do GitHub; o CI usa a API pelo `gh` com o `GITHUB_TOKEN` (1000 pedidos/h por
  repo, usamos ~6 por deploy). Asset de release tem limite de 2 GiB por arquivo.
- O job de deploy precisa de `permissions: contents: write`. Sem ação de terceiros: o `gh` já
  vem no runner.
- Uma tag `v<versão>` por deploy no repo, apontando para o commit publicado; as notas da release
  são as entradas novas do `changelog/next.md` desde a release anterior.
- O Caddyfile novo só pode ser aplicado depois que a versão no ar tiver release no GitHub (o
  `apply-caddyfile.sh` confere seguindo o redirect e volta o backup se não abrir).
- Download diferencial (`.blockmap`) continua não acontecendo: o electron-updater pede vários
  intervalos num pedido só e o armazenamento do GitHub responde 501; ele cai no download
  completo, como já acontecia (a VPS só guardava a versão atual). Ligar
  `useMultipleRangeRequest: false` no app é um passo à parte, se valer a pena.
- Mais difícil: o repo precisa continuar público e com o mesmo dono para os apps baixarem. Mudou?
  Atualize o endereço no Caddyfile (um lugar só).

## Fontes

- [GitHub: links para a release mais recente e para assets](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases)
- [GitHub CLI: `gh release create`](https://cli.github.com/manual/gh_release_create)
- [electron-builder: auto update e providers (`generic`, `github`)](https://www.electron.build/auto-update)
- [Caddy: `redir` e `path_regexp`](https://caddyserver.com/docs/caddyfile/directives/redir)
