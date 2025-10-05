// Force dynamic rendering for analytics page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
