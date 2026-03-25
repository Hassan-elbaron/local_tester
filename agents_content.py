"""
Content Agent - وكيل المحتوى
مسؤول عن إنتاج المحتوى التسويقي
"""

from base_agent import BaseAgent
from schemas import AgentRole, AgentInputSchema, AgentOutputSchema
from model_layer import ModelLayer
from typing import Dict, Any


class ContentAgent(BaseAgent):
    """وكيل المحتوى"""
    
    def __init__(self):
        super().__init__(role=AgentRole.CONTENT, model_type="local")
        self.model_layer = ModelLayer()
    
    def process(self, agent_input: AgentInputSchema) -> AgentOutputSchema:
        """
        معالجة مهمة إنتاج المحتوى
        
        Args:
            agent_input: مدخلات الوكيل
            
        Returns:
            AgentOutputSchema: المخرجات الموحدة
        """
        context = agent_input.context
        strategy = agent_input.dependencies_output.get("strategy", {})
        
        # بناء الـ prompt
        prompt = self._build_prompt(context, strategy)
        
        # استدعاء النموذج
        response = self.model_layer.generate(
            prompt=prompt,
            model_type=self.model_type
        )
        
        # معالجة النتائج
        output_data = self._parse_response(response)
        
        # إنشاء المخرجات الموحدة
        return self.create_output(
            agent_input=agent_input,
            output_data=output_data,
            confidence=0.88,
            metadata={
                "model_type": self.model_type,
                "content_types": ["social", "ads", "email"],
                "channels_covered": ["Facebook", "Instagram", "Google"]
            }
        )
    
    def _build_prompt(
        self,
        context,
        strategy: Dict[str, Any]
    ) -> str:
        """بناء الـ prompt للنموذج"""
        messaging_pillars = strategy.get("messaging_pillars", [])
        
        prompt = f"""
        أنت كاتب محتوى تسويقي متخصص.
        
        معلومات الحملة:
        - المنتج: {context.product}
        - الهدف: {context.goal}
        - السوق: {context.market}
        
        أعمدة الرسائل: {', '.join(messaging_pillars)}
        
        المطلوب:
        1. نسخ وسائل التواصل الاجتماعي (Social Copies)
        2. نسخ الإعلانات (Ad Copies)
        3. رسائل البريد الإلكتروني (Email Sequences)
        4. Hooks و CTAs قوية
        
        تأكد من:
        - الوضوح والإيجاز
        - توافق مع القيود: {', '.join(context.constraints)}
        - جذب الانتباه والتحفيز على الإجراء
        """
        return prompt.strip()
    
    def _parse_response(self, response: str) -> Dict[str, Any]:
        """تحليل استجابة النموذج"""
        return {
            "social_copies": [
                "Copy 1: Engaging social media post",
                "Copy 2: Another engaging post",
                "Copy 3: Call-to-action focused"
            ],
            "ad_copies": [
                "Ad 1: Headline focused",
                "Ad 2: Benefit focused",
                "Ad 3: Urgency focused"
            ],
            "email_sequences": [
                "Email 1: Introduction",
                "Email 2: Value proposition",
                "Email 3: Call-to-action"
            ],
            "hooks_and_ctas": {
                "hooks": ["Hook 1", "Hook 2"],
                "ctas": ["CTA 1", "CTA 2"]
            },
            "raw_response": response[:200]
        }
