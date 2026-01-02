/**
 * useRealTimeLogs Hook
 * 
 * Story 5.3: Admin Dashboard - Stats & Logs
 * 
 * Real-time log updates using WebSocket or polling fallback.
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface LogFilters {
    level?: 'error' | 'warning' | 'info' | '';
    component?: string;
}

export interface SystemLog {
    id: number;
    level: string;
    message: string;
    component: string;
    trace_id: string | null;
    stack_trace: string | null;
    created_at: string;
}

const WS_RECONNECT_DELAY = 3000;
const POLLING_INTERVAL = 10000;

export function useRealTimeLogs(filters: LogFilters = {}) {
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Filter function for incoming logs
    const passesFilters = useCallback((log: SystemLog): boolean => {
        if (filters.level && log.level !== filters.level) return false;
        if (filters.component && log.component !== filters.component) return false;
        return true;
    }, [filters.level, filters.component]);

    // Attempt WebSocket connection
    const connectWebSocket = useCallback(() => {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/api/v1/admin/logs/ws`;

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                setIsConnected(true);
                setError(null);
                // Stop polling if WS is connected
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }
            };

            ws.onmessage = (event) => {
                try {
                    const newLog: SystemLog = JSON.parse(event.data);
                    if (passesFilters(newLog)) {
                        setLogs(prev => [newLog, ...prev.slice(0, 99)]);
                    }
                } catch {
                    console.warn('Invalid WebSocket message:', event.data);
                }
            };

            ws.onerror = () => {
                setError('WebSocket connection error');
                setIsConnected(false);
            };

            ws.onclose = () => {
                setIsConnected(false);
                wsRef.current = null;

                // Auto-reconnect after delay
                reconnectTimeoutRef.current = setTimeout(() => {
                    connectWebSocket();
                }, WS_RECONNECT_DELAY);
            };

        } catch (err) {
            // WebSocket not available, fallback to polling
            startPolling();
        }
    }, [passesFilters]);

    // Fallback polling mechanism
    const startPolling = useCallback(() => {
        if (pollingIntervalRef.current) return;

        const poll = async () => {
            try {
                const params = new URLSearchParams({
                    page: '1',
                    page_size: '20',
                });
                if (filters.level) params.append('level', filters.level);

                const response = await fetch(`/api/v1/admin/logs?${params}`, {
                    credentials: 'include',
                });

                if (response.ok) {
                    const data = await response.json();
                    setLogs(data.items || []);
                    setError(null);
                }
            } catch {
                setError('Failed to fetch logs');
            }
        };

        // Initial fetch
        poll();

        // Start polling
        pollingIntervalRef.current = setInterval(poll, POLLING_INTERVAL);
    }, [filters.level]);

    // Initialize connection
    useEffect(() => {
        // Try WebSocket first, fallback to polling
        if (typeof WebSocket !== 'undefined') {
            connectWebSocket();
        } else {
            startPolling();
        }

        return () => {
            // Cleanup
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [connectWebSocket, startPolling]);

    // Manual refresh function
    const refresh = useCallback(async () => {
        try {
            const params = new URLSearchParams({
                page: '1',
                page_size: '20',
            });
            if (filters.level) params.append('level', filters.level);

            const response = await fetch(`/api/v1/admin/logs?${params}`, {
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setLogs(data.items || []);
            }
        } catch {
            setError('Failed to refresh logs');
        }
    }, [filters.level]);

    return {
        logs,
        isConnected,
        error,
        refresh,
    };
}
