import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
}

export default function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <p className="text-xs text-foreground/40 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {sub && <p className="text-xs text-foreground/30 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}
