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
      maxMessages: 500,
      rateDelta: 400,
      rateLimit: 5,
      connectionTimeout: 30000,
      socketTimeout: 30000,
      requireTLS: true,
      logger: false,
      debug: false,
    });

    // Verify connection configuration
    transporterInstance.verify((error) => {
      if (error) {
        console.error("Email transporter verification failed:", error.message);
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
  subject: string,
): Promise<EmailSendResult> => {
  try {
    // Validate inputs
    if (!email || !html || !subject) {
      throw new Error("Missing required email parameters");
    }

    if (!config.emailSender.email || !config.emailSender.mailbox_password) {
      throw new Error("Email configuration missing in environment variables");
    }

    const transporter = getTransporter();

    const mailOptions = {
      from: config.emailSender.email,
      to: email,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);

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
