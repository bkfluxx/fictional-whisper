import GoalsView from "@/components/goals/GoalsView";

export default function GoalsPage() {
  return (
    <div className="h-full overflow-y-auto overscroll-y-contain animate-in fade-in slide-in-from-right-4 duration-300">
      <GoalsView />
    </div>
  );
}
