"""
Advanced Decision Engine - محرك القرارات المتقدم
يتضمن: Ranking, Confidence Scoring, Jury Logic
"""

from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from schemas import AgentOutputSchema, DecisionResultSchema
import uuid
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class RankingStrategy(Enum):
    """استراتيجيات الترتيب"""
    CONFIDENCE_BASED = "confidence_based"
    WEIGHTED_SCORE = "weighted_score"
    CONSENSUS = "consensus"
    HYBRID = "hybrid"


@dataclass
class RankedOption:
    """خيار مرتب مع النقاط"""
    option_id: str
    option_data: Dict[str, Any]
    confidence_score: float
    weighted_score: float
    consensus_level: float
    overall_rank: float
    reasoning: Dict[str, Any] = field(default_factory=dict)


@dataclass
class JuryMember:
    """عضو في المجلس الاستشاري"""
    agent_name: str
    output: AgentOutputSchema
    confidence: float
    alignment_score: float = 0.0


class AdvancedDecisionEngine:
    """
    محرك قرارات متقدم مع:
    - Ranking متعدد المعايير
    - Confidence Scoring
    - Jury Logic (مجلس استشاري)
    - Consensus Detection
    """
    
    def __init__(self, jury_threshold: float = 0.7):
        """
        Args:
            jury_threshold: حد الإجماع المطلوب (0-1)
        """
        self.jury_threshold = jury_threshold
        self.decision_history: List[DecisionResultSchema] = []
        self.jury_members: List[JuryMember] = []
        
        logger.info(f"Advanced Decision Engine initialized with jury_threshold={jury_threshold}")
    
    def make_decision_with_jury(
        self,
        task_description: str,
        agent_outputs: List[AgentOutputSchema],
        available_options: List[Dict[str, Any]],
        ranking_strategy: RankingStrategy = RankingStrategy.HYBRID
    ) -> DecisionResultSchema:
        """
        اتخاذ قرار باستخدام مجلس استشاري من الوكلاء
        
        Args:
            task_description: وصف المهمة
            agent_outputs: مخرجات الوكلاء
            available_options: الخيارات المتاحة
            ranking_strategy: استراتيجية الترتيب
            
        Returns:
            DecisionResultSchema: القرار النهائي
        """
        logger.info(f"Starting jury-based decision for task: {task_description}")
        
        # تكوين المجلس الاستشاري
        jury = self._form_jury(agent_outputs)
        logger.debug(f"Jury formed with {len(jury)} members")
        
        # ترتيب الخيارات
        ranked_options = self._rank_options(
            available_options,
            jury,
            ranking_strategy
        )
        logger.debug(f"Options ranked: {len(ranked_options)} options")
        
        # اختيار أفضل خيار
        best_option = ranked_options[0] if ranked_options else None
        
        if not best_option:
            logger.warning("No valid options found for decision")
            return self._create_fallback_decision()
        
        # التحقق من الإجماع
        consensus_detected = self._check_consensus(jury, best_option)
        
        # بناء القرار
        decision = DecisionResultSchema(
            decision_id=str(uuid.uuid4()),
            selected_option=best_option.option_data,
            confidence_score=best_option.overall_rank,
            reasoning={
                "strategy": ranking_strategy.value,
                "jury_size": len(jury),
                "consensus_detected": consensus_detected,
                "consensus_level": best_option.consensus_level,
                "weighted_score": best_option.weighted_score,
                "confidence_score": best_option.confidence_score,
                "jury_opinions": [
                    {
                        "agent": member.agent_name,
                        "confidence": member.confidence,
                        "alignment": member.alignment_score
                    }
                    for member in jury
                ]
            },
            alternative_options=[
                opt.option_data for opt in ranked_options[1:3]
            ]
        )
        
        self.decision_history.append(decision)
        logger.info(f"Decision made: {decision.decision_id} with confidence {decision.confidence_score:.2f}")
        
        return decision
    
    def _form_jury(self, agent_outputs: List[AgentOutputSchema]) -> List[JuryMember]:
        """
        تكوين المجلس الاستشاري من الوكلاء
        
        Args:
            agent_outputs: مخرجات الوكلاء
            
        Returns:
            List[JuryMember]: أعضاء المجلس
        """
        jury = []
        
        for output in agent_outputs:
            member = JuryMember(
                agent_name=output.agent.value,
                output=output,
                confidence=output.confidence or 0.8,
                alignment_score=0.0
            )
            jury.append(member)
        
        # حساب درجات التوافق بين الأعضاء
        self._calculate_alignment_scores(jury)
        
        return jury
    
    def _calculate_alignment_scores(self, jury: List[JuryMember]):
        """
        حساب درجات التوافق بين أعضاء المجلس
        
        Args:
            jury: أعضاء المجلس
        """
        for i, member in enumerate(jury):
            alignment_sum = 0.0
            comparison_count = 0
            
            for j, other_member in enumerate(jury):
                if i != j:
                    # حساب التشابه بين المخرجات
                    similarity = self._calculate_output_similarity(
                        member.output,
                        other_member.output
                    )
                    alignment_sum += similarity
                    comparison_count += 1
            
            if comparison_count > 0:
                member.alignment_score = alignment_sum / comparison_count
            else:
                member.alignment_score = 1.0
    
    def _calculate_output_similarity(
        self,
        output1: AgentOutputSchema,
        output2: AgentOutputSchema
    ) -> float:
        """
        حساب التشابه بين مخرجات وكيلين
        
        Args:
            output1: المخرجات الأولى
            output2: المخرجات الثانية
            
        Returns:
            float: درجة التشابه (0-1)
        """
        # تبسيط: حساب التشابه بناءً على الثقة والمجال
        confidence_similarity = 1.0 - abs(
            (output1.confidence or 0.8) - (output2.confidence or 0.8)
        )
        
        # يمكن إضافة مقاييس تشابه أخرى هنا
        return confidence_similarity
    
    def _rank_options(
        self,
        options: List[Dict[str, Any]],
        jury: List[JuryMember],
        strategy: RankingStrategy
    ) -> List[RankedOption]:
        """
        ترتيب الخيارات بناءً على استراتيجية محددة
        
        Args:
            options: الخيارات المتاحة
            jury: المجلس الاستشاري
            strategy: استراتيجية الترتيب
            
        Returns:
            List[RankedOption]: الخيارات المرتبة
        """
        ranked = []
        
        for idx, option in enumerate(options):
            option_id = str(uuid.uuid4())
            
            # حساب النقاط حسب الاستراتيجية
            if strategy == RankingStrategy.CONFIDENCE_BASED:
                scores = self._score_confidence_based(option, jury)
            elif strategy == RankingStrategy.WEIGHTED_SCORE:
                scores = self._score_weighted(option, jury)
            elif strategy == RankingStrategy.CONSENSUS:
                scores = self._score_consensus(option, jury)
            else:  # HYBRID
                scores = self._score_hybrid(option, jury)
            
            ranked_option = RankedOption(
                option_id=option_id,
                option_data=option,
                confidence_score=scores["confidence"],
                weighted_score=scores["weighted"],
                consensus_level=scores["consensus"],
                overall_rank=scores["overall"],
                reasoning=scores.get("reasoning", {})
            )
            
            ranked.append(ranked_option)
        
        # ترتيب تنازلي حسب الترتيب الكلي
        ranked.sort(key=lambda x: x.overall_rank, reverse=True)
        
        logger.debug(f"Ranked {len(ranked)} options using {strategy.value} strategy")
        
        return ranked
    
    def _score_confidence_based(
        self,
        option: Dict[str, Any],
        jury: List[JuryMember]
    ) -> Dict[str, float]:
        """درجات بناءً على الثقة"""
        avg_confidence = sum(m.confidence for m in jury) / len(jury) if jury else 0.5
        
        return {
            "confidence": avg_confidence,
            "weighted": avg_confidence,
            "consensus": 0.0,
            "overall": avg_confidence,
            "reasoning": {"method": "confidence_based", "avg_confidence": avg_confidence}
        }
    
    def _score_weighted(
        self,
        option: Dict[str, Any],
        jury: List[JuryMember]
    ) -> Dict[str, float]:
        """درجات موزونة"""
        # وزن الثقة والتوافق
        confidence_weight = 0.6
        alignment_weight = 0.4
        
        avg_confidence = sum(m.confidence for m in jury) / len(jury) if jury else 0.5
        avg_alignment = sum(m.alignment_score for m in jury) / len(jury) if jury else 0.5
        
        weighted_score = (
            avg_confidence * confidence_weight +
            avg_alignment * alignment_weight
        )
        
        return {
            "confidence": avg_confidence,
            "weighted": weighted_score,
            "consensus": 0.0,
            "overall": weighted_score,
            "reasoning": {
                "method": "weighted_score",
                "confidence_weight": confidence_weight,
                "alignment_weight": alignment_weight,
                "avg_confidence": avg_confidence,
                "avg_alignment": avg_alignment
            }
        }
    
    def _score_consensus(
        self,
        option: Dict[str, Any],
        jury: List[JuryMember]
    ) -> Dict[str, float]:
        """درجات بناءً على الإجماع"""
        if not jury:
            return {
                "confidence": 0.5,
                "weighted": 0.5,
                "consensus": 0.0,
                "overall": 0.5
            }
        
        # حساب مستوى الإجماع
        alignment_scores = [m.alignment_score for m in jury]
        avg_alignment = sum(alignment_scores) / len(alignment_scores)
        
        # إذا كان هناك إجماع عالي، زيادة الدرجة
        consensus_boost = avg_alignment * 0.3
        
        base_score = sum(m.confidence for m in jury) / len(jury)
        consensus_score = base_score + consensus_boost
        
        return {
            "confidence": base_score,
            "weighted": base_score,
            "consensus": avg_alignment,
            "overall": min(consensus_score, 1.0),
            "reasoning": {
                "method": "consensus",
                "avg_alignment": avg_alignment,
                "consensus_boost": consensus_boost
            }
        }
    
    def _score_hybrid(
        self,
        option: Dict[str, Any],
        jury: List[JuryMember]
    ) -> Dict[str, float]:
        """درجات هجينة (مزيج من جميع الاستراتيجيات)"""
        confidence = self._score_confidence_based(option, jury)
        weighted = self._score_weighted(option, jury)
        consensus = self._score_consensus(option, jury)
        
        # متوسط الثلاث استراتيجيات
        overall = (
            confidence["overall"] * 0.3 +
            weighted["overall"] * 0.4 +
            consensus["overall"] * 0.3
        )
        
        return {
            "confidence": confidence["confidence"],
            "weighted": weighted["weighted"],
            "consensus": consensus["consensus"],
            "overall": overall,
            "reasoning": {
                "method": "hybrid",
                "confidence_score": confidence["overall"],
                "weighted_score": weighted["overall"],
                "consensus_score": consensus["overall"]
            }
        }
    
    def _check_consensus(
        self,
        jury: List[JuryMember],
        best_option: RankedOption
    ) -> bool:
        """
        التحقق من وجود إجماع بين أعضاء المجلس
        
        Args:
            jury: المجلس الاستشاري
            best_option: أفضل خيار
            
        Returns:
            bool: هل يوجد إجماع
        """
        if not jury:
            return False
        
        avg_alignment = sum(m.alignment_score for m in jury) / len(jury)
        
        consensus = avg_alignment >= self.jury_threshold
        
        logger.debug(
            f"Consensus check: alignment={avg_alignment:.2f}, "
            f"threshold={self.jury_threshold}, consensus={consensus}"
        )
        
        return consensus
    
    def _create_fallback_decision(self) -> DecisionResultSchema:
        """إنشاء قرار احتياطي في حالة الفشل"""
        return DecisionResultSchema(
            decision_id=str(uuid.uuid4()),
            selected_option={"status": "fallback", "reason": "No valid options"},
            confidence_score=0.0,
            reasoning={"status": "fallback_decision"},
            alternative_options=[]
        )
    
    def get_jury_statistics(self) -> Dict[str, Any]:
        """الحصول على إحصائيات المجلس"""
        if not self.jury_members:
            return {"jury_size": 0}
        
        confidences = [m.confidence for m in self.jury_members]
        alignments = [m.alignment_score for m in self.jury_members]
        
        return {
            "jury_size": len(self.jury_members),
            "avg_confidence": sum(confidences) / len(confidences),
            "avg_alignment": sum(alignments) / len(alignments),
            "members": [
                {
                    "agent": m.agent_name,
                    "confidence": m.confidence,
                    "alignment": m.alignment_score
                }
                for m in self.jury_members
            ]
        }
    
    def get_decision_statistics(self) -> Dict[str, Any]:
        """الحصول على إحصائيات القرارات"""
        if not self.decision_history:
            return {"total_decisions": 0}
        
        confidences = [d.confidence_score for d in self.decision_history]
        
        return {
            "total_decisions": len(self.decision_history),
            "avg_confidence": sum(confidences) / len(confidences),
            "high_confidence": len([d for d in self.decision_history if d.confidence_score > 0.85]),
            "medium_confidence": len([d for d in self.decision_history if 0.7 <= d.confidence_score <= 0.85]),
            "low_confidence": len([d for d in self.decision_history if d.confidence_score < 0.7])
        }
