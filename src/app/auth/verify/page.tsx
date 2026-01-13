import jwt from "jsonwebtoken";
import React from "react";
import VerifyResultClient from "../VerifyResultClient";
import prisma from "@/lib/prisma";
import { sendEvent } from "@/lib/sse";

const secret = process.env.JWT_SECRET || "your-secret-key";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = params?.token;
  let status: "success" | "error";
  let message = "";

  if (!token) {
    status = "error";
    message = "No verification token found in the URL.";
  } else {
    try {
      const decoded: any = jwt.verify(token, secret);
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });

      if (!user) {
        status = "error";
        message = "User not found.";
      } else {
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: { isVerified: true },
        });

        // create welcome notification
        try {
          const notification = await prisma.notification.create({
            data: {
              userId: updatedUser.id,
              type: "welcome",
              title: "Welcome to TaskerAI",
              message:
                "Welcome to TaskerAI — your email has been successfully verified!",
            },
          });

          try {
            sendEvent(updatedUser.id, "notification", { notification });
          } catch (e) {
            console.error("SSE push error (welcome):", e);
          }
        } catch (e) {
          console.error("Failed to create welcome notification:", e);
        }

        status = "success";
        message = "Email verified successfully! You can now sign in.";
      }
    } catch (err) {
      status = "error";
      message = "Invalid or expired verification token.";
    }
  }

  return <VerifyResultClient status={status} message={message} />;
}
