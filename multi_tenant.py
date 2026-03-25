"""
Multi-Tenant Architecture
معمارية متعددة المستأجرين
"""

from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field, asdict
from datetime import datetime
import json
import logging
from pathlib import Path
import secrets

logger = logging.getLogger(__name__)


@dataclass
class TenantConfig:
    """تكوين المستأجر"""
    tenant_id: str
    name: str
    company: str
    email: str
    plan: str  # free, starter, professional, enterprise
    status: str  # active, suspended, inactive
    created_at: str
    updated_at: str
    max_campaigns: int = 5
    max_users: int = 5
    max_api_calls_per_day: int = 1000
    features: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class TenantData:
    """بيانات المستأجر"""
    tenant_id: str
    campaigns: Dict[str, Any] = field(default_factory=dict)
    decisions: Dict[str, Any] = field(default_factory=dict)
    analytics: Dict[str, Any] = field(default_factory=dict)
    custom_data: Dict[str, Any] = field(default_factory=dict)


class TenantManager:
    """مدير المستأجرين"""
    
    def __init__(self, storage_dir: str = "./tenants"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        
        self.tenants: Dict[str, TenantConfig] = {}
        self.tenant_data: Dict[str, TenantData] = {}
        
        self._load_tenants()
    
    def _load_tenants(self):
        """تحميل المستأجرين"""
        for file_path in self.storage_dir.glob("tenant_*.json"):
            try:
                with open(file_path, 'r') as f:
                    data = json.load(f)
                    tenant = TenantConfig(**data)
                    self.tenants[tenant.tenant_id] = tenant
                    self.tenant_data[tenant.tenant_id] = TenantData(tenant.tenant_id)
            except Exception as e:
                logger.error(f"Failed to load tenant: {file_path}: {e}")
    
    def create_tenant(
        self,
        name: str,
        company: str,
        email: str,
        plan: str = "starter"
    ) -> TenantConfig:
        """إنشاء مستأجر جديد"""
        tenant_id = f"tenant_{secrets.token_hex(8)}"
        
        # تحديد الخصائص بناءً على الخطة
        plan_config = self._get_plan_config(plan)
        
        tenant = TenantConfig(
            tenant_id=tenant_id,
            name=name,
            company=company,
            email=email,
            plan=plan,
            status="active",
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
            max_campaigns=plan_config["max_campaigns"],
            max_users=plan_config["max_users"],
            max_api_calls_per_day=plan_config["max_api_calls_per_day"],
            features=plan_config["features"]
        )
        
        self.tenants[tenant_id] = tenant
        self.tenant_data[tenant_id] = TenantData(tenant_id)
        
        self._save_tenant(tenant)
        
        logger.info(f"Tenant created: {tenant_id} ({name})")
        
        return tenant
    
    def _get_plan_config(self, plan: str) -> Dict[str, Any]:
        """الحصول على تكوين الخطة"""
        plans = {
            "free": {
                "max_campaigns": 1,
                "max_users": 1,
                "max_api_calls_per_day": 100,
                "features": ["basic_analytics"]
            },
            "starter": {
                "max_campaigns": 5,
                "max_users": 5,
                "max_api_calls_per_day": 1000,
                "features": ["basic_analytics", "multiple_campaigns"]
            },
            "professional": {
                "max_campaigns": 50,
                "max_users": 20,
                "max_api_calls_per_day": 10000,
                "features": ["advanced_analytics", "api_access", "custom_reports"]
            },
            "enterprise": {
                "max_campaigns": 1000,
                "max_users": 100,
                "max_api_calls_per_day": 100000,
                "features": ["advanced_analytics", "api_access", "custom_reports", "dedicated_support"]
            }
        }
        
        return plans.get(plan, plans["starter"])
    
    def _save_tenant(self, tenant: TenantConfig):
        """حفظ المستأجر"""
        file_path = self.storage_dir / f"tenant_{tenant.tenant_id}.json"
        with open(file_path, 'w') as f:
            json.dump(tenant.to_dict(), f, indent=2)
    
    def get_tenant(self, tenant_id: str) -> Optional[TenantConfig]:
        """الحصول على مستأجر"""
        return self.tenants.get(tenant_id)
    
    def update_tenant(self, tenant_id: str, updates: Dict[str, Any]):
        """تحديث المستأجر"""
        tenant = self.get_tenant(tenant_id)
        
        if not tenant:
            raise ValueError(f"Tenant not found: {tenant_id}")
        
        for key, value in updates.items():
            if hasattr(tenant, key):
                setattr(tenant, key, value)
        
        tenant.updated_at = datetime.utcnow().isoformat()
        self._save_tenant(tenant)
        
        logger.info(f"Tenant updated: {tenant_id}")
    
    def upgrade_plan(self, tenant_id: str, new_plan: str):
        """ترقية خطة المستأجر"""
        tenant = self.get_tenant(tenant_id)
        
        if not tenant:
            raise ValueError(f"Tenant not found: {tenant_id}")
        
        plan_config = self._get_plan_config(new_plan)
        
        self.update_tenant(tenant_id, {
            "plan": new_plan,
            "max_campaigns": plan_config["max_campaigns"],
            "max_users": plan_config["max_users"],
            "max_api_calls_per_day": plan_config["max_api_calls_per_day"],
            "features": plan_config["features"]
        })
        
        logger.info(f"Tenant plan upgraded: {tenant_id} -> {new_plan}")
    
    def suspend_tenant(self, tenant_id: str):
        """تعليق المستأجر"""
        self.update_tenant(tenant_id, {"status": "suspended"})
        logger.info(f"Tenant suspended: {tenant_id}")
    
    def activate_tenant(self, tenant_id: str):
        """تفعيل المستأجر"""
        self.update_tenant(tenant_id, {"status": "active"})
        logger.info(f"Tenant activated: {tenant_id}")
    
    def list_tenants(self) -> List[TenantConfig]:
        """قائمة المستأجرين"""
        return list(self.tenants.values())
    
    def get_tenant_statistics(self, tenant_id: str) -> Dict[str, Any]:
        """الحصول على إحصائيات المستأجر"""
        tenant = self.get_tenant(tenant_id)
        
        if not tenant:
            return {}
        
        data = self.tenant_data.get(tenant_id)
        
        return {
            "tenant_id": tenant_id,
            "name": tenant.name,
            "plan": tenant.plan,
            "status": tenant.status,
            "total_campaigns": len(data.campaigns) if data else 0,
            "total_decisions": len(data.decisions) if data else 0,
            "max_campaigns": tenant.max_campaigns,
            "max_users": tenant.max_users,
            "features": tenant.features
        }


class TenantDataManager:
    """مدير بيانات المستأجرين"""
    
    def __init__(self, tenant_manager: TenantManager):
        self.tenant_manager = tenant_manager
    
    def save_campaign(
        self,
        tenant_id: str,
        campaign_id: str,
        campaign_data: Dict[str, Any]
    ):
        """حفظ حملة"""
        tenant = self.tenant_manager.get_tenant(tenant_id)
        
        if not tenant:
            raise ValueError(f"Tenant not found: {tenant_id}")
        
        data = self.tenant_manager.tenant_data.get(tenant_id)
        
        if not data:
            data = TenantData(tenant_id)
            self.tenant_manager.tenant_data[tenant_id] = data
        
        # التحقق من حد الحملات
        if len(data.campaigns) >= tenant.max_campaigns:
            raise ValueError(f"Campaign limit reached for tenant {tenant_id}")
        
        data.campaigns[campaign_id] = {
            "data": campaign_data,
            "created_at": datetime.utcnow().isoformat()
        }
        
        logger.info(f"Campaign saved for tenant {tenant_id}: {campaign_id}")
    
    def get_campaign(
        self,
        tenant_id: str,
        campaign_id: str
    ) -> Optional[Dict[str, Any]]:
        """الحصول على حملة"""
        data = self.tenant_manager.tenant_data.get(tenant_id)
        
        if not data or campaign_id not in data.campaigns:
            return None
        
        return data.campaigns[campaign_id]["data"]
    
    def list_campaigns(self, tenant_id: str) -> List[Dict[str, Any]]:
        """قائمة الحملات"""
        data = self.tenant_manager.tenant_data.get(tenant_id)
        
        if not data:
            return []
        
        return [
            {
                "campaign_id": cid,
                **campaign["data"]
            }
            for cid, campaign in data.campaigns.items()
        ]
    
    def delete_campaign(self, tenant_id: str, campaign_id: str):
        """حذف حملة"""
        data = self.tenant_manager.tenant_data.get(tenant_id)
        
        if data and campaign_id in data.campaigns:
            del data.campaigns[campaign_id]
            logger.info(f"Campaign deleted for tenant {tenant_id}: {campaign_id}")
    
    def save_decision(
        self,
        tenant_id: str,
        decision_id: str,
        decision_data: Dict[str, Any]
    ):
        """حفظ قرار"""
        data = self.tenant_manager.tenant_data.get(tenant_id)
        
        if not data:
            data = TenantData(tenant_id)
            self.tenant_manager.tenant_data[tenant_id] = data
        
        data.decisions[decision_id] = {
            "data": decision_data,
            "created_at": datetime.utcnow().isoformat()
        }
    
    def get_decision(
        self,
        tenant_id: str,
        decision_id: str
    ) -> Optional[Dict[str, Any]]:
        """الحصول على قرار"""
        data = self.tenant_manager.tenant_data.get(tenant_id)
        
        if not data or decision_id not in data.decisions:
            return None
        
        return data.decisions[decision_id]["data"]
    
    def list_decisions(self, tenant_id: str) -> List[Dict[str, Any]]:
        """قائمة القرارات"""
        data = self.tenant_manager.tenant_data.get(tenant_id)
        
        if not data:
            return []
        
        return [
            {
                "decision_id": did,
                **decision["data"]
            }
            for did, decision in data.decisions.items()
        ]


class TenantContext:
    """سياق المستأجر"""
    
    def __init__(self, tenant_id: str, user_id: str):
        self.tenant_id = tenant_id
        self.user_id = user_id
        self.created_at = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "tenant_id": self.tenant_id,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat()
        }


class MultiTenantSystem:
    """نظام متعدد المستأجرين الموحد"""
    
    def __init__(self, storage_dir: str = "./multi_tenant_storage"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        
        self.tenant_manager = TenantManager(str(self.storage_dir / "tenants"))
        self.data_manager = TenantDataManager(self.tenant_manager)
    
    def get_tenant_summary(self, tenant_id: str) -> Dict[str, Any]:
        """الحصول على ملخص المستأجر"""
        tenant = self.tenant_manager.get_tenant(tenant_id)
        
        if not tenant:
            return {}
        
        stats = self.tenant_manager.get_tenant_statistics(tenant_id)
        
        return {
            "tenant": tenant.to_dict(),
            "statistics": stats
        }
    
    def get_system_overview(self) -> Dict[str, Any]:
        """الحصول على نظرة عامة على النظام"""
        tenants = self.tenant_manager.list_tenants()
        
        return {
            "total_tenants": len(tenants),
            "active_tenants": len([t for t in tenants if t.status == "active"]),
            "by_plan": {
                plan: len([t for t in tenants if t.plan == plan])
                for plan in ["free", "starter", "professional", "enterprise"]
            },
            "total_campaigns": sum(
                len(self.tenant_manager.tenant_data.get(t.tenant_id, TenantData(t.tenant_id)).campaigns)
                for t in tenants
            )
        }


# مثال على الاستخدام
def example_usage():
    """مثال على الاستخدام"""
    
    system = MultiTenantSystem()
    
    # إنشاء مستأجر
    tenant = system.tenant_manager.create_tenant(
        name="Acme Corp",
        company="Acme Corporation",
        email="admin@acme.com",
        plan="professional"
    )
    
    print(f"Tenant created: {tenant.tenant_id}")
    
    # حفظ حملة
    system.data_manager.save_campaign(
        tenant.tenant_id,
        "campaign-1",
        {
            "product": "Product A",
            "goal": "Launch",
            "budget": 50000
        }
    )
    
    # الحصول على الحملات
    campaigns = system.data_manager.list_campaigns(tenant.tenant_id)
    print(f"Campaigns: {campaigns}")
    
    # الإحصائيات
    stats = system.tenant_manager.get_tenant_statistics(tenant.tenant_id)
    print(f"Tenant statistics: {stats}")
    
    # نظرة عامة
    overview = system.get_system_overview()
    print(f"System overview: {overview}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    example_usage()
