import { Response } from "express";

//Send standardized API response All dates in response data are in UTC format (ISO 8601 with Z suffix). Frontend should convert to user's local timezone for display
const sendResponse = <T>(
  res: Response,
  jsonData: {
    statusCode: number;
    success: boolean;
    message: string;
    meta?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    data: T | null | undefined;
  }
) => {
  // Add timezone header to inform frontend all dates are UTC
  res.setHeader("X-Timezone", "UTC");

  res.status(jsonData.statusCode).json({
    success: jsonData.success,
    message: jsonData.message,
    meta: jsonData.meta || null || undefined,
    data: jsonData.data || null || undefined,
  });
};

export default sendResponse;
