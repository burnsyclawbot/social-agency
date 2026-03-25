import { useState, useEffect, useCallback } from 'react';
import type { ClientProfile } from '../types/client';
import { apiFetch } from '../lib/api';

export function useClientStore(isAuthenticated: boolean) {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Fetch clients from server only when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setClients([]);
      setActiveClientId(null);
      setLoaded(false);
      return;
    }

    apiFetch<{ clients: ClientProfile[]; activeClientId: string | null }>('/clients')
      .then((data) => {
        setClients(data.clients);
        setActiveClientId(data.activeClientId);
      })
      .catch(() => {
        // Server error — leave empty
      })
      .finally(() => setLoaded(true));
  }, [isAuthenticated]);

  const activeClient = clients.find((c) => c.id === activeClientId) ?? null;

  const addClient = useCallback(async (client: ClientProfile) => {
    const data = await apiFetch<{ client: ClientProfile }>('/clients', {
      method: 'POST',
      body: JSON.stringify({
        accountType: client.accountType,
        business: client.business,
        brand: client.brand,
        voice: client.voice,
        compliance: client.compliance,
        platforms: client.platforms,
        blotatoApiKey: client.blotatoApiKey,
      }),
    });
    setClients((prev) => [...prev, data.client]);
    setActiveClientId(data.client.id);
    return data.client;
  }, []);

  const updateClient = useCallback(async (id: string, updates: Partial<ClientProfile>) => {
    const data = await apiFetch<{ client: ClientProfile }>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    setClients((prev) => prev.map((c) => (c.id === id ? data.client : c)));
    return data.client;
  }, []);

  const removeClient = useCallback(async (id: string) => {
    await apiFetch(`/clients/${id}`, { method: 'DELETE' });
    setClients((prev) => prev.filter((c) => c.id !== id));
    if (activeClientId === id) {
      setActiveClientId(null);
    }
  }, [activeClientId]);

  const switchClient = useCallback(async (id: string) => {
    await apiFetch('/clients/active', {
      method: 'POST',
      body: JSON.stringify({ clientId: id }),
    });
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
    loaded,
    addClient,
    updateClient,
    removeClient,
    switchClient,
  };
}
