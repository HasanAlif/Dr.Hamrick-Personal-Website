import Contact, { ContactAttrs } from "./contact.model";
import emailSender from "../../../shared/emailSender";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

// Create new contact - User submits form for query/help
const createContact = async (payload: ContactAttrs) => {
  try {
    // Save contact to database
    const result = await Contact.create(payload);

    // Send email notification to admin
    const adminEmail = "alifalmehedihasan2@gmail.com"; // Admin email address
    const subject = `New Contact Form Query from ${payload.firstName} ${payload.lastName}`;

    // Create HTML email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Contact Form Message</h2>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 5px;">
          <p><strong>From:</strong> ${payload.firstName} ${payload.lastName}</p>
          <p><strong>User Email:</strong> ${payload.email}</p>
          <p><strong>Phone:</strong> ${payload.phone}</p>
          <div style="margin-top: 20px;">
            <strong>Message:</strong>
            <p style="background: white; padding: 15px; border-left: 4px solid #4CAF50; margin: 10px 0;">
              ${payload.message}
            </p>
          </div>
          <div style="margin-top: 20px; font-size: 12px; color: #666;">
            <p>Additional Information:</p>
            <p>IP: ${payload.meta?.ip || "Not available"}</p>
            <p>User Agent: ${payload.meta?.userAgent || "Not available"}</p>
            <p>Referer: ${payload.meta?.referer || "Not available"}</p>
          </div>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          This message was sent from your website's contact form.
        </p>
      </div>
    `;

    // Send the email notification
    const emailResult = await emailSender(adminEmail, htmlContent, subject);

    if (!emailResult.success) {
      console.warn(
        `Email notification failed for contact from ${payload.email}:`,
        emailResult.error
      );
    }

    return result;
  } catch (error) {
    console.error("Error processing contact form:", error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to process your request. Please try again later."
    );
  }
};

export const contactService = {
  createContact,
};
