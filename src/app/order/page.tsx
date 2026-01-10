"use client";

import { History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function OrderPage() {
  return (
    <div className="p-4">
      <Card className="mt-4 border-none bg-white/10 text-white shadow-2xl shadow-primary/10 backdrop-blur-lg">
        <CardContent className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
          <History className="h-16 w-16 opacity-50" />
          <p className="mt-4 text-lg font-medium">You have 0 orders in progress</p>
          <p className="mt-1 text-sm text-white/70">
            Any orders you make will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
