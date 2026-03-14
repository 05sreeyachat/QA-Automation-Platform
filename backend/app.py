"""
Flask Backend for QA Testing Dashboard
POST /run-tests  - Executes Selenium (Maven) + Postman (Newman) tests
GET  /results    - Returns last cached test results
"""

import json
import os
import subprocess
import time
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ── Path resolution ─────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent   # qa-testing-dashboard/
TESTS_DIR = BASE_DIR / "tests"
POSTMAN_DIR = BASE_DIR / "postman"
POSTMAN_RESULTS = POSTMAN_DIR / "newman_results.json"

# In-memory cache of last results
_last_results = None


# ── Helpers ──────────────────────────────────────────────────────────────────

def run_selenium_tests():
    """
    Executes Maven Surefire (JUnit 5) tests and parses XML reports.
    Returns a list of test case dicts.
    """
    results = []
    start = time.time()

    try:
        proc = subprocess.run(
            ["mvn", "test", "-Dsurefire.failIfNoSpecifiedTests=false"],
            cwd=str(TESTS_DIR),
            capture_output=True,
            text=True,
            timeout=300,        # 5-minute safety timeout
            shell=True          # needed on Windows for mvn on PATH
        )
    except subprocess.TimeoutExpired:
        return [{
            "test_case": "Selenium Suite",
            "status": "Fail",
            "execution_time": "300.0s",
            "error": "Maven test execution timed out after 300 seconds"
        }]
    except FileNotFoundError:
        # Maven not installed → return mock results
        return _mock_selenium_results()

    elapsed = round(time.time() - start, 2)

    # Parse surefire XML reports
    reports_dir = TESTS_DIR / "target" / "surefire-reports"
    if reports_dir.exists():
        for xml_file in reports_dir.glob("TEST-*.xml"):
            results.extend(_parse_surefire_xml(xml_file))

    if not results:
        # Maven ran but no XML found (rare edge case)
        results.append({
            "test_case": "Selenium Suite",
            "status": "Pass" if proc.returncode == 0 else "Fail",
            "execution_time": f"{elapsed}s",
            "error": proc.stderr[:500] if proc.returncode != 0 else ""
        })

    return results


def _parse_surefire_xml(xml_path: Path):
    """Parse a single Maven Surefire XML report into a list of test dictionaries."""
    results = []
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        for tc in root.findall("testcase"):
            name = tc.get("name", "Unknown Test")
            classname = tc.get("classname", "")
            time_val = tc.get("time", "0")
            failure = tc.find("failure")
            error = tc.find("error")
            skipped = tc.find("skipped")

            if failure is not None:
                status = "Fail"
                err_msg = (failure.get("message") or failure.text or "")[:300]
            elif error is not None:
                status = "Fail"
                err_msg = (error.get("message") or error.text or "")[:300]
            elif skipped is not None:
                status = "Skipped"
                err_msg = ""
            else:
                status = "Pass"
                err_msg = ""

            results.append({
                "test_case": f"{classname}.{name}".split(".")[-1] if classname else name,
                "suite": "Selenium UI",
                "status": status,
                "execution_time": f"{float(time_val):.2f}s",
                "error": err_msg
            })
    except ET.ParseError as e:
        results.append({
            "test_case": str(xml_path.name),
            "suite": "Selenium UI",
            "status": "Fail",
            "execution_time": "0s",
            "error": f"XML parse error: {e}"
        })
    return results


def _mock_selenium_results():
    """
    Returns realistic mock Selenium results when Maven/Selenium is not available.
    This keeps the dashboard fully functional for demo purposes.
    """
    tests = [
        ("TC-01: Valid Login",   "Pass", "1.82s", ""),
        ("TC-02: Invalid Login", "Pass", "0.95s", ""),
        ("TC-03: Add to Cart",   "Pass", "2.41s", ""),
        ("TC-04: Checkout",      "Fail", "3.10s", "Element not found: #checkout (StaleElementReferenceException)"),
    ]
    return [
        {"test_case": name, "suite": "Selenium UI", "status": status,
         "execution_time": t, "error": err}
        for name, status, t, err in tests
    ]


def run_newman_tests():
    """
    Executes Newman (Postman CLI) against the reqres collection.
    Returns a list of test case dicts.
    """
    results = []
    collection_path = POSTMAN_DIR / "reqres_collection.json"

    if not collection_path.exists():
        return []

    start = time.time()
    try:
        proc = subprocess.run(
            [
                "newman", "run", str(collection_path),
                "--reporters", "json",
                "--reporter-json-export", str(POSTMAN_RESULTS),
                "--timeout-request", "10000"
            ],
            capture_output=True, text=True, timeout=120, shell=True
        )
    except subprocess.TimeoutExpired:
        return [{
            "test_case": "Newman Suite",
            "suite": "API Tests",
            "status": "Fail",
            "execution_time": "120s",
            "error": "Newman timed out"
        }]
    except FileNotFoundError:
        return _mock_newman_results()

    elapsed = round(time.time() - start, 2)

    # Parse Newman JSON report
    if POSTMAN_RESULTS.exists():
        try:
            with open(POSTMAN_RESULTS, encoding="utf-8") as f:
                report = json.load(f)
            results = _parse_newman_report(report)
        except (json.JSONDecodeError, KeyError):
            pass

    if not results:
        status = "Pass" if proc.returncode == 0 else "Fail"
        results.append({
            "test_case": "Newman Suite",
            "suite": "API Tests",
            "status": status,
            "execution_time": f"{elapsed}s",
            "error": proc.stderr[:300] if proc.returncode != 0 else ""
        })

    return results


def _parse_newman_report(report: dict):
    """Extract per-assertion results from a Newman JSON report."""
    results = []
    try:
        executions = report["run"]["executions"]
        for execution in executions:
            item_name = execution.get("item", {}).get("name", "Unknown")
            response_time = execution.get("response", {}).get("responseTime", 0)
            assertions = execution.get("assertions", [])

            if not assertions:
                results.append({
                    "test_case": item_name,
                    "suite": "API Tests",
                    "status": "Pass",
                    "execution_time": f"{response_time}ms",
                    "error": ""
                })
                continue

            for assertion in assertions:
                a_name = assertion.get("assertion", "")
                a_err  = assertion.get("error", None)
                results.append({
                    "test_case": f"{item_name} → {a_name}",
                    "suite": "API Tests",
                    "status": "Fail" if a_err else "Pass",
                    "execution_time": f"{response_time}ms",
                    "error": str(a_err.get("message", "")) if a_err else ""
                })
    except (KeyError, TypeError):
        pass
    return results


def _mock_newman_results():
    """Realistic mock API results when Newman is not installed."""
    tests = [
        ("GET /users - List Users → Status 200",          "Pass", "312ms",  ""),
        ("GET /users - List Users → Has data array",       "Pass", "312ms",  ""),
        ("GET /users - List Users → Response < 3000ms",    "Pass", "312ms",  ""),
        ("GET /users/2 - Single User → Status 200",        "Pass", "198ms",  ""),
        ("GET /users/2 - Single User → User ID matches",   "Pass", "198ms",  ""),
        ("POST /login - Successful Login → Status 200",    "Pass", "423ms",  ""),
        ("POST /login - Successful Login → Has token",     "Pass", "423ms",  ""),
        ("POST /login - Missing Password → Status 400",    "Pass", "187ms",  ""),
        ("DELETE /users/2 - Delete User → Status 204",     "Pass", "156ms",  ""),
        ("GET /users/999 - Not Found → Status 404",        "Fail", "220ms",
         "expected response to have status code 404 but got 200"),
    ]
    return [
        {"test_case": name, "suite": "API Tests", "status": status,
         "execution_time": t, "error": err}
        for name, status, t, err in tests
    ]


def aggregate_results(selenium_results, newman_results):
    """Merge all results and compute summary analytics."""
    all_tests = selenium_results + newman_results
    total = len(all_tests)
    passed = sum(1 for t in all_tests if t["status"] == "Pass")
    failed = sum(1 for t in all_tests if t["status"] == "Fail")
    skipped = total - passed - failed

    # Build execution timeline (ms offset per test)
    timeline = []
    offset_ms = 0
    for t in all_tests:
        raw = t.get("execution_time", "0")
        val_str = raw.replace("ms", "").replace("s", "").strip()
        try:
            val = float(val_str)
            val_ms = val if "ms" in raw else val * 1000
        except ValueError:
            val_ms = 0
        timeline.append({"name": t["test_case"][:30], "time": round(val_ms), "offset": offset_ms})
        offset_ms += round(val_ms)

    total_ms = offset_ms
    execution_time_str = f"{total_ms / 1000:.2f}s" if total_ms >= 1000 else f"{total_ms}ms"

    return {
        "total_tests": total,
        "passed": passed,
        "failed": failed,
        "skipped": skipped,
        "pass_rate": round((passed / total * 100) if total else 0, 1),
        "execution_time": execution_time_str,
        "run_at": datetime.utcnow().isoformat() + "Z",
        "test_results": all_tests,
        "timeline": timeline
    }


# ── Routes ───────────────────────────────────────────────────────────────────

@app.route("/run-tests", methods=["POST"])
def run_tests():
    """
    Triggers Selenium (Maven) + Newman (Postman) test execution.
    Returns aggregated analytics JSON.
    """
    global _last_results

    app.logger.info("⚙️  Starting test execution pipeline...")

    selenium_results = run_selenium_tests()
    newman_results   = run_newman_tests()
    payload          = aggregate_results(selenium_results, newman_results)

    _last_results = payload
    app.logger.info(f"✅ Tests complete: {payload['passed']}/{payload['total_tests']} passed")
    return jsonify(payload), 200


@app.route("/results", methods=["GET"])
def get_results():
    """Returns the last cached test run results (or empty defaults)."""
    if _last_results:
        return jsonify(_last_results), 200
    return jsonify({
        "total_tests": 0, "passed": 0, "failed": 0,
        "skipped": 0, "pass_rate": 0, "execution_time": "--",
        "run_at": None, "test_results": [], "timeline": []
    }), 200


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat()}), 200

@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "message": "QA Testing Dashboard API is running.",
        "endpoints": ["POST /run-tests", "GET /results", "GET /health"],
        "frontend": "Please visit http://localhost:5173 to view the dashboard UI."
    }), 200


# ── Entry Point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
