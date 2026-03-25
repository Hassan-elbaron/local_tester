"""
Observability System - نظام المراقبة
يتضمن: Tracing, Timing, Detailed Logging
"""

from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime
import logging
import time
import json
from contextlib import contextmanager

logger = logging.getLogger(__name__)


@dataclass
class ExecutionSpan:
    \"\"\"مدة التنفيذ\"\"\"
    span_id: str
    parent_span_id: Optional[str]
    operation_name: str
    agent_name: str
    start_time: float
    end_time: Optional[float] = None
    duration_ms: Optional[float] = None
    status: str = \"running\"  # running, success, failed
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            \"span_id\": self.span_id,
            \"parent_span_id\": self.parent_span_id,
            \"operation_name\": self.operation_name,
            \"agent_name\": self.agent_name,
            \"start_time\": self.start_time,
            \"end_time\": self.end_time,
            \"duration_ms\": self.duration_ms,
            \"status\": self.status,
            \"error\": self.error,
            \"metadata\": self.metadata
        }


@dataclass
class TraceContext:
    \"\"\"سياق التتبع\"\"\"
    trace_id: str
    root_span_id: str
    campaign_id: str
    task_id: str
    created_at: str
    spans: List[ExecutionSpan] = field(default_factory=list)
    
    def add_span(self, span: ExecutionSpan):
        \"\"\"إضافة span\"\"\"
        self.spans.append(span)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            \"trace_id\": self.trace_id,
            \"root_span_id\": self.root_span_id,
            \"campaign_id\": self.campaign_id,
            \"task_id\": self.task_id,
            \"created_at\": self.created_at,
            \"spans\": [span.to_dict() for span in self.spans]
        }


class TracingSystem:
    \"\"\"نظام التتبع\"\"\"
    
    def __init__(self):
        self.traces: Dict[str, TraceContext] = {}
        self.current_trace: Optional[str] = None
        self.current_span: Optional[str] = None
        self.span_stack: List[str] = []
    
    def create_trace(
        self,
        trace_id: str,
        campaign_id: str,
        task_id: str
    ) -> TraceContext:
        \"\"\"إنشاء trace جديد\"\"\"
        root_span_id = f\"span_{trace_id}_root\"
        
        trace = TraceContext(
            trace_id=trace_id,
            root_span_id=root_span_id,
            campaign_id=campaign_id,
            task_id=task_id,
            created_at=datetime.utcnow().isoformat()
        )
        
        self.traces[trace_id] = trace
        self.current_trace = trace_id
        
        logger.info(f\"Trace created: {trace_id}\")
        
        return trace
    
    def start_span(
        self,
        span_id: str,
        operation_name: str,
        agent_name: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ExecutionSpan:
        \"\"\"بدء span جديد\"\"\"
        if not self.current_trace:
            raise RuntimeError(\"No active trace\")
        
        parent_span_id = self.current_span
        
        span = ExecutionSpan(
            span_id=span_id,
            parent_span_id=parent_span_id,
            operation_name=operation_name,
            agent_name=agent_name,
            start_time=time.time(),
            metadata=metadata or {}
        )
        
        # إضافة إلى trace
        trace = self.traces[self.current_trace]
        trace.add_span(span)
        
        # تحديث stack
        self.span_stack.append(span_id)
        self.current_span = span_id
        
        logger.debug(f\"Span started: {span_id} ({operation_name})\")
        
        return span
    
    def end_span(
        self,
        span_id: str,
        status: str = \"success\",
        error: Optional[str] = None
    ):
        \"\"\"إنهاء span\"\"\"
        if not self.current_trace:
            return
        
        trace = self.traces[self.current_trace]
        
        # البحث عن span
        span = None
        for s in trace.spans:
            if s.span_id == span_id:
                span = s
                break
        
        if not span:
            logger.warning(f\"Span not found: {span_id}\")
            return
        
        # تحديث span
        span.end_time = time.time()
        span.duration_ms = (span.end_time - span.start_time) * 1000
        span.status = status
        span.error = error
        
        # تحديث stack
        if self.span_stack and self.span_stack[-1] == span_id:
            self.span_stack.pop()
            self.current_span = self.span_stack[-1] if self.span_stack else None
        
        logger.debug(
            f\"Span ended: {span_id} (status={status}, duration={span.duration_ms:.2f}ms)\"
        )
    
    @contextmanager
    def trace_span(
        self,
        span_id: str,
        operation_name: str,
        agent_name: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        \"\"\"Context manager للـ span\"\"\"
        try:
            self.start_span(span_id, operation_name, agent_name, metadata)
            yield
            self.end_span(span_id, status=\"success\")
        except Exception as e:
            self.end_span(span_id, status=\"failed\", error=str(e))
            raise
    
    def get_trace(self, trace_id: str) -> Optional[TraceContext]:
        \"\"\"الحصول على trace\"\"\"
        return self.traces.get(trace_id)
    
    def get_trace_summary(self, trace_id: str) -> Dict[str, Any]:
        \"\"\"الحصول على ملخص trace\"\"\"
        trace = self.get_trace(trace_id)
        
        if not trace:
            return {}
        
        total_duration = 0
        successful_spans = 0
        failed_spans = 0
        
        for span in trace.spans:
            if span.duration_ms:
                total_duration += span.duration_ms
            
            if span.status == \"success\":
                successful_spans += 1
            elif span.status == \"failed\":
                failed_spans += 1
        
        return {
            \"trace_id\": trace_id,
            \"total_spans\": len(trace.spans),
            \"successful_spans\": successful_spans,
            \"failed_spans\": failed_spans,
            \"total_duration_ms\": total_duration,
            \"avg_span_duration_ms\": total_duration / len(trace.spans) if trace.spans else 0
        }


class TimingAnalyzer:
    \"\"\"محلل التوقيت\"\"\"
    
    def __init__(self):
        self.timings: Dict[str, List[float]] = {}
    
    def record_timing(self, operation: str, duration_ms: float):
        \"\"\"تسجيل توقيت\"\"\"
        if operation not in self.timings:
            self.timings[operation] = []
        
        self.timings[operation].append(duration_ms)
    
    def get_timing_stats(self, operation: str) -> Dict[str, float]:
        \"\"\"الحصول على إحصائيات التوقيت\"\"\"
        if operation not in self.timings:
            return {}
        
        durations = self.timings[operation]
        
        return {
            \"count\": len(durations),
            \"min_ms\": min(durations),
            \"max_ms\": max(durations),
            \"avg_ms\": sum(durations) / len(durations),
            \"total_ms\": sum(durations)
        }
    
    def get_all_stats(self) -> Dict[str, Dict[str, float]]:
        \"\"\"الحصول على جميع الإحصائيات\"\"\"
        return {
            op: self.get_timing_stats(op)
            for op in self.timings.keys()
        }


class DetailedLogger:
    \"\"\"مسجل مفصل\"\"\"
    
    def __init__(self):
        self.logs: List[Dict[str, Any]] = []
    
    def log_event(
        self,
        event_type: str,
        agent_name: str,
        message: str,
        level: str = \"INFO\",
        metadata: Optional[Dict[str, Any]] = None
    ):
        \"\"\"تسجيل حدث\"\"\"
        log_entry = {
            \"timestamp\": datetime.utcnow().isoformat(),
            \"event_type\": event_type,
            \"agent_name\": agent_name,
            \"message\": message,
            \"level\": level,
            \"metadata\": metadata or {}
        }
        
        self.logs.append(log_entry)
        
        # تسجيل أيضاً في logging
        log_func = getattr(logger, level.lower(), logger.info)
        log_func(f\"[{agent_name}] {message}\")
    
    def get_logs(
        self,
        agent_name: Optional[str] = None,
        event_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        \"\"\"الحصول على السجلات\"\"\"
        filtered = self.logs
        
        if agent_name:
            filtered = [log for log in filtered if log[\"agent_name\"] == agent_name]
        
        if event_type:
            filtered = [log for log in filtered if log[\"event_type\"] == event_type]
        
        return filtered[-limit:]
    
    def get_logs_summary(self) -> Dict[str, Any]:
        \"\"\"الحصول على ملخص السجلات\"\"\"
        return {
            \"total_logs\": len(self.logs),
            \"by_level\": {
                level: len([log for log in self.logs if log[\"level\"] == level])
                for level in [\"DEBUG\", \"INFO\", \"WARNING\", \"ERROR\"]
            },
            \"by_agent\": {
                agent: len([log for log in self.logs if log[\"agent_name\"] == agent])
                for agent in set(log[\"agent_name\"] for log in self.logs)
            }
        }


class ObservabilitySystem:
    \"\"\"نظام المراقبة الموحد\"\"\"
    
    def __init__(self):
        self.tracing = TracingSystem()
        self.timing = TimingAnalyzer()
        self.logger = DetailedLogger()
    
    def create_trace_context(
        self,
        trace_id: str,
        campaign_id: str,
        task_id: str
    ) -> TraceContext:
        \"\"\"إنشاء سياق تتبع\"\"\"
        return self.tracing.create_trace(trace_id, campaign_id, task_id)
    
    def get_full_report(self, trace_id: str) -> Dict[str, Any]:
        \"\"\"الحصول على تقرير شامل\"\"\"
        trace_summary = self.tracing.get_trace_summary(trace_id)
        timing_stats = self.timing.get_all_stats()
        logs_summary = self.logger.get_logs_summary()
        
        return {
            \"trace\": trace_summary,
            \"timing\": timing_stats,
            \"logs\": logs_summary
        }
    
    @contextmanager
    def observe_operation(
        self,
        operation_name: str,
        agent_name: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        \"\"\"Context manager للمراقبة\"\"\"
        span_id = f\"span_{operation_name}_{time.time()}\"
        start_time = time.time()
        
        try:
            with self.tracing.trace_span(
                span_id,
                operation_name,
                agent_name,
                metadata
            ):
                yield
            
            duration = (time.time() - start_time) * 1000
            self.timing.record_timing(operation_name, duration)
            
            self.logger.log_event(
                \"operation_completed\",
                agent_name,
                f\"Operation completed: {operation_name}\",
                \"INFO\",
                {\"duration_ms\": duration}
            )
        
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            self.timing.record_timing(operation_name, duration)
            
            self.logger.log_event(
                \"operation_failed\",
                agent_name,
                f\"Operation failed: {operation_name}\",
                \"ERROR\",
                {\"error\": str(e), \"duration_ms\": duration}
            )
            
            raise


# مثال على الاستخدام
def example_usage():
    \"\"\"مثال على الاستخدام\"\"\"
    
    obs = ObservabilitySystem()
    
    # إنشاء trace
    trace = obs.create_trace_context(
        trace_id=\"trace-1\",
        campaign_id=\"campaign-1\",
        task_id=\"task-1\"
    )
    
    # محاكاة عمليات
    with obs.observe_operation(\"strategy_generation\", \"strategy_agent\"):
        time.sleep(0.1)
    
    with obs.observe_operation(\"content_generation\", \"content_agent\"):
        time.sleep(0.15)
    
    # الحصول على التقرير
    report = obs.get_full_report(\"trace-1\")
    print(json.dumps(report, indent=2))


if __name__ == \"__main__\":
    logging.basicConfig(level=logging.INFO)
    example_usage()
