"""
Campaign Agent - وكيل الحملات
مسؤول عن تخطيط وتنظيم الحملات التسويقية
"""

from base_agent import BaseAgent
from schemas import AgentRole, AgentInputSchema, AgentOutputSchema
from model_layer import ModelLayer
from typing import Dict, Any


class CampaignAgent(BaseAgent):
    """وكيل الحملات"""
    
    def __init__(self):
        super().__init__(role=AgentRole.CAMPAIGN, model_type="local")
        self.model_layer = ModelLayer()
    
    def process(self, agent_input: AgentInputSchema) -> AgentOutputSchema:
        """
        معالجة مهمة تخطيط الحملة
        
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
            confidence=0.90,
            metadata={
                "model_type": self.model_type,
                "campaign_phases": 3,
                "channels": ["Facebook", "Google", "Email"]
            }
        )
    
    def _build_prompt(
        self,
        context,
        strategy: Dict[str, Any]
    ) -> str:
        """بناء الـ prompt للنموذج"""
        positioning = strategy.get("positioning", "")
        
        prompt = f"""
        أنت مخطط حملات تسويقية متخصص.
        
        معلومات الحملة:
        - المنتج: {context.product}
        - الهدف: {context.goal}
        - السوق: {context.market}
        - الميزانية: ${context.budget}
        - الموضع: {positioning}
        
        المطلوب:
        1. هيكل الحملة (عدد المراحل والمدة)
        2. تعيين الأهداف لكل قناة
        3. مصفوفة الاختبار والإبداع
        4. تسلسل الإطلاق
        5. توزيع الميزانية الأولي
        6. مؤشرات النجاح
        
        تأكد من:
        - الواقعية والقابلية للتنفيذ
        - الامتثال للقيود: {', '.join(context.constraints)}
        - التنسيق مع الاستراتيجية
        """
        return prompt.strip()
    
    def _parse_response(self, response: str) -> Dict[str, Any]:
        """تحليل استجابة النموذج"""
        return {
            "campaign_structure": {
                "phases": 3,
                "phase_1": "Awareness Phase - 2 weeks",
                "phase_2": "Consideration Phase - 2 weeks",
                "phase_3": "Conversion Phase - 2 weeks"
            },
            "channel_mapping": {
                "Facebook": "Awareness & Engagement",
                "Google": "Conversion & Retargeting",
                "Email": "Nurturing & Retention"
            },
            "creative_testing_matrix": {
                "variations": 3,
                "test_duration": "1 week",
                "success_metric": "CTR > 2%"
            },
            "launch_sequence": [
                "Day 1: Facebook awareness campaign",
                "Day 3: Google search ads",
                "Day 5: Email nurture sequence"
            ],
            "budget_allocation": {
                "Facebook": 0.50,
                "Google": 0.35,
                "Email": 0.15
            },
            "raw_response": response[:200]
        }
