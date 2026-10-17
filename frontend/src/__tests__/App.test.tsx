import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../App';
import { expect, test, vi } from 'vitest';

// Mock the API client since we don't want real network requests in unit tests
vi.mock('../api/client', () => {
    return {
        api: {
            checkHealth: vi.fn().mockResolvedValue({ status: 'ok' }),
            runSimulation: vi.fn().mockReturnValue(new Promise(() => {})),
            getRun: vi.fn().mockResolvedValue({
                run_id: 'mock-123',
                metrics: {
                    weighted_response_mean: 100.5,
                    p3_mean_response: 25.0,
                    total_outage_minutes: 10,
                    assigned_count: 50,
                    invalid_assignments: 0,
                    runtime_seconds: 0.1
                },
                validation_results: { assigned_incidents: 50, total_incidents: 100, waiting_incidents: 0, invalid_assignment_attempts: 0, duplicate_assignments: 0, assignments_to_busy_vehicles: 0, assignments_before_reveal: 0 },
                assignments: [],
                incidents: [],
                vehicles: [],
                coverage_timeline: []
            })
        }
    };
});

test('renders App and shows loading state when submitting form', async () => {
    await act(async () => {
        render(<App />);
    });
    
    const runBtn = screen.getByText(/EXECUTE SIMULATION/i);
    expect(runBtn).toBeInTheDocument();
    
    // Fire submit on form
    await act(async () => {
        fireEvent.submit(runBtn.closest('form')!);
    });
    
    // Expect loading text/state
    expect(screen.getByText(/EXECUTING ENGINE/i)).toBeInTheDocument();
});

test('renders header and operations center branding', async () => {
    await act(async () => {
        render(<App />);
    });
    expect(screen.getByText(/EMERGENCY FLEET COMMAND/i)).toBeInTheDocument();
    expect(screen.getByText(/Causal Fleet Assignment/i)).toBeInTheDocument();
});
