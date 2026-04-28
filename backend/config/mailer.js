import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export async function sendWelcomeEmail(to, prenom) {
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: 'Bienvenue sur Ma Maison Connectée',
    html: `
      <h2>Bonjour ${prenom} !</h2>
      <p>Votre inscription sur <strong>Ma Maison Connectée</strong> a bien été reçue.</p>
      <p>Votre compte est en attente de validation par un administrateur. Vous recevrez un email dès que votre accès sera approuvé.</p>
      <p>Merci de votre confiance.</p>
    `,
  });
}

export async function sendApprovalEmail(to, prenom) {
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: 'Votre compte a été approuvé !',
    html: `
      <h2>Bonjour ${prenom} !</h2>
      <p>Votre compte sur <strong>Ma Maison Connectée</strong> vient d'être approuvé.</p>
      <p>Vous pouvez maintenant vous connecter et accéder à la plateforme.</p>
    `,
  });
}
