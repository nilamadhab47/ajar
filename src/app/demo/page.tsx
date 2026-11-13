import { redirect } from "next/navigation";

/** The full interactive office is the existing app in demo mode. `/demo` is its public, memorable address. */
export default function DemoPage() {
  redirect("/workspace/demo/office");
}
