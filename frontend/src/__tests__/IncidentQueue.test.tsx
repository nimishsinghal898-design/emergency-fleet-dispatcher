import { render, screen } from '@testing-library/react';
import { IncidentQueue } from '../components/IncidentQueue';
import { Incident } from '../types/models';
import { expect, test } from 'vitest';

test('IncidentQueue shows NO INCIDENTS WAITING when empty', () => {
    render(<IncidentQueue incidents={[]} />);
    expect(screen.getByText(/NO INCIDENTS WAITING/i)).toBeInTheDocument();
});

test('IncidentQueue sorts incidents correctly (P3 > P2 > P1, then Arrival Asc)', () => {
    const mockIncidents: Incident[] = [
        { id: '1', priority: 1, arrival_minute: 0, status: 'WAITING', x: 10, y: 10, dispatch_time: null, assigned_vehicle_id: null, response_time: null, completion_time: null },
        { id: '2', priority: 3, arrival_minute: 5, status: 'WAITING', x: 20, y: 20, dispatch_time: null, assigned_vehicle_id: null, response_time: null, completion_time: null },
        { id: '3', priority: 3, arrival_minute: 2, status: 'WAITING', x: 30, y: 30, dispatch_time: null, assigned_vehicle_id: null, response_time: null, completion_time: null }
    ];

    render(<IncidentQueue incidents={mockIncidents} />);
    
    const rows = screen.getAllByRole('row');
    // Row 0 is header
    // Row 1 should be id 3 (P3, arr 2)
    expect(rows[1]).toHaveTextContent('3');
    // Row 2 should be id 2 (P3, arr 5)
    expect(rows[2]).toHaveTextContent('2');
    // Row 3 should be id 1 (P1, arr 0)
    expect(rows[3]).toHaveTextContent('1');
});
