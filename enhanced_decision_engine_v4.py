"""
Enhanced Decision Engine v4 - محرك القرارات المحسّن
يتضمن: Scoring System, Confidence Calculation, Ranking Algorithm
"""

from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import logging
from datetime import datetime
import json

logger = logging.getLogger(__name__)


class ScoringStrategy(Enum):
    """استراتيجيات التقييم"""
    WEIGHTED = "weighted"  # ترجيح بناءً على الأوزان
    NORMALIZED = "normalized"  # تطبيع النتائج
    PERCENTILE = "percentile"  # ترتيب النسب المئوية
    HYBRID = "hybrid"  # مزيج من الاستراتيجيات


@dataclass
class ScoringCriteria:
    """معايير التقييم"""
    name: str  # اسم المعيار
    weight: float = 1.0  # الوزن (0-1)
    importance: str = "medium"  # الأهمية (low, medium, high, critical)
    description: str = ""  # الوصف
    
    def get_importance_multiplier(self) -> float:
        """الحصول على مضاعف الأهمية"""
        multipliers = {
            "low": 0.5,
            "medium": 1.0,
            "high": 1.5,
            "critical": 2.0
        }
        return multipliers.get(self.importance, 1.0)


@dataclass
class ScoredOption:
    """خيار مع درجة"""
    option_id: str
    name: str
    raw_score: float  # الدرجة الخام
    normalized_score: float = 0.0  # الدرجة المعايرة (0-1)
    confidence: float = 0.0  # درجة الثقة (0-1)
    ranking: int = 0  # الترتيب
    details: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "option_id": self.option_id,
            "name": self.name,
            "raw_score": self.raw_score,
            "normalized_score": self.normalized_score,
            "confidence": self.confidence,
            "ranking": self.ranking,
            "details": self.details
        }


@dataclass
class DecisionResult:
    """نتيجة القرار"""
    decision_id: str
    selected_option: str
    confidence_score: float
    all_options: List[ScoredOption]
    reasoning: Dict[str, Any]
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "decision_id": self.decision_id,
            "selected_option": self.selected_option,
            "confidence_score": self.confidence_score,
            "all_options": [opt.to_dict() for opt in self.all_options],
            "reasoning": self.reasoning,
            "timestamp": self.timestamp
        }


class ScoringEngine:
    """محرك التقييم"""
    
    def __init__(self):
        self.criteria: Dict[str, ScoringCriteria] = {}
        self.scoring_history: List[Dict[str, Any]] = []
    
    def add_criterion(self, criterion: ScoringCriteria):
        """إضافة معيار تقييم"""
        self.criteria[criterion.name] = criterion
        logger.debug(f"Criterion added: {criterion.name}")
    
    def score_option(
        self,
        option: Dict[str, Any],
        criteria_values: Dict[str, float]
    ) -> float:
        """
        تقييم خيار بناءً على المعايير
        
        Args:
            option: الخيار
            criteria_values: قيم المعايير (0-100)
            
        Returns:
            float: الدرجة النهائية
        """
        total_score = 0.0
        total_weight = 0.0
        
        for criterion_name, value in criteria_values.items():
            if criterion_name not in self.criteria:
                logger.warning(f"Unknown criterion: {criterion_name}")
                continue
            
            criterion = self.criteria[criterion_name]
            
            # حساب الدرجة المرجحة
            weighted_value = value * criterion.weight * criterion.get_importance_multiplier()
            
            total_score += weighted_value
            total_weight += criterion.weight * criterion.get_importance_multiplier()
        
        # حساب المتوسط المرجح
        final_score = total_score / total_weight if total_weight > 0 else 0
        
        return final_score
    
    def normalize_scores(self, scores: List[float]) -> List[float]:
        """تطبيع الدرجات إلى (0-1)"""
        if not scores:
            return []
        
        min_score = min(scores)
        max_score = max(scores)
        
        if max_score == min_score:
            return [0.5] * len(scores)
        
        normalized = [
            (score - min_score) / (max_score - min_score)
            for score in scores
        ]
        
        return normalized
    
    def calculate_confidence(
        self,
        normalized_score: float,
        score_variance: float,
        agreement_level: float = 1.0
    ) -> float:
        """
        حساب درجة الثقة
        
        Args:
            normalized_score: الدرجة المعايرة (0-1)
            score_variance: التباين في الدرجات
            agreement_level: مستوى الاتفاق (0-1)
            
        Returns:
            float: درجة الثقة (0-1)
        """
        # الدرجة الأساسية من الدرجة المعايرة
        base_confidence = normalized_score
        
        # تقليل الثقة بناءً على التباين
        variance_penalty = score_variance * 0.3
        
        # إضافة الثقة بناءً على الاتفاق
        agreement_boost = agreement_level * 0.2
        
        # الحساب النهائي
        confidence = base_confidence - variance_penalty + agreement_boost
        
        # التأكد من أن الثقة بين 0 و 1
        confidence = max(0.0, min(1.0, confidence))
        
        return confidence


class RankingEngine:
    """محرك الترتيب"""
    
    def __init__(self, strategy: ScoringStrategy = ScoringStrategy.HYBRID):
        self.strategy = strategy
        self.ranking_history: List[Dict[str, Any]] = []
    
    def rank_options(
        self,
        scored_options: List[ScoredOption]
    ) -> List[ScoredOption]:
        """
        ترتيب الخيارات
        
        Args:
            scored_options: الخيارات المقيمة
            
        Returns:
            List[ScoredOption]: الخيارات المرتبة
        """
        # ترتيب حسب الدرجة المعايرة (تنازلي)
        sorted_options = sorted(
            scored_options,
            key=lambda x: x.normalized_score,
            reverse=True
        )
        
        # تعيين الترتيب
        for rank, option in enumerate(sorted_options, 1):
            option.ranking = rank
        
        return sorted_options
    
    def get_top_options(
        self,
        ranked_options: List[ScoredOption],
        top_n: int = 3
    ) -> List[ScoredOption]:
        """الحصول على أفضل N خيارات"""
        return ranked_options[:top_n]
    
    def calculate_ranking_confidence(
        self,
        ranked_options: List[ScoredOption]
    ) -> float:
        """
        حساب ثقة الترتيب
        بناءً على الفجوة بين الخيارات الأولى
        
        Args:
            ranked_options: الخيارات المرتبة
            
        Returns:
            float: ثقة الترتيب (0-1)
        """
        if len(ranked_options) < 2:
            return 1.0
        
        # الفجوة بين الخيار الأول والثاني
        gap = ranked_options[0].normalized_score - ranked_options[1].normalized_score
        
        # الثقة تزداد مع الفجوة
        confidence = min(1.0, gap * 2)
        
        return confidence


class EnhancedDecisionEngineV4:
    """
    محرك القرارات المحسّن v4
    يجمع: Scoring + Confidence + Ranking
    """
    
    def __init__(self):
        self.scoring_engine = ScoringEngine()
        self.ranking_engine = RankingEngine()
        self.decision_history: List[DecisionResult] = []
        
        # إعداد معايير افتراضية
        self._setup_default_criteria()
    
    def _setup_default_criteria(self):
        """إعداد معايير التقييم الافتراضية"""
        default_criteria = [
            ScoringCriteria(
                name="relevance",
                weight=1.5,
                importance="critical",
                description="مدى الملاءمة للهدف"
            ),
            ScoringCriteria(
                name="effectiveness",
                weight=1.3,
                importance="high",
                description="الفعالية المتوقعة"
            ),
            ScoringCriteria(
                name="cost",
                weight=1.0,
                importance="high",
                description="التكلفة"
            ),
            ScoringCriteria(
                name="feasibility",
                weight=1.2,
                importance="high",
                description="الجدوى"
            ),
            ScoringCriteria(
                name="scalability",
                weight=0.8,
                importance="medium",
                description="قابلية التوسع"
            ),
        ]
        
        for criterion in default_criteria:
            self.scoring_engine.add_criterion(criterion)
    
    def make_decision(
        self,
        task_id: str,
        options: List[Dict[str, Any]],
        criteria_scores: Dict[str, Dict[str, float]],
        agent_outputs: Optional[List[Dict[str, Any]]] = None
    ) -> DecisionResult:
        """
        اتخاذ قرار بناءً على التقييم والترتيب
        
        Args:
            task_id: معرف المهمة
            options: قائمة الخيارات
            criteria_scores: درجات المعايير لكل خيار
            agent_outputs: مخرجات الوكلاء (اختياري)
            
        Returns:
            DecisionResult: نتيجة القرار
        """
        decision_id = f"decision_{task_id}_{datetime.utcnow().timestamp()}"
        
        logger.info(f"Making decision: {decision_id}")
        
        # تقييم الخيارات
        scored_options = []
        raw_scores = []
        
        for option in options:
            option_id = option.get("id", option.get("name", "unknown"))
            
            # الحصول على درجات المعايير للخيار
            option_criteria = criteria_scores.get(option_id, {})
            
            # حساب الدرجة
            raw_score = self.scoring_engine.score_option(option, option_criteria)
            raw_scores.append(raw_score)
            
            scored_option = ScoredOption(
                option_id=option_id,
                name=option.get("name", option_id),
                raw_score=raw_score
            )
            
            scored_options.append(scored_option)
        
        # تطبيع الدرجات
        normalized_scores = self.scoring_engine.normalize_scores(raw_scores)
        
        for scored_option, normalized_score in zip(scored_options, normalized_scores):
            scored_option.normalized_score = normalized_score
        
        # حساب درجات الثقة
        score_variance = self._calculate_variance(normalized_scores)
        
        for scored_option in scored_options:
            # حساب مستوى الاتفاق من مخرجات الوكلاء
            agreement_level = self._calculate_agreement_level(
                scored_option.option_id,
                agent_outputs
            )
            
            confidence = self.scoring_engine.calculate_confidence(
                scored_option.normalized_score,
                score_variance,
                agreement_level
            )
            
            scored_option.confidence = confidence
        
        # ترتيب الخيارات
        ranked_options = self.ranking_engine.rank_options(scored_options)
        
        # حساب ثقة الترتيب
        ranking_confidence = self.ranking_engine.calculate_ranking_confidence(
            ranked_options
        )
        
        # اختيار الخيار الأول
        selected_option = ranked_options[0]
        
        # إنشاء نتيجة القرار
        decision = DecisionResult(
            decision_id=decision_id,
            selected_option=selected_option.option_id,
            confidence_score=max(selected_option.confidence, ranking_confidence),
            all_options=ranked_options,
            reasoning={
                "scoring_strategy": self.scoring_engine.criteria,
                "score_variance": score_variance,
                "ranking_confidence": ranking_confidence,
                "agent_agreement": agreement_level,
                "top_3_options": [
                    {
                        "option": opt.option_id,
                        "score": opt.normalized_score,
                        "confidence": opt.confidence,
                        "ranking": opt.ranking
                    }
                    for opt in ranked_options[:3]
                ]
            }
        )
        
        # حفظ في السجل
        self.decision_history.append(decision)
        
        logger.info(
            f"Decision made: {selected_option.option_id} "
            f"(confidence: {decision.confidence_score:.2f})"
        )
        
        return decision
    
    def _calculate_variance(self, scores: List[float]) -> float:
        """حساب التباين في الدرجات"""
        if len(scores) < 2:
            return 0.0
        
        mean = sum(scores) / len(scores)
        variance = sum((x - mean) ** 2 for x in scores) / len(scores)
        
        return variance
    
    def _calculate_agreement_level(
        self,
        option_id: str,
        agent_outputs: Optional[List[Dict[str, Any]]]
    ) -> float:
        """
        حساب مستوى الاتفاق من مخرجات الوكلاء
        
        Args:
            option_id: معرف الخيار
            agent_outputs: مخرجات الوكلاء
            
        Returns:
            float: مستوى الاتفاق (0-1)
        """
        if not agent_outputs:
            return 0.5  # قيمة افتراضية
        
        agreements = 0
        
        for output in agent_outputs:
            if isinstance(output, dict):
                # البحث عن الخيار في مخرجات الوكيل
                output_str = json.dumps(output).lower()
                if str(option_id).lower() in output_str:
                    agreements += 1
        
        agreement_level = agreements / len(agent_outputs) if agent_outputs else 0.5
        
        return agreement_level
    
    def get_decision_statistics(self) -> Dict[str, Any]:
        """الحصول على إحصائيات القرارات"""
        if not self.decision_history:
            return {"total_decisions": 0}
        
        confidences = [d.confidence_score for d in self.decision_history]
        
        return {
            "total_decisions": len(self.decision_history),
            "avg_confidence": sum(confidences) / len(confidences),
            "min_confidence": min(confidences),
            "max_confidence": max(confidences),
            "high_confidence_decisions": len([c for c in confidences if c >= 0.8]),
            "medium_confidence_decisions": len([c for c in confidences if 0.5 <= c < 0.8]),
            "low_confidence_decisions": len([c for c in confidences if c < 0.5])
        }
    
    def get_decision_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """الحصول على سجل القرارات"""
        recent_decisions = self.decision_history[-limit:]
        return [d.to_dict() for d in recent_decisions]
    
    def reset_history(self):
        """إعادة تعيين السجل"""
        self.decision_history.clear()
        logger.info("Decision history reset")


# مثال على الاستخدام
def example_usage():
    """مثال على الاستخدام"""
    engine = EnhancedDecisionEngineV4()
    
    # تعريف الخيارات
    options = [
        {"id": "social_media", "name": "Social Media Campaign"},
        {"id": "email", "name": "Email Marketing"},
        {"id": "influencer", "name": "Influencer Partnership"},
    ]
    
    # تعريف درجات المعايير
    criteria_scores = {
        "social_media": {
            "relevance": 85,
            "effectiveness": 75,
            "cost": 60,
            "feasibility": 90,
            "scalability": 95
        },
        "email": {
            "relevance": 70,
            "effectiveness": 65,
            "cost": 90,
            "feasibility": 95,
            "scalability": 70
        },
        "influencer": {
            "relevance": 90,
            "effectiveness": 85,
            "cost": 40,
            "feasibility": 70,
            "scalability": 60
        }
    }
    
    # مخرجات الوكلاء (محاكاة)
    agent_outputs = [
        {"recommendation": "social_media", "confidence": 0.85},
        {"recommendation": "social_media", "confidence": 0.80},
        {"recommendation": "influencer", "confidence": 0.75},
    ]
    
    # اتخاذ القرار
    decision = engine.make_decision(
        task_id="task-1",
        options=options,
        criteria_scores=criteria_scores,
        agent_outputs=agent_outputs
    )
    
    print(f"Selected Option: {decision.selected_option}")
    print(f"Confidence: {decision.confidence_score:.2f}")
    print(f"All Options: {[opt.to_dict() for opt in decision.all_options]}")
    
    # الإحصائيات
    stats = engine.get_decision_statistics()
    print(f"Statistics: {stats}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    example_usage()
