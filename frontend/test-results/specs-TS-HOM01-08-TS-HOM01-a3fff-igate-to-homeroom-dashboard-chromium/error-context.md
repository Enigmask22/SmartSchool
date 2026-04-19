# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - img "SynapseS Logo" [ref=e8]
      - heading "SynapseS" [level=1] [ref=e9]
      - paragraph [ref=e10]: Đăng nhập để truy cập hệ thống quản lý trường học
    - generic [ref=e11]:
      - generic [ref=e12]:
        - heading "Đăng nhập" [level=3] [ref=e13]
        - paragraph [ref=e14]: Nhập thông tin tài khoản để tiếp tục
      - generic [ref=e16]:
        - generic [ref=e17]:
          - text: Username
          - textbox "Username" [ref=e18]:
            - /placeholder: nguyen_van_an
        - generic [ref=e19]:
          - text: Mật khẩu
          - generic [ref=e20]:
            - textbox "Mật khẩu" [ref=e21]:
              - /placeholder: Nhập mật khẩu
            - button "Hiển thị mật khẩu" [ref=e22] [cursor=pointer]:
              - img [ref=e23]
        - button "Đăng nhập" [ref=e26] [cursor=pointer]
        - button "Quên mật khẩu?" [ref=e28] [cursor=pointer]
  - region "Notifications alt+T"
```