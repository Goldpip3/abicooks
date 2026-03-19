'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function UserRow({ user, onApprove, onReject }) {
  const isAdmin = user.is_admin;
  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{user.name}</span>
          {isAdmin && (
            <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded font-medium">
              admin
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">{user.email}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[user.status] || ''}`}>
          {user.status}
        </span>
        {!isAdmin && user.status !== 'approved' && (
          <button
            onClick={onApprove}
            className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            Approve
          </button>
        )}
        {!isAdmin && user.status !== 'rejected' && (
          <button
            onClick={onReject}
            className="text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            Reject
          </button>
        )}
      </div>
    </div>
  );
}

export default function Admin() {
  const router = useRouter();
  const { session, status } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated' && !session?.user?.is_admin) {
      router.push('/browse');
    }
  }, [status, session, router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to load users');
      setUsers(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.is_admin) {
      fetchUsers();
    }
  }, [status, session]);

  const updateStatus = async (id, action) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/${action}`, {
        method: 'PATCH'
      });
      if (!res.ok) throw new Error('Action failed');
      const updated = await res.json();
      setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, status: updated.status } : u));
    } catch (err) {
      setError(err.message);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <svg className="animate-spin text-orange-500" xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
    );
  }

  const pending = users.filter(u => u.status === 'pending');
  const others = users.filter(u => u.status !== 'pending');

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-1">User Approvals</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Manage who can access AbiZar</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Pending ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map(u => (
              <UserRow
                key={u.id}
                user={u}
                onApprove={() => updateStatus(u.id, 'approve')}
                onReject={() => updateStatus(u.id, 'reject')}
              />
            ))}
          </div>
        </section>
      )}

      {pending.length === 0 && (
        <div className="mb-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
          No pending requests.
        </div>
      )}

      {others.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            All Users ({others.length})
          </h2>
          <div className="space-y-3">
            {others.map(u => (
              <UserRow
                key={u.id}
                user={u}
                onApprove={() => updateStatus(u.id, 'approve')}
                onReject={() => updateStatus(u.id, 'reject')}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
