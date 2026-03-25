const nodemailer = require('nodemailer');
const path = require('path');

const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: `"NeoTherapy Hospital" <${process.env.SMTP_EMAIL}>`,
    to,
    subject,
    html,
    attachments: [
      {
        filename: 'logo.png',
        path: path.join(__dirname, '..', 'assets', 'logo.png'),
        cid: 'logo'
      },
      {
        filename: 'watermark.jpg',
        path: path.join(__dirname, '..', 'assets', 'watermark.jpg'),
        cid: 'watermark'
      }
    ]
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
