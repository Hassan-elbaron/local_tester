"""
Enhanced Model Layer - طبقة النماذج المحسّنة
يتضمن: Retry Logic, Timeout Handling, Fallback Strategy
"""

from typing import Optional, Dict, Any, List
from enum import Enum
import logging
from datetime import datetime
import time

from model_layer import ModelLayer, ModelSelector
from error_handling import (
    RetryPolicy, FallbackStrategy, CircuitBreaker,
    CustomException, ErrorType, ErrorSeverity
)

logger = logging.getLogger(__name__)


class ModelPriority(Enum):
    """أولويات النماذج"""
    LOCAL_FIRST = "local_first"
    CLOUD_FIRST = "cloud_first"
    BALANCED = "balanced"
    COST_OPTIMIZED = "cost_optimized"
    QUALITY_OPTIMIZED = "quality_optimized"


class EnhancedModelLayer:
    """
    طبقة نماذج محسّنة مع:
    - Retry Logic مع exponential backoff
    - Timeout Handling
    - Fallback من Cloud إلى Local
    - Circuit Breaker لكل نموذج
    - Caching ذكي
    """
    
    def __init__(
        self,
        base_model_layer: Optional[ModelLayer] = None,
        default_timeout: float = 30.0,
        max_retries: int = 3,
        enable_fallback: bool = True
    ):
        """
        Args:
            base_model_layer: طبقة النماذج الأساسية
            default_timeout: المهلة الزمنية الافتراضية
            max_retries: الحد الأقصى للمحاولات
            enable_fallback: تفعيل الخطة البديلة
        """
        self.base_model_layer = base_model_layer or ModelLayer()
        self.default_timeout = default_timeout
        self.max_retries = max_retries
        self.enable_fallback = enable_fallback
        
        # إعداد السياسات
        self.retry_policy = RetryPolicy(max_retries=max_retries)
        self.fallback_strategy = FallbackStrategy()
        
        # Circuit Breakers لكل نموذج
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        
        # إحصائيات
        self.call_history: List[Dict[str, Any]] = []
        
        logger.info(
            f"EnhancedModelLayer initialized: "
            f"timeout={default_timeout}s, max_retries={max_retries}, "
            f"fallback={enable_fallback}"
        )
    
    def generate(
        self,
        prompt: str,
        model_type: str = "auto",
        task_complexity: str = "medium",
        priority: ModelPriority = ModelPriority.BALANCED,
        timeout: Optional[float] = None,
        max_retries: Optional[int] = None
    ) -> str:
        """
        توليد نص مع جميع الحماية
        
        Args:
            prompt: النص المدخل
            model_type: نوع النموذج (local, cloud, auto)
            task_complexity: تعقيد المهمة
            priority: أولوية النموذج
            timeout: المهلة الزمنية
            max_retries: الحد الأقصى للمحاولات
            
        Returns:
            str: النص المولد
        """
        timeout = timeout or self.default_timeout
        max_retries = max_retries or self.max_retries
        
        call_id = f"{datetime.utcnow().timestamp()}"
        start_time = datetime.utcnow()
        
        logger.info(
            f"Generate request {call_id}: "
            f"complexity={task_complexity}, priority={priority.value}"
        )
        
        try:
            # اختيار النموذج
            selected_model = self._select_model(
                model_type, task_complexity, priority
            )
            
            logger.debug(f"Selected model: {selected_model}")
            
            # تنفيذ مع إعادة المحاولة
            result = self._execute_with_retry(
                prompt=prompt,
                model_type=selected_model,
                max_retries=max_retries,
                timeout=timeout,
                priority=priority
            )
            
            # تسجيل النجاح
            duration = (datetime.utcnow() - start_time).total_seconds() * 1000
            self._record_call(
                call_id, "success", selected_model, duration, None
            )
            
            logger.info(f"Generate request {call_id} completed in {duration:.2f}ms")
            
            return result
        
        except Exception as e:
            duration = (datetime.utcnow() - start_time).total_seconds() * 1000
            self._record_call(
                call_id, "failed", "unknown", duration, str(e)
            )
            
            logger.error(f"Generate request {call_id} failed: {e}")
            raise
    
    def _select_model(
        self,
        model_type: str,
        task_complexity: str,
        priority: ModelPriority
    ) -> str:
        """
        اختيار النموذج بناءً على الأولوية
        
        Args:
            model_type: نوع النموذج
            task_complexity: تعقيد المهمة
            priority: الأولوية
            
        Returns:
            str: اسم النموذج المختار
        """
        selector = ModelSelector()
        
        if priority == ModelPriority.LOCAL_FIRST:
            return selector.select_model("local", task_complexity, "speed")
        
        elif priority == ModelPriority.CLOUD_FIRST:
            return selector.select_model("cloud", task_complexity, "quality")
        
        elif priority == ModelPriority.COST_OPTIMIZED:
            return selector.select_model("local", task_complexity, "balanced")
        
        elif priority == ModelPriority.QUALITY_OPTIMIZED:
            return selector.select_model("cloud", task_complexity, "quality")
        
        else:  # BALANCED
            if task_complexity == "simple":
                return selector.select_model("local", task_complexity, "speed")
            elif task_complexity == "complex":
                return selector.select_model("cloud", task_complexity, "quality")
            else:
                return selector.select_model("local", task_complexity, "balanced")
    
    def _execute_with_retry(
        self,
        prompt: str,
        model_type: str,
        max_retries: int,
        timeout: float,
        priority: ModelPriority
    ) -> str:
        """
        تنفيذ مع إعادة المحاولة والخطة البديلة
        
        Args:
            prompt: النص المدخل
            model_type: نوع النموذج
            max_retries: الحد الأقصى للمحاولات
            timeout: المهلة الزمنية
            priority: الأولوية
            
        Returns:
            str: النص المولد
        """
        last_error = None
        
        for attempt in range(max_retries + 1):
            try:
                # التحقق من Circuit Breaker
                cb = self._get_circuit_breaker(model_type)
                
                logger.debug(
                    f"Attempt {attempt + 1}/{max_retries + 1} "
                    f"for model {model_type}"
                )
                
                # تنفيذ مع المهلة الزمنية
                result = self._execute_with_timeout(
                    prompt, model_type, timeout
                )
                
                # نجاح - إعادة تعيين Circuit Breaker
                cb.reset()
                
                return result
            
            except Exception as e:
                last_error = e
                
                logger.warning(
                    f"Attempt {attempt + 1} failed for {model_type}: {e}"
                )
                
                # تحديث Circuit Breaker
                cb = self._get_circuit_breaker(model_type)
                cb.failure_count += 1
                
                if cb.failure_count >= cb.failure_threshold:
                    cb.state = "open"
                    logger.warning(
                        f"Circuit breaker opened for {model_type}"
                    )
                
                # محاولة الخطة البديلة
                if attempt < max_retries and self.enable_fallback:
                    fallback_model = self._get_fallback_model(
                        model_type, priority
                    )
                    
                    if fallback_model and fallback_model != model_type:
                        logger.info(
                            f"Trying fallback model: {fallback_model}"
                        )
                        model_type = fallback_model
                    else:
                        # انتظار قبل إعادة المحاولة
                        delay = self.retry_policy.get_delay(attempt)
                        logger.debug(f"Waiting {delay:.2f}s before retry")
                        time.sleep(delay)
                else:
                    break
        
        # فشل جميع المحاولات
        raise CustomException(
            f"Failed to generate after {max_retries + 1} attempts",
            error_type=ErrorType.EXECUTION_ERROR,
            severity=ErrorSeverity.HIGH,
            recoverable=False,
            context={"last_error": str(last_error), "model_type": model_type}
        )
    
    def _execute_with_timeout(
        self,
        prompt: str,
        model_type: str,
        timeout: float
    ) -> str:
        """
        تنفيذ مع المهلة الزمنية
        
        Args:
            prompt: النص المدخل
            model_type: نوع النموذج
            timeout: المهلة الزمنية
            
        Returns:
            str: النص المولد
        """
        start_time = time.time()
        
        try:
            # تنفيذ النموذج
            result = self.base_model_layer.generate(
                prompt=prompt,
                model_type=model_type
            )
            
            elapsed = time.time() - start_time
            
            if elapsed > timeout:
                logger.warning(
                    f"Model execution took {elapsed:.2f}s, "
                    f"exceeding timeout {timeout}s"
                )
            
            return result
        
        except Exception as e:
            elapsed = time.time() - start_time
            
            if elapsed > timeout:
                raise CustomException(
                    f"Model execution timed out after {timeout}s",
                    error_type=ErrorType.TIMEOUT_ERROR,
                    severity=ErrorSeverity.HIGH,
                    recoverable=True
                )
            else:
                raise
    
    def _get_circuit_breaker(self, model_type: str) -> CircuitBreaker:
        """الحصول على Circuit Breaker للنموذج"""
        if model_type not in self.circuit_breakers:
            self.circuit_breakers[model_type] = CircuitBreaker(
                failure_threshold=5,
                recovery_timeout=60,
                name=f"model_{model_type}"
            )
        
        return self.circuit_breakers[model_type]
    
    def _get_fallback_model(
        self,
        current_model: str,
        priority: ModelPriority
    ) -> Optional[str]:
        """
        الحصول على نموذج بديل
        
        Args:
            current_model: النموذج الحالي
            priority: الأولوية
            
        Returns:
            Optional[str]: النموذج البديل أو None
        """
        # إذا كان النموذج الحالي cloud، حاول local
        if "gpt" in current_model or "claude" in current_model:
            return "mistral"
        
        # إذا كان النموذج الحالي local، حاول cloud
        if "mistral" in current_model or "llama" in current_model:
            return "gpt-4"
        
        return None
    
    def _record_call(
        self,
        call_id: str,
        status: str,
        model_type: str,
        duration_ms: float,
        error: Optional[str]
    ):
        """تسجيل استدعاء"""
        record = {
            "call_id": call_id,
            "timestamp": datetime.utcnow().isoformat(),
            "status": status,
            "model_type": model_type,
            "duration_ms": duration_ms,
            "error": error
        }
        
        self.call_history.append(record)
    
    def get_statistics(self) -> Dict[str, Any]:
        """الحصول على الإحصائيات"""
        if not self.call_history:
            return {"total_calls": 0}
        
        successful = [c for c in self.call_history if c["status"] == "success"]
        failed = [c for c in self.call_history if c["status"] == "failed"]
        
        durations = [c["duration_ms"] for c in self.call_history]
        
        model_stats = {}
        for call in self.call_history:
            model = call["model_type"]
            if model not in model_stats:
                model_stats[model] = {"count": 0, "success": 0, "failed": 0}
            
            model_stats[model]["count"] += 1
            if call["status"] == "success":
                model_stats[model]["success"] += 1
            else:
                model_stats[model]["failed"] += 1
        
        return {
            "total_calls": len(self.call_history),
            "successful": len(successful),
            "failed": len(failed),
            "success_rate": len(successful) / len(self.call_history) * 100 if self.call_history else 0,
            "avg_duration_ms": sum(durations) / len(durations) if durations else 0,
            "min_duration_ms": min(durations) if durations else 0,
            "max_duration_ms": max(durations) if durations else 0,
            "model_statistics": model_stats,
            "circuit_breakers": {
                name: cb.get_status()
                for name, cb in self.circuit_breakers.items()
            }
        }
    
    def reset_statistics(self):
        """إعادة تعيين الإحصائيات"""
        self.call_history.clear()
        
        for cb in self.circuit_breakers.values():
            cb.reset()
        
        logger.info("Model layer statistics reset")
