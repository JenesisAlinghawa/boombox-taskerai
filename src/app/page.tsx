import { redirect } from "next/navigation";
import { getCurrentUser } from "@/utils/sessionManager";

export default async function HomePage() {
  // Check if user is logged in
  const user = await getCurrentUser();

  // If logged in, redirect to dashboard; otherwise redirect to login
  if (user) {
    redirect("/dashboard");
  } else {
    redirect("/auth/login");
  }

  return null;
}
