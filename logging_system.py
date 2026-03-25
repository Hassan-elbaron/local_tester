"""
Logging System - نظام التسجيل الشامل
يتضمن: Execution Logs, Agent Tracking, Decision Tracing
"""

import logging
import logging.handlers
from typing import Dict, Any, Optional, List
from datetime import datetime
from pathlib import Path
import json
from dataclasses import dataclass, asdict
from enum import Enum


class LogLevel(Enum):
    """مستويات التسجيل"""
    DEBUG = logging.DEBUG
    INFO = logging.INFO
    WARNING = logging.WARNING
    ERROR = logging.ERROR
    CRITICAL = logging.CRITICAL


class LogCategory(Enum):
    """فئات التسجيل"""
    ORCHESTRATOR = "orchestrator"
    AGENT = "agent"
    MODEL = "model"
    MEMORY = "memory"
    DECISION = "decision"
    ERROR = "error"
    PERFORMANCE = "performance"


@dataclass
class LogEntry:
    """إدخال سجل واحد"""
    timestamp: str
    category: str
    level: str
    agent_name: Optional[str]
    task_id: Optional[str]
    message: str
    metadata: Dict[str, Any]
    execution_time_ms: Optional[float] = None


class ExecutionTracker:
    """
    متتبع التنفيذ
    يتتبع تنفيذ كل agent والمهام
    """
    
    def __init__(self):
        self.execution_stack: List[Dict[str, Any]] = []
        self.execution_history: List[Dict[str, Any]] = []
    
    def start_execution(
        self,
        agent_name: str,
        task_id: str,
        task_description: str
    ) -> str:
        """
        بدء تنفيذ
        
        Args:
            agent_name: اسم الوكيل
            task_id: معرف المهمة
            task_description: وصف المهمة
            
        Returns:
            str: معرف التنفيذ
        """
        execution_id = f"{agent_name}:{task_id}:{datetime.utcnow().timestamp()}"
        
        execution = {
            "execution_id": execution_id,
            "agent_name": agent_name,
            "task_id": task_id,
            "task_description": task_description,
            "start_time": datetime.utcnow(),
            "status": "running"
        }
        
        self.execution_stack.append(execution)
        
        return execution_id
    
    def end_execution(
        self,
        execution_id: str,
        status: str = "completed",
        output: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ):
        """
        إنهاء التنفيذ
        
        Args:
            execution_id: معرف التنفيذ
            status: الحالة (completed, failed, skipped)
            output: المخرجات
            error: الخطأ إن وجد
        """
        # البحث عن التنفيذ
        execution = None
        for exec_item in self.execution_stack:
            if exec_item["execution_id"] == execution_id:
                execution = exec_item
                break
        
        if not execution:
            return
        
        # حساب الوقت
        end_time = datetime.utcnow()
        duration = (end_time - execution["start_time"]).total_seconds() * 1000
        
        # تحديث التنفيذ
        execution["end_time"] = end_time
        execution["duration_ms"] = duration
        execution["status"] = status
        execution["output"] = output
        execution["error"] = error
        
        # نقل إلى السجل
        self.execution_history.append(execution)
        self.execution_stack.remove(execution)
    
    def get_execution_trace(self, task_id: str) -> List[Dict[str, Any]]:
        """الحصول على تتبع التنفيذ لمهمة معينة"""
        return [
            exec_item for exec_item in self.execution_history
            if exec_item["task_id"] == task_id
        ]
    
    def get_agent_statistics(self, agent_name: str) -> Dict[str, Any]:
        """الحصول على إحصائيات الوكيل"""
        agent_executions = [
            exec_item for exec_item in self.execution_history
            if exec_item["agent_name"] == agent_name
        ]
        
        if not agent_executions:
            return {"agent": agent_name, "executions": 0}
        
        durations = [e["duration_ms"] for e in agent_executions if "duration_ms" in e]
        statuses = {}
        for exec_item in agent_executions:
            status = exec_item.get("status", "unknown")
            statuses[status] = statuses.get(status, 0) + 1
        
        return {
            "agent": agent_name,
            "total_executions": len(agent_executions),
            "avg_duration_ms": sum(durations) / len(durations) if durations else 0,
            "min_duration_ms": min(durations) if durations else 0,
            "max_duration_ms": max(durations) if durations else 0,
            "statuses": statuses
        }


class DecisionTracer:
    """
    متتبع القرارات
    يتتبع كيفية اتخاذ كل قرار
    """
    
    def __init__(self):
        self.decision_trace: List[Dict[str, Any]] = []
    
    def trace_decision(
        self,
        decision_id: str,
        task_id: str,
        decision_type: str,
        inputs: Dict[str, Any],
        agents_involved: List[str],
        reasoning: Dict[str, Any],
        output: Dict[str, Any],
        confidence: float
    ):
        """
        تتبع قرار
        
        Args:
            decision_id: معرف القرار
            task_id: معرف المهمة
            decision_type: نوع القرار
            inputs: المدخلات
            agents_involved: الوكلاء المشاركون
            reasoning: المنطق
            output: المخرجات
            confidence: درجة الثقة
        """
        trace = {
            "decision_id": decision_id,
            "task_id": task_id,
            "decision_type": decision_type,
            "timestamp": datetime.utcnow().isoformat(),
            "inputs": inputs,
            "agents_involved": agents_involved,
            "reasoning": reasoning,
            "output": output,
            "confidence": confidence
        }
        
        self.decision_trace.append(trace)
    
    def get_decision_path(self, task_id: str) -> List[Dict[str, Any]]:
        """الحصول على مسار القرارات لمهمة معينة"""
        return [
            trace for trace in self.decision_trace
            if trace["task_id"] == task_id
        ]
    
    def export_decision_trace(self, task_id: str) -> str:
        """تصدير مسار القرارات"""
        trace = self.get_decision_path(task_id)
        return json.dumps(trace, indent=2, default=str)


class ComprehensiveLogger:
    """
    نظام التسجيل الشامل
    يجمع جميع مكونات التسجيل
    """
    
    def __init__(
        self,
        log_dir: str = "./logs",
        log_level: LogLevel = LogLevel.INFO,
        enable_file_logging: bool = True,
        enable_console_logging: bool = True
    ):
        """
        Args:
            log_dir: مجلد السجلات
            log_level: مستوى التسجيل
            enable_file_logging: تفعيل تسجيل الملفات
            enable_console_logging: تفعيل تسجيل الـ console
        """
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        
        # إنشاء loggers
        self.loggers: Dict[str, logging.Logger] = {}
        self.execution_tracker = ExecutionTracker()
        self.decision_tracer = DecisionTracer()
        
        # إعداد التسجيل
        self._setup_logging(log_level, enable_file_logging, enable_console_logging)
    
    def _setup_logging(
        self,
        log_level: LogLevel,
        enable_file_logging: bool,
        enable_console_logging: bool
    ):
        """إعداد نظام التسجيل"""
        # إنشاء logger رئيسي
        root_logger = logging.getLogger("ai_marketing_os")
        root_logger.setLevel(log_level.value)
        
        # مسح المعالجات السابقة
        root_logger.handlers.clear()
        
        # صيغة التسجيل
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # معالج الـ console
        if enable_console_logging:
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(formatter)
            root_logger.addHandler(console_handler)
        
        # معالج الملفات
        if enable_file_logging:
            # ملف سجل عام
            file_handler = logging.handlers.RotatingFileHandler(
                self.log_dir / "ai_marketing_os.log",
                maxBytes=10 * 1024 * 1024,  # 10 MB
                backupCount=5
            )
            file_handler.setFormatter(formatter)
            root_logger.addHandler(file_handler)
        
        self.loggers["root"] = root_logger
    
    def get_logger(self, category: LogCategory) -> logging.Logger:
        """الحصول على logger لفئة معينة"""
        logger_name = f"ai_marketing_os.{category.value}"
        
        if logger_name not in self.loggers:
            logger = logging.getLogger(logger_name)
            self.loggers[logger_name] = logger
        
        return self.loggers[logger_name]
    
    def log_agent_execution(
        self,
        agent_name: str,
        task_id: str,
        task_description: str,
        status: str,
        duration_ms: float,
        confidence: Optional[float] = None,
        error: Optional[str] = None
    ):
        """تسجيل تنفيذ الوكيل"""
        logger = self.get_logger(LogCategory.AGENT)
        
        message = (
            f"Agent '{agent_name}' executed task '{task_id}': "
            f"status={status}, duration={duration_ms:.2f}ms"
        )
        
        if confidence is not None:
            message += f", confidence={confidence:.2f}"
        
        if error:
            logger.error(f"{message}, error={error}")
        else:
            logger.info(message)
    
    def log_decision(
        self,
        decision_id: str,
        decision_type: str,
        agents_involved: List[str],
        confidence: float,
        reasoning: str
    ):
        """تسجيل قرار"""
        logger = self.get_logger(LogCategory.DECISION)
        
        message = (
            f"Decision '{decision_id}' ({decision_type}): "
            f"agents={agents_involved}, confidence={confidence:.2f}, "
            f"reasoning={reasoning}"
        )
        
        logger.info(message)
    
    def log_error(
        self,
        error_type: str,
        error_message: str,
        agent_name: Optional[str] = None,
        task_id: Optional[str] = None
    ):
        """تسجيل خطأ"""
        logger = self.get_logger(LogCategory.ERROR)
        
        message = f"Error ({error_type}): {error_message}"
        if agent_name:
            message += f" [Agent: {agent_name}]"
        if task_id:
            message += f" [Task: {task_id}]"
        
        logger.error(message)
    
    def log_performance(
        self,
        metric_name: str,
        value: float,
        unit: str = "ms"
    ):
        """تسجيل مقياس الأداء"""
        logger = self.get_logger(LogCategory.PERFORMANCE)
        
        message = f"Performance: {metric_name}={value:.2f}{unit}"
        logger.info(message)
    
    def get_execution_report(self) -> Dict[str, Any]:
        """الحصول على تقرير التنفيذ"""
        return {
            "total_executions": len(self.execution_tracker.execution_history),
            "execution_history": self.execution_tracker.execution_history
        }
    
    def get_decision_report(self) -> Dict[str, Any]:
        """الحصول على تقرير القرارات"""
        return {
            "total_decisions": len(self.decision_tracer.decision_trace),
            "decision_trace": self.decision_tracer.decision_trace
        }
    
    def export_logs(self, output_file: str):
        """تصدير السجلات"""
        report = {
            "timestamp": datetime.utcnow().isoformat(),
            "execution_report": self.get_execution_report(),
            "decision_report": self.get_decision_report()
        }
        
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)


# إنشاء instance عام
_logger_instance: Optional[ComprehensiveLogger] = None


def get_logger_instance() -> ComprehensiveLogger:
    """الحصول على instance نظام التسجيل"""
    global _logger_instance
    
    if _logger_instance is None:
        _logger_instance = ComprehensiveLogger()
    
    return _logger_instance


def initialize_logger(
    log_dir: str = "./logs",
    log_level: LogLevel = LogLevel.INFO,
    enable_file_logging: bool = True,
    enable_console_logging: bool = True
) -> ComprehensiveLogger:
    """تهيئة نظام التسجيل"""
    global _logger_instance
    
    _logger_instance = ComprehensiveLogger(
        log_dir=log_dir,
        log_level=log_level,
        enable_file_logging=enable_file_logging,
        enable_console_logging=enable_console_logging
    )
    
    return _logger_instance
