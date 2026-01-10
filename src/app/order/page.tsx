"use client";

import { History } from "lucide-react";

export default function OrderPage() {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center text-white/70">
      <History className="h-16 w-16" />
      <p className="mt-4 text-lg">You have 0 orders in progress</p>
    </div>
  );
}
