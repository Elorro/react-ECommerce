import { Skeleton } from "@/components/ui/skeleton";

export default function ProductLoading() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
      <Skeleton className="min-h-[28rem] rounded-[2rem]" />
      <section className="space-y-6 rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-card">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-72" />
        </div>
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-5/6" />
        <div className="flex gap-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-12 w-28" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
      </section>
    </div>
  );
}
