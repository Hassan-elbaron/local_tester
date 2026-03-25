"""
Error Handling - نظام معالجة الأخطاء المتقدم
يتضمن: Fallback, Retry, Resilience, Circuit Breaker
"""

from typing import Optional, Callable, Any, List, Dict
from enum import Enum
import logging
from datetime import datetime, timedelta
import functools

logger = logging.getLogger(__name__)


class ErrorSeverity(Enum):
    """مستويات خطورة الخطأ"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ErrorType(Enum):
    """أنواع الأخطاء"""
    VALIDATION_ERROR = "validation_error"
    EXECUTION_ERROR = "execution_error"
    TIMEOUT_ERROR = "timeout_error"
    RESOURCE_ERROR = "resource_error"
    EXTERNAL_ERROR = "external_error"
    UNKNOWN_ERROR = "unknown_error"


class CustomException(Exception):
    """استثناء مخصص"""
    
    def __init__(
        self,
        message: str,
        error_type: ErrorType = ErrorType.UNKNOWN_ERROR,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        recoverable: bool = True,
        context: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_type = error_type
        self.severity = severity
        self.recoverable = recoverable
        self.context = context or {}
        self.timestamp = datetime.utcnow()
        
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """تحويل الاستثناء إلى قاموس"""
        return {
            "message": self.message,
            "error_type": self.error_type.value,
            "severity": self.severity.value,
            "recoverable": self.recoverable,
            "context": self.context,
            "timestamp": self.timestamp.isoformat()
        }


class CircuitBreaker:
    """
    Circuit Breaker Pattern
    يوقف المحاولات بعد عدد معين من الفشل
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        name: str = "circuit_breaker"
    ):
        """
        Args:
            failure_threshold: عدد الفشل المسموح قبل الفتح
            recovery_timeout: الوقت بالثواني قبل محاولة التعافي
            name: اسم Circuit Breaker
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.name = name
        
        self.failure_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.state = "closed"  # closed, open, half_open
        
        logger.info(
            f"CircuitBreaker '{name}' initialized: "
            f"threshold={failure_threshold}, timeout={recovery_timeout}s"
        )
    
    def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        استدعاء دالة مع حماية Circuit Breaker
        
        Args:
            func: الدالة المراد استدعاؤها
            *args: معاملات الدالة
            **kwargs: معاملات مسماة
            
        Returns:
            Any: نتيجة الدالة
            
        Raises:
            CustomException: إذا كان Circuit Breaker مفتوحاً
        """
        # التحقق من حالة Circuit Breaker
        if self.state == "open":
            if self._should_attempt_recovery():
                self.state = "half_open"
                logger.info(f"CircuitBreaker '{self.name}' entering half_open state")
            else:
                raise CustomException(
                    f"Circuit breaker '{self.name}' is open",
                    error_type=ErrorType.EXECUTION_ERROR,
                    severity=ErrorSeverity.HIGH,
                    recoverable=True
                )
        
        try:
            result = func(*args, **kwargs)
            
            # نجاح - إعادة تعيين الحالة
            if self.state == "half_open":
                self.state = "closed"
                self.failure_count = 0
                logger.info(f"CircuitBreaker '{self.name}' recovered to closed state")
            
            return result
        
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = datetime.utcnow()
            
            logger.warning(
                f"CircuitBreaker '{self.name}' failure {self.failure_count}/"
                f"{self.failure_threshold}: {e}"
            )
            
            if self.failure_count >= self.failure_threshold:
                self.state = "open"
                logger.error(
                    f"CircuitBreaker '{self.name}' opened after "
                    f"{self.failure_count} failures"
                )
            
            raise
    
    def _should_attempt_recovery(self) -> bool:
        """التحقق من إمكانية محاولة التعافي"""
        if not self.last_failure_time:
            return True
        
        elapsed = (datetime.utcnow() - self.last_failure_time).total_seconds()
        return elapsed >= self.recovery_timeout
    
    def reset(self):
        """إعادة تعيين Circuit Breaker"""
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "closed"
        logger.info(f"CircuitBreaker '{self.name}' reset")
    
    def get_status(self) -> Dict[str, Any]:
        """الحصول على حالة Circuit Breaker"""
        return {
            "name": self.name,
            "state": self.state,
            "failure_count": self.failure_count,
            "threshold": self.failure_threshold,
            "last_failure_time": self.last_failure_time.isoformat() if self.last_failure_time else None
        }


class RetryPolicy:
    """
    سياسة إعادة المحاولة
    """
    
    def __init__(
        self,
        max_retries: int = 3,
        initial_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True
    ):
        """
        Args:
            max_retries: الحد الأقصى لعدد المحاولات
            initial_delay: التأخير الأولي بالثواني
            max_delay: الحد الأقصى للتأخير
            exponential_base: قاعدة النمو الأسي
            jitter: إضافة عشوائية للتأخير
        """
        self.max_retries = max_retries
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter
    
    def get_delay(self, retry_count: int) -> float:
        """
        حساب التأخير للمحاولة
        
        Args:
            retry_count: رقم المحاولة
            
        Returns:
            float: التأخير بالثواني
        """
        delay = self.initial_delay * (self.exponential_base ** retry_count)
        delay = min(delay, self.max_delay)
        
        if self.jitter:
            import random
            delay = delay * (0.5 + random.random())
        
        return delay
    
    def should_retry(self, retry_count: int, error: Exception) -> bool:
        """
        التحقق من إمكانية إعادة المحاولة
        
        Args:
            retry_count: رقم المحاولة
            error: الخطأ
            
        Returns:
            bool: هل يجب إعادة المحاولة
        """
        if retry_count >= self.max_retries:
            return False
        
        # لا تعيد المحاولة للأخطاء غير القابلة للاسترجاع
        if isinstance(error, CustomException):
            return error.recoverable
        
        return True


class FallbackStrategy:
    """
    استراتيجية الخطة البديلة
    """
    
    def __init__(self):
        self.fallbacks: Dict[str, Callable] = {}
    
    def register_fallback(
        self,
        key: str,
        fallback_func: Callable
    ):
        """
        تسجيل دالة بديلة
        
        Args:
            key: مفتاح الدالة الأصلية
            fallback_func: الدالة البديلة
        """
        self.fallbacks[key] = fallback_func
        logger.info(f"Fallback registered for key: {key}")
    
    def execute_with_fallback(
        self,
        key: str,
        primary_func: Callable,
        *args,
        **kwargs
    ) -> Any:
        """
        تنفيذ الدالة الأساسية مع خطة بديلة
        
        Args:
            key: مفتاح الدالة
            primary_func: الدالة الأساسية
            *args: معاملات الدالة
            **kwargs: معاملات مسماة
            
        Returns:
            Any: نتيجة الدالة الأساسية أو البديلة
        """
        try:
            logger.debug(f"Executing primary function for key: {key}")
            return primary_func(*args, **kwargs)
        
        except Exception as e:
            logger.warning(f"Primary function failed for key {key}: {e}")
            
            if key in self.fallbacks:
                try:
                    logger.info(f"Executing fallback for key: {key}")
                    return self.fallbacks[key](*args, **kwargs)
                
                except Exception as fallback_error:
                    logger.error(f"Fallback also failed for key {key}: {fallback_error}")
                    raise CustomException(
                        f"Both primary and fallback failed for {key}",
                        error_type=ErrorType.EXECUTION_ERROR,
                        severity=ErrorSeverity.HIGH,
                        recoverable=False,
                        context={"original_error": str(e), "fallback_error": str(fallback_error)}
                    )
            else:
                raise


def retry_with_backoff(
    max_retries: int = 3,
    initial_delay: float = 1.0,
    backoff_factor: float = 2.0,
    on_retry: Optional[Callable] = None
):
    """
    Decorator لإعادة المحاولة مع التأخير الأسي
    
    Args:
        max_retries: الحد الأقصى للمحاولات
        initial_delay: التأخير الأولي
        backoff_factor: عامل النمو الأسي
        on_retry: دالة يتم استدعاؤها عند إعادة المحاولة
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            retry_policy = RetryPolicy(
                max_retries=max_retries,
                initial_delay=initial_delay,
                exponential_base=backoff_factor
            )
            
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    logger.debug(f"Attempt {attempt + 1}/{max_retries + 1} for {func.__name__}")
                    return func(*args, **kwargs)
                
                except Exception as e:
                    last_exception = e
                    
                    if not retry_policy.should_retry(attempt, e):
                        logger.error(f"Max retries reached for {func.__name__}")
                        raise
                    
                    delay = retry_policy.get_delay(attempt)
                    
                    logger.warning(
                        f"Attempt {attempt + 1} failed for {func.__name__}: {e}. "
                        f"Retrying in {delay:.2f}s..."
                    )
                    
                    if on_retry:
                        on_retry(attempt, e, delay)
                    
                    import time
                    time.sleep(delay)
            
            raise last_exception
        
        return wrapper
    
    return decorator


def handle_errors(
    default_return: Any = None,
    log_error: bool = True,
    re_raise: bool = False
):
    """
    Decorator لمعالجة الأخطاء
    
    Args:
        default_return: القيمة الافتراضية عند حدوث خطأ
        log_error: تسجيل الخطأ
        re_raise: إعادة رفع الخطأ بعد المعالجة
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            
            except Exception as e:
                if log_error:
                    logger.error(f"Error in {func.__name__}: {e}", exc_info=True)
                
                if re_raise:
                    raise
                
                return default_return
        
        return wrapper
    
    return decorator


class ErrorHandler:
    """
    معالج الأخطاء الشامل
    """
    
    def __init__(self):
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.fallback_strategy = FallbackStrategy()
        self.error_log: List[Dict[str, Any]] = []
    
    def get_or_create_circuit_breaker(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: int = 60
    ) -> CircuitBreaker:
        """الحصول على أو إنشاء Circuit Breaker"""
        if name not in self.circuit_breakers:
            self.circuit_breakers[name] = CircuitBreaker(
                failure_threshold=failure_threshold,
                recovery_timeout=recovery_timeout,
                name=name
            )
        
        return self.circuit_breakers[name]
    
    def log_error(
        self,
        error: Exception,
        context: Optional[Dict[str, Any]] = None
    ):
        """تسجيل الخطأ"""
        error_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "error_type": type(error).__name__,
            "message": str(error),
            "context": context or {}
        }
        
        self.error_log.append(error_entry)
        logger.error(f"Error logged: {error_entry}")
    
    def get_error_statistics(self) -> Dict[str, Any]:
        """الحصول على إحصائيات الأخطاء"""
        error_types = {}
        for entry in self.error_log:
            error_type = entry["error_type"]
            error_types[error_type] = error_types.get(error_type, 0) + 1
        
        return {
            "total_errors": len(self.error_log),
            "error_types": error_types,
            "circuit_breakers": {
                name: cb.get_status()
                for name, cb in self.circuit_breakers.items()
            }
        }


# إنشاء instance عام
_error_handler_instance: Optional[ErrorHandler] = None


def get_error_handler() -> ErrorHandler:
    """الحصول على معالج الأخطاء العام"""
    global _error_handler_instance
    
    if _error_handler_instance is None:
        _error_handler_instance = ErrorHandler()
    
    return _error_handler_instance
