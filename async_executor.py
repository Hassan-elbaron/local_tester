"""
Async Executor - محرك التنفيذ المتوازي
تنفيذ الـ Agents بشكل متوازي لتقليل زمن التنفيذ
"""

import asyncio
from typing import List, Dict, Any, Optional, Coroutine
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
from dataclasses import dataclass
from enum import Enum
import logging
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


class ExecutionMode(Enum):
    """أنماط التنفيذ"""
    SEQUENTIAL = "sequential"
    PARALLEL = "parallel"
    CONCURRENT = "concurrent"
    HYBRID = "hybrid"


class ExecutorType(Enum):
    """أنواع المنفذات"""
    THREAD = "thread"
    PROCESS = "process"
    ASYNC = "async"


@dataclass
class ExecutionTask:
    """مهمة تنفيذ واحدة"""
    task_id: str
    agent_name: str
    agent_function: Coroutine
    priority: int = 0
    timeout: Optional[float] = None
    retry_count: int = 0
    max_retries: int = 3


@dataclass
class ExecutionResult:
    """نتيجة التنفيذ"""
    task_id: str
    agent_name: str
    status: str  # completed, failed, timeout, skipped
    result: Optional[Any] = None
    error: Optional[str] = None
    duration_ms: float = 0.0
    retry_count: int = 0
    timestamp: str = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow().isoformat()


class AsyncExecutor:
    """
    منفذ متوازي للـ Agents
    يدعم التنفيذ المتزامن والمتوازي
    """
    
    def __init__(
        self,
        mode: ExecutionMode = ExecutionMode.CONCURRENT,
        max_workers: int = 5,
        executor_type: ExecutorType = ExecutorType.ASYNC,
        default_timeout: float = 30.0
    ):
        """
        Args:
            mode: نمط التنفيذ
            max_workers: عدد العمال
            executor_type: نوع المنفذ
            default_timeout: المهلة الزمنية الافتراضية
        """
        self.mode = mode
        self.max_workers = max_workers
        self.executor_type = executor_type
        self.default_timeout = default_timeout
        
        self.execution_results: List[ExecutionResult] = []
        self.pending_tasks: List[ExecutionTask] = []
        
        # إنشاء المنفذات
        if executor_type == ExecutorType.THREAD:
            self.executor = ThreadPoolExecutor(max_workers=max_workers)
        elif executor_type == ExecutorType.PROCESS:
            self.executor = ProcessPoolExecutor(max_workers=max_workers)
        else:
            self.executor = None
        
        logger.info(
            f"AsyncExecutor initialized: mode={mode.value}, "
            f"type={executor_type.value}, workers={max_workers}"
        )
    
    async def execute_sequential(
        self,
        tasks: List[ExecutionTask]
    ) -> List[ExecutionResult]:
        """
        تنفيذ متسلسل
        
        Args:
            tasks: قائمة المهام
            
        Returns:
            List[ExecutionResult]: نتائج التنفيذ
        """
        logger.info(f"Starting sequential execution for {len(tasks)} tasks")
        
        results = []
        
        for task in tasks:
            result = await self._execute_single_task(task)
            results.append(result)
        
        return results
    
    async def execute_parallel(
        self,
        tasks: List[ExecutionTask]
    ) -> List[ExecutionResult]:
        """
        تنفيذ متوازي
        
        Args:
            tasks: قائمة المهام
            
        Returns:
            List[ExecutionResult]: نتائج التنفيذ
        """
        logger.info(f"Starting parallel execution for {len(tasks)} tasks")
        
        # إنشاء tasks متزامنة
        coroutines = [
            self._execute_single_task(task)
            for task in tasks
        ]
        
        # تنفيذ جميع المهام بالتوازي
        results = await asyncio.gather(*coroutines, return_exceptions=False)
        
        return results
    
    async def execute_concurrent(
        self,
        tasks: List[ExecutionTask]
    ) -> List[ExecutionResult]:
        """
        تنفيذ متزامن مع حد أقصى للعمال
        
        Args:
            tasks: قائمة المهام
            
        Returns:
            List[ExecutionResult]: نتائج التنفيذ
        """
        logger.info(
            f"Starting concurrent execution for {len(tasks)} tasks "
            f"with {self.max_workers} workers"
        )
        
        # استخدام Semaphore للتحكم في عدد المهام المتزامنة
        semaphore = asyncio.Semaphore(self.max_workers)
        
        async def bounded_task(task: ExecutionTask) -> ExecutionResult:
            async with semaphore:
                return await self._execute_single_task(task)
        
        # إنشاء tasks محدودة
        coroutines = [bounded_task(task) for task in tasks]
        
        # تنفيذ جميع المهام
        results = await asyncio.gather(*coroutines, return_exceptions=False)
        
        return results
    
    async def execute_hybrid(
        self,
        tasks: List[ExecutionTask]
    ) -> List[ExecutionResult]:
        """
        تنفيذ هجين
        تنفيذ المهام ذات الأولوية العالية بالتوازي
        والمهام الأخرى بشكل متسلسل
        
        Args:
            tasks: قائمة المهام
            
        Returns:
            List[ExecutionResult]: نتائج التنفيذ
        """
        logger.info(f"Starting hybrid execution for {len(tasks)} tasks")
        
        # ترتيب المهام حسب الأولوية
        sorted_tasks = sorted(tasks, key=lambda t: t.priority, reverse=True)
        
        # فصل المهام ذات الأولوية العالية والمنخفضة
        high_priority = [t for t in sorted_tasks if t.priority >= 5]
        low_priority = [t for t in sorted_tasks if t.priority < 5]
        
        results = []
        
        # تنفيذ المهام ذات الأولوية العالية بالتوازي
        if high_priority:
            high_results = await self.execute_parallel(high_priority)
            results.extend(high_results)
        
        # تنفيذ المهام الأخرى بشكل متسلسل
        if low_priority:
            low_results = await self.execute_sequential(low_priority)
            results.extend(low_results)
        
        return results
    
    async def execute(
        self,
        tasks: List[ExecutionTask]
    ) -> List[ExecutionResult]:
        """
        تنفيذ المهام حسب النمط المحدد
        
        Args:
            tasks: قائمة المهام
            
        Returns:
            List[ExecutionResult]: نتائج التنفيذ
        """
        if self.mode == ExecutionMode.SEQUENTIAL:
            results = await self.execute_sequential(tasks)
        elif self.mode == ExecutionMode.PARALLEL:
            results = await self.execute_parallel(tasks)
        elif self.mode == ExecutionMode.CONCURRENT:
            results = await self.execute_concurrent(tasks)
        else:  # HYBRID
            results = await self.execute_hybrid(tasks)
        
        # تخزين النتائج
        self.execution_results.extend(results)
        
        return results
    
    async def _execute_single_task(
        self,
        task: ExecutionTask
    ) -> ExecutionResult:
        """
        تنفيذ مهمة واحدة مع إعادة المحاولة
        
        Args:
            task: المهمة
            
        Returns:
            ExecutionResult: نتيجة التنفيذ
        """
        start_time = datetime.utcnow()
        retry_count = 0
        last_error = None
        
        while retry_count <= task.max_retries:
            try:
                # تنفيذ المهمة مع المهلة الزمنية
                timeout = task.timeout or self.default_timeout
                
                logger.debug(
                    f"Executing task {task.task_id} ({task.agent_name}), "
                    f"attempt {retry_count + 1}/{task.max_retries + 1}"
                )
                
                result = await asyncio.wait_for(
                    task.agent_function,
                    timeout=timeout
                )
                
                # حساب المدة
                duration = (datetime.utcnow() - start_time).total_seconds() * 1000
                
                logger.info(
                    f"Task {task.task_id} ({task.agent_name}) completed "
                    f"in {duration:.2f}ms"
                )
                
                return ExecutionResult(
                    task_id=task.task_id,
                    agent_name=task.agent_name,
                    status="completed",
                    result=result,
                    duration_ms=duration,
                    retry_count=retry_count
                )
            
            except asyncio.TimeoutError:
                last_error = f"Timeout after {task.timeout or self.default_timeout}s"
                logger.warning(
                    f"Task {task.task_id} ({task.agent_name}) timed out, "
                    f"attempt {retry_count + 1}/{task.max_retries + 1}"
                )
                retry_count += 1
            
            except Exception as e:
                last_error = str(e)
                logger.warning(
                    f"Task {task.task_id} ({task.agent_name}) failed: {e}, "
                    f"attempt {retry_count + 1}/{task.max_retries + 1}"
                )
                retry_count += 1
            
            # انتظار قبل إعادة المحاولة
            if retry_count <= task.max_retries:
                await asyncio.sleep(1.0 * retry_count)  # exponential backoff
        
        # فشل جميع المحاولات
        duration = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        logger.error(
            f"Task {task.task_id} ({task.agent_name}) failed after "
            f"{task.max_retries + 1} attempts: {last_error}"
        )
        
        return ExecutionResult(
            task_id=task.task_id,
            agent_name=task.agent_name,
            status="failed",
            error=last_error,
            duration_ms=duration,
            retry_count=retry_count
        )
    
    def get_execution_statistics(self) -> Dict[str, Any]:
        """الحصول على إحصائيات التنفيذ"""
        if not self.execution_results:
            return {"total_executions": 0}
        
        completed = [r for r in self.execution_results if r.status == "completed"]
        failed = [r for r in self.execution_results if r.status == "failed"]
        timeout = [r for r in self.execution_results if r.status == "timeout"]
        
        durations = [r.duration_ms for r in self.execution_results]
        
        return {
            "total_executions": len(self.execution_results),
            "completed": len(completed),
            "failed": len(failed),
            "timeout": len(timeout),
            "success_rate": len(completed) / len(self.execution_results) * 100 if self.execution_results else 0,
            "avg_duration_ms": sum(durations) / len(durations) if durations else 0,
            "min_duration_ms": min(durations) if durations else 0,
            "max_duration_ms": max(durations) if durations else 0,
            "execution_mode": self.mode.value
        }
    
    def get_agent_statistics(self, agent_name: str) -> Dict[str, Any]:
        """الحصول على إحصائيات الوكيل"""
        agent_results = [
            r for r in self.execution_results
            if r.agent_name == agent_name
        ]
        
        if not agent_results:
            return {"agent": agent_name, "executions": 0}
        
        completed = [r for r in agent_results if r.status == "completed"]
        failed = [r for r in agent_results if r.status == "failed"]
        
        durations = [r.duration_ms for r in agent_results]
        
        return {
            "agent": agent_name,
            "total_executions": len(agent_results),
            "completed": len(completed),
            "failed": len(failed),
            "success_rate": len(completed) / len(agent_results) * 100 if agent_results else 0,
            "avg_duration_ms": sum(durations) / len(durations) if durations else 0,
            "total_duration_ms": sum(durations)
        }
    
    def shutdown(self):
        """إيقاف المنفذ"""
        if self.executor:
            self.executor.shutdown(wait=True)
        
        logger.info("AsyncExecutor shutdown complete")


async def run_async_tasks(
    tasks: List[ExecutionTask],
    mode: ExecutionMode = ExecutionMode.CONCURRENT,
    max_workers: int = 5
) -> List[ExecutionResult]:
    """
    دالة مساعدة لتشغيل المهام بشكل متزامن
    
    Args:
        tasks: قائمة المهام
        mode: نمط التنفيذ
        max_workers: عدد العمال
        
    Returns:
        List[ExecutionResult]: نتائج التنفيذ
    """
    executor = AsyncExecutor(mode=mode, max_workers=max_workers)
    results = await executor.execute(tasks)
    return results
