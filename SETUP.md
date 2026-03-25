# Setup & Installation Guide

دليل الإعداد والتثبيت لـ AI Marketing Operating System v2

## 📋 المتطلبات

- Python 3.8+
- pip أو poetry
- 2GB RAM (للنماذج المحلية)
- اتصال إنترنت (للنماذج السحابية)

## 🔧 خطوات التثبيت

### 1. استنساخ المشروع
```bash
cd /home/ubuntu
git clone <repository-url> ai_marketing_os_v2
cd ai_marketing_os_v2
```

### 2. إنشاء Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate  # على Linux/Mac
# أو
venv\Scripts\activate  # على Windows
```

### 3. تثبيت المتطلبات
```bash
pip install -r requirements.txt
```

### 4. إعداد متغيرات البيئة
```bash
# إنشاء ملف .env
cat > .env << EOF
# OpenAI API (للنماذج السحابية)
OPENAI_API_KEY=your_api_key_here

# Anthropic API (اختياري)
ANTHROPIC_API_KEY=your_api_key_here

# Model Configuration
DEFAULT_LOCAL_MODEL=llama2
DEFAULT_CLOUD_MODEL=gpt-4
EOF
```

## 🚀 التشغيل الأول

### تشغيل بسيط
```bash
python3 main.py
```

### النتائج المتوقعة
```
======================================================================
   AI Marketing Operating System (Production-Ready v2)
======================================================================
[Campaign] Product: EcoStride Running Shoes
[Campaign] Goal: Launch eco-friendly running shoes with 1000 sales
[Campaign] Budget: $50,000.00
[Campaign] Market: US Urban Millennials
----------------------------------------------------------------------
[Orchestrator] Starting campaign...
[Orchestrator] Phase 2: Problem Framing
[Orchestrator] Phase 3: Routing & Execution
[Orchestrator] Executing task: Market research and competitive analysis
...
[Orchestrator] Campaign completed successfully!
```

## 📚 الاستخدام المتقدم

### 1. تشغيل حملة مخصصة
```python
from orchestrator import MasterOrchestrator

orchestrator = MasterOrchestrator()

campaign = orchestrator.run_campaign(
    goal="Your marketing goal",
    product="Your product name",
    market="Your target market",
    budget=10000.0,
    constraints=["Constraint 1", "Constraint 2"]
)

print(campaign)
```

### 2. الوصول إلى الإحصائيات
```python
stats = orchestrator.get_system_statistics()

# Router statistics
print(stats["router_statistics"])

# Memory statistics
print(stats["memory_statistics"])

# Agent statistics
print(stats["agents_statistics"])
```

### 3. استخدام وكيل محدد
```python
from agents_strategy import StrategyAgent
from schemas import AgentInputSchema, CampaignContextSchema

agent = StrategyAgent()

context = CampaignContextSchema(
    goal="Launch new product",
    product="Product Name",
    market="Target Market",
    budget=50000,
    constraints=[]
)

agent_input = AgentInputSchema(
    agent_role=agent.role,
    task_id="task-123",
    context=context
)

output = agent.execute(agent_input)
print(output)
```

### 4. استخدام Model Layer مباشرة
```python
from model_layer import ModelLayer

model_layer = ModelLayer()

# توليد نص باستخدام نموذج محلي
response = model_layer.generate(
    prompt="Your prompt here",
    model_type="local",
    task_complexity="medium",
    priority="balanced"
)

print(response)

# الحصول على الإحصائيات
stats = model_layer.get_statistics()
print(stats)
```

### 5. استخدام Memory System
```python
from memory import UnifiedMemory

memory = UnifiedMemory()

# تخزين سياق
memory.context.store_context(
    campaign_id="campaign-123",
    context_data={"goal": "...", "budget": 50000}
)

# استرجاع سياق
context = memory.context.retrieve_context("campaign-123")

# الحصول على الإحصائيات
stats = memory.get_full_statistics()
print(stats)
```

## 🔌 التكامل مع الأنظمة الخارجية

### تكامل مع CRM
```python
# يمكن إضافة في agents_support.py
class CRMIntegration:
    def sync_campaign_data(self, campaign_id, crm_client):
        # تنفيذ التكامل
        pass
```

### تكامل مع Analytics
```python
# يمكن توسيع AnalyticsAgent
class AdvancedAnalytics:
    def setup_tracking(self, campaign_id, analytics_client):
        # إعداد التتبع
        pass
```

## 🐛 استكشاف الأخطاء

### مشكلة: "ModuleNotFoundError"
```bash
# الحل: تأكد من تثبيت المتطلبات
pip install -r requirements.txt
```

### مشكلة: "API Key not found"
```bash
# الحل: تأكد من إعداد متغيرات البيئة
export OPENAI_API_KEY=your_key
```

### مشكلة: "Slow execution"
```bash
# الحل: استخدم local models أو قلل cache size
model_layer = ModelLayer()
model_layer.clear_cache()
```

## 📊 المراقبة والتسجيل

### تفعيل Logging
```python
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

### عرض الإحصائيات
```python
import json

stats = orchestrator.get_system_statistics()
print(json.dumps(stats, indent=2))
```

## 🔐 الأمان

### Best Practices
1. **لا تخزن API keys في الكود**
   - استخدم متغيرات البيئة
   - استخدم .env files

2. **تشفير البيانات الحساسة**
   - استخدم encryption للسياق المخزن
   - استخدم HTTPS للـ API calls

3. **التحقق من المدخلات**
   - استخدم Pydantic validation
   - تحقق من القيود

## 🚀 التطوير المحلي

### تشغيل الاختبارات
```bash
# إضافة اختبارات في tests/ directory
python -m pytest tests/
```

### تشغيل مع Debug Mode
```bash
python -m pdb main.py
```

### Profiling الأداء
```python
import cProfile
import pstats

profiler = cProfile.Profile()
profiler.enable()

# كود المشروع هنا

profiler.disable()
stats = pstats.Stats(profiler)
stats.print_stats()
```

## 📈 التحسينات المستقبلية

- [ ] إضافة اختبارات شاملة
- [ ] تحسين الأداء مع async/await
- [ ] إضافة dashboard للمراقبة
- [ ] دعم multi-language
- [ ] تكامل مع أنظمة إضافية

## 📞 الدعم

للمساعدة والدعم:
- اقرأ README.md للمزيد من المعلومات
- راجع EXAMPLES.md للأمثلة
- تحقق من الأخطاء الشائعة أعلاه

---

**آخر تحديث**: 2024  
**الإصدار**: 2.0
