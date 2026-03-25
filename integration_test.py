"""
Integration Test - اختبار التكامل الشامل
يختبر جميع المكونات معاً
"""

import asyncio
import logging
from typing import Dict, Any, List
from datetime import datetime
import json

# استيراد المكونات
from advanced_decision_engine import AdvancedDecisionEngine, RankingStrategy
from logging_system import initialize_logger, LogLevel, LogCategory
from async_executor import AsyncExecutor, ExecutionMode, ExecutionTask
from error_handling import get_error_handler, CustomException, ErrorType
from enhanced_model_layer import EnhancedModelLayer, ModelPriority
from enhanced_memory import EnhancedUnifiedMemory
from contract_validator import get_contract_enforcer

logger = logging.getLogger(__name__)


class IntegrationTest:
    """
    اختبار التكامل الشامل
    """
    
    def __init__(self):
        self.logger_instance = initialize_logger(log_level=LogLevel.INFO)
        self.error_handler = get_error_handler()
        self.decision_engine = AdvancedDecisionEngine()
        self.model_layer = EnhancedModelLayer()
        self.memory = EnhancedUnifiedMemory()
        self.contract_enforcer = get_contract_enforcer(strict_mode=False)
        
        self.test_results: List[Dict[str, Any]] = []
    
    def run_all_tests(self) -> Dict[str, Any]:
        """تشغيل جميع الاختبارات"""
        logger.info("Starting comprehensive integration tests...")
        
        tests = [
            ("Decision Engine", self.test_decision_engine),
            ("Logging System", self.test_logging_system),
            ("Error Handling", self.test_error_handling),
            ("Model Layer", self.test_model_layer),
            ("Memory System", self.test_memory_system),
            ("Contract Validation", self.test_contract_validation),
            ("Async Execution", self.test_async_execution),
        ]
        
        results = {}
        
        for test_name, test_func in tests:
            try:
                logger.info(f"Running test: {test_name}")
                result = test_func()
                results[test_name] = {
                    "status": "passed",
                    "result": result
                }
                logger.info(f"✓ Test passed: {test_name}")
            
            except Exception as e:
                logger.error(f"✗ Test failed: {test_name}: {e}")
                results[test_name] = {
                    "status": "failed",
                    "error": str(e)
                }
        
        return results
    
    def test_decision_engine(self) -> Dict[str, Any]:
        """اختبار محرك القرارات"""
        logger.info("Testing Advanced Decision Engine...")
        
        # إنشاء خيارات
        options = [
            {"name": "Option A", "score": 0.85},
            {"name": "Option B", "score": 0.75},
            {"name": "Option C", "score": 0.90}
        ]
        
        # محاكاة مخرجات الوكلاء
        from schemas import AgentOutputSchema, AgentRole
        
        agent_outputs = [
            AgentOutputSchema(
                agent=AgentRole.STRATEGY,
                task_id="test-1",
                output={"recommendation": "Option C"},
                confidence=0.92
            ),
            AgentOutputSchema(
                agent=AgentRole.ANALYTICS,
                task_id="test-1",
                output={"recommendation": "Option C"},
                confidence=0.88
            )
        ]
        
        # اتخاذ القرار
        decision = self.decision_engine.make_decision_with_jury(
            task_description="Test decision making",
            agent_outputs=agent_outputs,
            available_options=options,
            ranking_strategy=RankingStrategy.HYBRID
        )
        
        stats = self.decision_engine.get_decision_statistics()
        
        return {
            "decision_id": decision.decision_id,
            "confidence": decision.confidence_score,
            "statistics": stats
        }
    
    def test_logging_system(self) -> Dict[str, Any]:
        """اختبار نظام التسجيل"""
        logger.info("Testing Logging System...")
        
        # تسجيل تنفيذ
        execution_id = self.logger_instance.execution_tracker.start_execution(
            agent_name="test_agent",
            task_id="test-task-1",
            task_description="Test execution"
        )
        
        # محاكاة التنفيذ
        import time
        time.sleep(0.1)
        
        self.logger_instance.execution_tracker.end_execution(
            execution_id=execution_id,
            status="completed",
            output={"result": "success"}
        )
        
        # تسجيل قرار
        self.logger_instance.log_decision(
            decision_id="test-decision-1",
            decision_type="channel_selection",
            agents_involved=["strategy", "analytics"],
            confidence=0.92,
            reasoning="Selected based on jury consensus"
        )
        
        # الحصول على التقرير
        exec_report = self.logger_instance.get_execution_report()
        decision_report = self.logger_instance.get_decision_report()
        
        return {
            "executions": len(exec_report["execution_history"]),
            "decisions": len(decision_report["decision_trace"])
        }
    
    def test_error_handling(self) -> Dict[str, Any]:
        """اختبار معالجة الأخطاء"""
        logger.info("Testing Error Handling...")
        
        # اختبار Circuit Breaker
        cb = self.error_handler.get_or_create_circuit_breaker(
            name="test_breaker",
            failure_threshold=3
        )
        
        # محاكاة الفشل
        for i in range(3):
            cb.failure_count += 1
        
        cb.state = "open"
        
        # محاولة استدعاء مع Circuit Breaker مفتوح
        try:
            if cb.state == "open":
                raise CustomException(
                    "Circuit breaker is open",
                    error_type=ErrorType.EXECUTION_ERROR
                )
        except CustomException as e:
            self.error_handler.log_error(e)
        
        stats = self.error_handler.get_error_statistics()
        
        return {
            "circuit_breakers": len(stats["circuit_breakers"]),
            "errors_logged": stats["total_errors"]
        }
    
    def test_model_layer(self) -> Dict[str, Any]:
        """اختبار طبقة النماذج"""
        logger.info("Testing Enhanced Model Layer...")
        
        # اختبار الإحصائيات
        stats = self.model_layer.get_statistics()
        
        return {
            "total_calls": stats.get("total_calls", 0),
            "circuit_breakers": len(stats.get("circuit_breakers", {}))
        }
    
    def test_memory_system(self) -> Dict[str, Any]:
        """اختبار نظام الذاكرة"""
        logger.info("Testing Enhanced Memory System...")
        
        # إنشاء جلسة
        session = self.memory.session_memory.create_session(
            session_id="test-session-1",
            campaign_id="test-campaign-1",
            context_data={"test": "data"}
        )
        
        # تحديث السياق
        self.memory.session_memory.update_session_context(
            session_id="test-session-1",
            updates={"updated": True}
        )
        
        # حفظ بيانات الحملة
        self.memory.persistent_storage.save_campaign_data(
            campaign_id="test-campaign-1",
            data={"goal": "Test campaign"}
        )
        
        # حفظ في قاعدة البيانات
        self.memory.database.save_campaign(
            campaign_id="test-campaign-1",
            product="Test Product",
            goal="Test Goal",
            market="Test Market",
            budget=10000,
            status="active"
        )
        
        stats = self.memory.get_full_statistics()
        
        return {
            "sessions": stats.get("sessions", 0),
            "database_campaigns": stats.get("database", {}).get("total_campaigns", 0)
        }
    
    def test_contract_validation(self) -> Dict[str, Any]:
        """اختبار التحقق من العقود"""
        logger.info("Testing Contract Validation...")
        
        # إنشاء مخرجات صحيحة
        valid_output = {
            "agent": "strategy",
            "task_id": "test-task-1",
            "output": {"positioning": "Premium"},
            "confidence": 0.92,
            "status": "success"
        }
        
        # التحقق
        validated = self.contract_enforcer.validator.validate_agent_output(
            valid_output,
            strict=False
        )
        
        # اختبار مخرجات خاطئة
        invalid_output = {
            "agent": "strategy",
            # حقل task_id مفقود
            "output": {"positioning": "Premium"}
        }
        
        try:
            self.contract_enforcer.validator.validate_agent_output(
                invalid_output,
                strict=False
            )
        except Exception as e:
            logger.warning(f"Expected validation error: {e}")
        
        stats = self.contract_enforcer.validator.get_statistics()
        
        return {
            "total_validations": stats["total_validations"],
            "success_rate": stats["success_rate"]
        }
    
    def test_async_execution(self) -> Dict[str, Any]:
        """اختبار التنفيذ المتزامن"""
        logger.info("Testing Async Execution...")
        
        # تشغيل الاختبار المتزامن
        result = asyncio.run(self._run_async_test())
        
        return result
    
    async def _run_async_test(self) -> Dict[str, Any]:
        """تشغيل الاختبار المتزامن"""
        
        # إنشاء مهام وهمية
        async def dummy_task(task_id: str):
            await asyncio.sleep(0.1)
            return f"Result for {task_id}"
        
        tasks = [
            ExecutionTask(
                task_id=f"test-task-{i}",
                agent_name=f"agent-{i}",
                agent_function=dummy_task(f"test-task-{i}"),
                priority=i % 3
            )
            for i in range(5)
        ]
        
        # تنفيذ مع أنماط مختلفة
        executor = AsyncExecutor(mode=ExecutionMode.CONCURRENT, max_workers=3)
        results = await executor.execute(tasks)
        
        stats = executor.get_execution_statistics()
        
        return {
            "total_executions": stats["total_executions"],
            "completed": stats["completed"],
            "success_rate": stats["success_rate"]
        }
    
    def generate_report(self, results: Dict[str, Any]) -> str:
        """إنشاء تقرير الاختبار"""
        report = {
            "timestamp": datetime.utcnow().isoformat(),
            "test_results": results,
            "summary": {
                "total_tests": len(results),
                "passed": len([r for r in results.values() if r["status"] == "passed"]),
                "failed": len([r for r in results.values() if r["status"] == "failed"])
            }
        }
        
        return json.dumps(report, indent=2, default=str)


def run_integration_tests():
    """تشغيل اختبارات التكامل"""
    tester = IntegrationTest()
    results = tester.run_all_tests()
    report = tester.generate_report(results)
    
    # حفظ التقرير
    with open("integration_test_report.json", "w") as f:
        f.write(report)
    
    logger.info("Integration tests completed")
    logger.info(f"Report saved to: integration_test_report.json")
    
    return results


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    results = run_integration_tests()
    
    print("\n" + "="*60)
    print("INTEGRATION TEST RESULTS")
    print("="*60)
    
    for test_name, result in results.items():
        status = "✓ PASS" if result["status"] == "passed" else "✗ FAIL"
        print(f"{status}: {test_name}")
        if result["status"] == "failed":
            print(f"  Error: {result['error']}")
    
    print("="*60)
