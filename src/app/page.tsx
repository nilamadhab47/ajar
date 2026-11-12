import { redirect } from "next/navigation";

export default function Home() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) redirect("/offices");
  redirect("/workspace/demo/office");
}
