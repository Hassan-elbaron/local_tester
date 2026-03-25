"""
Memory System - نظام الذاكرة
تخزين context ونتائج الحملات
"""

from typing import Dict, Any, Optional, List
from schemas import MemoryEntrySchema, DecisionLogSchema, CampaignPlanSchema
from datetime import datetime, timedelta
import json


class ContextMemory:
    """
    تخزين واسترجاع سياق الحملة
    """
    
    def __init__(self):
        self.context_store: Dict[str, Dict[str, Any]] = {}
        self.access_log: List[Dict[str, Any]] = []
    
    def store_context(
        self,
        campaign_id: str,
        context_data: Dict[str, Any],
        ttl: Optional[int] = None
    ):
        """
        تخزين سياق الحملة
        
        Args:
            campaign_id: معرف الحملة
            context_data: بيانات السياق
            ttl: مدة الحياة بالثواني (اختياري)
        """
        self.context_store[campaign_id] = {
            "data": context_data,
            "created_at": datetime.utcnow(),
            "ttl": ttl,
            "access_count": 0
        }
        
        self._log_access("store", campaign_id)
    
    def retrieve_context(self, campaign_id: str) -> Optional[Dict[str, Any]]:
        """
        استرجاع سياق الحملة
        
        Args:
            campaign_id: معرف الحملة
            
        Returns:
            Dict: بيانات السياق أو None
        """
        if campaign_id not in self.context_store:
            return None
        
        entry = self.context_store[campaign_id]
        
        # التحقق من TTL
        if entry["ttl"]:
            age = (datetime.utcnow() - entry["created_at"]).total_seconds()
            if age > entry["ttl"]:
                del self.context_store[campaign_id]
                return None
        
        # تحديث عدد الوصول
        entry["access_count"] += 1
        self._log_access("retrieve", campaign_id)
        
        return entry["data"]
    
    def update_context(
        self,
        campaign_id: str,
        updates: Dict[str, Any]
    ):
        """
        تحديث سياق الحملة
        
        Args:
            campaign_id: معرف الحملة
            updates: التحديثات
        """
        if campaign_id in self.context_store:
            self.context_store[campaign_id]["data"].update(updates)
            self._log_access("update", campaign_id)
    
    def delete_context(self, campaign_id: str):
        """حذف سياق الحملة"""
        if campaign_id in self.context_store:
            del self.context_store[campaign_id]
            self._log_access("delete", campaign_id)
    
    def _log_access(self, action: str, campaign_id: str):
        """تسجيل الوصول"""
        self.access_log.append({
            "action": action,
            "campaign_id": campaign_id,
            "timestamp": datetime.utcnow()
        })
    
    def get_statistics(self) -> Dict[str, Any]:
        """الحصول على إحصائيات الذاكرة"""
        return {
            "stored_contexts": len(self.context_store),
            "total_accesses": len(self.access_log),
            "access_log_size": len(self.access_log)
        }


class ResultsCache:
    """
    تخزين مؤقت لنتائج الوكلاء
    """
    
    def __init__(self, max_size: int = 1000):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.max_size = max_size
        self.hit_count = 0
        self.miss_count = 0
    
    def cache_result(
        self,
        key: str,
        result: Dict[str, Any],
        ttl: Optional[int] = 3600
    ):
        """
        تخزين النتيجة
        
        Args:
            key: مفتاح التخزين
            result: النتيجة
            ttl: مدة الحياة بالثواني
        """
        # إذا امتلأ الـ cache، احذف الأقدم
        if len(self.cache) >= self.max_size:
            oldest_key = min(
                self.cache.keys(),
                key=lambda k: self.cache[k]["created_at"]
            )
            del self.cache[oldest_key]
        
        self.cache[key] = {
            "result": result,
            "created_at": datetime.utcnow(),
            "ttl": ttl,
            "access_count": 0
        }
    
    def get_result(self, key: str) -> Optional[Dict[str, Any]]:
        """
        استرجاع النتيجة
        
        Args:
            key: مفتاح التخزين
            
        Returns:
            Dict: النتيجة أو None
        """
        if key not in self.cache:
            self.miss_count += 1
            return None
        
        entry = self.cache[key]
        
        # التحقق من TTL
        if entry["ttl"]:
            age = (datetime.utcnow() - entry["created_at"]).total_seconds()
            if age > entry["ttl"]:
                del self.cache[key]
                self.miss_count += 1
                return None
        
        entry["access_count"] += 1
        self.hit_count += 1
        return entry["result"]
    
    def clear_cache(self):
        """مسح الـ cache"""
        self.cache.clear()
    
    def get_statistics(self) -> Dict[str, Any]:
        """الحصول على إحصائيات الـ cache"""
        total = self.hit_count + self.miss_count
        return {
            "cache_size": len(self.cache),
            "max_size": self.max_size,
            "hit_count": self.hit_count,
            "miss_count": self.miss_count,
            "hit_rate": (
                self.hit_count / total * 100
                if total > 0
                else 0
            )
        }


class DecisionLog:
    """
    تسجيل جميع القرارات والاختيارات
    """
    
    def __init__(self):
        self.decisions: List[DecisionLogSchema] = []
    
    def log_decision(
        self,
        decision_id: str,
        campaign_id: str,
        decision_type: str,
        reasoning: Dict[str, Any],
        agent_opinions: Dict[str, Dict[str, Any]],
        final_decision: Dict[str, Any]
    ):
        """
        تسجيل قرار
        
        Args:
            decision_id: معرف القرار
            campaign_id: معرف الحملة
            decision_type: نوع القرار
            reasoning: المنطق
            agent_opinions: آراء الوكلاء
            final_decision: القرار النهائي
        """
        decision = DecisionLogSchema(
            decision_id=decision_id,
            campaign_id=campaign_id,
            decision_type=decision_type,
            reasoning=reasoning,
            agent_opinions=agent_opinions,
            final_decision=final_decision
        )
        self.decisions.append(decision)
    
    def get_campaign_decisions(self, campaign_id: str) -> List[DecisionLogSchema]:
        """الحصول على قرارات الحملة"""
        return [d for d in self.decisions if d.campaign_id == campaign_id]
    
    def get_decision(self, decision_id: str) -> Optional[DecisionLogSchema]:
        """الحصول على قرار محدد"""
        for d in self.decisions:
            if d.decision_id == decision_id:
                return d
        return None
    
    def export_decisions(self, campaign_id: str) -> str:
        """تصدير قرارات الحملة"""
        decisions = self.get_campaign_decisions(campaign_id)
        return json.dumps(
            [d.dict() for d in decisions],
            default=str,
            indent=2
        )
    
    def get_statistics(self) -> Dict[str, Any]:
        """الحصول على إحصائيات القرارات"""
        decision_types = {}
        for d in self.decisions:
            decision_types[d.decision_type] = (
                decision_types.get(d.decision_type, 0) + 1
            )
        
        return {
            "total_decisions": len(self.decisions),
            "decision_types": decision_types,
            "unique_campaigns": len(set(d.campaign_id for d in self.decisions))
        }


class CampaignHistory:
    """
    تتبع تاريخ الحملات والنتائج
    """
    
    def __init__(self):
        self.campaigns: Dict[str, CampaignPlanSchema] = {}
    
    def save_campaign(self, campaign_plan: CampaignPlanSchema):
        """حفظ خطة الحملة"""
        self.campaigns[campaign_plan.campaign_id] = campaign_plan
    
    def get_campaign(self, campaign_id: str) -> Optional[CampaignPlanSchema]:
        """الحصول على خطة الحملة"""
        return self.campaigns.get(campaign_id)
    
    def get_all_campaigns(self) -> List[CampaignPlanSchema]:
        """الحصول على جميع الحملات"""
        return list(self.campaigns.values())
    
    def get_campaigns_by_status(self, status: str) -> List[CampaignPlanSchema]:
        """الحصول على الحملات حسب الحالة"""
        return [c for c in self.campaigns.values() if c.status == status]
    
    def update_campaign_status(self, campaign_id: str, status: str):
        """تحديث حالة الحملة"""
        if campaign_id in self.campaigns:
            self.campaigns[campaign_id].status = status
    
    def get_statistics(self) -> Dict[str, Any]:
        """الحصول على إحصائيات الحملات"""
        statuses = {}
        for c in self.campaigns.values():
            statuses[c.status] = statuses.get(c.status, 0) + 1
        
        return {
            "total_campaigns": len(self.campaigns),
            "statuses": statuses,
            "average_budget": (
                sum(c.context.budget for c in self.campaigns.values()) /
                len(self.campaigns)
                if self.campaigns
                else 0
            )
        }


class UnifiedMemory:
    """
    نظام الذاكرة الموحد
    يجمع جميع مكونات الذاكرة
    """
    
    def __init__(self):
        self.context = ContextMemory()
        self.results_cache = ResultsCache()
        self.decision_log = DecisionLog()
        self.campaign_history = CampaignHistory()
    
    def get_full_statistics(self) -> Dict[str, Any]:
        """الحصول على إحصائيات شاملة"""
        return {
            "context_memory": self.context.get_statistics(),
            "results_cache": self.results_cache.get_statistics(),
            "decision_log": self.decision_log.get_statistics(),
            "campaign_history": self.campaign_history.get_statistics()
        }
    
    def clear_all(self):
        """مسح جميع الذاكرة"""
        self.context.context_store.clear()
        self.results_cache.clear_cache()
        self.decision_log.decisions.clear()
        self.campaign_history.campaigns.clear()
