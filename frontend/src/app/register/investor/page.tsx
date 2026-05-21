import { redirect } from "next/navigation";

export default function RegisterInvestorRedirect() {
  redirect("/register?zone=investor");
}
