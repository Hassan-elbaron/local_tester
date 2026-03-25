"""
Config Manager - مدير التكوين
يتحكم في تكوين النظام من YAML/JSON
"""

from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from pathlib import Path
import json
import logging
import yaml

logger = logging.getLogger(__name__)


@dataclass
class AgentConfig:
    """تكوين الوكيل"""
    name: str
    enabled: bool = True
    model_type: str = "auto"  # local, cloud, auto
    priority: int = 1  # 1-10
    timeout: float = 30.0
    retry_attempts: int = 3
    fallback_enabled: bool = True
    description: str = ""
    parameters: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.parameters is None:
            self.parameters = {}


@dataclass
class ModelConfig:
    """تكوين النموذج"""
    name: str
    type: str  # local, cloud
    enabled: bool = True
    priority: int = 1
    timeout: float = 30.0
    retry_attempts: int = 3
    fallback_model: Optional[str] = None
    parameters: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.parameters is None:
            self.parameters = {}


@dataclass
class SystemConfig:
    """تكوين النظام الكامل"""
    name: str
    version: str
    description: str
    agents: Dict[str, AgentConfig]
    models: Dict[str, ModelConfig]
    orchestrator: Dict[str, Any]
    memory: Dict[str, Any]
    logging: Dict[str, Any]
    api: Dict[str, Any]


class ConfigManager:
    """
    مدير التكوين
    يقرأ ويدير تكوين النظام من YAML/JSON
    """
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Args:
            config_path: مسار ملف التكوين
        """
        self.config_path = config_path
        self.system_config: Optional[SystemConfig] = None
        self.config_data: Dict[str, Any] = {}
        
        if config_path:
            self.load_config(config_path)
    
    def load_config(self, config_path: str) -> SystemConfig:
        """
        تحميل التكوين من ملف
        
        Args:
            config_path: مسار الملف (YAML أو JSON)
            
        Returns:
            SystemConfig: التكوين المحمل
        """
        path = Path(config_path)
        
        if not path.exists():
            raise FileNotFoundError(f"Config file not found: {config_path}")
        
        logger.info(f"Loading config from: {config_path}")
        
        # تحديد نوع الملف
        if path.suffix.lower() in ['.yaml', '.yml']:
            self.config_data = self._load_yaml(config_path)
        elif path.suffix.lower() == '.json':
            self.config_data = self._load_json(config_path)
        else:
            raise ValueError(f"Unsupported config format: {path.suffix}")
        
        # تحويل إلى SystemConfig
        self.system_config = self._parse_config(self.config_data)
        
        logger.info(f"Config loaded successfully: {self.system_config.name}")
        
        return self.system_config
    
    def _load_yaml(self, file_path: str) -> Dict[str, Any]:
        """تحميل ملف YAML"""
        with open(file_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
        
        return data or {}
    
    def _load_json(self, file_path: str) -> Dict[str, Any]:
        """تحميل ملف JSON"""
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return data
    
    def _parse_config(self, data: Dict[str, Any]) -> SystemConfig:
        """تحويل البيانات إلى SystemConfig"""
        
        # تحليل الوكلاء
        agents = {}
        for agent_name, agent_data in data.get('agents', {}).items():
            agents[agent_name] = AgentConfig(
                name=agent_name,
                enabled=agent_data.get('enabled', True),
                model_type=agent_data.get('model_type', 'auto'),
                priority=agent_data.get('priority', 1),
                timeout=agent_data.get('timeout', 30.0),
                retry_attempts=agent_data.get('retry_attempts', 3),
                fallback_enabled=agent_data.get('fallback_enabled', True),
                description=agent_data.get('description', ''),
                parameters=agent_data.get('parameters', {})
            )
        
        # تحليل النماذج
        models = {}
        for model_name, model_data in data.get('models', {}).items():
            models[model_name] = ModelConfig(
                name=model_name,
                type=model_data.get('type', 'local'),
                enabled=model_data.get('enabled', True),
                priority=model_data.get('priority', 1),
                timeout=model_data.get('timeout', 30.0),
                retry_attempts=model_data.get('retry_attempts', 3),
                fallback_model=model_data.get('fallback_model'),
                parameters=model_data.get('parameters', {})
            )
        
        return SystemConfig(
            name=data.get('name', 'AI Marketing OS'),
            version=data.get('version', '1.0.0'),
            description=data.get('description', ''),
            agents=agents,
            models=models,
            orchestrator=data.get('orchestrator', {}),
            memory=data.get('memory', {}),
            logging=data.get('logging', {}),
            api=data.get('api', {})
        )
    
    def get_agent_config(self, agent_name: str) -> Optional[AgentConfig]:
        """الحصول على تكوين وكيل"""
        if not self.system_config:
            return None
        
        return self.system_config.agents.get(agent_name)
    
    def get_model_config(self, model_name: str) -> Optional[ModelConfig]:
        """الحصول على تكوين نموذج"""
        if not self.system_config:
            return None
        
        return self.system_config.models.get(model_name)
    
    def get_enabled_agents(self) -> List[AgentConfig]:
        """الحصول على الوكلاء المفعلين"""
        if not self.system_config:
            return []
        
        return [agent for agent in self.system_config.agents.values() if agent.enabled]
    
    def get_enabled_models(self) -> List[ModelConfig]:
        """الحصول على النماذج المفعلة"""
        if not self.system_config:
            return []
        
        return [model for model in self.system_config.models.values() if model.enabled]
    
    def is_agent_enabled(self, agent_name: str) -> bool:
        """التحقق من تفعيل وكيل"""
        config = self.get_agent_config(agent_name)
        return config.enabled if config else False
    
    def is_model_enabled(self, model_name: str) -> bool:
        """التحقق من تفعيل نموذج"""
        config = self.get_model_config(model_name)
        return config.enabled if config else False
    
    def update_agent_config(
        self,
        agent_name: str,
        updates: Dict[str, Any]
    ):
        """تحديث تكوين وكيل"""
        if not self.system_config:
            return
        
        if agent_name not in self.system_config.agents:
            logger.warning(f"Agent not found: {agent_name}")
            return
        
        agent = self.system_config.agents[agent_name]
        
        for key, value in updates.items():
            if hasattr(agent, key):
                setattr(agent, key, value)
        
        logger.info(f"Agent config updated: {agent_name}")
    
    def update_model_config(
        self,
        model_name: str,
        updates: Dict[str, Any]
    ):
        """تحديث تكوين نموذج"""
        if not self.system_config:
            return
        
        if model_name not in self.system_config.models:
            logger.warning(f"Model not found: {model_name}")
            return
        
        model = self.system_config.models[model_name]
        
        for key, value in updates.items():
            if hasattr(model, key):
                setattr(model, key, value)
        
        logger.info(f"Model config updated: {model_name}")
    
    def save_config(self, output_path: str, format: str = 'yaml'):
        """
        حفظ التكوين
        
        Args:
            output_path: مسار الملف
            format: الصيغة (yaml أو json)
        """
        if not self.system_config:
            logger.warning("No config to save")
            return
        
        # تحويل إلى قاموس
        config_dict = self._system_config_to_dict(self.system_config)
        
        if format.lower() == 'yaml':
            self._save_yaml(output_path, config_dict)
        elif format.lower() == 'json':
            self._save_json(output_path, config_dict)
        else:
            raise ValueError(f"Unsupported format: {format}")
        
        logger.info(f"Config saved to: {output_path}")
    
    def _system_config_to_dict(self, config: SystemConfig) -> Dict[str, Any]:
        """تحويل SystemConfig إلى قاموس"""
        return {
            "name": config.name,
            "version": config.version,
            "description": config.description,
            "agents": {
                name: asdict(agent)
                for name, agent in config.agents.items()
            },
            "models": {
                name: asdict(model)
                for name, model in config.models.items()
            },
            "orchestrator": config.orchestrator,
            "memory": config.memory,
            "logging": config.logging,
            "api": config.api
        }
    
    def _save_yaml(self, file_path: str, data: Dict[str, Any]):
        """حفظ ملف YAML"""
        with open(file_path, 'w', encoding='utf-8') as f:
            yaml.dump(data, f, default_flow_style=False, allow_unicode=True)
    
    def _save_json(self, file_path: str, data: Dict[str, Any]):
        """حفظ ملف JSON"""
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    def get_config_summary(self) -> Dict[str, Any]:
        """الحصول على ملخص التكوين"""
        if not self.system_config:
            return {}
        
        return {
            "name": self.system_config.name,
            "version": self.system_config.version,
            "total_agents": len(self.system_config.agents),
            "enabled_agents": len(self.get_enabled_agents()),
            "total_models": len(self.system_config.models),
            "enabled_models": len(self.get_enabled_models()),
            "agents": {
                name: {
                    "enabled": agent.enabled,
                    "model_type": agent.model_type,
                    "priority": agent.priority
                }
                for name, agent in self.system_config.agents.items()
            },
            "models": {
                name: {
                    "type": model.type,
                    "enabled": model.enabled,
                    "priority": model.priority
                }
                for name, model in self.system_config.models.items()
            }
        }


def create_default_config() -> str:
    """
    إنشاء ملف تكوين افتراضي
    
    Returns:
        str: محتوى ملف YAML الافتراضي
    """
    default_config = """
name: AI Marketing OS
version: 4.0.0
description: Production-Ready AI Marketing Platform

agents:
  strategy:
    enabled: true
    model_type: auto
    priority: 1
    timeout: 30.0
    retry_attempts: 3
    fallback_enabled: true
    description: Strategy Agent - يطور استراتيجية التسويق
    parameters:
      max_iterations: 5
      temperature: 0.7

  content:
    enabled: true
    model_type: cloud
    priority: 2
    timeout: 45.0
    retry_attempts: 3
    fallback_enabled: true
    description: Content Agent - ينتج المحتوى التسويقي
    parameters:
      tone: professional
      max_length: 2000

  research:
    enabled: true
    model_type: local
    priority: 3
    timeout: 60.0
    retry_attempts: 2
    fallback_enabled: true
    description: Research Agent - يبحث عن البيانات
    parameters:
      depth: deep
      sources: 5

  campaign:
    enabled: true
    model_type: auto
    priority: 2
    timeout: 30.0
    retry_attempts: 3
    fallback_enabled: true
    description: Campaign Agent - يخطط الحملة
    parameters:
      duration_weeks: 4

  analytics:
    enabled: true
    model_type: local
    priority: 4
    timeout: 20.0
    retry_attempts: 2
    fallback_enabled: false
    description: Analytics Agent - يحسب KPIs
    parameters:
      metrics: [reach, engagement, conversion]

models:
  gpt4:
    type: cloud
    enabled: true
    priority: 1
    timeout: 30.0
    retry_attempts: 3
    fallback_model: mistral
    parameters:
      temperature: 0.7
      max_tokens: 2000

  mistral:
    type: local
    enabled: true
    priority: 2
    timeout: 20.0
    retry_attempts: 2
    fallback_model: null
    parameters:
      temperature: 0.5
      max_tokens: 1500

orchestrator:
  execution_mode: concurrent
  max_concurrent_agents: 5
  timeout: 120.0
  decision_strategy: hybrid

memory:
  session_ttl: 3600
  storage_dir: ./storage
  database_path: ./ai_marketing_os.db
  enable_persistence: true

logging:
  level: INFO
  format: detailed
  output: file
  log_file: ./logs/ai_marketing_os.log

api:
  enabled: true
  host: 0.0.0.0
  port: 8000
  debug: false
"""
    return default_config


# مثال على الاستخدام
def example_usage():
    """مثال على الاستخدام"""
    
    # إنشاء ملف تكوين افتراضي
    default_config = create_default_config()
    
    config_path = "./config.yaml"
    with open(config_path, 'w') as f:
        f.write(default_config)
    
    # تحميل التكوين
    manager = ConfigManager(config_path)
    
    # الحصول على ملخص التكوين
    summary = manager.get_config_summary()
    print(json.dumps(summary, indent=2))
    
    # الحصول على تكوين وكيل
    strategy_config = manager.get_agent_config('strategy')
    print(f"Strategy Agent Config: {asdict(strategy_config)}")
    
    # تحديث التكوين
    manager.update_agent_config('strategy', {'priority': 2, 'enabled': False})
    
    # الحصول على الوكلاء المفعلين
    enabled_agents = manager.get_enabled_agents()
    print(f"Enabled Agents: {[agent.name for agent in enabled_agents]}")
    
    # حفظ التكوين
    manager.save_config("./config_updated.yaml", format='yaml')


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    example_usage()
