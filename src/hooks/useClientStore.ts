import { useState, useEffect, useCallback } from 'react';
import type { ClientProfile } from '../types/client';

const STORAGE_KEY = 'spa_social_clients';
const ACTIVE_KEY = 'spa_social_active_client';

function loadClients(): ClientProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveClients(clients: ClientProfile[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

function loadActiveId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

function saveActiveId(id: string | null) {
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}

export function useClientStore() {
  const [clients, setClients] = useState<ClientProfile[]>(loadClients);
  const [activeClientId, setActiveClientId] = useState<string | null>(loadActiveId);

  useEffect(() => saveClients(clients), [clients]);
  useEffect(() => saveActiveId(activeClientId), [activeClientId]);

  const activeClient = clients.find((c) => c.id === activeClientId) ?? null;

  const addClient = useCallback((client: ClientProfile) => {
    setClients((prev) => [...prev, client]);
    setActiveClientId(client.id);
  }, []);

  const updateClient = useCallback((id: string, updates: Partial<ClientProfile>) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      )
    );
  }, []);

  const removeClient = useCallback((id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
    if (activeClientId === id) {
      setActiveClientId(null);
    }
  }, [activeClientId]);

  const switchClient = useCallback((id: string) => {
    setActiveClientId(id);
  }, []);

  const hasClients = clients.length > 0;
  const isAgency = clients.length > 1 || clients.some((c) => c.accountType === 'agency');

  return {
    clients,
    activeClient,
    activeClientId,
    hasClients,
    isAgency,
    addClient,
    updateClient,
    removeClient,
    switchClient,
  };
}
