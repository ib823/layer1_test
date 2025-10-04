'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Timeline } from '@/components/ui/Timeline';
import { useToast } from '@/hooks/useToast';
import Link from 'next/link';

interface ViolationDetail {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  department: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  violationType: string;
  description: string;
  conflictingRoles: string[];
  conflictDetails: {
    role1: string;
    role2: string;
    conflictingPermissions: string[];
    businessImpact: string;
  };
  detectedAt: string;
  status: 'open' | 'in_review' | 'resolved' | 'acknowledged';
  assignedTo?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
  comments: Array<{
    id: string;
    author: string;
    text: string;
    timestamp: string;
  }>;
}

export default function ViolationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [comment, setComment] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [assignee, setAssignee] = useState('');

  // Fetch violation details
  const { data: violation, isLoading } = useQuery<ViolationDetail>({
    queryKey: ['violation', params.id],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/modules/sod/violations/${params.id}`);
      if (!res.ok) throw new Error('Failed to fetch violation');
      return res.json();
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/modules/sod/violations/${params.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['violation', params.id] });
      showToast('Status updated successfully', 'success');
    },
    onError: () => {
      showToast('Failed to update status', 'error');
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (commentText: string) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/modules/sod/violations/${params.id}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment: commentText }),
        }
      );
      if (!res.ok) throw new Error('Failed to add comment');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['violation', params.id] });
      setComment('');
      showToast('Comment added', 'success');
    },
    onError: () => {
      showToast('Failed to add comment', 'error');
    },
  });

  // Resolve violation mutation
  const resolveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/modules/sod/violations/${params.id}/resolve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolution: resolutionNotes }),
        }
      );
      if (!res.ok) throw new Error('Failed to resolve violation');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['violation', params.id] });
      showToast('Violation resolved', 'success');
      setResolutionNotes('');
    },
    onError: () => {
      showToast('Failed to resolve violation', 'error');
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-surface-secondary rounded w-1/3"></div>
          <div className="h-64 bg-surface-secondary rounded"></div>
        </div>
      </div>
    );
  }

  if (!violation) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Card>
          <Card.Body>
            <p className="text-center text-text-secondary">Violation not found</p>
          </Card.Body>
        </Card>
      </div>
    );
  }

  // Timeline events
  const timelineEvents = [
    {
      id: '1',
      title: 'Violation Detected',
      description: 'Automated SoD analysis identified this conflict',
      timestamp: new Date(violation.detectedAt),
      type: 'warning' as const,
    },
    ...violation.comments.map((c, i) => ({
      id: `comment-${i}`,
      title: `Comment by ${c.author}`,
      description: c.text,
      timestamp: new Date(c.timestamp),
      type: 'info' as const,
    })),
    ...(violation.resolvedAt
      ? [
          {
            id: 'resolved',
            title: 'Violation Resolved',
            description: `Resolved by ${violation.resolvedBy}`,
            timestamp: new Date(violation.resolvedAt),
            type: 'success' as const,
          },
        ]
      : []),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-text-secondary">
        <Link href="/violations" className="hover:text-brand-primary transition-colors">
          Violations
        </Link>
        <span>/</span>
        <span className="text-text-primary">{violation.id}</span>
      </div>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-semibold text-text-primary">
              {violation.violationType}
            </h1>
            <Badge variant={violation.riskLevel.toLowerCase()}>
              {violation.riskLevel}
            </Badge>
          </div>
          <p className="text-text-secondary">{violation.description}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => router.push('/violations')}
          >
            Back to List
          </Button>
          {violation.status !== 'resolved' && (
            <Button
              variant="primary"
              onClick={() => updateStatusMutation.mutate('in_review')}
              disabled={violation.status === 'in_review'}
            >
              Start Review
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Information */}
          <Card>
            <Card.Header>
              <h2 className="text-lg font-semibold">User Information</h2>
            </Card.Header>
            <Card.Body>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-text-secondary">Name</span>
                  <p className="font-medium">
                    <Link
                      href={`/users/${violation.userId}`}
                      className="text-brand-primary hover:underline"
                    >
                      {violation.userName}
                    </Link>
                  </p>
                </div>
                <div>
                  <span className="text-sm text-text-secondary">User ID</span>
                  <p className="font-medium font-mono text-sm">{violation.userId}</p>
                </div>
                <div>
                  <span className="text-sm text-text-secondary">Email</span>
                  <p className="font-medium">{violation.userEmail}</p>
                </div>
                <div>
                  <span className="text-sm text-text-secondary">Department</span>
                  <p className="font-medium">{violation.department}</p>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Conflict Details */}
          <Card>
            <Card.Header>
              <h2 className="text-lg font-semibold">Conflict Details</h2>
            </Card.Header>
            <Card.Body className="space-y-4">
              <div>
                <span className="text-sm text-text-secondary">Conflicting Roles</span>
                <div className="mt-2 flex items-center gap-3">
                  <Badge variant="medium">{violation.conflictDetails.role1}</Badge>
                  <span className="text-text-secondary">+</span>
                  <Badge variant="medium">{violation.conflictDetails.role2}</Badge>
                </div>
              </div>

              <div>
                <span className="text-sm text-text-secondary">Conflicting Permissions</span>
                <ul className="mt-2 space-y-1">
                  {violation.conflictDetails.conflictingPermissions.map((perm, i) => (
                    <li key={i} className="text-sm text-text-primary flex items-start">
                      <span className="text-status-critical mr-2">•</span>
                      {perm}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-sm text-text-secondary">Business Impact</span>
                <p className="mt-1 text-text-primary">{violation.conflictDetails.businessImpact}</p>
              </div>
            </Card.Body>
          </Card>

          {/* Remediation Actions */}
          {violation.status !== 'resolved' && (
            <Card>
              <Card.Header>
                <h2 className="text-lg font-semibold">Remediation</h2>
              </Card.Header>
              <Card.Body className="space-y-4">
                <p className="text-sm text-text-secondary">
                  Choose an appropriate remediation action to resolve this SoD violation:
                </p>

                <div className="space-y-3">
                  <div className="p-4 border border-border rounded-lg hover:border-brand-primary transition-colors cursor-pointer">
                    <h3 className="font-medium text-text-primary mb-1">Remove Role</h3>
                    <p className="text-sm text-text-secondary">
                      Remove one of the conflicting roles from the user's access
                    </p>
                  </div>

                  <div className="p-4 border border-border rounded-lg hover:border-brand-primary transition-colors cursor-pointer">
                    <h3 className="font-medium text-text-primary mb-1">Request Mitigation</h3>
                    <p className="text-sm text-text-secondary">
                      Implement compensating controls (dual approval, audit trail, etc.)
                    </p>
                  </div>

                  <div className="p-4 border border-border rounded-lg hover:border-brand-primary transition-colors cursor-pointer">
                    <h3 className="font-medium text-text-primary mb-1">Accept Risk</h3>
                    <p className="text-sm text-text-secondary">
                      Acknowledge the risk with business justification
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <Input
                    label="Resolution Notes"
                    placeholder="Describe the remediation action taken..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    multiline
                    rows={3}
                  />
                  <Button
                    variant="primary"
                    className="mt-3 w-full"
                    onClick={() => resolveMutation.mutate()}
                    disabled={!resolutionNotes}
                  >
                    Mark as Resolved
                  </Button>
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Comments */}
          <Card>
            <Card.Header>
              <h2 className="text-lg font-semibold">Comments</h2>
            </Card.Header>
            <Card.Body className="space-y-4">
              <div className="space-y-3">
                {violation.comments.length === 0 ? (
                  <p className="text-sm text-text-secondary">No comments yet</p>
                ) : (
                  violation.comments.map((c) => (
                    <div key={c.id} className="p-3 bg-surface-secondary rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{c.author}</span>
                        <span className="text-xs text-text-secondary">
                          {new Date(c.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-text-primary">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 border-t border-border">
                <Input
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  multiline
                  rows={2}
                />
                <Button
                  variant="secondary"
                  className="mt-2"
                  onClick={() => addCommentMutation.mutate(comment)}
                  disabled={!comment}
                >
                  Add Comment
                </Button>
              </div>
            </Card.Body>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <Card.Header>
              <h2 className="text-lg font-semibold">Status</h2>
            </Card.Header>
            <Card.Body className="space-y-4">
              <div>
                <span className="text-sm text-text-secondary">Current Status</span>
                <div className="mt-2">
                  <Badge variant={violation.status === 'resolved' ? 'low' : 'medium'}>
                    {violation.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>

              {violation.status !== 'resolved' && (
                <Select
                  label="Update Status"
                  value={violation.status}
                  onChange={(e) => updateStatusMutation.mutate(e.target.value)}
                >
                  <option value="open">Open</option>
                  <option value="in_review">In Review</option>
                  <option value="acknowledged">Acknowledged</option>
                </Select>
              )}

              <div>
                <span className="text-sm text-text-secondary">Detected At</span>
                <p className="font-medium">
                  {new Date(violation.detectedAt).toLocaleString()}
                </p>
              </div>

              {violation.resolvedAt && (
                <div>
                  <span className="text-sm text-text-secondary">Resolved At</span>
                  <p className="font-medium">
                    {new Date(violation.resolvedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Timeline */}
          <Card>
            <Card.Header>
              <h2 className="text-lg font-semibold">Activity Timeline</h2>
            </Card.Header>
            <Card.Body>
              <Timeline events={timelineEvents} />
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
}
