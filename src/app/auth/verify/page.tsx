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

      // Check if this is a registration token (has email, password, firstName, lastName)
      // or a user verification token (has id)
      if (
        decoded.email &&
        decoded.password &&
        decoded.firstName &&
        decoded.lastName
      ) {
        // NEW USER REGISTRATION FLOW
        // Check if user already exists by email
        const existingUser = await prisma.user.findUnique({
          where: { email: decoded.email },
        });

        if (existingUser) {
          status = "error";
          message =
            "Email already registered. Please log in or use a different email.";
        } else {
          // Create the user now after email verification
          const newUser = await prisma.user.create({
            data: {
              email: decoded.email,
              password: decoded.password,
              firstName: decoded.firstName,
              lastName: decoded.lastName,
              role: "EMPLOYEE",
              isVerified: true, // Email is verified
              active: false, // Account inactive until OWNER approves
            },
          });

          // Notify OWNER about new user registration
          try {
            const owner = await prisma.user.findFirst({
              where: { role: "OWNER" },
            });

            if (owner) {
              await prisma.notification.create({
                data: {
                  receiverId: owner.id,
                  type: "new_user_registration",
                  data: {
                    userId: newUser.id,
                    userName: `${newUser.firstName} ${newUser.lastName}`,
                    email: newUser.email,
                    status: "pending",
                    title: "New User Registration",
                    message: `${newUser.firstName} ${newUser.lastName} (${newUser.email}) verified their email. Click to review in Team Management.`,
                  },
                },
              });
            }
          } catch (e) {
            console.warn("Failed to send owner notification", e);
          }

          status = "success";
          message =
            "Email verified successfully! Your account has been created. Please wait for the owner to approve your account before signing in.";
        }
      } else if (decoded.id) {
        // EXISTING USER EMAIL VERIFICATION (if needed)
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
        });

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
                receiverId: updatedUser.id,
                type: "welcome",
                data: {
                  title: "Welcome to TaskerAI",
                  message:
                    "Welcome to TaskerAI — your email has been successfully verified!",
                },
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
      } else {
        status = "error";
        message = "Invalid verification token.";
      }
    } catch (err) {
      status = "error";
      message = "Invalid or expired verification token.";
    }
  }

  return <VerifyResultClient status={status} message={message} />;
}
