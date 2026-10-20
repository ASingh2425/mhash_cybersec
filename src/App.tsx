import React, { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { AdminPortal } from './components/admin/AdminPortal';
import { UserPortal } from './components/user/UserPortal';
import { Identity } from './types';
import { api } from './api/client';

export default function App() {
  const [portalMode, setPortalMode] = useState<'admin' | 'user'>('admin');
  const [currentUserIdentityId, setCurrentUserIdentityId] = useState<string>('emp-jordan');
  const [identities, setIdentities] = useState<Identity[]>([]);

  useEffect(() => {
    api.getIdentities().then(setIdentities).catch(console.error);
  }, [portalMode]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header
        portalMode={portalMode}
        onTogglePortal={() => setPortalMode((prev) => (prev === 'admin' ? 'user' : 'admin'))}
        activeRoleName="Sarah Lin (Security Admin)"
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {portalMode === 'admin' ? (
          <AdminPortal />
        ) : (
          <UserPortal
            currentIdentityId={currentUserIdentityId}
            onSwitchIdentity={setCurrentUserIdentityId}
            identities={identities}
          />
        )}
      </main>
    </div>
  );
}
