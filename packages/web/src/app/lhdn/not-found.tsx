import Link from 'next/link';

/**
 * Not Found handler for LHDN e-Invoice module
 */
export default function LHDNNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="text-center max-w-md">
        <div className="text-7xl font-bold text-gray-300 mb-4">404</div>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          LHDN Page Not Found
        </h2>
        <p className="text-gray-600 mb-8">
          The LHDN e-invoice page you're looking for doesn't exist.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/lhdn" className="btn btn-primary">
            LHDN Dashboard
          </Link>
          <Link href="/dashboard" className="btn btn-secondary">
            Main Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
