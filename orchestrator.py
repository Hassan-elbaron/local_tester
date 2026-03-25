"""
Master Orchestrator - المنسق الرئيسي
يدير تدفق العمل الكامل: Router -> Agents -> Aggregator -> Decision
"""

from typing import Dict, Any, List, Optional
from schemas import (
    CampaignContextSchema, TaskSchema, AgentRole,
    AgentInputSchema, CampaignPlanSchema, TaskStatus
)
from orchestrator_router import TaskRouter
from orchestrator_aggregator import OutputAggregator
from orchestrator_decision import DecisionEngine
from memory import UnifiedMemory
from agents_strategy import StrategyAgent
from agents_content import ContentAgent
from agents_campaign import CampaignAgent
from agents_research import ResearchAgent
from agents_support import AnalyticsAgent, ComplianceAgent, BudgetAgent
import uuid
from datetime import datetime


class MasterOrchestrator:
    """
    المنسق الرئيسي - يقود النظام بأكمله
    """
    
    def __init__(self):
        self.router = TaskRouter()
        self.aggregator = OutputAggregator()
        self.decision_engine = DecisionEngine()
        self.memory = UnifiedMemory()
        
        # تهيئة الوكلاء
        self.agents = self._initialize_agents()
        
        # تتبع الحملات والمهام
        self.current_campaign_id: Optional[str] = None
        self.tasks: Dict[str, TaskSchema] = {}
        self.completed_tasks: List[str] = []
    
    def _initialize_agents(self) -> Dict[AgentRole, Any]:
        """تهيئة جميع الوكلاء"""
        return {
            AgentRole.RESEARCH: ResearchAgent(),
            AgentRole.STRATEGY: StrategyAgent(),
            AgentRole.CONTENT: ContentAgent(),
            AgentRole.CAMPAIGN: CampaignAgent(),
            AgentRole.ANALYTICS: AnalyticsAgent(),
            AgentRole.COMPLIANCE: ComplianceAgent(),
            AgentRole.BUDGET: BudgetAgent()
        }
    
    def run_campaign(
        self,
        goal: str,
        product: str,
        market: str,
        budget: float,
        constraints: List[str]
    ) -> CampaignPlanSchema:
        """
        تشغيل حملة كاملة
        
        Args:
            goal: الهدف التسويقي
            product: اسم المنتج
            market: السوق المستهدف
            budget: الميزانية
            constraints: القيود
            
        Returns:
            CampaignPlanSchema: خطة الحملة الكاملة
        """
        # Phase 1: Intake
        self.current_campaign_id = str(uuid.uuid4())
        context = CampaignContextSchema(
            goal=goal,
            product=product,
            market=market,
            budget=budget,
            constraints=constraints
        )
        
        print(f"[Orchestrator] Starting campaign {self.current_campaign_id}")
        print(f"[Orchestrator] Goal: {goal}")
        
        # حفظ السياق في الذاكرة
        self.memory.context.store_context(self.current_campaign_id, context.dict())
        
        # Phase 2: Problem Framing
        print("[Orchestrator] Phase 2: Problem Framing")
        self._create_tasks(context)
        
        # Phase 3: Routing & Execution
        print("[Orchestrator] Phase 3: Routing & Execution")
        results = self._execute_tasks(context)
        
        # Phase 4: Aggregation
        print("[Orchestrator] Phase 4: Aggregation")
        merged_plan = self.aggregator.merge_agent_results(results)
        
        # Phase 5: Decision Making
        print("[Orchestrator] Phase 5: Decision Making")
        # يمكن إضافة قرارات معقدة هنا إذا لزم الأمر
        
        # Phase 6: Output Packaging
        print("[Orchestrator] Phase 6: Output Packaging")
        campaign_plan = CampaignPlanSchema(
            campaign_id=self.current_campaign_id,
            context=context,
            tasks=list(self.tasks.values()),
            results=results,
            synthesis=merged_plan,
            status="completed",
            completed_at=datetime.utcnow()
        )
        
        # حفظ في الذاكرة
        self.memory.campaign_history.save_campaign(campaign_plan)
        
        print("[Orchestrator] Campaign completed successfully!")
        return campaign_plan
    
    def _create_tasks(self, context: CampaignContextSchema):
        """إنشاء المهام بناءً على السياق"""
        task_descriptions = [
            ("Market research and competitive analysis", AgentRole.RESEARCH),
            ("Strategic positioning and messaging", AgentRole.STRATEGY),
            ("Content creation", AgentRole.CONTENT),
            ("Campaign planning", AgentRole.CAMPAIGN),
            ("Budget allocation", AgentRole.BUDGET),
            ("Compliance review", AgentRole.COMPLIANCE),
            ("Analytics setup", AgentRole.ANALYTICS)
        ]
        
        for description, role in task_descriptions:
            task_id = str(uuid.uuid4())
            task = TaskSchema(
                id=task_id,
                description=description,
                assigned_role=role,
                status=TaskStatus.PENDING,
                inputs=AgentInputSchema(
                    agent_role=role,
                    task_id=task_id,
                    context=context
                )
            )
            self.tasks[task_id] = task
    
    def _execute_tasks(
        self,
        context: CampaignContextSchema
    ) -> Dict[AgentRole, Any]:
        """تنفيذ المهام بالترتيب الصحيح"""
        results = {}
        
        # ترتيب التنفيذ
        execution_order = [
            AgentRole.RESEARCH,
            AgentRole.STRATEGY,
            AgentRole.CONTENT,
            AgentRole.CAMPAIGN,
            AgentRole.BUDGET,
            AgentRole.COMPLIANCE,
            AgentRole.ANALYTICS
        ]
        
        for role in execution_order:
            # البحث عن المهمة
            task = next(
                (t for t in self.tasks.values() if t.assigned_role == role),
                None
            )
            
            if not task:
                continue
            
            print(f"[Orchestrator] Executing task: {task.description}")
            
            # تحديث المدخلات بنتائج المهام السابقة
            task.inputs.dependencies_output = {
                r.agent.value: r.output
                for r in [results.get(prev_role) for prev_role in execution_order[:execution_order.index(role)]]
                if r
            }
            
            # تنفيذ المهمة
            agent = self.agents.get(role)
            if agent:
                try:
                    output = agent.execute(task.inputs)
                    task.output = output
                    task.status = TaskStatus.COMPLETED
                    results[role] = output
                    self.completed_tasks.append(task.id)
                    
                    # حفظ النتيجة في الـ cache
                    cache_key = f"{self.current_campaign_id}:{role.value}"
                    self.memory.results_cache.cache_result(cache_key, output.dict())
                    
                    print(f"[Orchestrator] Task completed: {role.value}")
                except Exception as e:
                    print(f"[Orchestrator] Task failed: {role.value} - {str(e)}")
                    task.status = TaskStatus.FAILED
                    task.error = str(e)
        
        return results
    
    def get_campaign_status(self, campaign_id: str) -> Dict[str, Any]:
        """الحصول على حالة الحملة"""
        campaign = self.memory.campaign_history.get_campaign(campaign_id)
        if not campaign:
            return {"error": "Campaign not found"}
        
        return {
            "campaign_id": campaign_id,
            "status": campaign.status,
            "created_at": campaign.created_at.isoformat(),
            "completed_at": campaign.completed_at.isoformat() if campaign.completed_at else None,
            "total_tasks": len(campaign.tasks),
            "completed_tasks": len([t for t in campaign.tasks if t.status == TaskStatus.COMPLETED]),
            "context": campaign.context.dict()
        }
    
    def get_system_statistics(self) -> Dict[str, Any]:
        """الحصول على إحصائيات النظام"""
        return {
            "router_statistics": self.router.get_routing_statistics(),
            "aggregator_statistics": self.aggregator.get_aggregation_statistics(),
            "decision_statistics": self.decision_engine.get_decision_statistics(),
            "memory_statistics": self.memory.get_full_statistics(),
            "agents_statistics": {
                role.value: agent.get_statistics()
                for role, agent in self.agents.items()
            }
        }
