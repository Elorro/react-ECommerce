import { cn } from "@/lib/utils";

type NoticeTone = "info" | "warn" | "error" | "success";

const toneClasses: Record<NoticeTone, string> = {
  info: "border-black/10 bg-canvas text-black/75",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export function InlineNotice({
  tone,
  children,
  className,
}: {
  tone: NoticeTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border px-4 py-3 text-sm font-medium", toneClasses[tone], className)}>
      {children}
    </div>
  );
}
