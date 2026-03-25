"""
Agent Registry - سجل الوكلاء
يدير تسجيل وتحميل الوكلاء بشكل ديناميكي
"""

from typing import Dict, Any, Type, Optional, List, Callable
from abc import ABC, abstractmethod
from dataclasses import dataclass
import logging
import importlib
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class AgentMetadata:
    \"\"\"بيانات وصف الوكيل\"\"\"
    name: str
    version: str
    description: str
    author: str
    capabilities: List[str]
    required_params: List[str]
    optional_params: List[str]


class IAgent(ABC):
    \"\"\"واجهة الوكيل\"\"\"
    
    @abstractmethod
    def execute(self, **kwargs) -> Dict[str, Any]:
        \"\"\"تنفيذ الوكيل\"\"\"
        pass
    
    @abstractmethod
    def get_metadata(self) -> AgentMetadata:
        \"\"\"الحصول على بيانات الوكيل\"\"\"
        pass


class AgentRegistry:
    \"\"\"
    سجل الوكلاء
    يدير تسجيل وتحميل الوكلاء بشكل ديناميكي
    \"\"\"
    
    def __init__(self):
        self.agents: Dict[str, Type[IAgent]] = {}
        self.instances: Dict[str, IAgent] = {}
        self.metadata: Dict[str, AgentMetadata] = {}
        self.aliases: Dict[str, str] = {}  # أسماء بديلة
        
        logger.info("AgentRegistry initialized")
    
    def register(
        self,
        name: str,
        agent_class: Type[IAgent],
        aliases: Optional[List[str]] = None
    ):
        \"\"\"
        تسجيل وكيل
        
        Args:
            name: اسم الوكيل
            agent_class: فئة الوكيل
            aliases: أسماء بديلة
        \"\"\"
        if name in self.agents:
            logger.warning(f"Agent already registered: {name}")
            return
        
        self.agents[name] = agent_class
        
        # إنشاء instance للحصول على البيانات
        try:
            instance = agent_class()
            self.instances[name] = instance
            self.metadata[name] = instance.get_metadata()
            
            logger.info(f"Agent registered: {name}")
        except Exception as e:
            logger.error(f"Failed to register agent {name}: {e}")
            del self.agents[name]
            return
        
        # تسجيل الأسماء البديلة
        if aliases:
            for alias in aliases:
                self.aliases[alias] = name
                logger.debug(f"Agent alias registered: {alias} -> {name}")
    
    def register_from_module(
        self,
        module_path: str,
        agent_class_name: str,
        agent_name: str,
        aliases: Optional[List[str]] = None
    ):
        \"\"\"
        تسجيل وكيل من وحدة
        
        Args:
            module_path: مسار الوحدة (مثل: agents.strategy)
            agent_class_name: اسم فئة الوكيل
            agent_name: اسم الوكيل في السجل
            aliases: أسماء بديلة
        \"\"\"
        try:
            # استيراد الوحدة
            module = importlib.import_module(module_path)
            
            # الحصول على الفئة
            agent_class = getattr(module, agent_class_name)
            
            # التحقق من أن الفئة ترث من IAgent
            if not issubclass(agent_class, IAgent):
                raise TypeError(f"{agent_class_name} must inherit from IAgent")
            
            # التسجيل
            self.register(agent_name, agent_class, aliases)
            
            logger.info(f"Agent registered from module: {agent_name}")
        
        except ImportError as e:
            logger.error(f"Failed to import module {module_path}: {e}")
        except AttributeError as e:
            logger.error(f"Agent class not found: {agent_class_name}: {e}")
        except Exception as e:
            logger.error(f"Failed to register agent from module: {e}")
    
    def unregister(self, name: str):
        \"\"\"إلغاء تسجيل وكيل\"\"\"
        if name not in self.agents:
            logger.warning(f"Agent not found: {name}")
            return
        
        del self.agents[name]
        
        if name in self.instances:
            del self.instances[name]
        
        if name in self.metadata:
            del self.metadata[name]
        
        # إزالة الأسماء البديلة
        aliases_to_remove = [alias for alias, target in self.aliases.items() if target == name]
        for alias in aliases_to_remove:
            del self.aliases[alias]
        
        logger.info(f"Agent unregistered: {name}")
    
    def get_agent(self, name: str) -> Optional[IAgent]:
        \"\"\"
        الحصول على instance من الوكيل
        
        Args:
            name: اسم الوكيل (أو الاسم البديل)
            
        Returns:
            Optional[IAgent]: instance الوكيل أو None
        \"\"\"
        # التحقق من الاسم البديل
        actual_name = self.aliases.get(name, name)
        
        if actual_name not in self.agents:
            logger.warning(f"Agent not found: {name}")
            return None
        
        # الحصول على instance من الكاش أو إنشاء واحد جديد
        if actual_name not in self.instances:
            try:
                agent_class = self.agents[actual_name]
                self.instances[actual_name] = agent_class()
            except Exception as e:
                logger.error(f"Failed to create agent instance: {actual_name}: {e}")
                return None
        
        return self.instances[actual_name]
    
    def get_metadata(self, name: str) -> Optional[AgentMetadata]:
        \"\"\"الحصول على بيانات الوكيل\"\"\"
        actual_name = self.aliases.get(name, name)
        return self.metadata.get(actual_name)
    
    def list_agents(self) -> List[str]:
        \"\"\"قائمة الوكلاء المسجلين\"\"\"
        return list(self.agents.keys())
    
    def list_enabled_agents(self, config: Optional[Dict[str, Any]] = None) -> List[str]:
        \"\"\"قائمة الوكلاء المفعلين\"\"\"
        if not config:
            return self.list_agents()
        
        enabled = []
        for agent_name in self.agents.keys():
            agent_config = config.get(agent_name, {})
            if agent_config.get('enabled', True):
                enabled.append(agent_name)
        
        return enabled
    
    def get_agent_info(self, name: str) -> Optional[Dict[str, Any]]:
        \"\"\"الحصول على معلومات الوكيل\"\"\"
        metadata = self.get_metadata(name)
        
        if not metadata:
            return None
        
        return {
            \"name\": metadata.name,
            \"version\": metadata.version,
            \"description\": metadata.description,
            \"author\": metadata.author,
            \"capabilities\": metadata.capabilities,
            \"required_params\": metadata.required_params,
            \"optional_params\": metadata.optional_params
        }
    
    def get_registry_summary(self) -> Dict[str, Any]:
        \"\"\"الحصول على ملخص السجل\"\"\"
        return {
            \"total_agents\": len(self.agents),
            \"agents\": {
                name: self.get_agent_info(name)
                for name in self.agents.keys()
            },
            \"aliases\": self.aliases
        }
    
    def validate_agent_params(
        self,
        agent_name: str,
        params: Dict[str, Any]
    ) -> tuple[bool, List[str]]:
        \"\"\"
        التحقق من معاملات الوكيل
        
        Args:
            agent_name: اسم الوكيل
            params: المعاملات
            
        Returns:
            tuple: (صحيح/خطأ, قائمة الأخطاء)
        \"\"\"
        metadata = self.get_metadata(agent_name)
        
        if not metadata:
            return False, [f\"Agent not found: {agent_name}\"]
        
        errors = []
        
        # التحقق من المعاملات المطلوبة
        for required_param in metadata.required_params:
            if required_param not in params:
                errors.append(f\"Missing required parameter: {required_param}\")
        
        # التحقق من المعاملات غير المعروفة
        allowed_params = set(metadata.required_params + metadata.optional_params)
        for param in params.keys():
            if param not in allowed_params:
                errors.append(f\"Unknown parameter: {param}\")
        
        return len(errors) == 0, errors
    
    def execute_agent(
        self,
        agent_name: str,
        **kwargs
    ) -> Dict[str, Any]:
        \"\"\"
        تنفيذ الوكيل
        
        Args:
            agent_name: اسم الوكيل
            **kwargs: معاملات الوكيل
            
        Returns:
            Dict[str, Any]: نتيجة التنفيذ
        \"\"\"
        # التحقق من المعاملات
        is_valid, errors = self.validate_agent_params(agent_name, kwargs)
        
        if not is_valid:
            return {
                \"agent\": agent_name,
                \"status\": \"failed\",
                \"error\": \"Parameter validation failed\",
                \"details\": errors
            }
        
        # الحصول على الوكيل
        agent = self.get_agent(agent_name)
        
        if not agent:
            return {
                \"agent\": agent_name,
                \"status\": \"failed\",
                \"error\": f\"Agent not found: {agent_name}\"
            }
        
        # تنفيذ الوكيل
        try:
            result = agent.execute(**kwargs)
            
            return {
                \"agent\": agent_name,
                \"status\": \"success\",
                \"output\": result
            }
        
        except Exception as e:
            logger.error(f\"Agent execution failed: {agent_name}: {e}\")
            
            return {
                \"agent\": agent_name,
                \"status\": \"failed\",
                \"error\": str(e)
            }
    
    def execute_multiple(
        self,
        agent_names: List[str],
        shared_params: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> List[Dict[str, Any]]:
        \"\"\"
        تنفيذ عدة وكلاء
        
        Args:
            agent_names: قائمة أسماء الوكلاء
            shared_params: معاملات مشتركة
            **kwargs: معاملات إضافية
            
        Returns:
            List[Dict[str, Any]]: نتائج التنفيذ
        \"\"\"
        results = []
        
        for agent_name in agent_names:
            params = shared_params.copy() if shared_params else {}
            params.update(kwargs)
            
            result = self.execute_agent(agent_name, **params)
            results.append(result)
        
        return results


# مثال على الاستخدام
def example_usage():
    \"\"\"مثال على الاستخدام\"\"\"
    
    # إنشاء سجل
    registry = AgentRegistry()
    
    # تسجيل وكلاء من وحدات
    registry.register_from_module(
        'agents_strategy',
        'StrategyAgent',
        'strategy',
        aliases=['strategy_agent', 'strat']
    )
    
    registry.register_from_module(
        'agents_content',
        'ContentAgent',
        'content',
        aliases=['content_agent']
    )
    
    # الحصول على ملخص السجل
    summary = registry.get_registry_summary()
    print(f\"Registry Summary: {summary}\")
    
    # الحصول على معلومات الوكيل
    strategy_info = registry.get_agent_info('strategy')
    print(f\"Strategy Agent Info: {strategy_info}\")
    
    # تنفيذ الوكيل
    result = registry.execute_agent('strategy', goal=\"...\", market=\"...\")
    print(f\"Execution Result: {result}\")
    
    # تنفيذ عدة وكلاء
    results = registry.execute_multiple(
        ['strategy', 'content'],
        shared_params={\"goal\": \"...\"}
    )
    print(f\"Multiple Execution Results: {results}\")


if __name__ == \"__main__\":
    logging.basicConfig(level=logging.INFO)
    example_usage()
