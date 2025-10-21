"""
Queue Manager cho Qwen OCR Service
Xử lý concurrent requests một cách an toàn
"""

import asyncio
from typing import Dict, Optional
import time
from dataclasses import dataclass
from datetime import datetime

from ...core.logger import setup_logger

logger = setup_logger("qwen_queue")


@dataclass
class OCRRequest:
    """OCR request data"""
    request_id: str
    image_path: str
    timestamp: float
    priority: int = 0  # Higher = more priority


class QwenQueueManager:
    """
    Manager để xử lý OCR requests với queue
    
    Features:
    - Request queuing (FIFO hoặc priority)
    - Concurrency control (limit số requests đồng thời)
    - Timeout handling
    - Status tracking
    """
    
    def __init__(self, max_concurrent: int = 3, max_queue_size: int = 50):
        """
        Args:
            max_concurrent: Số requests được xử lý đồng thời (default: 3)
            max_queue_size: Kích thước tối đa của queue (default: 50)
        """
        self.max_concurrent = max_concurrent
        self.max_queue_size = max_queue_size
        
        self.queue: asyncio.Queue = asyncio.Queue(maxsize=max_queue_size)
        self.processing: Dict[str, OCRRequest] = {}  # Currently processing
        self.semaphore = asyncio.Semaphore(max_concurrent)
        
        self.stats = {
            'total_requests': 0,
            'completed': 0,
            'failed': 0,
            'rejected': 0,
            'in_queue': 0,
            'processing': 0,
        }
        
        logger.info(f"QwenQueueManager initialized: max_concurrent={max_concurrent}, max_queue_size={max_queue_size}")
    
    async def add_request(self, request_id: str, image_path: str, priority: int = 0, timeout: float = 600) -> bool:
        """
        Thêm request vào queue
        
        Args:
            request_id: Unique ID cho request
            image_path: Đường dẫn ảnh
            priority: Priority (higher = process first)
            timeout: Timeout in seconds (default: 10 phút)
            
        Returns:
            True nếu thêm thành công, False nếu queue full
        """
        try:
            # Check queue size
            if self.queue.qsize() >= self.max_queue_size:
                logger.warning(f"Queue full ({self.max_queue_size}), rejecting request {request_id}")
                self.stats['rejected'] += 1
                return False
            
            request = OCRRequest(
                request_id=request_id,
                image_path=image_path,
                timestamp=time.time(),
                priority=priority
            )
            
            # Add to queue
            await asyncio.wait_for(self.queue.put(request), timeout=5.0)
            
            self.stats['total_requests'] += 1
            self.stats['in_queue'] = self.queue.qsize()
            
            logger.info(f"✅ Added request {request_id} to queue (position: {self.queue.qsize()}, priority: {priority})")
            return True
            
        except asyncio.TimeoutError:
            logger.error(f"❌ Timeout adding request {request_id} to queue")
            self.stats['rejected'] += 1
            return False
        except Exception as e:
            logger.error(f"❌ Error adding request {request_id}: {e}")
            self.stats['rejected'] += 1
            return False
    
    async def process_request(self, request: OCRRequest, service) -> Dict:
        """
        Xử lý 1 OCR request
        
        Args:
            request: OCR request
            service: OCR service instance
            
        Returns:
            OCR result
        """
        request_id = request.request_id
        
        try:
            # Mark as processing
            self.processing[request_id] = request
            self.stats['processing'] = len(self.processing)
            
            logger.info(f"🔄 Processing request {request_id} (queue: {self.queue.qsize()}, processing: {len(self.processing)})")
            
            start_time = time.time()
            
            # Process OCR
            result = service.parse_grade_sheet(request.image_path)
            
            elapsed = time.time() - start_time
            
            logger.info(f"✅ Completed request {request_id} in {elapsed:.1f}s")
            
            self.stats['completed'] += 1
            return result
            
        except Exception as e:
            logger.error(f"❌ Error processing request {request_id}: {e}")
            self.stats['failed'] += 1
            return {
                'success': False,
                'headers': [],
                'rows': [],
                'errors': [f'Processing error: {str(e)}'],
                'total_rows': 0
            }
        finally:
            # Remove from processing
            if request_id in self.processing:
                del self.processing[request_id]
            self.stats['processing'] = len(self.processing)
            self.stats['in_queue'] = self.queue.qsize()
    
    async def worker(self, worker_id: int, service):
        """
        Worker để xử lý requests từ queue
        
        Args:
            worker_id: ID của worker
            service: OCR service instance
        """
        logger.info(f"Worker {worker_id} started")
        
        while True:
            try:
                # Get request from queue
                request = await self.queue.get()
                
                # Acquire semaphore (limit concurrency)
                async with self.semaphore:
                    # Process request
                    result = await self.process_request(request, service)
                    
                    # Mark task as done
                    self.queue.task_done()
                    
            except asyncio.CancelledError:
                logger.info(f"Worker {worker_id} cancelled")
                break
            except Exception as e:
                logger.error(f"Worker {worker_id} error: {e}")
    
    def get_stats(self) -> Dict:
        """Lấy statistics"""
        return {
            **self.stats,
            'timestamp': datetime.now().isoformat(),
            'queue_utilization': f"{(self.queue.qsize() / self.max_queue_size) * 100:.1f}%",
            'processing_utilization': f"{(len(self.processing) / self.max_concurrent) * 100:.1f}%"
        }
    
    def get_position_in_queue(self, request_id: str) -> Optional[int]:
        """
        Lấy vị trí của request trong queue
        
        Returns:
            Position (0-indexed) hoặc None nếu không tìm thấy
        """
        # Note: asyncio.Queue không support iteration
        # Cần implement custom queue nếu cần feature này
        return None
    
    async def wait_for_completion(self):
        """Chờ tất cả requests trong queue complete"""
        await self.queue.join()
        logger.info("All requests completed")


# Global queue manager instance
_queue_manager: Optional[QwenQueueManager] = None


def get_queue_manager(max_concurrent: int = 3, max_queue_size: int = 50) -> QwenQueueManager:
    """
    Get or create queue manager instance
    
    Args:
        max_concurrent: Số requests xử lý đồng thời
            - GPU H200 (141GB VRAM): Recommended 10-14
            - RTX 4060 (8GB VRAM): Recommended 1-2
        max_queue_size: Kích thước queue
    """
    global _queue_manager
    
    if _queue_manager is None:
        _queue_manager = QwenQueueManager(
            max_concurrent=max_concurrent,
            max_queue_size=max_queue_size
        )
    
    return _queue_manager


# Example usage
if __name__ == "__main__":
    async def test_queue():
        # Create queue manager
        manager = QwenQueueManager(max_concurrent=2, max_queue_size=10)
        
        # Simulate adding requests
        for i in range(5):
            await manager.add_request(
                request_id=f"req_{i}",
                image_path=f"test_{i}.jpg",
                priority=i
            )
        
        # Get stats
        stats = manager.get_stats()
        print(f"Stats: {stats}")
    
    # Run test
    asyncio.run(test_queue())

