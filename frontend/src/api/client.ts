import { 
    SimulationRequest, 
    SimulationResponse, 
    RunResult, 
    Vehicle, 
    Incident, 
    Assignment, 
    CoverageRecord,
    TimelineEvent,
    MetricsResponse
} from '../types/models';

function getApiBaseUrl(): string {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
        return envUrl.trim().replace(/\/+$/, '');
    }
    // If frontend is co-located with backend on port 8000
    if (typeof window !== 'undefined' && window.location.port === '8000') {
        return '';
    }
    // Default fallback for local development
    return 'http://127.0.0.1:8000';
}

const API_BASE = getApiBaseUrl();

class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    const targetUrl = `${API_BASE}${url}`;
    let response: Response;
    try {
        response = await fetch(targetUrl, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(options?.headers || {})
            }
        });
    } catch (networkErr: unknown) {
        const errorMsg = networkErr instanceof Error ? networkErr.message : 'Network error';
        throw new ApiError(0, `Network error connecting to API (${targetUrl}): ${errorMsg}`);
    }

    if (!response.ok) {
        let msg = 'Failed to fetch API';
        try {
            const errBody = await response.json();
            msg = errBody.detail || msg;
        } catch {
            // Provide informative message when server returns non-JSON (e.g. 404/502 HTML)
            msg = `Failed to fetch API (HTTP ${response.status} from ${targetUrl})`;
        }
        throw new ApiError(response.status, msg);
    }
    return response.json();
}

export const api = {
    async checkHealth(): Promise<{ status: string }> {
        return fetchJson<{status: string}>('/api/health');
    },

    async runSimulation(req: SimulationRequest): Promise<SimulationResponse> {
        return fetchJson<SimulationResponse>('/api/simulations', {
            method: 'POST',
            body: JSON.stringify(req)
        });
    },

    async getRun(runId: string): Promise<RunResult> {
        return fetchJson<RunResult>(`/api/simulations/${runId}`);
    },

    async getTimeline(runId: string): Promise<TimelineEvent[]> {
        return fetchJson<TimelineEvent[]>(`/api/simulations/${runId}/timeline`);
    },

    async getVehicles(runId: string): Promise<Vehicle[]> {
        return fetchJson<Vehicle[]>(`/api/simulations/${runId}/vehicles`);
    },

    async getIncidents(runId: string): Promise<Incident[]> {
        return fetchJson<Incident[]>(`/api/simulations/${runId}/incidents`);
    },

    async getAssignments(runId: string): Promise<Assignment[]> {
        return fetchJson<Assignment[]>(`/api/simulations/${runId}/assignments`);
    },

    async getMetrics(runId: string): Promise<MetricsResponse> {
        return fetchJson<MetricsResponse>(`/api/simulations/${runId}/metrics`);
    },

    async getCoverage(runId: string): Promise<CoverageRecord[]> {
        return fetchJson<CoverageRecord[]>(`/api/simulations/${runId}/coverage`);
    },
    
    getExportJsonUrl(runId: string): string {
        return `${API_BASE}/api/simulations/${runId}/export/json`;
    },
    
    getExportCsvUrl(runId: string): string {
        return `${API_BASE}/api/simulations/${runId}/export/csv`;
    }
};
