"""
Contract Validator - مدقق العقود
يتأكد من أن جميع الـ Agents تحترم العقد الموحد
"""

from typing import Dict, Any, Optional, List
from pydantic import BaseModel, ValidationError, field_validator
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class AgentContractSchema(BaseModel):
    """
    العقد الموحد لمخرجات الـ Agents
    جميع الوكلاء يجب أن ترجع هذا الشكل
    """
    agent: str  # اسم الوكيل
    task_id: str  # معرف المهمة
    output: Dict[str, Any]  # المخرجات
    confidence: Optional[float] = None  # درجة الثقة (0-1)
    status: str = "success"  # success, partial, failed
    error: Optional[str] = None  # الخطأ إن وجد
    metadata: Dict[str, Any] = {}  # بيانات إضافية
    
    @field_validator('confidence')
    @classmethod
    def validate_confidence(cls, v):
        if v is not None and (v < 0 or v > 1):
            raise ValueError('Confidence must be between 0 and 1')
        return v
    
    @field_validator('agent')
    @classmethod
    def validate_agent(cls, v):
        if not v or len(v) == 0:
            raise ValueError('Agent name cannot be empty')
        return v
    
    @field_validator('task_id')
    @classmethod
    def validate_task_id(cls, v):
        if not v or len(v) == 0:
            raise ValueError('Task ID cannot be empty')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "agent": "strategy",
                "task_id": "task-123",
                "output": {
                    "positioning": "Premium & Innovative",
                    "messaging_pillars": ["Quality", "Innovation"]
                },
                "confidence": 0.92,
                "status": "success",
                "error": None,
                "metadata": {
                    "execution_time_ms": 45,
                    "model_used": "gpt-4"
                }
            }
        }


class ContractViolation(Exception):
    """استثناء انتهاك العقد"""
    
    def __init__(self, message: str, violations: List[str]):
        self.message = message
        self.violations = violations
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "error": self.message,
            "violations": self.violations
        }


class ContractValidator:
    """
    مدقق العقود
    يتحقق من أن جميع الـ Agents تحترم العقد الموحد
    """
    
    def __init__(self):
        self.violations_log: List[Dict[str, Any]] = []
        self.validation_stats = {
            "total_validations": 0,
            "successful": 0,
            "failed": 0
        }
    
    def validate_agent_output(
        self,
        agent_output: Dict[str, Any],
        strict: bool = True
    ) -> AgentContractSchema:
        """
        التحقق من مخرجات الوكيل
        
        Args:
            agent_output: مخرجات الوكيل
            strict: التحقق الصارم
            
        Returns:
            AgentContractSchema: المخرجات المتحققة
            
        Raises:
            ContractViolation: إذا انتهك العقد
        """
        self.validation_stats["total_validations"] += 1
        
        violations = []
        
        # التحقق من الحقول المطلوبة
        required_fields = ["agent", "task_id", "output"]
        for field in required_fields:
            if field not in agent_output:
                violations.append(f"Missing required field: {field}")
        
        # التحقق من أنواع البيانات
        if "agent" in agent_output and not isinstance(agent_output["agent"], str):
            violations.append("Field 'agent' must be a string")
        
        if "task_id" in agent_output and not isinstance(agent_output["task_id"], str):
            violations.append("Field 'task_id' must be a string")
        
        if "output" in agent_output and not isinstance(agent_output["output"], dict):
            violations.append("Field 'output' must be a dictionary")
        
        if "confidence" in agent_output:
            if not isinstance(agent_output["confidence"], (int, float)):
                violations.append("Field 'confidence' must be a number")
            elif agent_output["confidence"] < 0 or agent_output["confidence"] > 1:
                violations.append("Field 'confidence' must be between 0 and 1")
        
        if "status" in agent_output:
            valid_statuses = ["success", "partial", "failed"]
            if agent_output["status"] not in valid_statuses:
                violations.append(f"Field 'status' must be one of {valid_statuses}")
        
        # تسجيل الانتهاكات
        if violations:
            self.validation_stats["failed"] += 1
            self._log_violation(agent_output, violations)
            
            if strict:
                raise ContractViolation(
                    f"Contract violation for agent {agent_output.get('agent', 'unknown')}",
                    violations
                )
            else:
                logger.warning(f"Contract violations detected: {violations}")
        else:
            self.validation_stats["successful"] += 1
        
        # محاولة إنشاء instance من Schema
        try:
            return AgentContractSchema(**agent_output)
        except ValidationError as e:
            violations.extend([str(err) for err in e.errors()])
            self._log_violation(agent_output, violations)
            
            if strict:
                raise ContractViolation(
                    f"Pydantic validation failed for agent {agent_output.get('agent', 'unknown')}",
                    violations
                )
            else:
                logger.warning(f"Pydantic validation errors: {violations}")
                # إرجاع output مع القيم الافتراضية
                return AgentContractSchema(
                    agent=agent_output.get("agent", "unknown"),
                    task_id=agent_output.get("task_id", "unknown"),
                    output=agent_output.get("output", {}),
                    confidence=agent_output.get("confidence"),
                    status=agent_output.get("status", "success"),
                    error=agent_output.get("error")
                )
    
    def validate_batch(
        self,
        agent_outputs: List[Dict[str, Any]],
        strict: bool = False
    ) -> List[AgentContractSchema]:
        """
        التحقق من مجموعة من المخرجات
        
        Args:
            agent_outputs: قائمة مخرجات الوكلاء
            strict: التحقق الصارم
            
        Returns:
            List[AgentContractSchema]: المخرجات المتحققة
        """
        validated = []
        
        for output in agent_outputs:
            try:
                validated_output = self.validate_agent_output(output, strict=strict)
                validated.append(validated_output)
            except ContractViolation as e:
                logger.error(f"Batch validation failed: {e}")
                if strict:
                    raise
        
        return validated
    
    def _log_violation(
        self,
        agent_output: Dict[str, Any],
        violations: List[str]
    ):
        """تسجيل انتهاك"""
        violation_record = {
            "timestamp": __import__('datetime').datetime.utcnow().isoformat(),
            "agent": agent_output.get("agent", "unknown"),
            "task_id": agent_output.get("task_id", "unknown"),
            "violations": violations
        }
        
        self.violations_log.append(violation_record)
        
        logger.warning(f"Contract violation logged: {violation_record}")
    
    def get_statistics(self) -> Dict[str, Any]:
        """الحصول على إحصائيات التحقق"""
        total = self.validation_stats["total_validations"]
        successful = self.validation_stats["successful"]
        
        return {
            "total_validations": total,
            "successful": successful,
            "failed": self.validation_stats["failed"],
            "success_rate": (successful / total * 100) if total > 0 else 0,
            "violations_count": len(self.violations_log)
        }
    
    def get_violations_report(self) -> Dict[str, Any]:
        """الحصول على تقرير الانتهاكات"""
        violations_by_agent = {}
        
        for violation in self.violations_log:
            agent = violation["agent"]
            if agent not in violations_by_agent:
                violations_by_agent[agent] = []
            
            violations_by_agent[agent].extend(violation["violations"])
        
        return {
            "total_violations": len(self.violations_log),
            "violations_by_agent": violations_by_agent,
            "recent_violations": self.violations_log[-10:]  # آخر 10 انتهاكات
        }
    
    def reset_statistics(self):
        """إعادة تعيين الإحصائيات"""
        self.violations_log.clear()
        self.validation_stats = {
            "total_validations": 0,
            "successful": 0,
            "failed": 0
        }
        logger.info("Contract validator statistics reset")


class ContractEnforcer:
    """
    محقق العقود
    يفرض احترام العقد في جميع الـ Agents
    """
    
    def __init__(self, strict_mode: bool = False):
        """
        Args:
            strict_mode: إذا كان True، سيرفع استثناء عند انتهاك العقد
        """
        self.validator = ContractValidator()
        self.strict_mode = strict_mode
    
    def wrap_agent_output(
        self,
        agent_name: str,
        task_id: str,
        output: Dict[str, Any],
        confidence: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AgentContractSchema:
        """
        تغليف مخرجات الوكيل بالعقد الموحد
        
        Args:
            agent_name: اسم الوكيل
            task_id: معرف المهمة
            output: المخرجات
            confidence: درجة الثقة
            metadata: البيانات الإضافية
            
        Returns:
            AgentContractSchema: المخرجات الموحدة
        """
        agent_output = {
            "agent": agent_name,
            "task_id": task_id,
            "output": output,
            "confidence": confidence or 0.8,
            "status": "success",
            "metadata": metadata or {}
        }
        
        return self.validator.validate_agent_output(
            agent_output,
            strict=self.strict_mode
        )
    
    def wrap_agent_error(
        self,
        agent_name: str,
        task_id: str,
        error: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AgentContractSchema:
        """
        تغليف خطأ الوكيل بالعقد الموحد
        
        Args:
            agent_name: اسم الوكيل
            task_id: معرف المهمة
            error: رسالة الخطأ
            metadata: البيانات الإضافية
            
        Returns:
            AgentContractSchema: المخرجات الموحدة مع الخطأ
        """
        agent_output = {
            "agent": agent_name,
            "task_id": task_id,
            "output": {},
            "confidence": 0.0,
            "status": "failed",
            "error": error,
            "metadata": metadata or {}
        }
        
        return self.validator.validate_agent_output(
            agent_output,
            strict=False  # لا نرفع استثناء للأخطاء
        )
    
    def get_full_report(self) -> Dict[str, Any]:
        """الحصول على تقرير شامل"""
        return {
            "validation_statistics": self.validator.get_statistics(),
            "violations_report": self.validator.get_violations_report(),
            "strict_mode": self.strict_mode
        }


# إنشاء instance عام
_contract_enforcer_instance: Optional[ContractEnforcer] = None


def get_contract_enforcer(strict_mode: bool = False) -> ContractEnforcer:
    """الحصول على محقق العقود العام"""
    global _contract_enforcer_instance
    
    if _contract_enforcer_instance is None:
        _contract_enforcer_instance = ContractEnforcer(strict_mode=strict_mode)
    
    return _contract_enforcer_instance
