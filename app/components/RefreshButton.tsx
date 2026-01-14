"use client";

export default function RefreshButton() {
  const handleRefresh = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <button
      onClick={handleRefresh}
      className="flex items-center justify-center gap-1 rounded-lg bg-slate-200 hover:bg-slate-300 px-2.5 py-2 sm:px-3 transition-colors"
      title="Refrescar tabla"
      aria-label="Refrescar"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="h-5 w-5 text-slate-700"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.995-1.465" />
      </svg>
    </button>
  );
}
