"""
Model Layer - طبقة النماذج
فصل local/cloud models مع selector ذكي
"""

from typing import Optional, Dict, Any
from schemas import ModelType, ModelConfigSchema, ModelResponseSchema
from datetime import datetime
import time


class ModelSelector:
    """
    اختيار النموذج المناسب بناءً على المعايير
    """
    
    def __init__(self):
        self.local_models = {
            "llama2": {"max_tokens": 4096, "speed": "fast"},
            "mistral": {"max_tokens": 8192, "speed": "fast"},
            "neural-chat": {"max_tokens": 4096, "speed": "fast"}
        }
        
        self.cloud_models = {
            "gpt-4": {"max_tokens": 8192, "speed": "medium", "cost": "high"},
            "gpt-3.5-turbo": {"max_tokens": 4096, "speed": "fast", "cost": "low"},
            "claude-3": {"max_tokens": 100000, "speed": "medium", "cost": "medium"}
        }
    
    def select_model(
        self,
        model_type: ModelType,
        task_complexity: str = "medium",
        priority: str = "balanced"
    ) -> str:
        """
        اختيار النموذج المناسب
        
        Args:
            model_type: نوع النموذج (local أو cloud)
            task_complexity: مستوى تعقيد المهمة (simple, medium, complex)
            priority: الأولوية (speed, cost, quality, balanced)
            
        Returns:
            str: اسم النموذج المختار
        """
        if model_type == ModelType.LOCAL:
            return self._select_local_model(task_complexity, priority)
        else:
            return self._select_cloud_model(task_complexity, priority)
    
    def _select_local_model(self, complexity: str, priority: str) -> str:
        """اختيار نموذج محلي"""
        if priority == "speed":
            return "mistral"  # أسرع نموذج محلي
        elif priority == "quality":
            return "llama2"  # أفضل جودة محلية
        else:
            return "neural-chat"  # متوازن
    
    def _select_cloud_model(self, complexity: str, priority: str) -> str:
        """اختيار نموذج سحابي"""
        if priority == "cost":
            return "gpt-3.5-turbo"
        elif priority == "quality":
            return "gpt-4"
        elif priority == "speed":
            return "gpt-3.5-turbo"
        else:
            return "claude-3"  # متوازن
    
    def get_model_config(self, model_name: str) -> ModelConfigSchema:
        """الحصول على إعدادات النموذج"""
        # البحث في النماذج المحلية
        if model_name in self.local_models:
            return ModelConfigSchema(
                model_type=ModelType.LOCAL,
                model_name=model_name,
                temperature=0.7,
                max_tokens=self.local_models[model_name].get("max_tokens", 512),
                top_p=0.9
            )
        
        # البحث في النماذج السحابية
        if model_name in self.cloud_models:
            return ModelConfigSchema(
                model_type=ModelType.CLOUD,
                model_name=model_name,
                temperature=0.7,
                max_tokens=self.cloud_models[model_name].get("max_tokens", 512),
                top_p=0.9
            )
        
        # النموذج الافتراضي
        return ModelConfigSchema(
            model_type=ModelType.LOCAL,
            model_name="llama2",
            temperature=0.7,
            max_tokens=512,
            top_p=0.9
        )


class LocalModelExecutor:
    """تنفيذ النماذج المحلية"""
    
    def __init__(self):
        self.models_loaded = {}
    
    def execute(
        self,
        prompt: str,
        model_config: ModelConfigSchema
    ) -> ModelResponseSchema:
        """
        تنفيذ النموذج المحلي
        
        Args:
            prompt: الـ prompt
            model_config: إعدادات النموذج
            
        Returns:
            ModelResponseSchema: الاستجابة
        """
        start_time = time.time()
        
        # محاكاة استدعاء النموذج المحلي
        # في التطبيق الحقيقي، سيتم استدعاء Ollama أو Llama.cpp
        response = f"[LOCAL: {model_config.model_name}] Response to: {prompt[:50]}..."
        
        latency = (time.time() - start_time) * 1000
        
        return ModelResponseSchema(
            model_name=model_config.model_name,
            model_type=ModelType.LOCAL,
            prompt=prompt,
            response=response,
            tokens_used=len(prompt.split()) + len(response.split()),
            latency_ms=latency
        )


class CloudModelExecutor:
    """تنفيذ النماذج السحابية"""
    
    def __init__(self):
        self.api_keys = {}
    
    def execute(
        self,
        prompt: str,
        model_config: ModelConfigSchema
    ) -> ModelResponseSchema:
        """
        تنفيذ النموذج السحابي
        
        Args:
            prompt: الـ prompt
            model_config: إعدادات النموذج
            
        Returns:
            ModelResponseSchema: الاستجابة
        """
        start_time = time.time()
        
        # محاكاة استدعاء النموذج السحابي
        # في التطبيق الحقيقي، سيتم استدعاء OpenAI API أو Anthropic API
        response = f"[CLOUD: {model_config.model_name}] Response to: {prompt[:50]}..."
        
        latency = (time.time() - start_time) * 1000
        
        return ModelResponseSchema(
            model_name=model_config.model_name,
            model_type=ModelType.CLOUD,
            prompt=prompt,
            response=response,
            tokens_used=len(prompt.split()) + len(response.split()),
            latency_ms=latency
        )


class ModelLayer:
    """
    طبقة النماذج - واجهة موحدة للنماذج المحلية والسحابية
    """
    
    def __init__(self):
        self.selector = ModelSelector()
        self.local_executor = LocalModelExecutor()
        self.cloud_executor = CloudModelExecutor()
        self.response_cache: Dict[str, ModelResponseSchema] = {}
        self.execution_stats = {
            "local_calls": 0,
            "cloud_calls": 0,
            "cache_hits": 0,
            "total_tokens": 0
        }
    
    def generate(
        self,
        prompt: str,
        model_type: str = "local",
        task_complexity: str = "medium",
        priority: str = "balanced",
        use_cache: bool = True
    ) -> str:
        """
        توليد استجابة من النموذج
        
        Args:
            prompt: الـ prompt
            model_type: نوع النموذج (local أو cloud)
            task_complexity: مستوى التعقيد
            priority: الأولوية
            use_cache: استخدام الـ cache
            
        Returns:
            str: الاستجابة
        """
        # التحقق من الـ cache
        cache_key = f"{model_type}:{prompt[:50]}"
        if use_cache and cache_key in self.response_cache:
            self.execution_stats["cache_hits"] += 1
            return self.response_cache[cache_key].response
        
        # اختيار النموذج
        model_name = self.selector.select_model(
            ModelType(model_type),
            task_complexity,
            priority
        )
        
        # الحصول على إعدادات النموذج
        model_config = self.selector.get_model_config(model_name)
        
        # تنفيذ النموذج
        if model_config.model_type == ModelType.LOCAL:
            response = self.local_executor.execute(prompt, model_config)
            self.execution_stats["local_calls"] += 1
        else:
            response = self.cloud_executor.execute(prompt, model_config)
            self.execution_stats["cloud_calls"] += 1
        
        # تحديث الإحصائيات
        self.execution_stats["total_tokens"] += response.tokens_used or 0
        
        # حفظ في الـ cache
        if use_cache:
            self.response_cache[cache_key] = response
        
        return response.response
    
    def get_statistics(self) -> Dict[str, Any]:
        """الحصول على إحصائيات الاستخدام"""
        total_calls = (
            self.execution_stats["local_calls"] +
            self.execution_stats["cloud_calls"]
        )
        
        return {
            "total_calls": total_calls,
            "local_calls": self.execution_stats["local_calls"],
            "cloud_calls": self.execution_stats["cloud_calls"],
            "cache_hits": self.execution_stats["cache_hits"],
            "cache_hit_rate": (
                self.execution_stats["cache_hits"] / total_calls
                if total_calls > 0
                else 0
            ),
            "total_tokens_used": self.execution_stats["total_tokens"],
            "local_percentage": (
                self.execution_stats["local_calls"] / total_calls * 100
                if total_calls > 0
                else 0
            )
        }
    
    def clear_cache(self):
        """مسح الـ cache"""
        self.response_cache.clear()
    
    def reset_statistics(self):
        """إعادة تعيين الإحصائيات"""
        self.execution_stats = {
            "local_calls": 0,
            "cloud_calls": 0,
            "cache_hits": 0,
            "total_tokens": 0
        }
