# Documentacao — ImobiBase

**Ultima atualizacao:** 14 de Marco de 2026

Indice central de toda a documentacao do projeto.

---

## Documentacao Principal

| Arquivo                            | Conteudo                                           |
| ---------------------------------- | -------------------------------------------------- |
| [README.md](README.md)             | Visao geral, setup, arquitetura                    |
| [DEPLOYMENT.md](DEPLOYMENT.md)     | Guia completo de deploy (Vercel, Docker, servidor) |
| [SECURITY.md](SECURITY.md)         | Politica de seguranca e vulnerabilidades           |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Como contribuir com o projeto                      |
| [CHANGELOG.md](CHANGELOG.md)       | Historico de versoes                               |
| [LICENSE](LICENSE)                 | Licenca MIT                                        |

---

## Guias Tecnicos (`docs/`)

### Autenticacao e Seguranca

| Arquivo                                                                         | Conteudo                           |
| ------------------------------------------------------------------------------- | ---------------------------------- |
| [AUTHENTICATION.md](docs/AUTHENTICATION.md)                                     | Sistema de auth (local + OAuth)    |
| [SECURITY.md](docs/SECURITY.md)                                                 | Arquitetura de seguranca detalhada |
| [SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md)                                     | Relatorio de auditoria             |
| [SECRET_ROTATION_GUIDE.md](docs/SECRET_ROTATION_GUIDE.md)                       | Rotacao de secrets                 |
| [SECRET_MANAGEMENT_IMPLEMENTATION.md](docs/SECRET_MANAGEMENT_IMPLEMENTATION.md) | Gerenciamento de secrets           |
| [COMPLIANCE.md](docs/COMPLIANCE.md)                                             | LGPD/GDPR compliance               |

### Integracoes

| Arquivo                                                                       | Conteudo                       |
| ----------------------------------------------------------------------------- | ------------------------------ |
| [WHATSAPP_SETUP.md](docs/WHATSAPP_SETUP.md)                                   | WhatsApp Business API          |
| [WHATSAPP_WEBHOOK_SECURITY_SETUP.md](docs/WHATSAPP_WEBHOOK_SECURITY_SETUP.md) | Seguranca de webhooks WhatsApp |
| [EMAIL_SETUP.md](docs/EMAIL_SETUP.md)                                         | SendGrid / Resend              |
| [SMS_SETUP.md](docs/SMS_SETUP.md)                                             | Twilio SMS e 2FA               |
| [PAYMENTS_SETUP.md](docs/PAYMENTS_SETUP.md)                                   | Stripe e Mercado Pago          |
| [MAPS_SETUP.md](docs/MAPS_SETUP.md)                                           | Google Maps API                |
| [ESIGNATURE_SETUP.md](docs/ESIGNATURE_SETUP.md)                               | ClickSign assinatura digital   |

### Infraestrutura

| Arquivo                                                 | Conteudo                             |
| ------------------------------------------------------- | ------------------------------------ |
| [BACKGROUND_JOBS.md](docs/BACKGROUND_JOBS.md)           | BullMQ e processamento em background |
| [JOBS_QUICK_REFERENCE.md](docs/JOBS_QUICK_REFERENCE.md) | Referencia rapida de jobs            |
| [FILE_STORAGE.md](docs/FILE_STORAGE.md)                 | Armazenamento de arquivos            |
| [GITHUB_ACTIONS_SETUP.md](docs/GITHUB_ACTIONS_SETUP.md) | Configuracao CI/CD                   |
| [GITHUB_SECRETS_SETUP.md](docs/GITHUB_SECRETS_SETUP.md) | Secrets do GitHub Actions            |

### Monitoramento

| Arquivo                                                             | Conteudo                |
| ------------------------------------------------------------------- | ----------------------- |
| [MONITORING_ANALYTICS_GUIDE.md](docs/MONITORING_ANALYTICS_GUIDE.md) | Guia de monitoramento   |
| [SENTRY_SETUP.md](docs/SENTRY_SETUP.md)                             | Configuracao Sentry     |
| [SENTRY_ALERTS_SETUP.md](docs/SENTRY_ALERTS_SETUP.md)               | Alertas Sentry          |
| [UPTIME_MONITORING.md](docs/UPTIME_MONITORING.md)                   | Monitoramento de uptime |

### Performance e Qualidade

| Arquivo                                                                               | Conteudo                    |
| ------------------------------------------------------------------------------------- | --------------------------- |
| [TESTING.md](docs/TESTING.md)                                                         | Framework de testes         |
| [PERFORMANCE_OPTIMIZATION_QUICKSTART.md](docs/PERFORMANCE_OPTIMIZATION_QUICKSTART.md) | Otimizacao de performance   |
| [PERFORMANCE_INTEGRATION_GUIDE.md](docs/PERFORMANCE_INTEGRATION_GUIDE.md)             | Integracao de performance   |
| [ACCESSIBILITY_AUDIT.md](docs/ACCESSIBILITY_AUDIT.md)                                 | Auditoria de acessibilidade |
| [CODE_PATTERNS.md](docs/CODE_PATTERNS.md)                                             | Padroes de codigo           |

---

## Design System (`client/src/lib/`)

| Arquivo                                                                     | Conteudo                    |
| --------------------------------------------------------------------------- | --------------------------- |
| [DESIGN_SYSTEM_GUIDE.md](client/src/lib/DESIGN_SYSTEM_GUIDE.md)             | Principios e guia principal |
| [COMPONENT_EXAMPLES.md](client/src/lib/COMPONENT_EXAMPLES.md)               | Exemplos de componentes     |
| [SPACING_GUIDE.md](client/src/lib/SPACING_GUIDE.md)                         | Sistema de espacamento 8pt  |
| [MIGRATION_GUIDE.md](client/src/lib/MIGRATION_GUIDE.md)                     | Guia de migracao            |
| [UTILITIES_QUICK_REFERENCE.md](client/src/lib/UTILITIES_QUICK_REFERENCE.md) | Referencia de utilities CSS |

---

## Relatorios de Desenvolvimento

Relatorios historicos de implementacao estao em `docs/reports/`.

---

## Navegacao Rapida

**Novo no projeto?** → [README.md](README.md) → [CONTRIBUTING.md](CONTRIBUTING.md)

**Implementar nova pagina?** → [Design System Guide](client/src/lib/DESIGN_SYSTEM_GUIDE.md) → [Component Examples](client/src/lib/COMPONENT_EXAMPLES.md)

**Configurar integracao?** → Consulte o guia em `docs/` para o servico desejado

**Deploy?** → [DEPLOYMENT.md](DEPLOYMENT.md)

**Seguranca?** → [SECURITY.md](SECURITY.md) → [docs/SECURITY.md](docs/SECURITY.md)
