/**
 * Service untuk Pengiriman Email via Google SMTP (Gmail)
 * Toko Listrik Citra 23 Palu
 */
const nodemailer = require('nodemailer');

function getTransporter() {
  const user = (process.env.SMTP_USER || process.env.ADMIN_EMAIL || 'liasinata@gmail.com').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');

  if (!pass) {
    throw new Error('SMTP_PASS (Google App Password) belum dikonfigurasi di file .env.');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass
    }
  });
}

async function sendResetPasswordEmail({ to, resetUrl, adminName }) {
  const transporter = getTransporter();
  const smtpUser = (process.env.SMTP_USER || process.env.ADMIN_EMAIL || 'liasinata@gmail.com').trim();
  const fromAddress = process.env.EMAIL_FROM || `Toko Listrik Citra 23 <${smtpUser}>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #1E293B; }
        .container { max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #005CE6 0%, #0045B0 100%); padding: 32px 24px; text-align: center; color: #FFFFFF; }
        .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
        .header p { margin: 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 32px 24px; }
        .btn-wrapper { text-align: center; margin: 28px 0; }
        .btn { display: inline-block; background-color: #005CE6; color: #FFFFFF !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,92,230,0.25); }
        .info-box { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #92400E; margin-bottom: 20px; }
        .footer { padding: 20px 24px; background: #F1F5F9; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TOKO LISTRIK CITRA 23 PALU</h1>
          <p>Permintaan Pemulihan Password Akun Admin</p>
        </div>
        <div class="content">
          <p>Halo <strong>${adminName || 'Admin'}</strong>,</p>
          <p>Kami menerima permintaan untuk mereset kata sandi akun Administrator Anda pada sistem Toko Listrik Citra 23.</p>
          
          <div class="btn-wrapper">
            <a href="${resetUrl}" class="btn" target="_blank" style="color: #ffffff;">Reset Password Saya</a>
          </div>

          <div class="info-box">
            <strong>Penting:</strong> Tautan pemulihan ini hanya berlaku selama <strong>15 menit</strong> dan hanya dapat digunakan 1 kali demi keamanan akun toko Anda.
          </div>

          <p style="font-size: 13px; color: #64748B;">
            Jika tombol di atas tidak berfungsi, Anda dapat menyalin dan membuka tautan berikut di browser:<br>
            <a href="${resetUrl}" style="color: #005CE6; word-break: break-all;">${resetUrl}</a>
          </p>

          <p style="font-size: 13px; color: #94A3B8; margin-top: 24px;">
            Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini. Password akun Anda tetap aman dan tidak akan berubah.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Toko Listrik Citra 23 Palu &bull; Sistem Terpusat Operasional Kasir & Laba Rugi
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: fromAddress,
    to: to,
    subject: 'Permintaan Reset Password Admin - Toko Listrik Citra 23 Palu',
    html: htmlContent
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}

module.exports = {
  sendResetPasswordEmail
};
