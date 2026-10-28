---
description: Quy tắc quản lý nhánh Git (Git Branching & Merge Workflow)
---

# Quy Tắc Git Workflow Bắt Buộc

1. **Tuyệt đối KHÔNG push trực tiếp lên nhánh `main`** (`git push origin main` trực tiếp từ các thay đổi mới bị cấm).
2. **Quy trình chuẩn cho mọi phiên bản / tính năng / bản vá tiếp theo:**
   - Luôn tách nhánh mới từ `main`: `git checkout -b feat/<ten-tinh-nang>` hoặc `git checkout -b fix/<ten-loi>` hoặc `release/vX.Y.Z`.
   - Thực hiện thay đổi, chạy đầy đủ kiểm thử (`npm test`) trên nhánh mới.
   - Đẩy nhánh tính năng lên remote (`git push -u origin <ten-nhanh>`) và tạo Pull Request hoặc merge có kiểm soát (`git checkout main && git merge --no-ff <ten-nhanh>`) sau khi đã kiểm tra kỹ.
