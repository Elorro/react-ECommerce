import { Skeleton } from "@/components/ui/skeleton";

export default function OrderDetailLoading() {
  return (
    <section className="space-y-8 rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-card">
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="rounded-3xl border border-black/5 bg-canvas px-5 py-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-3 h-7 w-40" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      </div>
    </section>
  );
}
