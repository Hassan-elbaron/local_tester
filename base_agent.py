"""
Base Agent Class - الفئة الأساسية لجميع الوكلاء
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from schemas import (
    AgentRole, AgentInputSchema, AgentOutputSchema,
    CampaignContextSchema
)
import uuid
from datetime import datetime


class BaseAgent(ABC):
    """
    الفئة الأساسية لجميع الوكلاء
    كل وكيل يرث من هذه الفئة ويطبق process() method
    """
    
    def __init__(self, role: AgentRole, model_type: str = "local"):
        """
        تهيئة الوكيل
        
        Args:
            role: دور الوكيل
            model_type: نوع النموذج (local أو cloud)
        """
        self.role = role
        self.model_type = model_type
        self.execution_count = 0
        self.total_execution_time = 0.0
    
    @abstractmethod
    def process(
        self,
        agent_input: AgentInputSchema
    ) -> AgentOutputSchema:
        """
        معالجة المهمة - يجب تطبيقها في كل وكيل
        
        Args:
            agent_input: مدخلات الوكيل الموحدة
            
        Returns:
            AgentOutputSchema: المخرجات الموحدة
        """
        pass
    
    def validate_input(self, agent_input: AgentInputSchema) -> bool:
        """
        التحقق من صحة المدخلات
        
        Args:
            agent_input: مدخلات الوكيل
            
        Returns:
            bool: صحة المدخلات
        """
        if not agent_input.context:
            return False
        if agent_input.agent_role != self.role:
            return False
        return True
    
    def create_output(
        self,
        agent_input: AgentInputSchema,
        output_data: Dict[str, Any],
        confidence: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AgentOutputSchema:
        """
        إنشاء مخرجات موحدة
        
        Args:
            agent_input: مدخلات الوكيل
            output_data: بيانات المخرجات
            confidence: درجة الثقة (اختياري)
            metadata: بيانات إضافية (اختياري)
            
        Returns:
            AgentOutputSchema: المخرجات الموحدة
        """
        return AgentOutputSchema(
            agent=self.role,
            task_id=agent_input.task_id,
            output=output_data,
            confidence=confidence or 0.8,
            metadata=metadata or {}
        )
    
    def execute(
        self,
        agent_input: AgentInputSchema
    ) -> AgentOutputSchema:
        """
        تنفيذ الوكيل مع التتبع
        
        Args:
            agent_input: مدخلات الوكيل
            
        Returns:
            AgentOutputSchema: المخرجات
        """
        import time
        
        # التحقق من المدخلات
        if not self.validate_input(agent_input):
            return self.create_output(
                agent_input,
                {"error": "Invalid input"},
                confidence=0.0
            )
        
        # تنفيذ المعالجة
        start_time = time.time()
        try:
            output = self.process(agent_input)
            execution_time = time.time() - start_time
            
            # تحديث الإحصائيات
            self.execution_count += 1
            self.total_execution_time += execution_time
            
            # إضافة معلومات الأداء
            if not output.metadata:
                output.metadata = {}
            output.metadata["execution_time_ms"] = execution_time * 1000
            output.metadata["agent_execution_count"] = self.execution_count
            
            return output
        except Exception as e:
            return self.create_output(
                agent_input,
                {"error": str(e)},
                confidence=0.0,
                metadata={"error_type": type(e).__name__}
            )
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        الحصول على إحصائيات الوكيل
        
        Returns:
            Dict: الإحصائيات
        """
        avg_time = (
            self.total_execution_time / self.execution_count
            if self.execution_count > 0
            else 0
        )
        
        return {
            "role": self.role.value,
            "model_type": self.model_type,
            "execution_count": self.execution_count,
            "total_execution_time_ms": self.total_execution_time * 1000,
            "average_execution_time_ms": avg_time * 1000
        }
