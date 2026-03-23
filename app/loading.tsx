// apps/web/app/loading.tsx
// Shown while any server component in the root layout is loading.
// Keep it minimal — route-level loading.tsx files handle the rest.

export default function RootLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-stone-200 border-t-stone-700 rounded-full animate-spin" />
    </div>
  );
}
