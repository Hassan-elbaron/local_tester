"""
Authentication & User Management System
نظام المصادقة وإدارة المستخدمين
"""

from typing import Dict, Any, Optional, List, Set
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
import hashlib
import secrets
import logging
import jwt
import json
from pathlib import Path

logger = logging.getLogger(__name__)


class UserRole(str, Enum):
    """أدوار المستخدمين"""
    ADMIN = "admin"
    MANAGER = "manager"
    ANALYST = "analyst"
    VIEWER = "viewer"


class Permission(str, Enum):
    """الأذونات"""
    # Campaign Management
    CREATE_CAMPAIGN = "create_campaign"
    READ_CAMPAIGN = "read_campaign"
    UPDATE_CAMPAIGN = "update_campaign"
    DELETE_CAMPAIGN = "delete_campaign"
    
    # User Management
    CREATE_USER = "create_user"
    READ_USER = "read_user"
    UPDATE_USER = "update_user"
    DELETE_USER = "delete_user"
    
    # System Management
    VIEW_ANALYTICS = "view_analytics"
    VIEW_LOGS = "view_logs"
    MANAGE_SYSTEM = "manage_system"
    VIEW_BILLING = "view_billing"


# تحديد الأذونات لكل دور
ROLE_PERMISSIONS = {
    UserRole.ADMIN: [
        Permission.CREATE_CAMPAIGN, Permission.READ_CAMPAIGN,
        Permission.UPDATE_CAMPAIGN, Permission.DELETE_CAMPAIGN,
        Permission.CREATE_USER, Permission.READ_USER,
        Permission.UPDATE_USER, Permission.DELETE_USER,
        Permission.VIEW_ANALYTICS, Permission.VIEW_LOGS,
        Permission.MANAGE_SYSTEM, Permission.VIEW_BILLING
    ],
    UserRole.MANAGER: [
        Permission.CREATE_CAMPAIGN, Permission.READ_CAMPAIGN,
        Permission.UPDATE_CAMPAIGN, Permission.DELETE_CAMPAIGN,
        Permission.READ_USER, Permission.VIEW_ANALYTICS,
        Permission.VIEW_LOGS, Permission.VIEW_BILLING
    ],
    UserRole.ANALYST: [
        Permission.READ_CAMPAIGN, Permission.UPDATE_CAMPAIGN,
        Permission.VIEW_ANALYTICS, Permission.VIEW_LOGS
    ],
    UserRole.VIEWER: [
        Permission.READ_CAMPAIGN, Permission.VIEW_ANALYTICS
    ]
}


@dataclass
class User:
    """نموذج المستخدم"""
    user_id: str
    email: str
    username: str
    password_hash: str
    role: UserRole
    tenant_id: str
    is_active: bool = True
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    last_login: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self, include_password: bool = False) -> Dict[str, Any]:
        data = asdict(self)
        if not include_password:
            del data['password_hash']
        return data


@dataclass
class Session:
    """جلسة المستخدم"""
    session_id: str
    user_id: str
    tenant_id: str
    token: str
    created_at: str
    expires_at: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    is_active: bool = True
    
    def is_expired(self) -> bool:
        return datetime.fromisoformat(self.expires_at) < datetime.utcnow()


@dataclass
class AuditLog:
    """سجل التدقيق"""
    log_id: str
    user_id: str
    tenant_id: str
    action: str
    resource: str
    resource_id: str
    status: str  # success, failed
    timestamp: str
    ip_address: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)


class PasswordManager:
    """مدير كلمات المرور"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """تجزئة كلمة المرور"""
        salt = secrets.token_hex(32)
        pwd_hash = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return f"{salt}${pwd_hash.hex()}"
    
    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """التحقق من كلمة المرور"""
        try:
            salt, pwd_hash = password_hash.split('$')
            new_hash = hashlib.pbkdf2_hmac(
                'sha256',
                password.encode('utf-8'),
                salt.encode('utf-8'),
                100000
            )
            return new_hash.hex() == pwd_hash
        except Exception as e:
            logger.error(f"Password verification failed: {e}")
            return False


class TokenManager:
    """مدير التوكنات"""
    
    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        self.secret_key = secret_key
        self.algorithm = algorithm
    
    def create_token(
        self,
        user_id: str,
        tenant_id: str,
        expires_in: int = 3600
    ) -> str:
        """إنشاء توكن"""
        payload = {
            "user_id": user_id,
            "tenant_id": tenant_id,
            "exp": datetime.utcnow() + timedelta(seconds=expires_in),
            "iat": datetime.utcnow()
        }
        
        token = jwt.encode(
            payload,
            self.secret_key,
            algorithm=self.algorithm
        )
        
        return token
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """التحقق من التوكن"""
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm]
            )
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.InvalidTokenError:
            logger.warning("Invalid token")
            return None


class UserManager:
    """مدير المستخدمين"""
    
    def __init__(self, storage_dir: str = "./users"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        
        self.users: Dict[str, User] = {}
        self._load_users()
    
    def _load_users(self):
        """تحميل المستخدمين من التخزين"""
        for file_path in self.storage_dir.glob("user_*.json"):
            try:
                with open(file_path, 'r') as f:
                    data = json.load(f)
                    user = User(**data)
                    self.users[user.user_id] = user
            except Exception as e:
                logger.error(f"Failed to load user: {file_path}: {e}")
    
    def create_user(
        self,
        email: str,
        username: str,
        password: str,
        role: UserRole,
        tenant_id: str
    ) -> User:
        """إنشاء مستخدم جديد"""
        # التحقق من عدم وجود المستخدم
        if any(u.email == email for u in self.users.values()):
            raise ValueError(f"User with email {email} already exists")
        
        user_id = f"user_{secrets.token_hex(8)}"
        password_hash = PasswordManager.hash_password(password)
        
        user = User(
            user_id=user_id,
            email=email,
            username=username,
            password_hash=password_hash,
            role=role,
            tenant_id=tenant_id
        )
        
        self.users[user_id] = user
        self._save_user(user)
        
        logger.info(f"User created: {user_id} ({email})")
        
        return user
    
    def _save_user(self, user: User):
        """حفظ المستخدم"""
        file_path = self.storage_dir / f"user_{user.user_id}.json"
        with open(file_path, 'w') as f:
            json.dump(user.to_dict(include_password=True), f, indent=2)
    
    def get_user(self, user_id: str) -> Optional[User]:
        """الحصول على مستخدم"""
        return self.users.get(user_id)
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """الحصول على مستخدم بالبريد الإلكتروني"""
        for user in self.users.values():
            if user.email == email:
                return user
        return None
    
    def authenticate(self, email: str, password: str) -> Optional[User]:
        """مصادقة المستخدم"""
        user = self.get_user_by_email(email)
        
        if not user or not user.is_active:
            return None
        
        if not PasswordManager.verify_password(password, user.password_hash):
            return None
        
        # تحديث آخر تسجيل دخول
        user.last_login = datetime.utcnow().isoformat()
        self._save_user(user)
        
        logger.info(f"User authenticated: {user.user_id}")
        
        return user
    
    def update_user(self, user_id: str, updates: Dict[str, Any]):
        """تحديث المستخدم"""
        user = self.get_user(user_id)
        
        if not user:
            raise ValueError(f"User not found: {user_id}")
        
        for key, value in updates.items():
            if hasattr(user, key) and key != "password_hash":
                setattr(user, key, value)
        
        user.updated_at = datetime.utcnow().isoformat()
        self._save_user(user)
        
        logger.info(f"User updated: {user_id}")
    
    def delete_user(self, user_id: str):
        """حذف المستخدم"""
        if user_id not in self.users:
            raise ValueError(f"User not found: {user_id}")
        
        del self.users[user_id]
        
        file_path = self.storage_dir / f"user_{user_id}.json"
        file_path.unlink(missing_ok=True)
        
        logger.info(f"User deleted: {user_id}")
    
    def list_users(self, tenant_id: str) -> List[User]:
        """قائمة المستخدمين"""
        return [
            user for user in self.users.values()
            if user.tenant_id == tenant_id
        ]


class SessionManager:
    """مدير الجلسات"""
    
    def __init__(self, token_manager: TokenManager):
        self.token_manager = token_manager
        self.sessions: Dict[str, Session] = {}
    
    def create_session(
        self,
        user_id: str,
        tenant_id: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Session:
        """إنشاء جلسة"""
        session_id = f"session_{secrets.token_hex(16)}"
        token = self.token_manager.create_token(user_id, tenant_id)
        
        session = Session(
            session_id=session_id,
            user_id=user_id,
            tenant_id=tenant_id,
            token=token,
            created_at=datetime.utcnow().isoformat(),
            expires_at=(datetime.utcnow() + timedelta(hours=24)).isoformat(),
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        self.sessions[session_id] = session
        
        logger.info(f"Session created: {session_id}")
        
        return session
    
    def get_session(self, session_id: str) -> Optional[Session]:
        """الحصول على جلسة"""
        session = self.sessions.get(session_id)
        
        if session and session.is_expired():
            self.delete_session(session_id)
            return None
        
        return session
    
    def validate_token(self, token: str) -> Optional[Session]:
        """التحقق من التوكن"""
        payload = self.token_manager.verify_token(token)
        
        if not payload:
            return None
        
        # البحث عن الجلسة
        for session in self.sessions.values():
            if session.token == token and not session.is_expired():
                return session
        
        return None
    
    def delete_session(self, session_id: str):
        """حذف جلسة"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            logger.info(f"Session deleted: {session_id}")
    
    def invalidate_user_sessions(self, user_id: str):
        """إلغاء جميع جلسات المستخدم"""
        sessions_to_delete = [
            sid for sid, session in self.sessions.items()
            if session.user_id == user_id
        ]
        
        for session_id in sessions_to_delete:
            self.delete_session(session_id)


class PermissionManager:
    """مدير الأذونات"""
    
    @staticmethod
    def has_permission(user: User, permission: Permission) -> bool:
        """التحقق من الأذن"""
        user_permissions = ROLE_PERMISSIONS.get(user.role, [])
        return permission in user_permissions
    
    @staticmethod
    def has_any_permission(user: User, permissions: List[Permission]) -> bool:
        """التحقق من وجود أي أذن"""
        user_permissions = ROLE_PERMISSIONS.get(user.role, [])
        return any(p in user_permissions for p in permissions)
    
    @staticmethod
    def has_all_permissions(user: User, permissions: List[Permission]) -> bool:
        """التحقق من وجود جميع الأذونات"""
        user_permissions = ROLE_PERMISSIONS.get(user.role, [])
        return all(p in user_permissions for p in permissions)


class AuditLogger:
    """مسجل التدقيق"""
    
    def __init__(self, storage_dir: str = "./audit_logs"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        
        self.logs: List[AuditLog] = []
    
    def log_action(
        self,
        user_id: str,
        tenant_id: str,
        action: str,
        resource: str,
        resource_id: str,
        status: str,
        ip_address: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        """تسجيل إجراء"""
        log_id = f"log_{secrets.token_hex(8)}"
        
        audit_log = AuditLog(
            log_id=log_id,
            user_id=user_id,
            tenant_id=tenant_id,
            action=action,
            resource=resource,
            resource_id=resource_id,
            status=status,
            timestamp=datetime.utcnow().isoformat(),
            ip_address=ip_address,
            details=details or {}
        )
        
        self.logs.append(audit_log)
        self._save_log(audit_log)
        
        logger.info(f"Audit log: {action} on {resource} ({status})")
    
    def _save_log(self, audit_log: AuditLog):
        """حفظ السجل"""
        file_path = self.storage_dir / f"log_{audit_log.log_id}.json"
        with open(file_path, 'w') as f:
            json.dump(asdict(audit_log), f, indent=2)
    
    def get_logs(
        self,
        tenant_id: str,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 100
    ) -> List[AuditLog]:
        """الحصول على السجلات"""
        filtered = [log for log in self.logs if log.tenant_id == tenant_id]
        
        if user_id:
            filtered = [log for log in filtered if log.user_id == user_id]
        
        if action:
            filtered = [log for log in filtered if log.action == action]
        
        return filtered[-limit:]


class AuthenticationSystem:
    """نظام المصادقة الموحد"""
    
    def __init__(
        self,
        secret_key: str = "your-secret-key-change-in-production",
        storage_dir: str = "./auth_storage"
    ):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        
        self.token_manager = TokenManager(secret_key)
        self.user_manager = UserManager(str(self.storage_dir / "users"))
        self.session_manager = SessionManager(self.token_manager)
        self.permission_manager = PermissionManager()
        self.audit_logger = AuditLogger(str(self.storage_dir / "audit_logs"))
    
    def login(
        self,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """تسجيل الدخول"""
        user = self.user_manager.authenticate(email, password)
        
        if not user:
            self.audit_logger.log_action(
                user_id="unknown",
                tenant_id="unknown",
                action="login",
                resource="user",
                resource_id=email,
                status="failed",
                ip_address=ip_address
            )
            return None
        
        session = self.session_manager.create_session(
            user.user_id,
            user.tenant_id,
            ip_address,
            user_agent
        )
        
        self.audit_logger.log_action(
            user_id=user.user_id,
            tenant_id=user.tenant_id,
            action="login",
            resource="user",
            resource_id=user.user_id,
            status="success",
            ip_address=ip_address
        )
        
        return {
            "user_id": user.user_id,
            "email": user.email,
            "role": user.role.value,
            "tenant_id": user.tenant_id,
            "token": session.token,
            "session_id": session.session_id
        }
    
    def logout(self, session_id: str):
        """تسجيل الخروج"""
        session = self.session_manager.get_session(session_id)
        
        if session:
            self.audit_logger.log_action(
                user_id=session.user_id,
                tenant_id=session.tenant_id,
                action="logout",
                resource="session",
                resource_id=session_id,
                status="success"
            )
            
            self.session_manager.delete_session(session_id)
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """التحقق من التوكن"""
        session = self.session_manager.validate_token(token)
        
        if not session:
            return None
        
        user = self.user_manager.get_user(session.user_id)
        
        if not user or not user.is_active:
            return None
        
        return {
            "user_id": user.user_id,
            "email": user.email,
            "role": user.role.value,
            "tenant_id": user.tenant_id,
            "permissions": [p.value for p in ROLE_PERMISSIONS.get(user.role, [])]
        }
    
    def get_system_statistics(self) -> Dict[str, Any]:
        """الحصول على إحصائيات النظام"""
        return {
            "total_users": len(self.user_manager.users),
            "active_sessions": len([s for s in self.session_manager.sessions.values() if s.is_active]),
            "total_audit_logs": len(self.audit_logger.logs)
        }


# مثال على الاستخدام
def example_usage():
    """مثال على الاستخدام"""
    
    auth = AuthenticationSystem()
    
    # إنشاء مستخدم
    user = auth.user_manager.create_user(
        email="admin@example.com",
        username="admin",
        password="secure_password",
        role=UserRole.ADMIN,
        tenant_id="tenant-1"
    )
    
    print(f"User created: {user.user_id}")
    
    # تسجيل الدخول
    login_result = auth.login(
        email="admin@example.com",
        password="secure_password",
        ip_address="192.168.1.1"
    )
    
    print(f"Login result: {login_result}")
    
    # التحقق من التوكن
    if login_result:
        token = login_result["token"]
        verified = auth.verify_token(token)
        print(f"Token verified: {verified}")
    
    # الإحصائيات
    stats = auth.get_system_statistics()
    print(f"System statistics: {stats}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    example_usage()
