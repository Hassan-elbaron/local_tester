"""
Enhanced Memory Layer - طبقة الذاكرة المحسّنة
يتضمن: Session Context, Persistent Storage, Database Preparation
"""

from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import json
import logging
from pathlib import Path
import sqlite3

logger = logging.getLogger(__name__)


@dataclass
class SessionContext:
    """سياق الجلسة"""
    session_id: str
    campaign_id: str
    created_at: str
    last_accessed: str
    context_data: Dict[str, Any]
    metadata: Dict[str, Any]


class SessionMemory:
    """
    ذاكرة الجلسة
    تخزين السياق للجلسة الحالية
    """
    
    def __init__(self, session_ttl: int = 3600):
        """
        Args:
            session_ttl: مدة حياة الجلسة بالثواني
        """
        self.session_ttl = session_ttl
        self.sessions: Dict[str, SessionContext] = {}
    
    def create_session(
        self,
        session_id: str,
        campaign_id: str,
        context_data: Dict[str, Any]
    ) -> SessionContext:
        """إنشاء جلسة جديدة"""
        session = SessionContext(
            session_id=session_id,
            campaign_id=campaign_id,
            created_at=datetime.utcnow().isoformat(),
            last_accessed=datetime.utcnow().isoformat(),
            context_data=context_data,
            metadata={}
        )
        
        self.sessions[session_id] = session
        logger.info(f"Session created: {session_id}")
        
        return session
    
    def get_session(self, session_id: str) -> Optional[SessionContext]:
        """الحصول على جلسة"""
        if session_id not in self.sessions:
            return None
        
        session = self.sessions[session_id]
        
        # التحقق من انتهاء الصلاحية
        last_accessed = datetime.fromisoformat(session.last_accessed)
        if (datetime.utcnow() - last_accessed).total_seconds() > self.session_ttl:
            del self.sessions[session_id]
            logger.warning(f"Session expired: {session_id}")
            return None
        
        # تحديث آخر وصول
        session.last_accessed = datetime.utcnow().isoformat()
        
        return session
    
    def update_session_context(
        self,
        session_id: str,
        updates: Dict[str, Any]
    ):
        """تحديث سياق الجلسة"""
        session = self.get_session(session_id)
        
        if session:
            session.context_data.update(updates)
            session.last_accessed = datetime.utcnow().isoformat()
            logger.debug(f"Session context updated: {session_id}")
    
    def delete_session(self, session_id: str):
        """حذف جلسة"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            logger.info(f"Session deleted: {session_id}")
    
    def cleanup_expired_sessions(self):
        """تنظيف الجلسات المنتهية الصلاحية"""
        expired = []
        
        for session_id, session in self.sessions.items():
            last_accessed = datetime.fromisoformat(session.last_accessed)
            if (datetime.utcnow() - last_accessed).total_seconds() > self.session_ttl:
                expired.append(session_id)
        
        for session_id in expired:
            del self.sessions[session_id]
        
        if expired:
            logger.info(f"Cleaned up {len(expired)} expired sessions")


class PersistentStorage:
    """
    التخزين الدائم
    حفظ البيانات في ملفات JSON
    """
    
    def __init__(self, storage_dir: str = "./storage"):
        """
        Args:
            storage_dir: مجلد التخزين
        """
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        
        logger.info(f"PersistentStorage initialized: {self.storage_dir}")
    
    def save_campaign_data(
        self,
        campaign_id: str,
        data: Dict[str, Any]
    ):
        """حفظ بيانات الحملة"""
        file_path = self.storage_dir / f"campaign_{campaign_id}.json"
        
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2, default=str)
        
        logger.info(f"Campaign data saved: {file_path}")
    
    def load_campaign_data(self, campaign_id: str) -> Optional[Dict[str, Any]]:
        """تحميل بيانات الحملة"""
        file_path = self.storage_dir / f"campaign_{campaign_id}.json"
        
        if not file_path.exists():
            return None
        
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        logger.info(f"Campaign data loaded: {file_path}")
        
        return data
    
    def save_decision_log(
        self,
        campaign_id: str,
        decisions: List[Dict[str, Any]]
    ):
        """حفظ سجل القرارات"""
        file_path = self.storage_dir / f"decisions_{campaign_id}.json"
        
        with open(file_path, 'w') as f:
            json.dump(decisions, f, indent=2, default=str)
        
        logger.info(f"Decision log saved: {file_path}")
    
    def list_campaigns(self) -> List[str]:
        """قائمة الحملات المحفوظة"""
        campaigns = []
        
        for file_path in self.storage_dir.glob("campaign_*.json"):
            campaign_id = file_path.stem.replace("campaign_", "")
            campaigns.append(campaign_id)
        
        return campaigns


class DatabasePreparation:
    """
    تحضير قاعدة البيانات
    هيكل جاهز للتكامل مع قاعدة بيانات حقيقية
    """
    
    def __init__(self, db_path: str = "./ai_marketing_os.db"):
        """
        Args:
            db_path: مسار قاعدة البيانات
        """
        self.db_path = db_path
        self._init_database()
    
    def _init_database(self):
        """تهيئة قاعدة البيانات"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # جدول الحملات
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS campaigns (
                campaign_id TEXT PRIMARY KEY,
                product TEXT NOT NULL,
                goal TEXT NOT NULL,
                market TEXT NOT NULL,
                budget REAL NOT NULL,
                status TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                metadata TEXT
            )
        """)
        
        # جدول المهام
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                task_id TEXT PRIMARY KEY,
                campaign_id TEXT NOT NULL,
                agent_name TEXT NOT NULL,
                task_description TEXT NOT NULL,
                status TEXT NOT NULL,
                output TEXT,
                confidence REAL,
                created_at TIMESTAMP NOT NULL,
                completed_at TIMESTAMP,
                FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id)
            )
        """)
        
        # جدول القرارات
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS decisions (
                decision_id TEXT PRIMARY KEY,
                campaign_id TEXT NOT NULL,
                task_id TEXT NOT NULL,
                decision_type TEXT NOT NULL,
                reasoning TEXT,
                output TEXT,
                confidence REAL,
                created_at TIMESTAMP NOT NULL,
                FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id),
                FOREIGN KEY (task_id) REFERENCES tasks(task_id)
            )
        """)
        
        # جدول السياق
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS context (
                context_id TEXT PRIMARY KEY,
                campaign_id TEXT NOT NULL,
                session_id TEXT,
                context_data TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id)
            )
        """)
        
        # جدول الأخطاء
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS errors (
                error_id TEXT PRIMARY KEY,
                campaign_id TEXT,
                task_id TEXT,
                error_type TEXT NOT NULL,
                error_message TEXT NOT NULL,
                severity TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL,
                FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id),
                FOREIGN KEY (task_id) REFERENCES tasks(task_id)
            )
        """)
        
        conn.commit()
        conn.close()
        
        logger.info(f"Database initialized: {self.db_path}")
    
    def save_campaign(
        self,
        campaign_id: str,
        product: str,
        goal: str,
        market: str,
        budget: float,
        status: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """حفظ الحملة"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO campaigns
            (campaign_id, product, goal, market, budget, status, created_at, updated_at, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            campaign_id, product, goal, market, budget, status,
            datetime.utcnow(), datetime.utcnow(),
            json.dumps(metadata or {})
        ))
        
        conn.commit()
        conn.close()
        
        logger.info(f"Campaign saved to database: {campaign_id}")
    
    def save_task(
        self,
        task_id: str,
        campaign_id: str,
        agent_name: str,
        task_description: str,
        status: str,
        output: Optional[Dict[str, Any]] = None,
        confidence: Optional[float] = None
    ):
        """حفظ المهمة"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO tasks
            (task_id, campaign_id, agent_name, task_description, status, output, confidence, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            task_id, campaign_id, agent_name, task_description, status,
            json.dumps(output or {}), confidence,
            datetime.utcnow()
        ))
        
        conn.commit()
        conn.close()
        
        logger.info(f"Task saved to database: {task_id}")
    
    def save_decision(
        self,
        decision_id: str,
        campaign_id: str,
        task_id: str,
        decision_type: str,
        reasoning: Optional[str] = None,
        output: Optional[Dict[str, Any]] = None,
        confidence: Optional[float] = None
    ):
        """حفظ القرار"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO decisions
            (decision_id, campaign_id, task_id, decision_type, reasoning, output, confidence, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            decision_id, campaign_id, task_id, decision_type, reasoning,
            json.dumps(output or {}), confidence,
            datetime.utcnow()
        ))
        
        conn.commit()
        conn.close()
        
        logger.info(f"Decision saved to database: {decision_id}")
    
    def get_campaign_history(self, campaign_id: str) -> Dict[str, Any]:
        """الحصول على سجل الحملة"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # الحملة
        cursor.execute("SELECT * FROM campaigns WHERE campaign_id = ?", (campaign_id,))
        campaign = cursor.fetchone()
        
        # المهام
        cursor.execute("SELECT * FROM tasks WHERE campaign_id = ?", (campaign_id,))
        tasks = cursor.fetchall()
        
        # القرارات
        cursor.execute("SELECT * FROM decisions WHERE campaign_id = ?", (campaign_id,))
        decisions = cursor.fetchall()
        
        conn.close()
        
        return {
            "campaign": campaign,
            "tasks": tasks,
            "decisions": decisions
        }
    
    def get_statistics(self) -> Dict[str, Any]:
        """الحصول على إحصائيات قاعدة البيانات"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # عدد الحملات
        cursor.execute("SELECT COUNT(*) FROM campaigns")
        total_campaigns = cursor.fetchone()[0]
        
        # عدد المهام
        cursor.execute("SELECT COUNT(*) FROM tasks")
        total_tasks = cursor.fetchone()[0]
        
        # عدد القرارات
        cursor.execute("SELECT COUNT(*) FROM decisions")
        total_decisions = cursor.fetchone()[0]
        
        # عدد الأخطاء
        cursor.execute("SELECT COUNT(*) FROM errors")
        total_errors = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "total_campaigns": total_campaigns,
            "total_tasks": total_tasks,
            "total_decisions": total_decisions,
            "total_errors": total_errors
        }


class EnhancedUnifiedMemory:
    """
    نظام الذاكرة الموحد المحسّن
    يجمع: Session Memory + Persistent Storage + Database Preparation
    """
    
    def __init__(
        self,
        storage_dir: str = "./storage",
        db_path: str = "./ai_marketing_os.db"
    ):
        self.session_memory = SessionMemory()
        self.persistent_storage = PersistentStorage(storage_dir)
        self.database = DatabasePreparation(db_path)
    
    def get_full_statistics(self) -> Dict[str, Any]:
        """الحصول على إحصائيات شاملة"""
        return {
            "sessions": len(self.session_memory.sessions),
            "storage": {
                "campaigns": len(self.persistent_storage.list_campaigns())
            },
            "database": self.database.get_statistics()
        }
    
    def cleanup(self):
        """تنظيف الموارد"""
        self.session_memory.cleanup_expired_sessions()
        logger.info("Memory cleanup completed")
