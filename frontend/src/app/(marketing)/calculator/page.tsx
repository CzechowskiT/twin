import { redirect } from "next/navigation";

/** Legacy URL → investor lane. */
export default function LegacyCalculatorRedirect() {
  redirect("/investor/calculator");
}
