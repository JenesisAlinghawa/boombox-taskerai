import { redirect } from "next/navigation";

export default function HomePage() {
  // Always redirect to login on startup
  redirect("/auth/login");

  return null;
}
