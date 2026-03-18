import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/store/checkout-form";
import { auth } from "@/lib/auth";
import { isStripeCheckoutEnabled } from "@/lib/payments";

export const metadata = {
  title: "Checkout | Atelier Commerce",
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  return (
    <CheckoutForm
      stripeEnabled={isStripeCheckoutEnabled()}
      paymentCancelled={params.payment === "cancelled"}
    />
  );
}
