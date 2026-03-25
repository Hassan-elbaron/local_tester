"""
Advanced Monitoring & Alerting System
نظام المراقبة والتنبيهات المتقدم
"""

from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import logging
import json
from pathlib import Path
from collections import defaultdict

logger = logging.getLogger(__name__)


class AlertSeverity(str, Enum):
    """مستويات التنبيهات"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class MetricType(str, Enum):
    """أنواع المقاييس"""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    TIMER = "timer"


@dataclass
class Metric:
    """المقياس"""
    name: str
    type: MetricType
    value: float
    timestamp: str
    labels: Dict[str, str] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "type": self.type.value,
            "value": self.value,
            "timestamp": self.timestamp,
            "labels": self.labels
        }


@dataclass
class Alert:
    """التنبيه"""
    alert_id: str
    title: str
    message: str
    severity: AlertSeverity
    source: str
    timestamp: str
    resolved_at: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "alert_id": self.alert_id,
            "title": self.title,
            "message": self.message,
            "severity": self.severity.value,
            "source": self.source,
            "timestamp": self.timestamp,
            "resolved_at": self.resolved_at,
            "metadata": self.metadata
        }


@dataclass
class AlertRule:
    """قاعدة التنبيه"""
    rule_id: str
    name: str
    metric_name: str
    condition: str  # >, <, >=, <=, ==
    threshold: float
    duration_seconds: int
    severity: AlertSeverity
    enabled: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "name": self.name,
            "metric_name": self.metric_name,
            "condition": self.condition,
            "threshold": self.threshold,
            "duration_seconds": self.duration_seconds,
            "severity": self.severity.value,
            "enabled": self.enabled
        }


class MetricsCollector:
    """جامع المقاييس"""
    
    def __init__(self):
        self.metrics: List[Metric] = []
        self.current_values: Dict[str, float] = {}
    
    def record_metric(
        self,
        name: str,
        value: float,
        metric_type: MetricType = MetricType.GAUGE,
        labels: Optional[Dict[str, str]] = None
    ):
        """تسجيل مقياس"""
        metric = Metric(
            name=name,
            type=metric_type,
            value=value,
            timestamp=datetime.utcnow().isoformat(),
            labels=labels or {}
        )
        
        self.metrics.append(metric)
        self.current_values[name] = value
        
        logger.debug(f"Metric recorded: {name} = {value}")
    
    def get_metric(self, name: str) -> Optional[float]:
        """الحصول على قيمة المقياس الحالية"""
        return self.current_values.get(name)
    
    def get_metrics(
        self,
        name: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        limit: int = 1000
    ) -> List[Metric]:
        """الحصول على المقاييس"""
        filtered = self.metrics
        
        if name:
            filtered = [m for m in filtered if m.name == name]
        
        if start_time:
            start = datetime.fromisoformat(start_time)
            filtered = [m for m in filtered if datetime.fromisoformat(m.timestamp) >= start]
        
        if end_time:
            end = datetime.fromisoformat(end_time)
            filtered = [m for m in filtered if datetime.fromisoformat(m.timestamp) <= end]
        
        return filtered[-limit:]
    
    def get_statistics(self, name: str) -> Dict[str, float]:
        """الحصول على إحصائيات المقياس"""
        metrics = [m.value for m in self.metrics if m.name == name]
        
        if not metrics:
            return {}
        
        return {
            "count": len(metrics),
            "min": min(metrics),
            "max": max(metrics),
            "avg": sum(metrics) / len(metrics),
            "latest": metrics[-1]
        }


class AlertingEngine:
    """محرك التنبيهات"""
    
    def __init__(self):
        self.rules: Dict[str, AlertRule] = {}
        self.alerts: List[Alert] = []
        self.alert_handlers: List[Callable] = []
        self.alert_history: Dict[str, List[Alert]] = defaultdict(list)
    
    def add_rule(self, rule: AlertRule):
        """إضافة قاعدة"""
        self.rules[rule.rule_id] = rule
        logger.info(f"Alert rule added: {rule.name}")
    
    def remove_rule(self, rule_id: str):
        """إزالة قاعدة"""
        if rule_id in self.rules:
            del self.rules[rule_id]
            logger.info(f"Alert rule removed: {rule_id}")
    
    def evaluate_rules(self, metrics_collector: MetricsCollector):
        """تقييم القواعس"""
        for rule in self.rules.values():
            if not rule.enabled:
                continue
            
            value = metrics_collector.get_metric(rule.metric_name)
            
            if value is None:
                continue
            
            # التحقق من الشرط
            triggered = False
            
            if rule.condition == ">":
                triggered = value > rule.threshold
            elif rule.condition == "<":
                triggered = value < rule.threshold
            elif rule.condition == ">=":
                triggered = value >= rule.threshold
            elif rule.condition == "<=":
                triggered = value <= rule.threshold
            elif rule.condition == "==":
                triggered = value == rule.threshold
            
            if triggered:
                self._trigger_alert(rule, value)
    
    def _trigger_alert(self, rule: AlertRule, value: float):
        """تفعيل تنبيه"""
        import secrets
        
        alert_id = f"alert_{secrets.token_hex(8)}"
        
        alert = Alert(
            alert_id=alert_id,
            title=rule.name,
            message=f"Metric '{rule.metric_name}' triggered alert: {value} {rule.condition} {rule.threshold}",
            severity=rule.severity,
            source=rule.metric_name,
            timestamp=datetime.utcnow().isoformat(),
            metadata={
                "rule_id": rule.rule_id,
                "metric_value": value,
                "threshold": rule.threshold
            }
        )
        
        self.alerts.append(alert)
        self.alert_history[rule.metric_name].append(alert)
        
        # استدعاء المعالجات
        for handler in self.alert_handlers:
            try:
                handler(alert)
            except Exception as e:
                logger.error(f"Alert handler failed: {e}")
        
        logger.warning(f"Alert triggered: {alert.title} (severity: {alert.severity.value})")
    
    def resolve_alert(self, alert_id: str):
        """حل التنبيه"""
        for alert in self.alerts:
            if alert.alert_id == alert_id:
                alert.resolved_at = datetime.utcnow().isoformat()
                logger.info(f"Alert resolved: {alert_id}")
                break
    
    def register_handler(self, handler: Callable):
        """تسجيل معالج التنبيهات"""
        self.alert_handlers.append(handler)
    
    def get_active_alerts(self) -> List[Alert]:
        """الحصول على التنبيهات النشطة"""
        return [alert for alert in self.alerts if alert.resolved_at is None]
    
    def get_alerts(
        self,
        severity: Optional[AlertSeverity] = None,
        limit: int = 100
    ) -> List[Alert]:
        """الحصول على التنبيهات"""
        filtered = self.alerts
        
        if severity:
            filtered = [a for a in filtered if a.severity == severity]
        
        return filtered[-limit:]


class HealthCheck:
    """فحص الصحة"""
    
    def __init__(self):
        self.checks: Dict[str, Callable] = {}
        self.last_results: Dict[str, Dict[str, Any]] = {}
    
    def register_check(self, name: str, check_func: Callable):
        """تسجيل فحص"""
        self.checks[name] = check_func
    
    def run_checks(self) -> Dict[str, Dict[str, Any]]:
        """تشغيل الفحوصات"""
        results = {}
        
        for name, check_func in self.checks.items():
            try:
                status = check_func()
                results[name] = {
                    "status": "healthy" if status else "unhealthy",
                    "timestamp": datetime.utcnow().isoformat()
                }
            except Exception as e:
                results[name] = {
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                }
        
        self.last_results = results
        return results
    
    def is_system_healthy(self) -> bool:
        """التحقق من صحة النظام"""
        return all(
            result.get("status") == "healthy"
            for result in self.last_results.values()
        )


class MonitoringDashboard:
    """لوحة المراقبة"""
    
    def __init__(
        self,
        metrics_collector: MetricsCollector,
        alerting_engine: AlertingEngine,
        health_check: HealthCheck
    ):
        self.metrics_collector = metrics_collector
        self.alerting_engine = alerting_engine
        self.health_check = health_check
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """الحصول على بيانات لوحة المراقبة"""
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "system_health": {
                "is_healthy": self.health_check.is_system_healthy(),
                "checks": self.health_check.last_results
            },
            "alerts": {
                "active": len(self.alerting_engine.get_active_alerts()),
                "total": len(self.alerting_engine.alerts),
                "recent": [a.to_dict() for a in self.alerting_engine.get_active_alerts()[:10]]
            },
            "metrics": {
                "total_recorded": len(self.metrics_collector.metrics),
                "current_values": self.metrics_collector.current_values
            }
        }
    
    def get_detailed_report(self) -> Dict[str, Any]:
        """الحصول على تقرير مفصل"""
        return {
            "dashboard": self.get_dashboard_data(),
            "metrics_summary": {
                name: self.metrics_collector.get_statistics(name)
                for name in set(m.name for m in self.metrics_collector.metrics)
            },
            "alert_rules": {
                rule_id: rule.to_dict()
                for rule_id, rule in self.alerting_engine.rules.items()
            }
        }


class MonitoringSystem:
    """نظام المراقبة الموحد"""
    
    def __init__(self):
        self.metrics_collector = MetricsCollector()
        self.alerting_engine = AlertingEngine()
        self.health_check = HealthCheck()
        self.dashboard = MonitoringDashboard(
            self.metrics_collector,
            self.alerting_engine,
            self.health_check
        )
    
    def record_metric(
        self,
        name: str,
        value: float,
        metric_type: MetricType = MetricType.GAUGE,
        labels: Optional[Dict[str, str]] = None
    ):
        """تسجيل مقياس"""
        self.metrics_collector.record_metric(name, value, metric_type, labels)
        
        # تقييم القواعس
        self.alerting_engine.evaluate_rules(self.metrics_collector)
    
    def add_alert_rule(self, rule: AlertRule):
        """إضافة قاعدة تنبيه"""
        self.alerting_engine.add_rule(rule)
    
    def register_health_check(self, name: str, check_func: Callable):
        """تسجيل فحص صحة"""
        self.health_check.register_check(name, check_func)
    
    def register_alert_handler(self, handler: Callable):
        """تسجيل معالج التنبيهات"""
        self.alerting_engine.register_handler(handler)
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """الحصول على بيانات لوحة المراقبة"""
        return self.dashboard.get_dashboard_data()
    
    def get_detailed_report(self) -> Dict[str, Any]:
        """الحصول على تقرير مفصل"""
        return self.dashboard.get_detailed_report()


# مثال على الاستخدام
def example_usage():
    """مثال على الاستخدام"""
    
    monitoring = MonitoringSystem()
    
    # تسجيل فحوصات الصحة
    monitoring.register_health_check("database", lambda: True)
    monitoring.register_health_check("api", lambda: True)
    
    # إضافة قواعس التنبيهات
    rule = AlertRule(
        rule_id="rule-1",
        name="High CPU Usage",
        metric_name="cpu_usage",
        condition=">",
        threshold=80.0,
        duration_seconds=60,
        severity=AlertSeverity.WARNING
    )
    monitoring.add_alert_rule(rule)
    
    # تسجيل معالج التنبيهات
    def alert_handler(alert: Alert):
        print(f"Alert: {alert.title} - {alert.message}")
    
    monitoring.register_alert_handler(alert_handler)
    
    # تسجيل المقاييس
    monitoring.record_metric("cpu_usage", 75.0)
    monitoring.record_metric("memory_usage", 60.0)
    monitoring.record_metric("cpu_usage", 85.0)  # سيفعل التنبيه
    
    # الحصول على بيانات لوحة المراقبة
    dashboard = monitoring.get_dashboard_data()
    print(json.dumps(dashboard, indent=2))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    example_usage()
