/**
 * COMPLIANCE EMAIL HELPERS
 *
 * Envio real de e-mails relacionados a compliance (LGPD), reutilizando o
 * transporte seguro de `server/auth/email-service.ts` — que faz no-op (log) caso
 * SMTP não esteja configurado, evitando quebrar fluxos em dev/test/serverless.
 *
 * Cobre:
 *  - Confirmação de exclusão de conta (titular) — LGPD Art. 18, VI.
 *  - Alerta ao Encarregado (DPO) sobre incidente de segurança high/critical —
 *    LGPD Art. 48 + Res. CD/ANPD 15/2024 (prazo: 3 dias úteis).
 */

import { sendEmail } from "../auth/email-service";

const APP_URL = process.env.APP_URL || "http://localhost:5000";

/**
 * E-mail do Encarregado (DPO). Configurável por env; cai para o padrão público.
 */
export function getDpoEmail(): string {
  return process.env.DPO_EMAIL || process.env.COMPLIANCE_DPO_EMAIL || "dpo@imobibase.com";
}

/**
 * Envia e-mail de confirmação de exclusão de conta com o link/token.
 * Lança apenas se o transporte SMTP configurado falhar; quando não há SMTP,
 * o sendEmail subjacente apenas loga e resolve.
 */
export async function sendDeletionConfirmationEmail(
  to: string,
  name: string | null | undefined,
  confirmationToken: string,
): Promise<void> {
  const confirmUrl = `${APP_URL}/api/compliance/confirm-deletion/${confirmationToken}`;
  const displayName = name && name.trim().length > 0 ? name : "titular dos dados";

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background-color:#dc3545;padding:30px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;">Confirmação de Exclusão de Conta</h1>
        </td></tr>
        <tr><td style="padding:40px 30px;">
          <h2 style="color:#333;margin:0 0 20px 0;">Olá, ${displayName}!</h2>
          <p style="color:#666;font-size:16px;line-height:1.6;">
            Recebemos uma solicitação para excluir/anonimizar sua conta e seus dados pessoais,
            conforme o seu direito de eliminação (LGPD Art. 18).
          </p>
          <p style="color:#666;font-size:16px;line-height:1.6;">
            Para <strong>confirmar</strong> e iniciar o processo, clique no botão abaixo.
            Esta ação é irreversível.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 0;">
            <a href="${confirmUrl}" style="background-color:#dc3545;color:#fff;padding:14px 30px;text-decoration:none;border-radius:5px;font-size:16px;font-weight:bold;display:inline-block;">
              Confirmar Exclusão
            </a>
          </td></tr></table>
          <p style="color:#999;font-size:14px;line-height:1.6;">
            Se você não solicitou esta exclusão, ignore este e-mail. Sua conta permanecerá ativa.
          </p>
          <p style="color:#0066cc;font-size:13px;word-break:break-all;">${confirmUrl}</p>
        </td></tr>
        <tr><td style="background-color:#f8f8f8;padding:20px 30px;text-align:center;">
          <p style="color:#999;font-size:12px;margin:0;">ImobiBase — Encarregado de Dados (DPO): ${getDpoEmail()}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await sendEmail(to, "Confirmação de Exclusão de Conta - ImobiBase", html);
}

export interface BreachAlertDetails {
  incidentNumber: string;
  severity: string;
  title: string;
  description: string;
  affectedRecordsCount: number;
  discoveredAt: string;
  /** Prazo legal calculado (Res. CD/ANPD 15/2024 - 3 dias úteis). */
  anpdDeadline: string;
  tenantId: string;
  isUpdate?: boolean;
}

/**
 * Alerta o Encarregado (DPO) sobre incidente de segurança high/critical.
 * LGPD Art. 48 + Res. CD/ANPD 15/2024: notificação à ANPD em até 3 DIAS ÚTEIS
 * a contar da ciência (discoveredAt).
 */
export async function sendBreachAlertToDpo(details: BreachAlertDetails): Promise<void> {
  const dpoEmail = getDpoEmail();
  const action = details.isUpdate ? "atualizado" : "registrado";

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background-color:#b71c1c;padding:30px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Incidente de Segurança ${action}</h1>
        </td></tr>
        <tr><td style="padding:40px 30px;">
          <p style="color:#333;font-size:16px;line-height:1.6;">
            Um incidente de segurança de severidade <strong>${details.severity.toUpperCase()}</strong>
            foi ${action} e requer ação do Encarregado (DPO).
          </p>
          <table cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;color:#444;">
            <tr><td style="font-weight:bold;">Número do incidente:</td><td>${details.incidentNumber}</td></tr>
            <tr><td style="font-weight:bold;">Título:</td><td>${details.title}</td></tr>
            <tr><td style="font-weight:bold;">Registros afetados:</td><td>${details.affectedRecordsCount}</td></tr>
            <tr><td style="font-weight:bold;">Detectado em (ciência):</td><td>${details.discoveredAt}</td></tr>
            <tr><td style="font-weight:bold;color:#b71c1c;">Prazo ANPD (3 dias úteis):</td><td style="color:#b71c1c;font-weight:bold;">${details.anpdDeadline}</td></tr>
          </table>
          <p style="color:#666;font-size:14px;line-height:1.6;margin-top:20px;">${details.description}</p>
          <p style="color:#b71c1c;font-size:14px;line-height:1.6;font-weight:bold;">
            Ação requerida: avaliar risco e, se aplicável, comunicar a ANPD e os titulares afetados
            em até 3 (três) dias úteis a contar da ciência, conforme Res. CD/ANPD 15/2024 e LGPD Art. 48.
          </p>
        </td></tr>
        <tr><td style="background-color:#f8f8f8;padding:20px 30px;text-align:center;">
          <p style="color:#999;font-size:12px;margin:0;">ImobiBase — Notificação automática de compliance</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await sendEmail(
    dpoEmail,
    `[ANPD] Incidente ${details.severity.toUpperCase()} ${details.incidentNumber} - ação em 3 dias úteis`,
    html,
  );
}

/**
 * Adiciona N dias ÚTEIS (seg-sex) a uma data, ignorando finais de semana.
 * Nota: não considera feriados nacionais (tarefa futura). Conforme Res. CD/ANPD
 * 15/2024, o prazo de notificação é de 3 dias úteis a contar da ciência.
 */
export function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from.getTime());
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay(); // 0=domingo, 6=sábado
    if (dow !== 0 && dow !== 6) {
      added++;
    }
  }
  return result;
}
