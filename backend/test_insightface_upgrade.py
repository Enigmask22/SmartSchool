"""
Test Script cho InsightFace Upgrade
Verify rằng hệ thống đã chuyển đổi thành công sang InsightFace
"""

import asyncio
import json
import requests
import time
from pathlib import Path

# Colors for console output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_success(msg):
    print(f"{Colors.GREEN}✅ {msg}{Colors.END}")

def print_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.END}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠️ {msg}{Colors.END}")

def print_info(msg):
    print(f"{Colors.BLUE}ℹ️ {msg}{Colors.END}")

def print_header(msg):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}")
    print(f"🔍 {msg}")
    print(f"{'='*60}{Colors.END}")

class InsightFaceUpgradeTest:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.test_results = {
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "warnings": 0,
            "tests": []
        }

    def add_test_result(self, test_name: str, passed: bool, message: str, warning: bool = False):
        self.test_results["total_tests"] += 1
        if passed:
            self.test_results["passed_tests"] += 1
            print_success(f"{test_name}: {message}")
        else:
            if warning:
                self.test_results["warnings"] += 1
                print_warning(f"{test_name}: {message}")
            else:
                self.test_results["failed_tests"] += 1
                print_error(f"{test_name}: {message}")
        
        self.test_results["tests"].append({
            "name": test_name,
            "passed": passed,
            "message": message,
            "warning": warning
        })

    def test_server_connection(self):
        """Test 1: Server có đang chạy không"""
        try:
            response = requests.get(f"{self.base_url}/", timeout=5)
            if response.status_code == 200:
                data = response.json()
                version = data.get("version", "unknown")
                ai_engine = data.get("ai_engine", "unknown")
                
                if "InsightFace" in ai_engine:
                    self.add_test_result(
                        "Server Connection", 
                        True, 
                        f"Server running v{version} with {ai_engine}"
                    )
                else:
                    self.add_test_result(
                        "Server Connection", 
                        False, 
                        f"Server running but not using InsightFace: {ai_engine}"
                    )
            else:
                self.add_test_result(
                    "Server Connection", 
                    False, 
                    f"Server responded with status {response.status_code}"
                )
        except requests.exceptions.RequestException as e:
            self.add_test_result(
                "Server Connection", 
                False, 
                f"Cannot connect to server: {str(e)}"
            )

    def test_health_check(self):
        """Test 2: Health check với InsightFace"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                ai_engine = data.get("ai_engine", "")
                ai_status = data.get("ai_status", "")
                accuracy = data.get("accuracy", "")
                
                if "InsightFace" in ai_engine and "Ready" in ai_status:
                    self.add_test_result(
                        "Health Check", 
                        True, 
                        f"InsightFace ready with {accuracy} accuracy"
                    )
                elif "InsightFace" in ai_engine:
                    self.add_test_result(
                        "Health Check", 
                        False, 
                        f"InsightFace detected but not ready: {ai_status}",
                        warning=True
                    )
                else:
                    self.add_test_result(
                        "Health Check", 
                        False, 
                        f"Not using InsightFace: {ai_engine}"
                    )
            else:
                self.add_test_result(
                    "Health Check", 
                    False, 
                    f"Health check failed with status {response.status_code}"
                )
        except requests.exceptions.RequestException as e:
            self.add_test_result(
                "Health Check", 
                False, 
                f"Health check error: {str(e)}"
            )

    def test_ai_status(self):
        """Test 3: AI service status"""
        try:
            response = requests.get(f"{self.base_url}/api/ai/status", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    details = data.get("data", {})
                    service_name = details.get("service_name", "")
                    accuracy = details.get("accuracy", "")
                    
                    if "InsightFace" in service_name:
                        self.add_test_result(
                            "AI Service Status", 
                            True, 
                            f"Active service: {service_name} ({accuracy})"
                        )
                    else:
                        self.add_test_result(
                            "AI Service Status", 
                            False, 
                            f"Wrong service active: {service_name}",
                            warning=True
                        )
                else:
                    self.add_test_result(
                        "AI Service Status", 
                        False, 
                        f"AI status request failed: {data.get('message', 'Unknown error')}"
                    )
            else:
                self.add_test_result(
                    "AI Service Status", 
                    False, 
                    f"AI status endpoint returned {response.status_code}"
                )
        except requests.exceptions.RequestException as e:
            self.add_test_result(
                "AI Service Status", 
                False, 
                f"AI status error: {str(e)}"
            )

    def test_debug_info(self):
        """Test 4: Debug info cho InsightFace"""
        try:
            response = requests.get(f"{self.base_url}/api/ai/debug-info", timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    info = data.get("data", {})
                    service_name = info.get("service_name", "")
                    accuracy = info.get("accuracy", "")
                    database_count = info.get("face_database_count", 0)
                    
                    if "InsightFace" in service_name:
                        self.add_test_result(
                            "Debug Info", 
                            True, 
                            f"{service_name} with {database_count} registered faces"
                        )
                    else:
                        self.add_test_result(
                            "Debug Info", 
                            False, 
                            f"Debug shows wrong service: {service_name}",
                            warning=True
                        )
                else:
                    self.add_test_result(
                        "Debug Info", 
                        False, 
                        f"Debug info failed: {data.get('message', 'Unknown error')}"
                    )
            else:
                self.add_test_result(
                    "Debug Info", 
                    False, 
                    f"Debug endpoint returned {response.status_code}"
                )
        except requests.exceptions.RequestException as e:
            self.add_test_result(
                "Debug Info", 
                False, 
                f"Debug info error: {str(e)}"
            )

    def test_api_documentation(self):
        """Test 5: API documentation accessible"""
        try:
            response = requests.get(f"{self.base_url}/docs", timeout=5)
            if response.status_code == 200:
                self.add_test_result(
                    "API Documentation", 
                    True, 
                    "Swagger UI accessible at /docs"
                )
            else:
                self.add_test_result(
                    "API Documentation", 
                    False, 
                    f"Docs endpoint returned {response.status_code}"
                )
        except requests.exceptions.RequestException as e:
            self.add_test_result(
                "API Documentation", 
                False, 
                f"Docs endpoint error: {str(e)}"
            )

    def test_imports(self):
        """Test 6: Import libraries locally"""
        try:
            # Test InsightFace import
            import insightface
            self.add_test_result(
                "InsightFace Import", 
                True, 
                f"InsightFace v{insightface.__version__} imported successfully"
            )
        except ImportError:
            self.add_test_result(
                "InsightFace Import", 
                False, 
                "InsightFace library not installed"
            )

        try:
            # Test ONNX Runtime import
            import onnxruntime
            self.add_test_result(
                "ONNX Runtime Import", 
                True, 
                f"ONNX Runtime v{onnxruntime.__version__} imported successfully"
            )
        except ImportError:
            self.add_test_result(
                "ONNX Runtime Import", 
                False, 
                "ONNX Runtime library not installed"
            )

        try:
            # Test service import
            from ai.face_recognition_insightface import insightface_service
            if insightface_service and insightface_service.app:
                self.add_test_result(
                    "Service Import", 
                    True, 
                    "InsightFace service imported and initialized"
                )
            else:
                self.add_test_result(
                    "Service Import", 
                    False, 
                    "InsightFace service imported but not initialized",
                    warning=True
                )
        except ImportError:
            self.add_test_result(
                "Service Import", 
                False, 
                "Cannot import InsightFace service"
            )

    def run_all_tests(self):
        """Chạy tất cả tests"""
        print_header("INSIGHTFACE UPGRADE VERIFICATION TESTS")
        
        print_info("Testing server connection and InsightFace status...")
        self.test_server_connection()
        self.test_health_check()
        self.test_ai_status()
        self.test_debug_info()
        self.test_api_documentation()
        
        print_info("Testing local libraries...")
        self.test_imports()
        
        self.print_summary()
        self.save_results()

    def print_summary(self):
        """In tóm tắt kết quả"""
        print_header("TEST RESULTS SUMMARY")
        
        total = self.test_results["total_tests"]
        passed = self.test_results["passed_tests"]
        failed = self.test_results["failed_tests"]
        warnings = self.test_results["warnings"]
        
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"📊 Total Tests: {total}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"⚠️ Warnings: {warnings}")
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if failed == 0 and warnings == 0:
            print_success("🎉 ALL TESTS PASSED! InsightFace upgrade successful!")
        elif failed == 0:
            print_warning(f"✅ All tests passed with {warnings} warnings")
        else:
            print_error(f"❌ {failed} tests failed. Check issues above.")
        
        print_header("RECOMMENDATIONS")
        if failed > 0:
            print("🔧 Fix failed tests before proceeding:")
            for test in self.test_results["tests"]:
                if not test["passed"] and not test["warning"]:
                    print(f"   • {test['name']}: {test['message']}")
        
        if warnings > 0:
            print("⚠️ Address warnings for optimal performance:")
            for test in self.test_results["tests"]:
                if test["warning"]:
                    print(f"   • {test['name']}: {test['message']}")
        
        if failed == 0:
            print("🚀 Next steps:")
            print("   1. Re-register student faces với InsightFace")
            print("   2. Test continuous recognition")
            print("   3. Monitor accuracy improvements")
            print("   4. Update frontend to show new accuracy")

    def save_results(self):
        """Save test results to file"""
        results_file = "insightface_upgrade_test_results.json"
        
        self.test_results["timestamp"] = time.time()
        self.test_results["test_summary"] = {
            "total_tests": self.test_results["total_tests"],
            "passed_tests": self.test_results["passed_tests"],
            "failed_tests": self.test_results["failed_tests"],
            "warnings": self.test_results["warnings"],
            "success_rate": (self.test_results["passed_tests"] / self.test_results["total_tests"] * 100) if self.test_results["total_tests"] > 0 else 0
        }
        
        with open(results_file, 'w') as f:
            json.dump(self.test_results, f, indent=2, default=str)
        
        print_info(f"Test results saved to: {results_file}")

def main():
    print_header("SMART SCHOOL - INSIGHTFACE UPGRADE VERIFICATION")
    print_info("Verifying successful upgrade from MediaPipe to InsightFace...")
    print_info("Expected improvements: 75-80% → 95-99% accuracy")
    
    # Initialize tester
    tester = InsightFaceUpgradeTest()
    
    # Run all tests
    tester.run_all_tests()

if __name__ == "__main__":
    main() 