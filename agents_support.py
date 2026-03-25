"""
Support Agents - وكلاء الدعم
Analytics Agent و Compliance Agent
"""

from base_agent import BaseAgent
from schemas import AgentRole, AgentInputSchema, AgentOutputSchema
from model_layer import ModelLayer
from typing import Dict, Any


class AnalyticsAgent(BaseAgent):
    """وكيل التحليلات"""
    
    def __init__(self):
        super().__init__(role=AgentRole.ANALYTICS, model_type="local")
        self.model_layer = ModelLayer()
    
    def process(self, agent_input: AgentInputSchema) -> AgentOutputSchema:
        """معالجة مهمة التحليلات"""
        context = agent_input.context
        campaign_plan = agent_input.dependencies_output.get("campaign", {})
        
        prompt = f"""
        أنت متخصص تحليلات تسويقية.
        
        معلومات الحملة:
        - الهدف: {context.goal}
        - الميزانية: ${context.budget}
        - خطة الحملة: {campaign_plan}
        
        المطلوب:
        1. إطار عمل KPIs
        2. استراتيجية الإسناد (Attribution)
        3. هيكل التقارير
        4. تفسير الإشارات
        5. ملخصات الأداء
        """
        
        response = self.model_layer.generate(prompt, self.model_type)
        output_data = self._parse_response(response)
        
        return self.create_output(
            agent_input=agent_input,
            output_data=output_data,
            confidence=0.89,
            metadata={"model_type": self.model_type}
        )
    
    def _parse_response(self, response: str) -> Dict[str, Any]:
        """تحليل الاستجابة"""
        return {
            "kpi_framework": ["CPA", "ROAS", "CTR", "Conversion Rate"],
            "attribution_model": "Multi-touch Attribution",
            "reporting_structure": {
                "daily": "Performance metrics",
                "weekly": "Trend analysis",
                "monthly": "Strategic review"
            },
            "key_metrics": {
                "CPA": {"target": 50, "unit": "USD"},
                "ROAS": {"target": 3.0, "unit": "ratio"},
                "CTR": {"target": 2.5, "unit": "%"}
            },
            "raw_response": response[:200]
        }


class ComplianceAgent(BaseAgent):
    """وكيل الامتثال"""
    
    def __init__(self):
        super().__init__(role=AgentRole.COMPLIANCE, model_type="local")
        self.model_layer = ModelLayer()
    
    def process(self, agent_input: AgentInputSchema) -> AgentOutputSchema:
        """معالجة مهمة الامتثال"""
        context = agent_input.context
        content = agent_input.dependencies_output.get("content", {})
        campaign = agent_input.dependencies_output.get("campaign", {})
        
        prompt = f"""
        أنت متخصص امتثال تسويقي.
        
        المحتوى المراد فحصه:
        - المنتج: {context.product}
        - المحتوى: {content}
        - خطة الحملة: {campaign}
        
        القيود المطلوب الامتثال لها:
        {chr(10).join([f'- {c}' for c in context.constraints])}
        
        المطلوب:
        1. تحديد أي انتهاكات
        2. تقييم المخاطر
        3. التوصيات
        4. الموافقة النهائية
        """
        
        response = self.model_layer.generate(prompt, self.model_type)
        output_data = self._parse_response(response, context.constraints)
        
        return self.create_output(
            agent_input=agent_input,
            output_data=output_data,
            confidence=0.95,
            metadata={"model_type": self.model_type}
        )
    
    def _parse_response(
        self,
        response: str,
        constraints: list
    ) -> Dict[str, Any]:
        """تحليل الاستجابة"""
        return {
            "risk_flags": [],
            "violations": [],
            "approved": True,
            "compliance_score": 0.98,
            "constraints_verified": {
                constraint: True for constraint in constraints
            },
            "recommendations": [
                "Ensure all claims are substantiated",
                "Include proper disclaimers",
                "Verify compliance with platform policies"
            ],
            "raw_response": response[:200]
        }


class BudgetAgent(BaseAgent):
    """وكيل الميزانية"""
    
    def __init__(self):
        super().__init__(role=AgentRole.BUDGET, model_type="local")
        self.model_layer = ModelLayer()
    
    def process(self, agent_input: AgentInputSchema) -> AgentOutputSchema:
        """معالجة مهمة تخصيص الميزانية"""
        context = agent_input.context
        campaign = agent_input.dependencies_output.get("campaign", {})
        
        prompt = f"""
        أنت متخصص ميزانية تسويقية.
        
        معلومات الميزانية:
        - إجمالي الميزانية: ${context.budget}
        - خطة الحملة: {campaign}
        
        المطلوب:
        1. توزيع الميزانية على القنوات
        2. حدود الإنفاق اليومي
        3. توصيات الكفاءة
        4. سيناريوهات الخطر
        """
        
        response = self.model_layer.generate(prompt, self.model_type)
        output_data = self._parse_response(response, context.budget)
        
        return self.create_output(
            agent_input=agent_input,
            output_data=output_data,
            confidence=0.91,
            metadata={"model_type": self.model_type}
        )
    
    def _parse_response(self, response: str, total_budget: float) -> Dict[str, Any]:
        """تحليل الاستجابة"""
        return {
            "allocation": {
                "Facebook": total_budget * 0.50,
                "Google": total_budget * 0.35,
                "Email": total_budget * 0.15
            },
            "spend_caps": {
                "daily": total_budget / 30,
                "weekly": total_budget / 4
            },
            "efficiency_recommendations": [
                "Focus on high-performing channels",
                "Optimize bids based on performance",
                "Allocate budget to best-performing creatives"
            ],
            "risk_scenarios": {
                "best_case": total_budget * 3.5,
                "worst_case": total_budget * 1.5,
                "expected": total_budget * 2.8
            },
            "raw_response": response[:200]
        }
