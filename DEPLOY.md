# Deploy — Dashboard ESG

## 1. Como o deploy foi feito

A aplicação (Spring Boot 4.1 / Java 21 + PostgreSQL 18 com Flyway) roda em **containers Docker** numa **VM Debian da rede interna**. O **nginx instalado no host** (apt) faz o papel de proxy reverso. Por enquanto o acesso é **só HTTP**.

```
Navegador (rede interna) ──HTTP :80──> nginx (host)
                                          │ proxy_pass 127.0.0.1:8080
                                          ▼
                              [container app] ──rede docker──> [container postgres]
                              porta só em 127.0.0.1             sem porta publicada
```

Acesso: `http://<ip-da-vm>/dashboard-esg/` (a raiz `/` redireciona para esse endereço).

### Arquivos envolvidos

| Arquivo | Função |
|---|---|
| `Dockerfile` | Build multi-stage: compila com Maven e roda o jar em `eclipse-temurin:21-jre` com usuário não-root |
| `docker-compose.prod.yaml` | Sobe `app` + `postgres` em produção (volume persistente, restart automático, logs limitados) |
| `.env.example` → `.env` | Variáveis de produção. O `.env` existe só na VM e está fora do git |
| `deploy/nginx/dashboard-esg.conf` | Config do nginx (porta 80 → `127.0.0.1:8080`) |
| `docker-compose.yaml` | **Só desenvolvimento** (Postgres local na porta 5435) |

### Passos executados na VM

```bash
# Dependências: Docker Engine + compose plugin (repositório oficial), nginx e git
sudo apt install -y nginx git

# Código
sudo git clone <url-do-repo> /opt/dashboard-esg
cd /opt/dashboard-esg

# Variáveis de produção
cp .env.example .env && chmod 600 .env
openssl rand -base64 64     # valor usado em JWT_SECRET

# Aplicação + banco (o Flyway cria o schema na primeira subida)
docker compose -f docker-compose.prod.yaml up -d --build

# Nginx
sudo cp deploy/nginx/dashboard-esg.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/dashboard-esg.conf /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### Variáveis do `.env`

| Variável | Descrição |
|---|---|
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | Banco. Também são repassadas à app |
| `JWT_SECRET` | Segredo do token (gerar com `openssl rand -base64 64`) |
| `JWT_EXPIRATION` | Validade do token em ms (padrão 24h) |
| `COOKIE_SECURE` | `false` enquanto for HTTP. Com `true` sem HTTPS o login para de funcionar |

## 2. Pendências e avisos

- **Firewall não configurado.** As portas 8080 e 5432 não ficam expostas na rede: a app escuta só em `127.0.0.1` e o banco não publica porta. Mesmo assim, recomenda-se liberar apenas SSH e HTTP:
  ```bash
  sudo apt install -y ufw
  sudo ufw allow 22/tcp && sudo ufw allow 80/tcp
  sudo ufw enable
  ```
  Atenção: o Docker escreve regras próprias no iptables. Por isso, portas publicadas em `0.0.0.0` passariam por cima do ufw. Mantenha os binds como estão.
- **Senha do admin:** o usuário inicial é criado pela migration `V1` com um hash fixo. Troque a senha no primeiro acesso.
- **HTTPS (futuro):** adicionar `listen 443 ssl` com certificado interno no nginx, redirecionar 80→443 e usar `COOKIE_SECURE=true`.

## 3. Fluxo de desenvolvimento

**1. Desenvolver localmente**
```bash
docker compose up -d              # Postgres de dev (localhost:5435)
./mvnw spring-boot:run            # ou rodar pela IDE
# http://localhost:8080/dashboard-esg/
```

**2. Alterou o banco?** Crie uma **nova** migration em `src/main/resources/db/migration/V<n>__descricao.sql`. Nunca edite uma migration que já rodou em produção, porque o Flyway falha na validação e a app não sobe.

**3. (Opcional) Testar o build de produção**
```bash
docker compose -f docker-compose.prod.yaml build
```

**4. Commit e push**
```bash
git add .
git commit -m "feat: descrição da mudança"
git push origin main
```

**5. Atualizar a VM**
```bash
ssh usuario@<ip-da-vm>
cd /opt/dashboard-esg
git pull
docker compose -f docker-compose.prod.yaml up -d --build
docker image prune -f             # remove imagens antigas
```

**6. Conferir**
```bash
docker compose -f docker-compose.prod.yaml ps
docker compose -f docker-compose.prod.yaml logs -f app
curl -I http://127.0.0.1:8080/dashboard-esg/login     # esperado: 200
```

**Casos específicos**
- **Mudou só o `.env`:** `docker compose -f docker-compose.prod.yaml up -d`. O `restart` não relê o `.env`.
- **Mudou a config do nginx:** `sudo cp deploy/nginx/dashboard-esg.conf /etc/nginx/sites-available/ && sudo nginx -t && sudo systemctl reload nginx`.

## 4. Comandos úteis (na VM, em `/opt/dashboard-esg`)

> Atalho opcional: `alias dc='docker compose -f docker-compose.prod.yaml'`

| Ação | Comando |
|---|---|
| Reiniciar a app | `docker compose -f docker-compose.prod.yaml restart app` |
| Parar tudo | `docker compose -f docker-compose.prod.yaml down` (**nunca** use `-v`: apaga o banco) |
| Logs | `docker compose -f docker-compose.prod.yaml logs -f --tail=200 app` |
| Acessar o banco | `docker compose -f docker-compose.prod.yaml exec postgres psql -U <POSTGRES_USER> -d <POSTGRES_DB>` |
| Backup | `docker compose -f docker-compose.prod.yaml exec -T postgres pg_dump -U <POSTGRES_USER> <POSTGRES_DB> \| gzip > backup-$(date +%F).sql.gz` |
| Restaurar backup (em banco vazio) | `gunzip -c backup.sql.gz \| docker compose -f docker-compose.prod.yaml exec -T postgres psql -U <POSTGRES_USER> -d <POSTGRES_DB>` |
| Voltar versão | `git checkout <commit>` + `up -d --build`. Migrations já aplicadas **não** são desfeitas |
