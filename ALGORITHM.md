# Algorithmic Specification: Coverage-Aware Online Dispatcher

## 1. Mathematical Formulation

The core dispatch optimization problem is an **online, multi-criteria assignment problem** solved dynamically at every minute $t \in [0, 120]$. At time $t$, the system observes:
- A set of waiting incidents $\mathcal{I}_t = \{i_1, i_2, \dots, i_m\}$.
- A set of currently idle emergency vehicles $\mathcal{V}_t = \{v_1, v_2, \dots, v_k\}$.

The objective is to compute an assignment mapping $\mathcal{A}_t \subset \mathcal{I}_t \times \mathcal{V}_t$ that minimizes global priority-weighted response latency while preserving geographic readiness across the four operational quadrants.

---

## 2. Priority Weighting Scheme

Emergency calls are categorized into three urgency classes, assigned mathematical weights according to the challenge evaluation criteria:

$$\begin{array}{lcl}
\textbf{Priority 1 (Routine)}  & \implies & W_1 = 1 \\
\textbf{Priority 2 (Urgent)}   & \implies & W_2 = 3 \\
\textbf{Priority 3 (Critical)} & \implies & W_3 = 7
\end{array}$$

### Queue Ingestion Order
Waiting incidents are sorted prior to evaluation:
1. **Urgency**: Priority descending ($P_3 \succ P_2 \succ P_1$).
2. **Fairness**: Arrival minute ascending (FIFO within each priority tier).
3. **Determinism**: Incident ID ascending (`I001` $\prec$ `I002`).

---

## 3. Cost Function Components

For a given incident $i$ and candidate idle vehicle $v$, the **Effective Assignment Cost** $C(i, v)$ is calculated as:

$$C(i, v) = \text{ResponseCost}(i, v) + \frac{\text{CoveragePenalty}(v) + \text{ScarcityPenalty}(v)}{W_p}$$

### 3.1 Response-Time Component
Vehicles travel at a constant speed of $1.0\text{ unit/minute}$. Travel time is directly equal to Euclidean distance:

$$\text{ResponseCost}(i, v) = \sqrt{(v_x - i_x)^2 + (v_y - i_y)^2} \times \alpha$$

Where the response weight configuration is $\alpha = 1.0$.

### 3.2 Coverage Preservation Component
Let $Q(v) \in \{\text{LL, UL, LR, UR}\}$ denote the quadrant containing vehicle $v$. Let $\text{Idle}_{\text{before}}(Q(v))$ be the number of idle vehicles currently available in that quadrant.

If dispatching vehicle $v$ would leave quadrant $Q(v)$ completely vacant ($\text{Idle}_{\text{after}} = 0$), a severe binary penalty is applied:

$$\text{CoveragePenalty}(v) = \begin{cases} 
100.0 & \text{if } \text{Idle}_{\text{before}}(Q(v)) - 1 = 0 \\
0.0 & \text{otherwise}
\end{cases}$$

This prevents the creation of **Coverage Outages** where an entire quadrant is left with 0 emergency coverage.

### 3.3 Vehicle Scarcity Component
To avoid draining a quadrant to its last unit prematurely, a continuous scarcity penalty increases as the available vehicle pool in a sector diminishes:

$$\text{ScarcityPenalty}(v) = \frac{20.0}{\max\left(1, \text{Idle}_{\text{before}}(Q(v))\right)}$$

$$\begin{array}{|c|c|}
\hline
\textbf{Idle Vehicles Before Dispatch} & \textbf{Scarcity Penalty} \\
\hline
5 & 4.0 \\
4 & 5.0 \\
3 & 6.67 \\
2 & 10.0 \\
1 & 20.0 \\
\hline
\end{array}$$

---

## 4. Interaction of Urgency and Coverage

The combined coverage and scarcity penalties are divided by the incident's priority weight $W_p$:

$$\text{Penalty Term} = \frac{\text{CoveragePenalty}(v) + \text{ScarcityPenalty}(v)}{W_p}$$

This mathematical structure creates an optimal operational policy:
- **For Priority 3 Critical Calls ($W_3 = 7$)**:
  The penalty is divided by 7. Even if taking vehicle $v$ empties the quadrant ($100.0 + 20.0 = 120.0$), the added cost is only $\frac{120.0}{7} \approx 17.14$. Because Priority 3 carries a $7\times$ multiplier in the challenge objective function, the dispatcher prioritizes immediate life-saving response over quadrant preservation.
- **For Priority 1 Routine Calls ($W_1 = 1$)**:
  The penalty is divided by 1. Routine calls feel the full $120.0$ penalty, forcing the dispatcher to select an alternative vehicle from an adjacent quadrant with surplus units, keeping the local quadrant ready for critical emergencies.

---

## 5. Vehicle Selection & Deterministic Tie-Breaking

The algorithm evaluates the objective score:
$$\text{Score}(i, v) = -C(i, v)$$
The optimal vehicle $v^*$ is the one that maximizes the score (minimizes the cost).

### Deterministic Tie-Breaking Hierarchy
To guarantee bit-for-bit reproducibility across platforms, ties are broken deterministically with tolerance $\epsilon = 10^{-6}$:

1. **Score Comparison**: Vehicle $v_a$ is strictly better than $v_b$ if $\text{Score}(i, v_a) > \text{Score}(i, v_b) + \epsilon$.
2. **Distance Tie-Breaker**: If $|\text{Score}(i, v_a) - \text{Score}(i, v_b)| \le \epsilon$, select the vehicle with the smaller Euclidean distance:
   $$\text{dist}(i, v_a) < \text{dist}(i, v_b) - \epsilon$$
3. **Lexicographical Identifier**: If travel distances are also identical within $\epsilon$, select the vehicle with the lexicographically smaller string ID:
   $$v_a.\text{id} < v_b.\text{id} \quad (\text{e.g., } \texttt{"V01"} \prec \texttt{"V02"})$$

---

## 6. Dynamic Intra-Minute State Propagation

When multiple incidents are dispatched within the same minute tick $t$:
```python
# Initial state of idle counts at start of tick
idle_counts = {q: count_idle_vehicles(q) for q in Quadrant}

for incident in state.waiting_incidents:
    # 1. Filter currently unassigned idle vehicles
    candidates = [v for v in idle_vehicles if v.id not in assigned_this_tick]
    
    # 2. Score candidates using dynamic idle_counts
    best_v = select_best_vehicle(incident, candidates, idle_counts)
    
    if best_v:
        # 3. Immediately decrement quadrant tally
        idle_counts[best_v.get_quadrant()] -= 1
        assigned_this_tick.add(best_v.id)
```

This ensures that if two incidents appear simultaneously in a quadrant with only 1 idle unit, the first dispatch immediately triggers the 100.0 coverage outage penalty for the second evaluation, preventing double-depletion.

---

## 7. Comparison with Greedy Nearest-Idle Baseline

| Feature | Nearest-Idle Baseline | Coverage-Aware Dispatcher (Ours) |
| :--- | :--- | :--- |
| **Objective** | $\min \text{dist}(i, v)$ | $\min \left(\text{dist} + \frac{\text{penalties}}{W_p}\right)$ |
| **Sector Awareness** | Completely unaware | Continuous quadrant tracking |
| **Outage Prevention** | None (frequently drops to 0) | Strong (100.0 penalty boundary) |
| **Priority Handling** | Treats all calls equally | Priority-weighted cost scaling |
| **Systemic Result** | Sector blackouts, delayed P3 response | Balanced coverage, fast P3 response |
