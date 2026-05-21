import { redirect } from "next/navigation";

export default function RegisterCandidateRedirect() {
  redirect("/register?zone=candidate");
}
