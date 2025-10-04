import { Button, Card, CardTitle, Badge } from '@/components/ui';

export default function DashboardPage() {
  return (
    <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="text-3xl font-bold" style={{ marginBottom: '0.5rem' }}>
          SAP GRC Dashboard
        </h1>
        <p className="text-secondary">
          Governance, Risk & Compliance Overview
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md" style={{ marginBottom: '2rem' }}>
        <Card>
          <Card.Body>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-secondary" style={{ marginBottom: '0.25rem' }}>
                  Total Violations
                </p>
                <p className="text-3xl font-bold">247</p>
              </div>
              <Badge variant="critical">+12%</Badge>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-secondary" style={{ marginBottom: '0.25rem' }}>
                  Critical Issues
                </p>
                <p className="text-3xl font-bold text-critical">45</p>
              </div>
              <Badge variant="high">+5</Badge>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-secondary" style={{ marginBottom: '0.25rem' }}>
                  Users Analyzed
                </p>
                <p className="text-3xl font-bold">1,284</p>
              </div>
              <Badge variant="info">Active</Badge>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-secondary" style={{ marginBottom: '0.25rem' }}>
                  Compliance Score
                </p>
                <p className="text-3xl font-bold text-low">94%</p>
              </div>
              <Badge variant="low">+2%</Badge>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Recent Violations Table */}
      <Card>
        <Card.Header>
          <div className="flex justify-between items-center">
            <CardTitle>Recent SoD Violations</CardTitle>
            <Button variant="primary" size="sm">
              View All
            </Button>
          </div>
        </Card.Header>
        <Card.Body style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Violation Type</th>
                <th>Risk Level</th>
                <th>Detected</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-medium">USER_1234</td>
                <td>Create & Approve PO</td>
                <td>
                  <Badge variant="critical">Critical</Badge>
                </td>
                <td className="text-secondary">2 hours ago</td>
                <td>
                  <span className="text-high">Pending Review</span>
                </td>
              </tr>
              <tr>
                <td className="font-medium">USER_5678</td>
                <td>Payment Processing</td>
                <td>
                  <Badge variant="high">High</Badge>
                </td>
                <td className="text-secondary">5 hours ago</td>
                <td>
                  <span className="text-high">Pending Review</span>
                </td>
              </tr>
              <tr>
                <td className="font-medium">USER_9012</td>
                <td>Vendor Management</td>
                <td>
                  <Badge variant="medium">Medium</Badge>
                </td>
                <td className="text-secondary">1 day ago</td>
                <td>
                  <span className="text-secondary">In Progress</span>
                </td>
              </tr>
              <tr>
                <td className="font-medium">USER_3456</td>
                <td>GL Account Posting</td>
                <td>
                  <Badge variant="low">Low</Badge>
                </td>
                <td className="text-secondary">2 days ago</td>
                <td>
                  <span className="text-low">Resolved</span>
                </td>
              </tr>
            </tbody>
          </table>
        </Card.Body>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-md" style={{ marginTop: '2rem' }}>
        <Button variant="primary" size="md">
          Run New Analysis
        </Button>
        <Button variant="secondary" size="md">
          Export Report
        </Button>
        <Button variant="ghost" size="md">
          View Settings
        </Button>
      </div>
    </main>
  );
}
