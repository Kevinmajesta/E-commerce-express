// src/utils/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

const sendWelcomeEmail = async (to, name) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: 'Selamat Datang di Aplikasi Kami!',
    html: `
      <p>Halo ${name},</p>
      <p>Selamat datang di aplikasi kami! Kami sangat senang Anda bergabung.</p>
      <p>Anda sekarang dapat menjelajahi berbagai fitur dan layanan yang kami tawarkan.</p>
      <p>Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi kami.</p>
      <p>Salam Hormat,</p>
      <p>Tim Aplikasi Anda</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent successfully to ${to}`);
  } catch (error) {
    console.error(`Error sending welcome email to ${to}:`, error);
  }
};

module.exports = { sendWelcomeEmail };