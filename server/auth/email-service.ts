/**
 * Email Service Module
 * Handles sending authentication-related emails
 */

import nodemailer from 'nodemailer';

// Email configuration from environment variables
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587', 10);
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@imobibase.com';
const APP_URL = process.env.APP_URL || 'http://localhost:5000';

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465, // true for 465, false for other ports
      auth: EMAIL_USER && EMAIL_PASSWORD ? {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD,
      } : undefined,
    });
  }
  return transporter;
}

// Helper function to send email
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    // If email is not configured, log to console instead
    if (!EMAIL_USER || !EMAIL_PASSWORD) {
      console.log('='.repeat(80));
      console.log('EMAIL NOT CONFIGURED - Would send email:');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Content:', html.substring(0, 200) + '...');
      console.log('='.repeat(80));
      return;
    }

    const transporter = getTransporter();
    await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });

    console.log(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
}

// Password Reset Email
export async function sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
  const resetUrl = `${APP_URL}/auth/reset-password?token=${token}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinir Senha - ImobiBase</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #0066cc; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">ImobiBase</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0;">Olá, ${name}!</h2>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${resetUrl}" style="background-color: #0066cc; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">
                      Redefinir Senha
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                Se o botão não funcionar, copie e cole este link no seu navegador:
              </p>
              <p style="color: #0066cc; font-size: 14px; word-break: break-all; margin: 10px 0 20px 0;">
                ${resetUrl}
              </p>
              <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #eeeeee;">
                Este link expira em 1 hora por motivos de segurança.
              </p>
              <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 10px 0 0 0;">
                Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá inalterada.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © 2024 ImobiBase. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail(email, 'Redefinir Senha - ImobiBase', html);
}

// Email Verification Email
export async function sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
  const verifyUrl = `${APP_URL}/auth/verify-email?token=${token}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificar Email - ImobiBase</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #0066cc; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">ImobiBase</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0;">Bem-vindo, ${name}!</h2>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Obrigado por se cadastrar no ImobiBase. Para começar a usar todos os recursos, precisamos verificar seu endereço de email.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${verifyUrl}" style="background-color: #28a745; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">
                      Verificar Email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                Se o botão não funcionar, copie e cole este link no seu navegador:
              </p>
              <p style="color: #0066cc; font-size: 14px; word-break: break-all; margin: 10px 0 20px 0;">
                ${verifyUrl}
              </p>
              <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #eeeeee;">
                Este link expira em 24 horas.
              </p>
              <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 10px 0 0 0;">
                Se você não criou esta conta, pode ignorar este email com segurança.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © 2024 ImobiBase. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail(email, 'Verificar seu Email - ImobiBase', html);
}

// Password Changed Confirmation Email
export async function sendPasswordChangedEmail(email: string, name: string): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Senha Alterada - ImobiBase</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #28a745; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Senha Alterada</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0;">Olá, ${name}!</h2>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Sua senha foi alterada com sucesso.
              </p>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Se você não fez esta alteração, entre em contato conosco imediatamente.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${APP_URL}/auth/login" style="background-color: #0066cc; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">
                      Fazer Login
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #eeeeee;">
                Por motivos de segurança, recomendamos que você:
              </p>
              <ul style="color: #666666; font-size: 14px; line-height: 1.6; margin: 10px 0 0 0; padding-left: 20px;">
                <li>Use uma senha única e forte</li>
                <li>Não compartilhe sua senha com ninguém</li>
                <li>Ative a autenticação de dois fatores (2FA)</li>
              </ul>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © 2024 ImobiBase. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail(email, 'Senha Alterada - ImobiBase', html);
}

// Security Alert Email (Suspicious Login)
export async function sendSecurityAlertEmail(
  email: string,
  name: string,
  alertType: string,
  details: { location?: string; device?: string; ipAddress?: string }
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerta de Segurança - ImobiBase</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #dc3545; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">⚠️ Alerta de Segurança</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0;">Olá, ${name}!</h2>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Detectamos atividade incomum em sua conta: <strong>${alertType}</strong>
              </p>
              ${details.location ? `<p style="color: #666666; font-size: 14px; margin: 5px 0;"><strong>Local:</strong> ${details.location}</p>` : ''}
              ${details.device ? `<p style="color: #666666; font-size: 14px; margin: 5px 0;"><strong>Dispositivo:</strong> ${details.device}</p>` : ''}
              ${details.ipAddress ? `<p style="color: #666666; font-size: 14px; margin: 5px 0;"><strong>IP:</strong> ${details.ipAddress}</p>` : ''}
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                Se foi você, ignore este email. Caso contrário, recomendamos que altere sua senha imediatamente.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${APP_URL}/auth/forgot-password" style="background-color: #dc3545; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">
                      Alterar Senha
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © 2024 ImobiBase. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail(email, 'Alerta de Segurança - ImobiBase', html);
}

// New Login Notification Email
export async function sendNewLoginEmail(
  email: string,
  name: string,
  details: { location?: string; device?: string; ipAddress?: string; time: string }
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Novo Login Detectado - ImobiBase</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #0066cc; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Novo Login</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0;">Olá, ${name}!</h2>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Detectamos um novo login em sua conta ImobiBase:
              </p>
              <p style="color: #666666; font-size: 14px; margin: 5px 0;"><strong>Quando:</strong> ${details.time}</p>
              ${details.location ? `<p style="color: #666666; font-size: 14px; margin: 5px 0;"><strong>Local:</strong> ${details.location}</p>` : ''}
              ${details.device ? `<p style="color: #666666; font-size: 14px; margin: 5px 0;"><strong>Dispositivo:</strong> ${details.device}</p>` : ''}
              ${details.ipAddress ? `<p style="color: #666666; font-size: 14px; margin: 5px 0;"><strong>IP:</strong> ${details.ipAddress}</p>` : ''}
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                Se foi você, não precisa fazer nada. Caso contrário, altere sua senha imediatamente.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${APP_URL}/settings/security" style="background-color: #0066cc; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">
                      Revisar Atividade
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © 2024 ImobiBase. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail(email, 'Novo Login Detectado - ImobiBase', html);
}

export { sendEmail };
