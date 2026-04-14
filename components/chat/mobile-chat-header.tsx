"use client";

import { LogoutButton } from "@/components/auth/logout-button";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

interface MobileChatHeaderProps {
  email: string | null;
}

export function MobileChatHeader({ email }: MobileChatHeaderProps) {
  const fallback = email ?? "AI";

  return (
    <Card className="mb-4 lg:hidden">
      <CardContent className="flex items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-3">
          <Avatar fallback={fallback} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-300">
              Signed in
            </p>
            <p className="max-w-[180px] truncate text-sm text-slate-300">
              {email ?? "Authenticated user"}
            </p>
          </div>
        </div>
        <div className="w-[120px]">
          <LogoutButton />
        </div>
      </CardContent>
    </Card>
  );
}
