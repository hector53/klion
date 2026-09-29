export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark min-h-screen bg-[#111827] text-slate-100">
      {children}
    </div>
  );
}
