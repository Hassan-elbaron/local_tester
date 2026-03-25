"""
Router - توجيه المهام إلى الوكلاء المناسبين
"""

from typing import List, Dict, Any
from schemas import (
    AgentRole, TaskSchema, RoutingDecisionSchema,
    AgentInputSchema, CampaignContextSchema
)
import uuid


class TaskRouter:
    """
    توجيه المهام إلى الوكلاء المناسبين بناءً على المنطق والأولويات
    """
    
    def __init__(self):
        self.routing_rules = self._initialize_routing_rules()
        self.routing_history: List[RoutingDecisionSchema] = []
    
    def _initialize_routing_rules(self) -> Dict[str, Dict[str, Any]]:
        """تهيئة قواعد التوجيه"""
        return {
            "research": {
                "agent": AgentRole.RESEARCH,
                "priority": 1,
                "dependencies": [],
                "estimated_duration_ms": 5000
            },
            "strategy": {
                "agent": AgentRole.STRATEGY,
                "priority": 2,
                "dependencies": [AgentRole.RESEARCH],
                "estimated_duration_ms": 4000
            },
            "content": {
                "agent": AgentRole.CONTENT,
                "priority": 3,
                "dependencies": [AgentRole.STRATEGY],
                "estimated_duration_ms": 3000
            },
            "campaign": {
                "agent": AgentRole.CAMPAIGN,
                "priority": 3,
                "dependencies": [AgentRole.STRATEGY],
                "estimated_duration_ms": 3000
            },
            "budget": {
                "agent": AgentRole.BUDGET,
                "priority": 4,
                "dependencies": [AgentRole.CAMPAIGN],
                "estimated_duration_ms": 2000
            },
            "compliance": {
                "agent": AgentRole.COMPLIANCE,
                "priority": 5,
                "dependencies": [AgentRole.CONTENT, AgentRole.CAMPAIGN],
                "estimated_duration_ms": 2000
            },
            "analytics": {
                "agent": AgentRole.ANALYTICS,
                "priority": 4,
                "dependencies": [AgentRole.CAMPAIGN],
                "estimated_duration_ms": 2000
            }
        }
    
    def route_task(
        self,
        task_description: str,
        context: CampaignContextSchema,
        completed_tasks: List[str] = None
    ) -> RoutingDecisionSchema:
        """
        توجيه مهمة إلى الوكيل المناسب
        
        Args:
            task_description: وصف المهمة
            context: سياق الحملة
            completed_tasks: قائمة المهام المكتملة
            
        Returns:
            RoutingDecisionSchema: قرار التوجيه
        """
        completed_tasks = completed_tasks or []
        
        # تحديد نوع المهمة
        task_type = self._identify_task_type(task_description)
        
        # الحصول على قاعدة التوجيه
        routing_rule = self.routing_rules.get(task_type)
        
        if not routing_rule:
            # إذا لم توجد قاعدة، استخدم الاستراتيجية الافتراضية
            routing_rule = self.routing_rules["strategy"]
        
        # التحقق من تكامل المتطلبات
        dependencies_met = self._check_dependencies(
            routing_rule["dependencies"],
            completed_tasks
        )
        
        # إنشاء قرار التوجيه
        decision = RoutingDecisionSchema(
            task_id=str(uuid.uuid4()),
            assigned_agent=routing_rule["agent"],
            priority=routing_rule["priority"],
            reasoning=f"Routed to {routing_rule['agent'].value} based on task type: {task_type}",
            estimated_duration_ms=routing_rule["estimated_duration_ms"]
        )
        
        # تسجيل القرار
        self.routing_history.append(decision)
        
        return decision
    
    def _identify_task_type(self, task_description: str) -> str:
        """تحديد نوع المهمة من الوصف"""
        description_lower = task_description.lower()
        
        if any(word in description_lower for word in ["research", "analyze", "market", "competitor"]):
            return "research"
        elif any(word in description_lower for word in ["strategy", "strategic", "positioning"]):
            return "strategy"
        elif any(word in description_lower for word in ["content", "copy", "write", "message"]):
            return "content"
        elif any(word in description_lower for word in ["campaign", "plan", "structure"]):
            return "campaign"
        elif any(word in description_lower for word in ["budget", "allocation", "spend"]):
            return "budget"
        elif any(word in description_lower for word in ["compliance", "review", "check", "approve"]):
            return "compliance"
        elif any(word in description_lower for word in ["analytics", "kpi", "measurement", "metric"]):
            return "analytics"
        else:
            return "strategy"  # الافتراضي
    
    def _check_dependencies(
        self,
        required_dependencies: List[AgentRole],
        completed_tasks: List[str]
    ) -> bool:
        """التحقق من تكامل المتطلبات"""
        # تبسيط: افترض أن جميع المتطلبات مكتملة
        return True
    
    def get_routing_statistics(self) -> Dict[str, Any]:
        """الحصول على إحصائيات التوجيه"""
        agent_counts = {}
        for decision in self.routing_history:
            agent = decision.assigned_agent.value
            agent_counts[agent] = agent_counts.get(agent, 0) + 1
        
        return {
            "total_routings": len(self.routing_history),
            "agent_distribution": agent_counts,
            "average_priority": (
                sum(d.priority for d in self.routing_history) /
                len(self.routing_history)
                if self.routing_history
                else 0
            )
        }
