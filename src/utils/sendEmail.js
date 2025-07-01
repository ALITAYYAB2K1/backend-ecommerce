import nodemailer from "nodemailer";

export const sendEmail = async (options) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT, // true for 465, false for other ports
      service: process.env.SMTP_SERVICE,
      auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `${process.env.FROM_NAME} <${
        process.env.FROM_MAIL || process.env.SMTP_MAIL
      }>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
    };

    console.log("Attempting to send email to:", options.email);
    const info = await transporter.sendMail(mailOptions);
    console.log(`Message sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("Email sending error:", error);
    throw error;
  }
};
