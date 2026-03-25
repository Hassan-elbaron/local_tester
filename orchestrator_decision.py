"""
Decision Layer - طبقة اتخاذ القرارات
"""

from typing import List, Dict, Any, Optional, Tuple
from schemas import (
    DecisionContextSchema, DecisionCriteriaSchema,
    DecisionResultSchema, AgentOutputSchema
)
import uuid
from datetime import datetime


class DecisionEngine:
    """
    محرك اتخاذ القرارات بناءً على معايير وآراء الوكلاء
    """
    
    def __init__(self):
        self.decision_history: List[DecisionResultSchema] = []
    
    def make_decision(
        self,
        decision_context: DecisionContextSchema,
        agent_opinions: List[AgentOutputSchema]
    ) -> DecisionResultSchema:
        """
        اتخاذ قرار بناءً على السياق والآراء
        
        Args:
            decision_context: سياق القرار
            agent_opinions: آراء الوكلاء
            
        Returns:
            DecisionResultSchema: نتيجة القرار
        """
        # تقييم الخيارات
        evaluated_options = self._evaluate_options(
            decision_context.available_options,
            decision_context.criteria,
            agent_opinions
        )
        
        # اختيار أفضل خيار
        selected_option, confidence_score = self._select_best_option(
            evaluated_options,
            decision_context.constraints
        )
        
        # بناء المنطق
        reasoning = self._build_reasoning(
            evaluated_options,
            selected_option,
            agent_opinions
        )
        
        # إنشاء نتيجة القرار
        decision = DecisionResultSchema(
            decision_id=str(uuid.uuid4()),
            selected_option=selected_option,
            confidence_score=confidence_score,
            reasoning=reasoning,
            alternative_options=[
                opt for opt in evaluated_options
                if opt != selected_option
            ][:2]  # أفضل خيارين بديلين
        )
        
        self.decision_history.append(decision)
        return decision
    
    def _evaluate_options(
        self,
        options: List[Dict[str, Any]],
        criteria: List[DecisionCriteriaSchema],
        agent_opinions: List[AgentOutputSchema]
    ) -> List[Dict[str, Any]]:
        """
        تقييم الخيارات بناءً على المعايير
        
        Args:
            options: الخيارات المتاحة
            criteria: معايير التقييم
            agent_opinions: آراء الوكلاء
            
        Returns:
            List: الخيارات المقيمة مرتبة
        """
        evaluated = []
        
        for option in options:
            score = 0.0
            total_weight = 0.0
            
            # تقييم بناءً على المعايير
            for criterion in criteria:
                criterion_score = self._evaluate_criterion(
                    option,
                    criterion
                )
                score += criterion_score * criterion.weight
                total_weight += criterion.weight
            
            # تقييم بناءً على آراء الوكلاء
            agent_score = self._evaluate_agent_opinions(
                option,
                agent_opinions
            )
            score += agent_score * 0.3  # 30% من الوزن للآراء
            total_weight += 0.3
            
            # حساب النقاط النهائية
            final_score = score / total_weight if total_weight > 0 else 0
            
            evaluated.append({
                "option": option,
                "score": final_score,
                "details": {
                    "criteria_score": score - agent_score * 0.3,
                    "agent_score": agent_score
                }
            })
        
        # ترتيب حسب النقاط
        return sorted(evaluated, key=lambda x: x["score"], reverse=True)
    
    def _evaluate_criterion(
        self,
        option: Dict[str, Any],
        criterion: DecisionCriteriaSchema
    ) -> float:
        """تقييم معيار واحد"""
        # تبسيط: افترض أن الخيار يحقق المعيار
        if criterion.threshold:
            # إذا كان هناك حد أدنى
            return 0.9 if option.get("score", 0) >= criterion.threshold else 0.3
        else:
            return 0.8  # الافتراضي
    
    def _evaluate_agent_opinions(
        self,
        option: Dict[str, Any],
        agent_opinions: List[AgentOutputSchema]
    ) -> float:
        """تقييم آراء الوكلاء"""
        if not agent_opinions:
            return 0.5
        
        # حساب متوسط الثقة من الوكلاء
        confidence_scores = [
            o.confidence or 0.8
            for o in agent_opinions
        ]
        
        return sum(confidence_scores) / len(confidence_scores)
    
    def _select_best_option(
        self,
        evaluated_options: List[Dict[str, Any]],
        constraints: List[str]
    ) -> Tuple[Dict[str, Any], float]:
        """
        اختيار أفضل خيار يحترم القيود
        
        Returns:
            tuple: (الخيار المختار، درجة الثقة)
        """
        if not evaluated_options:
            return {}, 0.0
        
        # اختيار أفضل خيار يحترم القيود
        for evaluated in evaluated_options:
            if self._check_constraints(evaluated["option"], constraints):
                return evaluated["option"], evaluated["score"]
        
        # إذا لم يوجد خيار يحترم جميع القيود، اختر الأفضل
        return evaluated_options[0]["option"], evaluated_options[0]["score"]
    
    def _check_constraints(
        self,
        option: Dict[str, Any],
        constraints: List[str]
    ) -> bool:
        """التحقق من احترام القيود"""
        # تبسيط: افترض أن جميع الخيارات تحترم القيود
        return True
    
    def _build_reasoning(
        self,
        evaluated_options: List[Dict[str, Any]],
        selected_option: Dict[str, Any],
        agent_opinions: List[AgentOutputSchema]
    ) -> Dict[str, Any]:
        """بناء المنطق خلف القرار"""
        return {
            "selection_reason": f"Selected option with highest score: {evaluated_options[0]['score']:.2f}",
            "alternatives_considered": len(evaluated_options),
            "agent_consensus": len([o for o in agent_opinions if (o.confidence or 0.8) > 0.8]),
            "total_agents": len(agent_opinions),
            "decision_confidence": "high" if evaluated_options[0]["score"] > 0.85 else "medium" if evaluated_options[0]["score"] > 0.7 else "low"
        }
    
    def get_decision_statistics(self) -> Dict[str, Any]:
        """الحصول على إحصائيات القرارات"""
        if not self.decision_history:
            return {"total_decisions": 0}
        
        confidence_scores = [d.confidence_score for d in self.decision_history]
        
        return {
            "total_decisions": len(self.decision_history),
            "average_confidence": sum(confidence_scores) / len(confidence_scores),
            "high_confidence_decisions": len([d for d in self.decision_history if d.confidence_score > 0.85]),
            "low_confidence_decisions": len([d for d in self.decision_history if d.confidence_score < 0.7])
        }
