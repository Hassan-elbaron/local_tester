"""
Strategy Agent - وكيل الاستراتيجية
مسؤول عن بناء التوجيه الاستراتيجي للحملات
"""

from base_agent import BaseAgent
from schemas import AgentRole, AgentInputSchema, AgentOutputSchema
from model_layer import ModelLayer
from typing import Dict, Any


class StrategyAgent(BaseAgent):
    """وكيل الاستراتيجية"""
    
    def __init__(self):
        super().__init__(role=AgentRole.STRATEGY, model_type="cloud")
        self.model_layer = ModelLayer()
    
    def process(self, agent_input: AgentInputSchema) -> AgentOutputSchema:
        """
        معالجة المهمة الاستراتيجية
        
        Args:
            agent_input: مدخلات الوكيل
            
        Returns:
            AgentOutputSchema: المخرجات الموحدة
        """
        context = agent_input.context
        
        # بناء الـ prompt
        prompt = self._build_prompt(context, agent_input.dependencies_output)
        
        # استدعاء النموذج
        response = self.model_layer.generate(
            prompt=prompt,
            model_type=self.model_type
        )
        
        # معالجة النتائج
        output_data = self._parse_response(response, context)
        
        # إنشاء المخرجات الموحدة
        return self.create_output(
            agent_input=agent_input,
            output_data=output_data,
            confidence=0.92,
            metadata={
                "model_type": self.model_type,
                "prompt_length": len(prompt),
                "response_length": len(response)
            }
        )
    
    def _build_prompt(
        self,
        context,
        dependencies_output: Dict[str, Any]
    ) -> str:
        """بناء الـ prompt للنموذج"""
        research_data = dependencies_output.get("research", {})
        
        prompt = f"""
        أنت خبير استراتيجية تسويقية متخصص.
        
        المعلومات:
        - الهدف: {context.goal}
        - المنتج: {context.product}
        - السوق: {context.market}
        - الميزانية: ${context.budget}
        - القيود: {', '.join(context.constraints)}
        
        بيانات البحث: {research_data}
        
        المطلوب:
        1. تحديد الجمهور المستهدف (Segment Definition)
        2. تحديد الموضع (Positioning)
        3. أعمدة الرسائل (Messaging Pillars)
        4. قيمة العرض (Value Proposition)
        5. استراتيجية الدخول للسوق (Go-to-Market)
        
        أرجع النتائج بصيغة منظمة وواضحة.
        """
        return prompt.strip()
    
    def _parse_response(
        self,
        response: str,
        context
    ) -> Dict[str, Any]:
        """تحليل استجابة النموذج"""
        # في التطبيق الحقيقي، سيتم تحليل JSON أو نص منظم
        return {
            "segment_definition": "Target Audience Segment",
            "positioning": "Premium & Innovative",
            "messaging_pillars": [
                "Quality & Excellence",
                "Innovation & Technology",
                "Customer-Centric Approach"
            ],
            "value_proposition": "Delivering superior value through innovation",
            "go_to_market_strategy": "Multi-channel approach",
            "raw_response": response[:200]  # اختزال للتوضيح
        }
