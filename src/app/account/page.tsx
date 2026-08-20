import { permanentRedirect } from "next/navigation";

export default function AccountIndexPage() {
  permanentRedirect("/account/orders");
}
