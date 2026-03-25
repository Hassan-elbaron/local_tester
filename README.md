# AI Marketing Operating System (Production-Ready v2)

نظام تشغيل تسويقي ذكي قائم على معمارية Multi-Agent مع تصميم Production-ready.

## 🏗️ البنية المعمارية

```
┌─────────────────────────────────────────────────────────────┐
│                    Master Orchestrator                       │
│  (Router → Agents → Aggregator → Decision Engine)           │
└─────────────────────────────────────────────────────────────┘
         ↓           ↓           ↓           ↓
    ┌────────────────────────────────────────────┐
    │         7 Specialized Agents               │
    ├────────────────────────────────────────────┤
    │ • Research Agent      (Market Analysis)    │
    │ • Strategy Agent      (Positioning)        │
    │ • Content Agent       (Copy Creation)      │
    │ • Campaign Agent      (Planning)           │
    │ • Analytics Agent     (KPI Framework)      │
    │ • Compliance Agent    (Review & Approval)  │
    │ • Budget Agent        (Allocation)         │
    └────────────────────────────────────────────┘
         ↓           ↓           ↓
    ┌────────────────────────────────────────────┐
    │    Model Layer (Local + Cloud)             │
    │  • Local: Llama2, Mistral, Neural-Chat    │
    │  • Cloud: GPT-4, GPT-3.5, Claude-3        │
    │  • Smart Selector + Caching               │
    └────────────────────────────────────────────┘
         ↓           ↓           ↓
    ┌────────────────────────────────────────────┐
    │    Unified Memory System                   │
    │  • Context Memory      (Campaign Context)  │
    │  • Results Cache       (Agent Outputs)     │
    │  • Decision Log        (Audit Trail)       │
    │  • Campaign History    (Tracking)          │
    └────────────────────────────────────────────┘
```

## 📦 مكونات النظام

### 1. **Schemas (schemas.py)**
تعريفات Pydantic موحدة لجميع المدخلات والمخرجات:
- `AgentInputSchema`: مدخلات موحدة لجميع الوكلاء
- `AgentOutputSchema`: مخرجات موحدة مع confidence scores
- `CampaignContextSchema`: سياق الحملة
- `CampaignPlanSchema`: خطة الحملة الكاملة

### 2. **Base Agent (base_agent.py)**
فئة أساسية لجميع الوكلاء:
```python
class BaseAgent(ABC):
    - validate_input()
    - execute()
    - create_output()
    - get_statistics()
```

### 3. **Specialized Agents**
كل وكيل في ملف مستقل:
- `agents_research.py`: تحليل السوق والمنافسين
- `agents_strategy.py`: التوضيب والرسائل
- `agents_content.py`: إنتاج المحتوى
- `agents_campaign.py`: تخطيط الحملة
- `agents_support.py`: Analytics, Compliance, Budget

### 4. **Model Layer (model_layer.py)**
إدارة ذكية للنماذج:
- `ModelSelector`: اختيار النموذج المناسب
- `LocalModelExecutor`: تنفيذ النماذج المحلية
- `CloudModelExecutor`: تنفيذ النماذج السحابية
- `ModelLayer`: واجهة موحدة مع caching

### 5. **Memory System (memory.py)**
نظام ذاكرة شامل:
- `ContextMemory`: تخزين سياق الحملات
- `ResultsCache`: تخزين مؤقت ذكي للنتائج
- `DecisionLog`: تسجيل جميع القرارات
- `CampaignHistory`: تتبع الحملات السابقة
- `UnifiedMemory`: واجهة موحدة

### 6. **Orchestrator Components**
- `orchestrator_router.py`: توجيه المهام للوكلاء المناسبين
- `orchestrator_aggregator.py`: تجميع ودمج المخرجات
- `orchestrator_decision.py`: اتخاذ القرارات المعقدة
- `orchestrator.py`: المنسق الرئيسي

## 🚀 الميزات الرئيسية

### ✅ Modular Architecture
- كل وكيل في ملف مستقل
- BaseAgent موحد لتقليل التكرار
- سهل الصيانة والتوسع

### ✅ Unified Output Schema
```json
{
  "agent": "strategy",
  "task_id": "uuid",
  "output": { "positioning": "...", "messaging": [...] },
  "confidence": 0.92,
  "metadata": { "execution_time_ms": 45 }
}
```

### ✅ Smart Model Selection
- اختيار تلقائي بين local/cloud
- معايير: speed, cost, quality, balanced
- Caching ذكي لتقليل التوكنز

### ✅ Comprehensive Memory
- Context persistence
- Results caching
- Audit trail كامل
- Campaign history

### ✅ Production-Ready
- Error handling شامل
- Statistics و monitoring
- Logging مفصل
- Performance tracking

## 📊 تدفق التشغيل

```
1. Campaign Intake
   ↓
2. Problem Framing (إنشاء المهام)
   ↓
3. Routing & Execution (توجيه وتنفيذ)
   ├─ Research Agent
   ├─ Strategy Agent
   ├─ Content Agent
   ├─ Campaign Agent
   ├─ Budget Agent
   ├─ Compliance Agent
   └─ Analytics Agent
   ↓
4. Aggregation (تجميع النتائج)
   ↓
5. Decision Making (اتخاذ القرارات)
   ↓
6. Output Packaging (تعبئة النتائج)
```

## 🔧 الاستخدام

### التشغيل الأساسي
```python
from orchestrator import MasterOrchestrator

orchestrator = MasterOrchestrator()

campaign_plan = orchestrator.run_campaign(
    goal="Launch eco-friendly shoes with 1000 sales",
    product="EcoStride Running Shoes",
    market="US Urban Millennials",
    budget=50000.0,
    constraints=["No aggressive tactics", "Highlight sustainability"]
)

print(campaign_plan)
```

### الحصول على الإحصائيات
```python
stats = orchestrator.get_system_statistics()
print(stats["router_statistics"])
print(stats["memory_statistics"])
print(stats["agents_statistics"])
```

## 📈 الإحصائيات المتاحة

### Router Statistics
- Total routings
- Agent distribution
- Average priority

### Memory Statistics
- Stored contexts
- Cache hit rate
- Total decisions
- Campaign history

### Agent Statistics
- Execution count
- Average execution time
- Total execution time

## 🎯 معايير الجودة

| المعيار | القيمة |
|--------|--------|
| Code Modularity | ⭐⭐⭐⭐⭐ |
| Scalability | ⭐⭐⭐⭐⭐ |
| Maintainability | ⭐⭐⭐⭐⭐ |
| Performance | ⭐⭐⭐⭐ |
| Documentation | ⭐⭐⭐⭐⭐ |

## 📝 الملفات الرئيسية

```
ai_marketing_os_v2/
├── schemas.py                 # Pydantic schemas
├── base_agent.py              # Base class for agents
├── agents_research.py         # Research agent
├── agents_strategy.py         # Strategy agent
├── agents_content.py          # Content agent
├── agents_campaign.py         # Campaign agent
├── agents_support.py          # Support agents
├── model_layer.py             # Model management
├── memory.py                  # Memory system
├── orchestrator_router.py     # Task routing
├── orchestrator_aggregator.py # Output aggregation
├── orchestrator_decision.py   # Decision engine
├── orchestrator.py            # Master orchestrator
├── main.py                    # Entry point
├── requirements.txt           # Dependencies
└── README.md                  # This file
```

## 🔄 التطوير المستقبلي

- [ ] إضافة وكلاء متخصصين (Social Media, Email, etc.)
- [ ] تحسين Decision Engine مع ML models
- [ ] إضافة real-time monitoring dashboard
- [ ] تكامل مع أنظمة CRM/CMS الخارجية
- [ ] Multi-language support
- [ ] Advanced analytics و reporting

## 📞 الدعم والمساهمة

للأسئلة والمساهمات، يرجى التواصل مع فريق التطوير.

---

**Version**: 2.0 (Production-Ready)  
**Last Updated**: 2024  
**Status**: ✅ Fully Functional
