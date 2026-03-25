"""
Unified Schemas for AI Marketing OS
استخدام Pydantic لتنظيم جميع inputs/outputs
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime


class AgentRole(str, Enum):
    """تعريف أدوار الوكلاء"""
    STRATEGY = "strategy"
    CONTENT = "content"
    CAMPAIGN = "campaign"
    ANALYTICS = "analytics"
    RESEARCH = "research"
    COMPLIANCE = "compliance"
    BUDGET = "budget"
    COMMUNITY = "community"
    WATCHMAN = "watchman"
    FUTURIST = "futurist"
    SUPPORT = "support"
    OPTIMIZATION = "optimization"


class ModelType(str, Enum):
    """نوع النموذج"""
    LOCAL = "local"
    CLOUD = "cloud"


class TaskStatus(str, Enum):
    """حالة المهمة"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    NEEDS_REVIEW = "needs_review"


# ==================== INPUT SCHEMAS ====================

class CampaignContextSchema(BaseModel):
    """سياق الحملة"""
    goal: str = Field(..., description="الهدف الرئيسي للحملة")
    product: str = Field(..., description="اسم المنتج")
    market: str = Field(..., description="السوق المستهدف")
    budget: float = Field(..., gt=0, description="الميزانية بالدولار")
    constraints: List[str] = Field(default_factory=list, description="القيود والشروط")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="بيانات إضافية")
    
    class Config:
        json_schema_extra = {
            "example": {
                "goal": "زيادة المبيعات بنسبة 50%",
                "product": "منتج جديد",
                "market": "السوق المحلي",
                "budget": 50000.0,
                "constraints": ["يجب الامتثال للقوانين"]
            }
        }


class AgentInputSchema(BaseModel):
    """مدخلات الوكيل الموحدة"""
    agent_role: AgentRole = Field(..., description="دور الوكيل")
    task_id: str = Field(..., description="معرف المهمة")
    context: CampaignContextSchema = Field(..., description="سياق الحملة")
    dependencies_output: Dict[str, Any] = Field(
        default_factory=dict,
        description="مخرجات المهام السابقة"
    )
    parameters: Dict[str, Any] = Field(
        default_factory=dict,
        description="معاملات إضافية خاصة بالوكيل"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "agent_role": "strategy",
                "task_id": "task_001",
                "context": {
                    "goal": "إطلاق منتج",
                    "product": "منتج X",
                    "market": "السوق Y",
                    "budget": 50000.0
                },
                "dependencies_output": {},
                "parameters": {}
            }
        }


# ==================== OUTPUT SCHEMAS ====================

class AgentOutputSchema(BaseModel):
    """مخرجات الوكيل الموحدة"""
    agent: AgentRole = Field(..., description="الوكيل الذي أنتج هذا المخرج")
    task_id: str = Field(..., description="معرف المهمة")
    output: Dict[str, Any] = Field(..., description="المخرج الفعلي")
    confidence: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="درجة الثقة في المخرج (0-1)"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="بيانات إضافية"
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "agent": "strategy",
                "task_id": "task_001",
                "output": {
                    "positioning": "متميز",
                    "messaging_pillars": ["الجودة", "الابتكار"]
                },
                "confidence": 0.95,
                "metadata": {"model_used": "local"}
            }
        }


class TaskSchema(BaseModel):
    """تعريف المهمة"""
    id: str = Field(..., description="معرف فريد للمهمة")
    description: str = Field(..., description="وصف المهمة")
    assigned_role: AgentRole = Field(..., description="الوكيل المسؤول")
    status: TaskStatus = Field(default=TaskStatus.PENDING)
    dependencies: List[str] = Field(default_factory=list, description="معرفات المهام السابقة")
    inputs: AgentInputSchema = Field(..., description="مدخلات المهمة")
    output: Optional[AgentOutputSchema] = Field(default=None, description="مخرجات المهمة")
    error: Optional[str] = Field(default=None, description="رسالة الخطأ إن وجدت")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = Field(default=None)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "task_001",
                "description": "تطوير استراتيجية",
                "assigned_role": "strategy",
                "status": "completed",
                "dependencies": [],
                "inputs": {},
                "output": {}
            }
        }


class CampaignPlanSchema(BaseModel):
    """خطة الحملة النهائية"""
    campaign_id: str = Field(..., description="معرف الحملة")
    context: CampaignContextSchema = Field(..., description="سياق الحملة")
    tasks: List[TaskSchema] = Field(..., description="قائمة المهام")
    results: Dict[AgentRole, AgentOutputSchema] = Field(
        default_factory=dict,
        description="مخرجات كل وكيل"
    )
    synthesis: Dict[str, Any] = Field(
        default_factory=dict,
        description="النتائج المدمجة"
    )
    status: str = Field(default="in_progress", description="حالة الخطة")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = Field(default=None)


# ==================== MEMORY SCHEMAS ====================

class MemoryEntrySchema(BaseModel):
    """إدخال في الذاكرة"""
    key: str = Field(..., description="مفتاح الإدخال")
    value: Any = Field(..., description="قيمة الإدخال")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    ttl: Optional[int] = Field(default=None, description="مدة الحياة بالثواني")


class DecisionLogSchema(BaseModel):
    """سجل القرارات"""
    decision_id: str = Field(..., description="معرف القرار")
    campaign_id: str = Field(..., description="معرف الحملة")
    decision_type: str = Field(..., description="نوع القرار")
    reasoning: Dict[str, Any] = Field(..., description="المنطق خلف القرار")
    agent_opinions: Dict[AgentRole, Dict[str, Any]] = Field(
        default_factory=dict,
        description="آراء الوكلاء"
    )
    final_decision: Dict[str, Any] = Field(..., description="القرار النهائي")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ==================== MODEL LAYER SCHEMAS ====================

class ModelConfigSchema(BaseModel):
    """إعدادات النموذج"""
    model_type: ModelType = Field(..., description="نوع النموذج")
    model_name: str = Field(..., description="اسم النموذج")
    temperature: float = Field(default=0.7, ge=0.0, le=1.0)
    max_tokens: int = Field(default=512, gt=0)
    top_p: float = Field(default=0.9, ge=0.0, le=1.0)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ModelResponseSchema(BaseModel):
    """استجابة النموذج"""
    model_name: str = Field(..., description="اسم النموذج المستخدم")
    model_type: ModelType = Field(..., description="نوع النموذج")
    prompt: str = Field(..., description="الـ prompt المستخدم")
    response: str = Field(..., description="الاستجابة")
    tokens_used: Optional[int] = Field(default=None, description="عدد التوكنز المستخدمة")
    latency_ms: Optional[float] = Field(default=None, description="وقت الاستجابة بالميلي ثانية")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ==================== ROUTER SCHEMAS ====================

class RoutingDecisionSchema(BaseModel):
    """قرار التوجيه"""
    task_id: str = Field(..., description="معرف المهمة")
    assigned_agent: AgentRole = Field(..., description="الوكيل المعين")
    priority: int = Field(default=0, description="الأولوية")
    reasoning: str = Field(..., description="سبب التوجيه")
    estimated_duration_ms: Optional[int] = Field(default=None)


class AggregationResultSchema(BaseModel):
    """نتيجة التجميع"""
    aggregation_id: str = Field(..., description="معرف التجميع")
    source_outputs: List[AgentOutputSchema] = Field(..., description="المخرجات المجمعة")
    aggregated_data: Dict[str, Any] = Field(..., description="البيانات المجمعة")
    synthesis_notes: str = Field(..., description="ملاحظات التجميع")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ==================== DECISION LAYER SCHEMAS ====================

class DecisionCriteriaSchema(BaseModel):
    """معايير القرار"""
    criteria_type: str = Field(..., description="نوع المعيار")
    weight: float = Field(default=1.0, ge=0.0, description="وزن المعيار")
    threshold: Optional[float] = Field(default=None, description="الحد الأدنى")
    description: str = Field(..., description="وصف المعيار")


class DecisionContextSchema(BaseModel):
    """سياق القرار"""
    decision_type: str = Field(..., description="نوع القرار")
    available_options: List[Dict[str, Any]] = Field(..., description="الخيارات المتاحة")
    criteria: List[DecisionCriteriaSchema] = Field(..., description="معايير التقييم")
    constraints: List[str] = Field(default_factory=list, description="القيود")


class DecisionResultSchema(BaseModel):
    """نتيجة القرار"""
    decision_id: str = Field(..., description="معرف القرار")
    selected_option: Dict[str, Any] = Field(..., description="الخيار المختار")
    confidence_score: float = Field(ge=0.0, le=1.0, description="درجة الثقة")
    reasoning: Dict[str, Any] = Field(..., description="المنطق خلف القرار")
    alternative_options: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="الخيارات البديلة"
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow)
