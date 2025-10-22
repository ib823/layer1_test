import Link from 'next/link';

/**
 * Not Found handler for /modules/* routes
 */
export default function ModulesNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="text-center max-w-md">
        <div className="text-7xl font-bold text-gray-300 mb-4">404</div>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          Module Not Found
        </h2>
        <p className="text-gray-600 mb-8">
          The module you're trying to access doesn't exist or you don't have permission.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/dashboard" className="btn btn-primary">
            Dashboard
          </Link>
          <Link href="/" className="btn btn-secondary">
            Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
