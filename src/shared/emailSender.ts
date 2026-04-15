import nodemailer, { Transporter } from "nodemailer";
import config from "../config";

// Singleton transporter instance for connection pooling
let transporterInstance: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (!transporterInstance) {
    transporterInstance = nodemailer.createTransport({
      host: config.emailSender.smtp_host,
      port: config.emailSender.smtp_port,
      secure: false, // STARTTLS for port 587
      auth: {
        user: config.emailSender.email,
        pass: config.emailSender.mailbox_password,
      },
      // Production optimizations
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 400,
      rateLimit: 5,
      connectionTimeout: 10000,
      socketTimeout: 10000,
    });

    // Verify connection configuration
    transporterInstance.verify((error) => {
      if (error) {
        console.error(
          "Email transporter verification failed:",
          error.message
        );
      } else {
        console.log("Email transporter verified successfully");
      }
    });
  }

  return transporterInstance;
};

interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const emailSender = async (
  email: string,
  html: string,
  subject: string
): Promise<EmailSendResult> => {
  try {
    // Validate inputs
    if (!email || !html || !subject) {
      throw new Error("Missing required email parameters");
    }

    if (!config.emailSender.email || !config.emailSender.mailbox_password) {
      throw new Error(
        "Email configuration missing in environment variables"
      );
    }

    const transporter = getTransporter();

    const mailOptions = {
      from: config.emailSender.email,
      to: email,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Email sent successfully:", {
      to: email,
      messageId: info.messageId,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error("Failed to send email:", {
      to: email,
      subject,
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
};

export default emailSender;

