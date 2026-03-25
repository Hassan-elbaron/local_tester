"""
Enhanced Memory Layer v4 - طبقة الذاكرة المحسّنة
يتضمن: Campaign History, Learning, Advanced Caching
"""

from typing import Dict, Any, Optional, List, Set
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
import json
import logging
import hashlib
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class CampaignRecord:
    \"\"\"سجل الحملة\"\"\"
    campaign_id: str
    product: str
    goal: str
    market: str
    budget: float
    status: str
    created_at: str
    updated_at: str
    results: Dict[str, Any] = field(default_factory=dict)
    decisions: List[Dict[str, Any]] = field(default_factory=list)
    metrics: Dict[str, float] = field(default_factory=dict)
    lessons_learned: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class CacheEntry:
    \"\"\"مدخل الكاش\"\"\"
    key: str
    value: Any
    created_at: str
    expires_at: str
    hit_count: int = 0
    
    def is_expired(self) -> bool:
        \"\"\"التحقق من انتهاء الصلاحية\"\"\"
        return datetime.fromisoformat(self.expires_at) < datetime.utcnow()


class CampaignHistoryManager:
    \"\"\"مدير سجل الحملات\"\"\"
    
    def __init__(self, storage_dir: str = \"./campaign_history\"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        
        self.campaigns: Dict[str, CampaignRecord] = {}
        self._load_campaigns()
    
    def _load_campaigns(self):
        \"\"\"تحميل الحملات من التخزين\"\"\"
        for file_path in self.storage_dir.glob(\"campaign_*.json\"):
            try:
                with open(file_path, 'r') as f:
                    data = json.load(f)
                    campaign = CampaignRecord(**data)
                    self.campaigns[campaign.campaign_id] = campaign
            except Exception as e:
                logger.error(f\"Failed to load campaign: {file_path}: {e}\")
    
    def save_campaign(
        self,
        campaign_id: str,
        product: str,
        goal: str,
        market: str,
        budget: float,
        status: str,
        results: Optional[Dict[str, Any]] = None,
        metrics: Optional[Dict[str, float]] = None
    ) -> CampaignRecord:
        \"\"\"حفظ حملة\"\"\"
        now = datetime.utcnow().isoformat()
        
        campaign = CampaignRecord(
            campaign_id=campaign_id,
            product=product,
            goal=goal,
            market=market,
            budget=budget,
            status=status,
            created_at=now,
            updated_at=now,
            results=results or {},
            metrics=metrics or {}
        )
        
        self.campaigns[campaign_id] = campaign
        
        # حفظ في الملف
        file_path = self.storage_dir / f\"campaign_{campaign_id}.json\"
        with open(file_path, 'w') as f:
            json.dump(campaign.to_dict(), f, indent=2)
        
        logger.info(f\"Campaign saved: {campaign_id}\")
        
        return campaign
    
    def update_campaign(
        self,
        campaign_id: str,
        updates: Dict[str, Any]
    ):
        \"\"\"تحديث حملة\"\"\"
        if campaign_id not in self.campaigns:
            logger.warning(f\"Campaign not found: {campaign_id}\")
            return
        
        campaign = self.campaigns[campaign_id]
        
        # تحديث الحقول
        for key, value in updates.items():
            if hasattr(campaign, key):
                setattr(campaign, key, value)
        
        campaign.updated_at = datetime.utcnow().isoformat()
        
        # حفظ التحديث
        file_path = self.storage_dir / f\"campaign_{campaign_id}.json\"
        with open(file_path, 'w') as f:
            json.dump(campaign.to_dict(), f, indent=2)
        
        logger.info(f\"Campaign updated: {campaign_id}\")
    
    def add_decision(
        self,
        campaign_id: str,
        decision: Dict[str, Any]
    ):
        \"\"\"إضافة قرار إلى الحملة\"\"\"
        if campaign_id not in self.campaigns:
            logger.warning(f\"Campaign not found: {campaign_id}\")
            return
        
        campaign = self.campaigns[campaign_id]
        campaign.decisions.append({
            \"timestamp\": datetime.utcnow().isoformat(),
            **decision
        })
        
        self.update_campaign(campaign_id, {\"decisions\": campaign.decisions})
    
    def add_lesson_learned(
        self,
        campaign_id: str,
        lesson: str
    ):
        \"\"\"إضافة درس مستفاد\"\"\"
        if campaign_id not in self.campaigns:
            logger.warning(f\"Campaign not found: {campaign_id}\")
            return
        
        campaign = self.campaigns[campaign_id]
        campaign.lessons_learned.append(lesson)
        
        self.update_campaign(campaign_id, {\"lessons_learned\": campaign.lessons_learned})
    
    def get_campaign(self, campaign_id: str) -> Optional[CampaignRecord]:
        \"\"\"الحصول على حملة\"\"\"
        return self.campaigns.get(campaign_id)
    
    def get_similar_campaigns(
        self,
        market: str,
        product_category: Optional[str] = None,
        limit: int = 5
    ) -> List[CampaignRecord]:
        \"\"\"الحصول على حملات مشابهة\"\"\"
        similar = [
            campaign for campaign in self.campaigns.values()
            if campaign.market == market
        ]
        
        return similar[:limit]
    
    def get_campaign_statistics(self) -> Dict[str, Any]:
        \"\"\"الحصول على إحصائيات الحملات\"\"\"
        if not self.campaigns:
            return {\"total_campaigns\": 0}
        
        total_budget = sum(c.budget for c in self.campaigns.values())
        avg_budget = total_budget / len(self.campaigns)
        
        status_counts = {}
        for campaign in self.campaigns.values():
            status = campaign.status
            status_counts[status] = status_counts.get(status, 0) + 1
        
        return {
            \"total_campaigns\": len(self.campaigns),
            \"total_budget\": total_budget,
            \"avg_budget\": avg_budget,
            \"by_status\": status_counts
        }


class AdvancedCachingSystem:
    \"\"\"نظام الكاش المتقدم\"\"\"
    
    def __init__(self, max_size_mb: int = 100, default_ttl: int = 1800):
        self.cache: Dict[str, CacheEntry] = {}
        self.max_size_mb = max_size_mb
        self.default_ttl = default_ttl
        self.current_size_mb = 0
    
    def _calculate_size(self, obj: Any) -> float:
        \"\"\"حساب حجم الكائن بالـ MB\"\"\"
        try:
            return len(json.dumps(obj)) / (1024 * 1024)
        except:
            return 0.001
    
    def _make_key(self, prefix: str, data: Dict[str, Any]) -> str:
        \"\"\"إنشاء مفتاح كاش\"\"\"
        data_str = json.dumps(data, sort_keys=True)
        hash_val = hashlib.md5(data_str.encode()).hexdigest()
        return f\"{prefix}:{hash_val}\"
    
    def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None
    ):
        \"\"\"حفظ في الكاش\"\"\"
        ttl = ttl or self.default_ttl
        
        size = self._calculate_size(value)
        
        # التحقق من المساحة
        if self.current_size_mb + size > self.max_size_mb:
            self._evict_oldest()
        
        expires_at = (datetime.utcnow() + timedelta(seconds=ttl)).isoformat()
        
        entry = CacheEntry(
            key=key,
            value=value,
            created_at=datetime.utcnow().isoformat(),
            expires_at=expires_at
        )
        
        self.cache[key] = entry
        self.current_size_mb += size
        
        logger.debug(f\"Cache set: {key} (ttl={ttl}s)\")
    
    def get(self, key: str) -> Optional[Any]:
        \"\"\"الحصول من الكاش\"\"\"
        if key not in self.cache:
            return None
        
        entry = self.cache[key]
        
        # التحقق من انتهاء الصلاحية
        if entry.is_expired():
            del self.cache[key]
            return None
        
        # تحديث عدد الضربات
        entry.hit_count += 1
        
        logger.debug(f\"Cache hit: {key}\")
        
        return entry.value
    
    def delete(self, key: str):
        \"\"\"حذف من الكاش\"\"\"
        if key in self.cache:
            del self.cache[key]
    
    def clear(self):
        \"\"\"مسح الكاش\"\"\"
        self.cache.clear()
        self.current_size_mb = 0
    
    def _evict_oldest(self):
        \"\"\"إزالة أقدم عنصر\"\"\"
        if not self.cache:
            return
        
        oldest_key = min(
            self.cache.keys(),
            key=lambda k: self.cache[k].created_at
        )
        
        del self.cache[oldest_key]
    
    def get_statistics(self) -> Dict[str, Any]:
        \"\"\"الحصول على إحصائيات الكاش\"\"\"
        total_hits = sum(e.hit_count for e in self.cache.values())
        
        return {
            \"total_entries\": len(self.cache),
            \"current_size_mb\": self.current_size_mb,
            \"max_size_mb\": self.max_size_mb,
            \"total_hits\": total_hits,
            \"avg_hits_per_entry\": total_hits / len(self.cache) if self.cache else 0
        }


class LearningSystem:
    \"\"\"نظام التعلم من النتائج\"\"\"
    
    def __init__(self):
        self.patterns: Dict[str, List[Dict[str, Any]]] = {}
        self.success_metrics: Dict[str, float] = {}
        self.failure_patterns: Dict[str, int] = {}
    
    def record_outcome(
        self,
        pattern_name: str,
        inputs: Dict[str, Any],
        outputs: Dict[str, Any],
        metrics: Dict[str, float]
    ):
        \"\"\"تسجيل نتيجة\"\"\"
        if pattern_name not in self.patterns:
            self.patterns[pattern_name] = []
        
        self.patterns[pattern_name].append({
            \"timestamp\": datetime.utcnow().isoformat(),
            \"inputs\": inputs,
            \"outputs\": outputs,
            \"metrics\": metrics
        })
        
        # تحديث متوسط النجاح
        success_rate = metrics.get(\"success_rate\", 0)
        if pattern_name not in self.success_metrics:
            self.success_metrics[pattern_name] = success_rate
        else:
            # متوسط متحرك
            self.success_metrics[pattern_name] = (
                self.success_metrics[pattern_name] * 0.7 + success_rate * 0.3
            )
    
    def get_best_patterns(self, limit: int = 5) -> List[str]:
        \"\"\"الحصول على أفضل الأنماط\"\"\"
        sorted_patterns = sorted(
            self.success_metrics.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return [pattern for pattern, _ in sorted_patterns[:limit]]
    
    def get_pattern_insights(self, pattern_name: str) -> Dict[str, Any]:
        \"\"\"الحصول على رؤى الأنماط\"\"\"
        if pattern_name not in self.patterns:
            return {}
        
        outcomes = self.patterns[pattern_name]
        
        if not outcomes:
            return {}
        
        avg_metrics = {}
        for metric_name in outcomes[0][\"metrics\"].keys():
            values = [o[\"metrics\"][metric_name] for o in outcomes]
            avg_metrics[metric_name] = sum(values) / len(values)
        
        return {
            \"pattern_name\": pattern_name,
            \"total_outcomes\": len(outcomes),
            \"avg_metrics\": avg_metrics,
            \"success_rate\": self.success_metrics.get(pattern_name, 0)
        }


class EnhancedMemoryV4:
    \"\"\"نظام الذاكرة المحسّن v4\"\"\"
    
    def __init__(
        self,
        storage_dir: str = \"./storage\",
        cache_max_size_mb: int = 100
    ):
        self.campaign_history = CampaignHistoryManager(storage_dir)
        self.cache = AdvancedCachingSystem(max_size_mb=cache_max_size_mb)
        self.learning = LearningSystem()
    
    def get_full_statistics(self) -> Dict[str, Any]:
        \"\"\"الحصول على إحصائيات شاملة\"\"\"
        return {
            \"campaigns\": self.campaign_history.get_campaign_statistics(),
            \"cache\": self.cache.get_statistics(),
            \"learning_patterns\": len(self.learning.patterns)
        }
    
    def get_recommendations(
        self,
        market: str,
        product_category: Optional[str] = None
    ) -> Dict[str, Any]:
        \"\"\"الحصول على توصيات بناءً على التاريخ\"\"\"
        # الحصول على حملات مشابهة
        similar_campaigns = self.campaign_history.get_similar_campaigns(
            market=market,
            product_category=product_category,
            limit=5
        )
        
        # الحصول على أفضل الأنماط
        best_patterns = self.learning.get_best_patterns(limit=3)
        
        # استخراج الدروس المستفادة
        lessons = []
        for campaign in similar_campaigns:
            lessons.extend(campaign.lessons_learned)
        
        return {
            \"similar_campaigns\": [c.campaign_id for c in similar_campaigns],
            \"best_patterns\": best_patterns,
            \"lessons_learned\": list(set(lessons)),
            \"avg_budget\": sum(c.budget for c in similar_campaigns) / len(similar_campaigns) if similar_campaigns else 0
        }


# مثال على الاستخدام
def example_usage():
    \"\"\"مثال على الاستخدام\"\"\"
    
    memory = EnhancedMemoryV4()
    
    # حفظ حملة
    campaign = memory.campaign_history.save_campaign(
        campaign_id=\"campaign-1\",
        product=\"EcoStride\",
        goal=\"Launch eco-friendly shoes\",
        market=\"US Urban Millennials\",
        budget=50000,
        status=\"active\"
    )
    
    # إضافة قرار
    memory.campaign_history.add_decision(
        \"campaign-1\",
        {\"decision_type\": \"channel\", \"value\": \"social_media\"}
    )
    
    # إضافة درس
    memory.campaign_history.add_lesson_learned(
        \"campaign-1\",
        \"Social media was highly effective for this demographic\"
    )
    
    # استخدام الكاش
    memory.cache.set(\"campaign-1-data\", campaign.to_dict())
    cached_data = memory.cache.get(\"campaign-1-data\")
    
    # تسجيل نتيجة
    memory.learning.record_outcome(
        \"social_media_campaign\",
        {\"market\": \"US\", \"budget\": 50000},
        {\"reach\": 100000, \"engagement\": 5000},
        {\"success_rate\": 0.85}
    )
    
    # الحصول على التوصيات
    recommendations = memory.get_recommendations(\"US Urban Millennials\")
    print(json.dumps(recommendations, indent=2))
    
    # الإحصائيات
    stats = memory.get_full_statistics()
    print(json.dumps(stats, indent=2))


if __name__ == \"__main__\":
    logging.basicConfig(level=logging.INFO)
    example_usage()
