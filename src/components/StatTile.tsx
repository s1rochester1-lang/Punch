export default function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel rounded-card px-4 py-3 flex-1">
      <p className="text-muted text-[10px] uppercase tracking-[0.15em] font-body">{label}</p>
      <p className="stamp text-xl text-paper mt-1">{value}</p>
    </div>
  );
}
