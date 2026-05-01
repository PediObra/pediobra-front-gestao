"use client";

import { type FormEvent, useMemo, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n/language-store";
import { STRIPE_PUBLISHABLE_KEY } from "@/lib/stripe/config";

const stripePromise = STRIPE_PUBLISHABLE_KEY
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : null;

export function DeliveryRequestStripeDialog({
  open,
  clientSecret,
  amountLabel,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  clientSecret: string | null;
  amountLabel: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const t = useTranslation();
  const options = useMemo<StripeElementsOptions | undefined>(() => {
    if (!clientSecret) return undefined;

    return {
      clientSecret,
      appearance: {
        theme: "night",
        variables: {
          borderRadius: "8px",
          colorPrimary: "#f59e0b",
        },
      },
    };
  }, [clientSecret]);

  if (!clientSecret || !stripePromise || !options) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("payments.payDeliveryTitle")}</DialogTitle>
          <DialogDescription>
            {t("payments.payDeliveryDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
          <span className="text-muted-foreground">{t("payments.amount")}</span>
          <span className="ml-2 font-mono font-semibold">{amountLabel}</span>
        </div>
        <Elements stripe={stripePromise} options={options}>
          <DeliveryRequestStripeForm
            onCancel={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        </Elements>
      </DialogContent>
    </Dialog>
  );
}

function DeliveryRequestStripeForm({
  onCancel,
  onSuccess,
}: {
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const t = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [elementLoadError, setElementLoadError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements || elementLoadError) return;

    setSubmitting(true);
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (result.error) {
        toast.error(result.error.message ?? t("payments.paymentFailed"));
        return;
      }

      toast.success(t("payments.deliveryPaymentSubmitted"));
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("payments.paymentFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <PaymentElement
        options={{ layout: "tabs" }}
        onLoadError={(event) => {
          const message = event.error.message ?? t("payments.paymentFailed");
          setElementLoadError(message);
          toast.error(message);
        }}
      />
      {elementLoadError && (
        <p className="text-xs text-destructive">{elementLoadError}</p>
      )}
      <p className="text-xs text-muted-foreground">
        {t("payments.paymentProcessingHint")}
      </p>
      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={submitting}
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          disabled={
            !stripe || !elements || submitting || Boolean(elementLoadError)
          }
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CreditCard className="size-4" />
          )}
          {t("payments.payDelivery")}
        </Button>
      </DialogFooter>
    </form>
  );
}
