"use client";

import { useOptimistic, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { setUserPlan } from "@/lib/actions/admin";

export function PlanControl({ userId, initialPlan }: { userId: string; initialPlan: "free" | "premium" }) {
  const [plan, setPlan] = useOptimistic(initialPlan);
  const [isPending, startTransition] = useTransition();

  function change(next: "free" | "premium") {
    if (next === plan) return;
    startTransition(async () => {
      setPlan(next);
      await setUserPlan(userId, next);
    });
  }

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        variant={plan === "free" ? "default" : "outline"}
        disabled={isPending}
        onClick={() => change("free")}
      >
        Free
      </Button>
      <Button
        type="button"
        size="sm"
        variant={plan === "premium" ? "default" : "outline"}
        disabled={isPending}
        onClick={() => change("premium")}
      >
        Premium
      </Button>
    </div>
  );
}
