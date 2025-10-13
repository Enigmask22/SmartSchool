# Hướng dẫn Multi-School Database

## Tổng quan

Hệ thống hỗ trợ multiple Supabase databases cho các trường khác nhau. Mỗi trường sẽ có một database riêng với SUPABASE_URL và SUPABASE_KEY riêng.

## Cấu trúc Username

Username phải có format: `user_name.school_name.province`

**Ví dụ:**
- `nguyen_thi_lan.chuyen_le_quy_don.tphcm`
- `tran_van_hung.chuyen_nguyen_du.daklak`
- `le_thi_hoa.thpt_vo_thi_sau.tphcm`

## Cấu hình Schools

### File `school_databases.json`

```json
{
  "schools": {
    "chuyen_le_quy_don.tphcm": {
      "school_name": "Trường THPT Chuyên Lê Quý Đôn",
      "province": "TP. Hồ Chí Minh",
      "supabase_url": "https://your-project-1.supabase.co",
      "supabase_key": "your-anon-key-1",
      "description": "Trường chuyên Lê Quý Đôn TP.HCM"
    }
  },
  "default_school": "chuyen_le_quy_don.tphcm",
  "cache_ttl": 300,
  "max_connections": 10
}
```

## Cách sử dụng

### 1. Import functions

```python
from database.connection import (
    get_school_db,
    get_school_info,
    parse_username,
    list_available_schools,
    init_school_db
)
```

### 2. Lấy database client cho school cụ thể

```python
# Lấy client dựa trên username
username = "nguyen_thi_lan.chuyen_le_quy_don.tphcm"
client = get_school_db(username)

# Sử dụng client để query database
result = client.table('users').select('*').execute()
```

### 3. Lấy thông tin school

```python
username = "nguyen_thi_lan.chuyen_le_quy_don.tphcm"
school_info = get_school_info(username)

if school_info:
    print(f"School: {school_info['school_name']}")
    print(f"Province: {school_info['province']}")
```

### 4. Parse username

```python
username = "nguyen_thi_lan.chuyen_le_quy_don.tphcm"
parsed = parse_username(username)

print(f"User: {parsed['user_name']}")          # nguyen_thi_lan
print(f"School: {parsed['school_name']}")      # chuyen_le_quy_don
print(f"Province: {parsed['province']}")       # tphcm
print(f"School Key: {parsed['school_key']}")   # chuyen_le_quy_don.tphcm
```

### 5. Khởi tạo database async

```python
async def init_user_database(username: str):
    try:
        client = await init_school_db(username)
        # Database đã sẵn sàng sử dụng
        return client
    except Exception as e:
        print(f"Lỗi khởi tạo database: {e}")
```

## Integration với FastAPI

### Dependency injection

```python
from fastapi import Depends
from database.connection import get_school_db

def get_current_user_db(username: str = Depends(get_current_username)):
    return get_school_db(username)

@app.get("/users/")
async def get_users(db: Client = Depends(get_current_user_db)):
    result = db.table('users').select('*').execute()
    return result.data
```

### Middleware để extract username

```python
@app.middleware("http")
async def extract_username(request: Request, call_next):
    # Extract username từ token hoặc session
    username = extract_username_from_request(request)
    request.state.username = username
    response = await call_next(request)
    return response

def get_current_username(request: Request) -> str:
    return request.state.username
```

## Quản lý Schools

### Thêm school mới

1. Thêm entry vào `school_databases.json`
2. Restart application hoặc gọi `refresh_school_configs()`

```python
from database.connection import refresh_school_configs

# Refresh configs sau khi thay đổi file JSON
refresh_school_configs()
```

### List tất cả schools

```python
from database.connection import list_available_schools

schools = list_available_schools()
for school_key, info in schools.items():
    print(f"{school_key}: {info['school_name']}")
```

## Error Handling

### Fallback mechanism

- Nếu không tìm thấy school config → sử dụng default school
- Nếu không có default school → fallback về legacy database (.env)
- Tất cả errors được log chi tiết

### Logging

```python
import logging
logger = logging.getLogger(__name__)

# Tất cả database operations đều có logging
logger.info(f"Database connection verified cho user: {username}")
logger.error(f"Lỗi khi lấy school database cho {username}: {str(e)}")
```

## Performance

### Connection Caching

- Database clients được cache với TTL configurable
- Automatic cleanup của expired connections
- Thread-safe với Lock mechanism

### Configuration

```json
{
  "cache_ttl": 300,        // Cache 5 phút
  "max_connections": 10    // Tối đa 10 connections
}
```

## Testing

Chạy test script:

```bash
cd backend
python test_multi_school_db.py
```

## Migration từ Legacy

### Backward Compatibility

Code cũ vẫn hoạt động với:
- `get_db()` function (legacy)
- `.env` SUPABASE_URL và SUPABASE_KEY
- Existing database connections

### Gradual Migration

1. Cập nhật `school_databases.json`
2. Thay đổi username format
3. Cập nhật code sử dụng `get_school_db(username)`
4. Remove legacy code khi ready

## Troubleshooting

### Common Issues

1. **Username format không đúng**
   - Đảm bảo format: `user_name.school_name.province`
   - Sử dụng `parse_username()` để debug

2. **School không tìm thấy**
   - Kiểm tra `school_databases.json`
   - Verify school_key mapping
   - Sử dụng `list_available_schools()`

3. **Database connection failed**
   - Kiểm tra SUPABASE_URL và SUPABASE_KEY
   - Verify network connectivity
   - Check logs for detailed error

4. **Performance issues**
   - Adjust `cache_ttl` và `max_connections`
   - Monitor connection usage
   - Check for connection leaks

### Debug Commands

```python
# Test username parsing
parsed = parse_username("your_username")
print(parsed)

# List available schools
schools = list_available_schools()
print(schools)

# Test database connection
client = get_school_db("your_username")
print(client)
```
