# 🚀 Hướng Dẫn Deploy Frontend lên Render

## ❌ Vấn Đề Hiện Tại

Render đang cấu hình sai:
- **Build Command:** `npm install` (sai)
- **Publish Directory:** `npm start` (sai - đây không phải directory)
- **Service Type:** Web Service (sai cho React app)

## ✅ Giải Pháp

### **1. Tạo Static Site Service**

Thay vì tạo Web Service, hãy tạo **Static Site**:

1. Vào [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Static Site"**
3. Connect GitHub repository của bạn

### **2. Cấu Hình Render**

**Build Command:**
```bash
cd frontend && npm install && npm run build
```

**Publish Directory:**
```
frontend/build
```

**Root Directory (nếu cần):**
```
frontend
```

### **3. Environment Variables**

Thêm các biến môi trường sau:

| Key | Value | Description |
|-----|-------|-------------|
| `REACT_APP_API_URL` | `https://your-backend-url.onrender.com/api` | URL backend API |
| `NODE_ENV` | `production` | Môi trường production |

### **4. Cấu Hình Chi Tiết**

#### **Build Settings:**
- **Node Version:** 18.x hoặc 20.x
- **Build Command:** `cd frontend && npm install && npm run build`
- **Publish Directory:** `frontend/build`

#### **Advanced Settings:**
- **Auto-Deploy:** Yes (tự động deploy khi push code)
- **Pull Request Previews:** Yes (tùy chọn)

### **5. File Cấu Hình Render**

Tạo file `render.yaml` ở root project:

```yaml
services:
  - type: web
    name: smart-school-frontend
    env: static
    buildCommand: cd frontend && npm install && npm run build
    staticPublishPath: ./frontend/build
    envVars:
      - key: REACT_APP_API_URL
        value: https://your-backend-url.onrender.com/api
      - key: NODE_ENV
        value: production
```

### **6. Kiểm Tra package.json**

Đảm bảo `package.json` có script build:

```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  }
}
```

### **7. Troubleshooting**

#### **Lỗi "Publish directory does not exist":**
- Đảm bảo build command chạy thành công
- Kiểm tra `frontend/build` folder được tạo
- Verify publish directory là `frontend/build`

#### **Lỗi Build Failed:**
- Kiểm tra Node.js version (18.x hoặc 20.x)
- Đảm bảo tất cả dependencies được install
- Xem build logs để debug

#### **Lỗi 404 trên routes:**
- Thêm file `public/_redirects` với nội dung:
```
/*    /index.html   200
```

### **8. Steps Deploy**

1. **Commit và Push code:**
```bash
git add .
git commit -m "Fix render deployment config"
git push origin main
```

2. **Tạo Static Site trên Render:**
   - Connect GitHub repo
   - Chọn "Static Site"
   - Cấu hình như trên

3. **Deploy:**
   - Render sẽ tự động build và deploy
   - Kiểm tra logs nếu có lỗi

### **9. Kiểm Tra Sau Deploy**

- ✅ Site load được
- ✅ API calls hoạt động
- ✅ Routing hoạt động (SPA)
- ✅ Static assets load được

### **10. Custom Domain (Optional)**

1. Trong Render Dashboard
2. Vào Settings → Custom Domains
3. Add domain và configure DNS

---

## 🎯 Kết Quả Mong Đợi

Sau khi deploy thành công:
- ✅ Frontend accessible tại URL Render
- ✅ API calls đến backend hoạt động
- ✅ Tất cả features hoạt động bình thường
- ✅ Auto-deploy khi push code mới

## 📞 Support

Nếu vẫn gặp lỗi:
1. Check build logs trên Render
2. Verify environment variables
3. Test build locally: `cd frontend && npm run build`
