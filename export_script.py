import csv
import json
import urllib.request

BASE_URL = "http://127.0.0.1:8000/api/simulations"

def request_json(url, method="GET", data=None):
    req = urllib.request.Request(url, method=method)
    if data:
        req.add_header('Content-Type', 'application/json')
        data = json.dumps(data).encode('utf-8')
    with urllib.request.urlopen(req, data=data) as response:
        return json.loads(response.read().decode())

def request_raw(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        return response.read()

def main():
    print("Running simulation...")
    # 1. Run simulation
    req_body = {
        "seed": 20260911,
        "dispatcher_type": "coverage",
        "experimental_mode": False
    }
    res = request_json(BASE_URL, method="POST", data=req_body)
    run_id = res["run_id"]
    print(f"Run ID: {run_id}")

    # 2. Export JSON
    print("Exporting JSON...")
    res_json = request_json(f"{BASE_URL}/{run_id}/export/json")
    with open("results.json", "w") as f:
        json.dump(res_json, f, indent=2)

    # 3. Export CSVs
    print("Exporting CSV...")
    res_csv = request_raw(f"{BASE_URL}/{run_id}/export/csv")
    with open("results.csv", "wb") as f:
        f.write(res_csv)

    print("Fetching assignments directly...")
    assignments = request_json(f"{BASE_URL}/{run_id}/assignments")
    if assignments:
        with open("assignments.csv", "w", newline='') as f:
            writer = csv.DictWriter(f, fieldnames=assignments[0].keys())
            writer.writeheader()
            writer.writerows(assignments)

    print("Fetching coverage directly...")
    coverage = request_json(f"{BASE_URL}/{run_id}/coverage")
    if coverage:
        with open("coverage.csv", "w", newline='') as f:
            writer = csv.DictWriter(f, fieldnames=coverage[0].keys())
            writer.writeheader()
            writer.writerows(coverage)
        
    print("Done!")

if __name__ == "__main__":
    main()
