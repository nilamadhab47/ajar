import { redirect } from "next/navigation";

/** Older links to the demo office now come in through sign-in. */
export default function DemoPage() {
  redirect("/login");
}
