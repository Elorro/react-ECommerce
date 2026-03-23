import { Skeleton } from "@/components/ui/skeleton";

export default function CheckoutLoading() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
      <section className="space-y-5 rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-card">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </section>
      <aside className="space-y-4 rounded-[2rem] border border-black/5 bg-pine p-8 text-white shadow-card">
        <Skeleton className="h-10 w-48 bg-white/15" />
        <Skeleton className="h-5 w-full bg-white/10" />
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full bg-white/10" />
        ))}
        <Skeleton className="h-14 w-full bg-white/10" />
      </aside>
    </div>
  );
}
