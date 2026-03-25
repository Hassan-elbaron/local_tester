# استخدام الأمثلة - AI Marketing OS v2

أمثلة عملية لاستخدام نظام التشغيل التسويقي الذكي

## 📌 مثال 1: تشغيل حملة كاملة

```python
from orchestrator import MasterOrchestrator

# إنشاء المنسق
orchestrator = MasterOrchestrator()

# تشغيل حملة
campaign = orchestrator.run_campaign(
    goal="Launch eco-friendly running shoes with 1000 sales in Q3",
    product="EcoStride Running Shoes",
    market="US Urban Millennials",
    budget=50000.0,
    constraints=[
        "No aggressive sales tactics",
        "Must highlight recycled materials",
        "Comply with FTC guidelines"
    ]
)

# طباعة النتائج
print(f"Campaign ID: {campaign.campaign_id}")
print(f"Status: {campaign.status}")
print(f"Strategy: {campaign.results['strategy'].output}")
print(f"Budget Allocation: {campaign.results['budget'].output}")
```

## 📌 مثال 2: استخدام وكيل محدد

### استخدام Research Agent
```python
from agents_research import ResearchAgent
from schemas import AgentInputSchema, CampaignContextSchema

# إنشاء الوكيل
research_agent = ResearchAgent()

# إنشاء السياق
context = CampaignContextSchema(
    goal="Understand the sustainable footwear market",
    product="EcoStride Running Shoes",
    market="US Urban Millennials",
    budget=50000,
    constraints=["Sustainability focus"]
)

# إنشاء المدخلات
agent_input = AgentInputSchema(
    agent_role=research_agent.role,
    task_id="research-001",
    context=context
)

# تنفيذ الوكيل
output = research_agent.execute(agent_input)

# عرض النتائج
print(f"Agent: {output.agent.value}")
print(f"Confidence: {output.confidence}")
print(f"Market Size: {output.output.get('market_framing', {}).get('market_size')}")
print(f"Growth Rate: {output.output.get('market_framing', {}).get('growth_rate')}")
```

### استخدام Strategy Agent
```python
from agents_strategy import StrategyAgent

strategy_agent = StrategyAgent()

# المدخلات (مع نتائج البحث)
agent_input = AgentInputSchema(
    agent_role=strategy_agent.role,
    task_id="strategy-001",
    context=context,
    dependencies_output={
        "research": research_output.output
    }
)

output = strategy_agent.execute(agent_input)

print(f"Positioning: {output.output.get('positioning')}")
print(f"Messaging Pillars: {output.output.get('messaging_pillars')}")
print(f"Value Proposition: {output.output.get('value_proposition')}")
```

### استخدام Content Agent
```python
from agents_content import ContentAgent

content_agent = ContentAgent()

agent_input = AgentInputSchema(
    agent_role=content_agent.role,
    task_id="content-001",
    context=context,
    dependencies_output={
        "strategy": strategy_output.output
    }
)

output = content_agent.execute(agent_input)

print("Social Media Copies:")
for copy in output.output.get('social_copies', []):
    print(f"  - {copy}")

print("\nAd Copies:")
for copy in output.output.get('ad_copies', []):
    print(f"  - {copy}")
```

## 📌 مثال 3: استخدام Model Layer

### اختيار النموذج المناسب
```python
from model_layer import ModelLayer, ModelSelector

selector = ModelSelector()

# اختيار نموذج محلي سريع
model_name = selector.select_model(
    model_type="local",
    task_complexity="simple",
    priority="speed"
)
print(f"Selected model: {model_name}")  # mistral

# اختيار نموذج سحابي عالي الجودة
model_name = selector.select_model(
    model_type="cloud",
    task_complexity="complex",
    priority="quality"
)
print(f"Selected model: {model_name}")  # gpt-4
```

### توليد النصوص
```python
model_layer = ModelLayer()

# توليد نص بسيط
response = model_layer.generate(
    prompt="Write a catchy headline for eco-friendly shoes",
    model_type="local",
    priority="speed"
)
print(f"Generated: {response}")

# توليد نص معقد
response = model_layer.generate(
    prompt="Create a comprehensive marketing strategy for sustainable products",
    model_type="cloud",
    priority="quality"
)
print(f"Generated: {response}")

# الحصول على الإحصائيات
stats = model_layer.get_statistics()
print(f"Cache Hit Rate: {stats['cache_hit_rate']:.1f}%")
print(f"Local Calls: {stats['local_calls']}")
print(f"Cloud Calls: {stats['cloud_calls']}")
```

## 📌 مثال 4: استخدام Memory System

### تخزين واسترجاع السياق
```python
from memory import UnifiedMemory

memory = UnifiedMemory()

# تخزين سياق الحملة
campaign_id = "campaign-eco-shoes-2024"
context_data = {
    "goal": "Launch eco-friendly shoes",
    "budget": 50000,
    "market": "US Urban Millennials",
    "constraints": ["Sustainability focus"]
}

memory.context.store_context(campaign_id, context_data, ttl=3600)

# استرجاع السياق
retrieved = memory.context.retrieve_context(campaign_id)
print(f"Retrieved context: {retrieved}")

# تحديث السياق
memory.context.update_context(campaign_id, {
    "status": "in_progress",
    "phase": 2
})
```

### استخدام Results Cache
```python
# تخزين النتائج
cache_key = f"{campaign_id}:strategy"
strategy_result = {
    "positioning": "Premium & Sustainable",
    "messaging_pillars": ["Quality", "Sustainability", "Innovation"]
}

memory.results_cache.cache_result(cache_key, strategy_result)

# استرجاع من الـ cache
cached = memory.results_cache.get_result(cache_key)
print(f"Cached result: {cached}")

# إحصائيات الـ cache
cache_stats = memory.results_cache.get_statistics()
print(f"Cache Hit Rate: {cache_stats['hit_rate']:.1f}%")
```

### تسجيل القرارات
```python
import uuid

decision_id = str(uuid.uuid4())
memory.decision_log.log_decision(
    decision_id=decision_id,
    campaign_id=campaign_id,
    decision_type="channel_selection",
    reasoning={
        "criteria": ["ROI", "Audience Reach", "Cost Efficiency"],
        "scores": {"Facebook": 0.92, "Google": 0.88, "LinkedIn": 0.75}
    },
    agent_opinions={
        "strategy": {"recommendation": "Facebook + Google"},
        "analytics": {"recommendation": "Facebook + Google + Email"}
    },
    final_decision={"channels": ["Facebook", "Google"]}
)

# استرجاع القرارات
decisions = memory.decision_log.get_campaign_decisions(campaign_id)
print(f"Total decisions: {len(decisions)}")
```

### تتبع الحملات
```python
from schemas import CampaignPlanSchema

# حفظ خطة الحملة
campaign_plan = CampaignPlanSchema(
    campaign_id=campaign_id,
    context=context,
    tasks=[],
    results={},
    synthesis={},
    status="completed"
)

memory.campaign_history.save_campaign(campaign_plan)

# استرجاع الحملة
retrieved_campaign = memory.campaign_history.get_campaign(campaign_id)
print(f"Campaign status: {retrieved_campaign.status}")

# الحصول على جميع الحملات
all_campaigns = memory.campaign_history.get_all_campaigns()
print(f"Total campaigns: {len(all_campaigns)}")

# الحصول على الحملات حسب الحالة
completed = memory.campaign_history.get_campaigns_by_status("completed")
print(f"Completed campaigns: {len(completed)}")
```

## 📌 مثال 5: الإحصائيات والمراقبة

### الحصول على إحصائيات شاملة
```python
orchestrator = MasterOrchestrator()

# تشغيل حملة
campaign = orchestrator.run_campaign(...)

# الحصول على الإحصائيات
stats = orchestrator.get_system_statistics()

# Router Statistics
print("=== Router Statistics ===")
router_stats = stats["router_statistics"]
print(f"Total Routings: {router_stats['total_routings']}")
print(f"Agent Distribution: {router_stats['agent_distribution']}")

# Memory Statistics
print("\n=== Memory Statistics ===")
memory_stats = stats["memory_statistics"]
print(f"Stored Contexts: {memory_stats['context_memory']['stored_contexts']}")
print(f"Cache Hit Rate: {memory_stats['results_cache']['hit_rate']:.1f}%")
print(f"Total Decisions: {memory_stats['decision_log']['total_decisions']}")

# Agent Statistics
print("\n=== Agent Statistics ===")
agent_stats = stats["agents_statistics"]
for agent_name, stats_data in agent_stats.items():
    print(f"{agent_name}:")
    print(f"  Executions: {stats_data['execution_count']}")
    print(f"  Avg Time: {stats_data['average_execution_time_ms']:.2f}ms")
```

## 📌 مثال 6: معالجة الأخطاء

```python
from orchestrator import MasterOrchestrator
import logging

logging.basicConfig(level=logging.DEBUG)

orchestrator = MasterOrchestrator()

try:
    campaign = orchestrator.run_campaign(
        goal="",  # goal فارغ - سيسبب خطأ
        product="Product",
        market="Market",
        budget=50000,
        constraints=[]
    )
except ValueError as e:
    print(f"Validation Error: {e}")
except Exception as e:
    print(f"Unexpected Error: {e}")
    logging.exception("Campaign execution failed")
```

## 📌 مثال 7: التكامل مع الأنظمة الخارجية

```python
# مثال على تكامل مع CRM
class CRMIntegration:
    def __init__(self, crm_api_key):
        self.api_key = crm_api_key
    
    def sync_campaign(self, campaign_plan):
        """مزامنة خطة الحملة مع CRM"""
        campaign_data = {
            "name": campaign_plan.context.product,
            "goal": campaign_plan.context.goal,
            "budget": campaign_plan.context.budget,
            "status": campaign_plan.status
        }
        # تنفيذ API call
        return campaign_data

# الاستخدام
crm = CRMIntegration(api_key="your_crm_key")
orchestrator = MasterOrchestrator()

campaign = orchestrator.run_campaign(...)
crm.sync_campaign(campaign)
```

## 📌 مثال 8: حفظ وتصدير النتائج

```python
import json
from datetime import datetime

orchestrator = MasterOrchestrator()
campaign = orchestrator.run_campaign(...)

# حفظ كـ JSON
output_file = f"campaign_{campaign.campaign_id}_{datetime.now().isoformat()}.json"
with open(output_file, 'w') as f:
    json.dump(campaign.dict(), f, indent=2, default=str)

print(f"Campaign saved to: {output_file}")

# تصدير الإحصائيات
stats = orchestrator.get_system_statistics()
stats_file = f"stats_{campaign.campaign_id}.json"
with open(stats_file, 'w') as f:
    json.dump(stats, f, indent=2, default=str)

print(f"Statistics saved to: {stats_file}")
```

---

**ملاحظات مهمة:**
- جميع الأمثلة تفترض تثبيت المتطلبات بشكل صحيح
- استخدم try-except للتعامل مع الأخطاء
- راجع README.md للمزيد من التفاصيل المعمارية
- راجع SETUP.md لتعليمات الإعداد
