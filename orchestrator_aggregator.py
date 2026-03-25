"""
Aggregator - تجميع ودمج مخرجات الوكلاء
"""

from typing import List, Dict, Any
from schemas import (
    AgentOutputSchema, AggregationResultSchema, AgentRole
)
import uuid
from datetime import datetime


class OutputAggregator:
    """
    تجميع مخرجات الوكلاء المختلفة في نتيجة موحدة
    """
    
    def __init__(self):
        self.aggregation_history: List[AggregationResultSchema] = []
    
    def aggregate_outputs(
        self,
        outputs: List[AgentOutputSchema],
        aggregation_type: str = "synthesis"
    ) -> AggregationResultSchema:
        """
        تجميع مخرجات متعددة
        
        Args:
            outputs: قائمة المخرجات
            aggregation_type: نوع التجميع (synthesis, consensus, weighted)
            
        Returns:
            AggregationResultSchema: النتيجة المجمعة
        """
        if aggregation_type == "synthesis":
            aggregated = self._synthesis_aggregation(outputs)
        elif aggregation_type == "consensus":
            aggregated = self._consensus_aggregation(outputs)
        elif aggregation_type == "weighted":
            aggregated = self._weighted_aggregation(outputs)
        else:
            aggregated = self._synthesis_aggregation(outputs)
        
        result = AggregationResultSchema(
            aggregation_id=str(uuid.uuid4()),
            source_outputs=outputs,
            aggregated_data=aggregated,
            synthesis_notes=f"Aggregated {len(outputs)} outputs using {aggregation_type} method"
        )
        
        self.aggregation_history.append(result)
        return result
    
    def _synthesis_aggregation(
        self,
        outputs: List[AgentOutputSchema]
    ) -> Dict[str, Any]:
        """
        تجميع تركيبي - دمج جميع المخرجات
        """
        aggregated = {
            "synthesis_timestamp": datetime.utcnow().isoformat(),
            "agent_outputs": {},
            "key_insights": [],
            "confidence_scores": {}
        }
        
        for output in outputs:
            agent_name = output.agent.value
            aggregated["agent_outputs"][agent_name] = output.output
            aggregated["confidence_scores"][agent_name] = output.confidence or 0.8
            
            # استخراج الرؤى الرئيسية
            if isinstance(output.output, dict):
                for key, value in output.output.items():
                    if isinstance(value, (str, int, float)):
                        aggregated["key_insights"].append({
                            "agent": agent_name,
                            "insight": f"{key}: {value}"
                        })
        
        return aggregated
    
    def _consensus_aggregation(
        self,
        outputs: List[AgentOutputSchema]
    ) -> Dict[str, Any]:
        """
        تجميع إجماعي - البحث عن الاتفاق بين الوكلاء
        """
        aggregated = {
            "consensus_level": self._calculate_consensus_level(outputs),
            "agreed_points": [],
            "disagreements": [],
            "agent_alignment": {}
        }
        
        # حساب التوافق بين الوكلاء
        confidence_scores = [o.confidence or 0.8 for o in outputs]
        avg_confidence = sum(confidence_scores) / len(confidence_scores)
        
        aggregated["average_confidence"] = avg_confidence
        aggregated["consensus_strength"] = "high" if avg_confidence > 0.85 else "medium" if avg_confidence > 0.7 else "low"
        
        return aggregated
    
    def _weighted_aggregation(
        self,
        outputs: List[AgentOutputSchema]
    ) -> Dict[str, Any]:
        """
        تجميع مرجح - إعطاء أوزان بناءً على الثقة
        """
        total_confidence = sum(o.confidence or 0.8 for o in outputs)
        
        aggregated = {
            "weighted_outputs": {},
            "total_weight": total_confidence,
            "weights": {}
        }
        
        for output in outputs:
            agent_name = output.agent.value
            weight = (output.confidence or 0.8) / total_confidence
            aggregated["weights"][agent_name] = weight
            aggregated["weighted_outputs"][agent_name] = {
                "output": output.output,
                "weight": weight
            }
        
        return aggregated
    
    def _calculate_consensus_level(self, outputs: List[AgentOutputSchema]) -> float:
        """حساب مستوى الإجماع"""
        if not outputs:
            return 0.0
        
        confidence_scores = [o.confidence or 0.8 for o in outputs]
        avg_confidence = sum(confidence_scores) / len(confidence_scores)
        
        # حساب الانحراف المعياري
        variance = sum((c - avg_confidence) ** 2 for c in confidence_scores) / len(confidence_scores)
        std_dev = variance ** 0.5
        
        # مستوى الإجماع = ثقة عالية + انحراف منخفض
        consensus = avg_confidence * (1 - min(std_dev, 1))
        return round(consensus, 2)
    
    def merge_agent_results(
        self,
        results: Dict[AgentRole, AgentOutputSchema]
    ) -> Dict[str, Any]:
        """
        دمج نتائج الوكلاء في خطة موحدة
        
        Args:
            results: قاموس النتائج حسب الدور
            
        Returns:
            Dict: الخطة المدمجة
        """
        merged_plan = {
            "research_insights": results.get(AgentRole.RESEARCH, AgentOutputSchema(
                agent=AgentRole.RESEARCH,
                task_id="",
                output={}
            )).output,
            "strategy": results.get(AgentRole.STRATEGY, AgentOutputSchema(
                agent=AgentRole.STRATEGY,
                task_id="",
                output={}
            )).output,
            "content_assets": results.get(AgentRole.CONTENT, AgentOutputSchema(
                agent=AgentRole.CONTENT,
                task_id="",
                output={}
            )).output,
            "campaign_structure": results.get(AgentRole.CAMPAIGN, AgentOutputSchema(
                agent=AgentRole.CAMPAIGN,
                task_id="",
                output={}
            )).output,
            "budget_allocation": results.get(AgentRole.BUDGET, AgentOutputSchema(
                agent=AgentRole.BUDGET,
                task_id="",
                output={}
            )).output,
            "compliance_status": results.get(AgentRole.COMPLIANCE, AgentOutputSchema(
                agent=AgentRole.COMPLIANCE,
                task_id="",
                output={}
            )).output,
            "kpi_framework": results.get(AgentRole.ANALYTICS, AgentOutputSchema(
                agent=AgentRole.ANALYTICS,
                task_id="",
                output={}
            )).output,
            "merged_timestamp": datetime.utcnow().isoformat()
        }
        
        return merged_plan
    
    def get_aggregation_statistics(self) -> Dict[str, Any]:
        """الحصول على إحصائيات التجميع"""
        if not self.aggregation_history:
            return {"total_aggregations": 0}
        
        aggregation_types = {}
        for agg in self.aggregation_history:
            agg_type = agg.synthesis_notes.split()[-2]  # استخراج نوع التجميع
            aggregation_types[agg_type] = aggregation_types.get(agg_type, 0) + 1
        
        return {
            "total_aggregations": len(self.aggregation_history),
            "aggregation_types": aggregation_types,
            "average_sources_per_aggregation": (
                sum(len(agg.source_outputs) for agg in self.aggregation_history) /
                len(self.aggregation_history)
            )
        }
