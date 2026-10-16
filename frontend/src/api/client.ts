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

const API_BASE = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && (window.location.port === '8000' || !window.location.port) ? '' : 'http://127.0.0.1:8000');

class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options?.headers || {})
        }
    });

    if (!response.ok) {
        let msg = 'Failed to fetch API';
        try {
            const errBody = await response.json();
            msg = errBody.detail || msg;
        } catch {
            // Ignore parse errors on error responses
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
