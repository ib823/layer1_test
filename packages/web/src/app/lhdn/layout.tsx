// Force dynamic rendering for all LHDN pages
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function LHDNLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
