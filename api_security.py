"""
API Security Layer
طبقة الأمان للـ API
"""

from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict
import logging
import asyncio
from functools import wraps

logger = logging.getLogger(__name__)


@dataclass
class RateLimitConfig:
    """تكوين حد المعدل"""
    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    requests_per_day: int = 10000
    burst_size: int = 10


@dataclass
class RateLimitEntry:
    """مدخل حد المعدل"""
    client_id: str
    minute_requests: int = 0
    hour_requests: int = 0
    day_requests: int = 0
    minute_reset_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    hour_reset_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    day_reset_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


class RateLimiter:
    """محدد المعدل"""
    
    def __init__(self, config: RateLimitConfig = None):
        self.config = config or RateLimitConfig()
        self.limits: Dict[str, RateLimitEntry] = defaultdict(
            lambda: RateLimitEntry(client_id="")
        )
    
    def _reset_if_needed(self, entry: RateLimitEntry):
        """إعادة تعيين العدادات إذا لزم الأمر"""
        now = datetime.utcnow()
        
        # إعادة تعيين الدقيقة
        if datetime.fromisoformat(entry.minute_reset_at) < now - timedelta(minutes=1):
            entry.minute_requests = 0
            entry.minute_reset_at = now.isoformat()
        
        # إعادة تعيين الساعة
        if datetime.fromisoformat(entry.hour_reset_at) < now - timedelta(hours=1):
            entry.hour_requests = 0
            entry.hour_reset_at = now.isoformat()
        
        # إعادة تعيين اليوم
        if datetime.fromisoformat(entry.day_reset_at) < now - timedelta(days=1):
            entry.day_requests = 0
            entry.day_reset_at = now.isoformat()
    
    def is_allowed(self, client_id: str) -> tuple[bool, Dict[str, Any]]:
        """التحقق من السماح بالطلب"""
        entry = self.limits[client_id]
        entry.client_id = client_id
        
        self._reset_if_needed(entry)
        
        # التحقق من الحدود
        if entry.minute_requests >= self.config.requests_per_minute:
            return False, {
                "error": "Rate limit exceeded (per minute)",
                "limit": self.config.requests_per_minute,
                "current": entry.minute_requests,
                "reset_at": entry.minute_reset_at
            }
        
        if entry.hour_requests >= self.config.requests_per_hour:
            return False, {
                "error": "Rate limit exceeded (per hour)",
                "limit": self.config.requests_per_hour,
                "current": entry.hour_requests,
                "reset_at": entry.hour_reset_at
            }
        
        if entry.day_requests >= self.config.requests_per_day:
            return False, {
                "error": "Rate limit exceeded (per day)",
                "limit": self.config.requests_per_day,
                "current": entry.day_requests,
                "reset_at": entry.day_reset_at
            }
        
        # زيادة العدادات
        entry.minute_requests += 1
        entry.hour_requests += 1
        entry.day_requests += 1
        
        return True, {
            "minute_remaining": self.config.requests_per_minute - entry.minute_requests,
            "hour_remaining": self.config.requests_per_hour - entry.hour_requests,
            "day_remaining": self.config.requests_per_day - entry.day_requests
        }
    
    def get_status(self, client_id: str) -> Dict[str, Any]:
        """الحصول على حالة العميل"""
        entry = self.limits.get(client_id)
        
        if not entry:
            return {
                "minute_requests": 0,
                "hour_requests": 0,
                "day_requests": 0
            }
        
        self._reset_if_needed(entry)
        
        return {
            "minute_requests": entry.minute_requests,
            "minute_limit": self.config.requests_per_minute,
            "hour_requests": entry.hour_requests,
            "hour_limit": self.config.requests_per_hour,
            "day_requests": entry.day_requests,
            "day_limit": self.config.requests_per_day
        }


class InputValidator:
    """مدقق المدخلات"""
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """التحقق من البريد الإلكتروني"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    @staticmethod
    def validate_password(password: str) -> tuple[bool, str]:
        """التحقق من كلمة المرور"""
        if len(password) < 8:
            return False, "Password must be at least 8 characters"
        
        if not any(c.isupper() for c in password):
            return False, "Password must contain at least one uppercase letter"
        
        if not any(c.islower() for c in password):
            return False, "Password must contain at least one lowercase letter"
        
        if not any(c.isdigit() for c in password):
            return False, "Password must contain at least one digit"
        
        return True, "Password is valid"
    
    @staticmethod
    def validate_campaign_data(data: Dict[str, Any]) -> tuple[bool, list]:
        """التحقق من بيانات الحملة"""
        errors = []
        
        # التحقق من المتطلبات
        required_fields = ["product", "goal", "market", "budget"]
        for field in required_fields:
            if field not in data:
                errors.append(f"Missing required field: {field}")
        
        # التحقق من الأنواع
        if "budget" in data and not isinstance(data["budget"], (int, float)):
            errors.append("Budget must be a number")
        
        if "budget" in data and data["budget"] <= 0:
            errors.append("Budget must be greater than 0")
        
        if "product" in data and len(data["product"]) < 3:
            errors.append("Product name must be at least 3 characters")
        
        return len(errors) == 0, errors
    
    @staticmethod
    def validate_decision_data(data: Dict[str, Any]) -> tuple[bool, list]:
        """التحقق من بيانات القرار"""
        errors = []
        
        if "options" not in data:
            errors.append("Missing required field: options")
        elif not isinstance(data["options"], list) or len(data["options"]) == 0:
            errors.append("Options must be a non-empty list")
        
        if "criteria_scores" not in data:
            errors.append("Missing required field: criteria_scores")
        elif not isinstance(data["criteria_scores"], dict):
            errors.append("Criteria scores must be a dictionary")
        
        return len(errors) == 0, errors


class SecurityHeaders:
    """رؤوس الأمان"""
    
    @staticmethod
    def get_security_headers() -> Dict[str, str]:
        """الحصول على رؤوس الأمان"""
        return {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Content-Security-Policy": "default-src 'self'",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        }


class IPWhitelist:
    """قائمة IP البيضاء"""
    
    def __init__(self):
        self.whitelist: set = set()
        self.blacklist: set = set()
    
    def add_to_whitelist(self, ip: str):
        """إضافة IP إلى القائمة البيضاء"""
        self.whitelist.add(ip)
    
    def add_to_blacklist(self, ip: str):
        """إضافة IP إلى القائمة السوداء"""
        self.blacklist.add(ip)
    
    def is_allowed(self, ip: str) -> bool:
        """التحقق من السماح بـ IP"""
        if ip in self.blacklist:
            return False
        
        if self.whitelist and ip not in self.whitelist:
            return False
        
        return True


class RequestValidator:
    """مدقق الطلبات"""
    
    def __init__(self):
        self.rate_limiter = RateLimiter()
        self.input_validator = InputValidator()
        self.ip_whitelist = IPWhitelist()
    
    def validate_request(
        self,
        client_id: str,
        ip_address: str,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None
    ) -> tuple[bool, Dict[str, Any]]:
        """التحقق من الطلب"""
        
        # التحقق من IP
        if not self.ip_whitelist.is_allowed(ip_address):
            return False, {"error": "IP address not allowed"}
        
        # التحقق من حد المعدل
        is_allowed, rate_info = self.rate_limiter.is_allowed(client_id)
        if not is_allowed:
            return False, rate_info
        
        # التحقق من البيانات
        if data:
            if endpoint == "/campaigns" and method == "POST":
                is_valid, errors = self.input_validator.validate_campaign_data(data)
                if not is_valid:
                    return False, {"errors": errors}
            
            elif endpoint == "/decisions" and method == "POST":
                is_valid, errors = self.input_validator.validate_decision_data(data)
                if not is_valid:
                    return False, {"errors": errors}
        
        return True, rate_info
    
    def get_security_headers(self) -> Dict[str, str]:
        """الحصول على رؤوس الأمان"""
        return SecurityHeaders.get_security_headers()


class APISecurityMiddleware:
    """middleware الأمان للـ API"""
    
    def __init__(self):
        self.request_validator = RequestValidator()
        self.request_log: list = []
    
    def validate_and_log(
        self,
        client_id: str,
        ip_address: str,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None
    ) -> tuple[bool, Dict[str, Any]]:
        """التحقق والتسجيل"""
        
        is_valid, info = self.request_validator.validate_request(
            client_id,
            ip_address,
            method,
            endpoint,
            data
        )
        
        # تسجيل الطلب
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "client_id": client_id,
            "ip_address": ip_address,
            "method": method,
            "endpoint": endpoint,
            "status": "allowed" if is_valid else "blocked",
            "details": info
        }
        
        self.request_log.append(log_entry)
        
        if not is_valid:
            logger.warning(f"Request blocked: {log_entry}")
        
        return is_valid, info
    
    def get_security_headers(self) -> Dict[str, str]:
        """الحصول على رؤوس الأمان"""
        return self.request_validator.get_security_headers()
    
    def get_request_logs(self, limit: int = 100) -> list:
        """الحصول على سجلات الطلبات"""
        return self.request_log[-limit:]


# مثال على الاستخدام
def example_usage():
    """مثال على الاستخدام"""
    
    middleware = APISecurityMiddleware()
    
    # اختبار Rate Limiting
    print("=== Rate Limiting Test ===")
    for i in range(5):
        is_valid, info = middleware.validate_and_log(
            client_id="client-1",
            ip_address="192.168.1.1",
            method="GET",
            endpoint="/campaigns"
        )
        print(f"Request {i+1}: {'Allowed' if is_valid else 'Blocked'}")
    
    # اختبار Input Validation
    print("\n=== Input Validation Test ===")
    
    # حملة صحيحة
    is_valid, info = middleware.validate_and_log(
        client_id="client-2",
        ip_address="192.168.1.2",
        method="POST",
        endpoint="/campaigns",
        data={
            "product": "Product A",
            "goal": "Launch",
            "market": "US",
            "budget": 50000
        }
    )
    print(f"Valid campaign: {is_valid}")
    
    # حملة غير صحيحة
    is_valid, info = middleware.validate_and_log(
        client_id="client-2",
        ip_address="192.168.1.2",
        method="POST",
        endpoint="/campaigns",
        data={
            "product": "A",  # قصير جداً
            "goal": "Launch",
            "market": "US",
            "budget": -100  # سالب
        }
    )
    print(f"Invalid campaign: {is_valid}")
    print(f"Errors: {info}")
    
    # الحصول على رؤوس الأمان
    print("\n=== Security Headers ===")
    headers = middleware.get_security_headers()
    for key, value in headers.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    example_usage()
