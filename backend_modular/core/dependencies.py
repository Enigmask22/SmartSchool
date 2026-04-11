"""
Core Dependencies
FastAPI dependencies được sử dụng chung bởi tất cả modules
Tách biệt khỏi implementation cụ thể của từng module để tuân thủ kiến trúc Modular Monolithic
"""

from typing import Optional
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from supabase import Client

from core.database import get_db, get_school_db
from core.logger import setup_logger
from core.config import SECRET_KEY, ALGORITHM

logger = setup_logger("core_dependencies")

# JWT Bearer token security scheme (required)
security = HTTPBearer()

# JWT Bearer token security scheme (optional - không throw error nếu không có token)
security_optional = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Dependency để lấy user hiện tại từ JWT token
    Được sử dụng bởi tất cả modules cần authentication
    
    Args:
        request: FastAPI Request object (để lấy database từ middleware nếu có)
        credentials: JWT token từ Authorization header
    
    Returns:
        dict: User data từ database
    
    Raises:
        HTTPException: 401 nếu token không hợp lệ hoặc user không tồn tại
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode JWT token
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if username is None:
            raise credentials_exception
            
        if token_type != "access":
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
    
    # Lấy database client (có thể từ middleware hoặc từ get_school_db)
    db: Client
    if hasattr(request.state, 'db') and request.state.db:
        # Database đã được set bởi middleware
        db = request.state.db
    else:
        # Fallback: lấy database từ username
        db = get_school_db(username)
    
    # Query user từ database
    user_response = db.table("users").select("*").or_(
        f"username.eq.{username},email.eq.{username}"
    ).execute()
    
    if not user_response.data:
        raise credentials_exception
    
    return user_response.data[0]


async def get_current_user_from_refresh_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Dependency để lấy user từ refresh token
    Sử dụng cho endpoint refresh token
    
    Args:
        request: FastAPI Request object
        credentials: Refresh token từ Authorization header
    
    Returns:
        dict: User data từ database
    
    Raises:
        HTTPException: 401 nếu refresh token không hợp lệ
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if username is None:
            raise credentials_exception
            
        if token_type != "refresh":
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
    
    # Lấy database client
    db: Client
    if hasattr(request.state, 'db') and request.state.db:
        db = request.state.db
    else:
        db = get_school_db(username)
    
    user_response = db.table("users").select("*").or_(
        f"username.eq.{username},email.eq.{username}"
    ).execute()
    
    if not user_response.data:
        raise credentials_exception
    
    return user_response.data[0]


async def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional)
) -> Optional[dict]:
    """
    Dependency để lấy user hiện tại (optional)
    Không throw exception nếu không có token, chỉ return None
    
    Sử dụng cho các endpoint có thể truy cập cả authenticated và unauthenticated users
    """
    if credentials is None:
        return None
    
    try:
        return await get_current_user(request, credentials)
    except HTTPException:
        return None


def require_role(*allowed_roles: str):
    """
    Dependency factory để kiểm tra role của user
    
    Usage:
        @router.get("/admin-only")
        async def admin_endpoint(
            request: Request,
            current_user = Depends(require_role("admin", "super_admin"))
        ):
            ...
    """
    async def role_checker(request: Request, current_user: dict = Depends(get_current_user)) -> dict:
        user_role = current_user.get("role", "").lower()
        
        if user_role not in [role.lower() for role in allowed_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Chỉ {', '.join(allowed_roles)} mới có quyền truy cập endpoint này"
            )
        
        return current_user
    
    return role_checker

