import { Skeleton } from "@/components/ui/skeleton";

export default function CatalogLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      <Skeleton className="h-20 w-full rounded-[1.75rem]" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <article key={index} className="overflow-hidden rounded-[1.75rem] border border-black/5 bg-white shadow-card">
            <Skeleton className="aspect-square rounded-none" />
            <div className="space-y-4 p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
