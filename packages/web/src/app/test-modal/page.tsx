'use client';

import { Modal, Button } from '@/components/ui';
import { useState } from 'react';

export default function TestModalPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Modal Component Test</h1>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
        <Button onClick={() => setIsOpen(true)}>Open Simple Modal</Button>
        <Button variant="danger" onClick={() => setConfirmOpen(true)}>
          Open Confirmation
        </Button>
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Simple Modal" size="md">
        <p>This is a simple modal with some content.</p>
        <p>It can be closed by clicking outside, pressing Escape, or the close button.</p>
      </Modal>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Action"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                alert('Confirmed!');
                setConfirmOpen(false);
              }}
            >
              Confirm Delete
            </Button>
          </>
        }
      >
        <p>Are you sure you want to delete this violation?</p>
        <p style={{ color: 'var(--status-critical)' }}>This action cannot be undone.</p>
      </Modal>
    </main>
  );
}