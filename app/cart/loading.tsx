import { Skeleton } from "@/components/ui/skeleton";

export default function CartLoading() {
  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-12 w-48" />
        </div>
        <div className="rounded-3xl bg-white px-5 py-4 shadow-card">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="mt-3 h-10 w-24" />
        </div>
      </div>
      <div className="grid gap-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <article
            key={index}
            className="grid gap-5 rounded-[1.75rem] border border-black/5 bg-white/85 p-5 shadow-card md:grid-cols-[120px_1fr_auto]"
          >
            <Skeleton className="aspect-square rounded-3xl" />
            <div className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-12 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </article>
        ))}
      </div>
      <Skeleton className="h-12 w-40" />
    </section>
  );
}
