# Runbook

Atualizado em: 17/06/2026

## Validacao local basica

```bash
npm run check
npm run build
```

## Testes recomendados

```bash
npm run test:unit
npm run test:smoke
npm run test:smoke:e2e
```

## SEO

```bash
npm run seo:sitemap
```

Verificar:

- `client/public/sitemap.xml`
- `client/public/robots.txt`
- canonical por rota publica
- JSON-LD

## Incidente

1. Identificar escopo e tenant afetado.
2. Preservar logs.
3. Revogar tokens/secrets se necessario.
4. Acionar plano LGPD se houver dados pessoais.
5. Registrar em auditoria e postmortem.

## Backup/restore

### Verificacao de prontidao

```bash
npm run ops:backup:verify
npm run ops:cron:verify
```

Estrategias suportadas:

- `BACKUP_UPLOAD_URL_TEMPLATE`: `pg_dump -F c` sobe o dump para storage duravel por URL PUT pre-assinada. Use `{backupName}` ou `{backupFile}` no template para objeto unico por execucao.
- `BACKUP_OPTIONAL=true` + `SUPABASE_PITR_ENABLED=true`: Supabase PITR e a estrategia oficial de DR; nesse caso o cron de dump pode ser tratado como complementar.

### Restore drill

O restore deve sempre usar banco isolado, nunca `DATABASE_URL` de producao:

```bash
RESTORE_DRILL_CONFIRM=restore-drill \
RESTORE_DRILL_DATABASE_URL=postgresql://...scratch... \
RESTORE_DRILL_BACKUP_FILE=/path/backup.dump \
npm run ops:restore:drill
```

Tambem e possivel baixar o dump por URL:

```bash
RESTORE_DRILL_CONFIRM=restore-drill \
RESTORE_DRILL_DATABASE_URL=postgresql://...scratch... \
RESTORE_DRILL_BACKUP_URL=https://storage.example/backup.dump \
npm run ops:restore:drill
```

Registrar no postmortem operacional:

- frequencia;
- retencao;
- RPO;
- RTO;
- data do ultimo restore drill bem-sucedido.

## RLS

Aplicar somente com o runbook especifico:

```bash
npm run db:rls:apply
npm run db:rls:verify
```

O verificador falha se o role da aplicacao for superuser, tiver `BYPASSRLS`,
for owner das tabelas protegidas, ou se `ENABLE/FORCE ROW LEVEL SECURITY` e
policies nao estiverem ativos.

## Pentest

Pentest automatico basico:

```bash
TEST_URL=https://staging.imobibase.com.br npm run security:pentest
```

Esse comando nao substitui pentest externo manual, mas cria gate repetivel para
auth bypass, SQL injection basico, XSS refletido, CSRF, path traversal, headers,
rate limit e CORS.
