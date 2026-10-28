# 🌐 Agent 3D Topology Hub (v4.0)

**Real-Time 3D Isometric Cyberpunk Multi-Agent Visualization Server, WebSocket Hub & Model Context Protocol (MCP) Server**

[![License: MIT](https://img.shields.io/badge/License-MIT-cyan.svg)](LICENSE)
[![Docker Multi-Arch](https://img.shields.io/badge/Docker-ARM64%20%7C%20AMD64-blue)](Dockerfile)
[![MCP Ready](https://img.shields.io/badge/MCP-STDIO%20%26%20HTTP-indigo)](src/mcp/index.js)
[![Zero 3D Dependencies](https://img.shields.io/badge/3D%20Engine-Pure%20Canvas%202D-emerald)](public/AgentOffice3D.js)

> **🇻🇳 Tiếng Việt:** Biến mọi phiên làm việc của các tác tử AI (Antigravity, Claude Code, Cursor, CrewAI, AutoGen, LangGraph, n8n...) thành một **Phòng Điều Hành 3D Cyberpunk Thời Gian Thực** chạy trên Docker (Mac mini / VPS / Local), có bảo mật mã chứng thực riêng cho từng phiên và xem trực tiếp trên mọi thiết bị (Laptop, iPhone, iPad).
>
> **🇺🇸 English:** Turn any multi-agent workflow or swarm session into a live, interactive **3D Isometric Cyberpunk Command Center**. Packaged as an ultra-lightweight Docker container (<50MB RAM) with multi-session token authentication, real-time WebSocket streaming, and a built-in **MCP Server**.

---

## ✨ Điểm Nổi Bật / Key Features (v4.0)

1. **🔄 Biến Đổi Hình Thái Động (Dynamic Topology Morphing - $N = 1 \to 50+$):**
   * Tự động chuyển đổi mượt mà (60fps Smooth Lerp) giữa 4 đội hình không gian khi số lượng Agent ($N$) tăng/giảm liên tục trong cùng một phiên:
     * **$N = 1$ (Solo Center):** Bàn chỉ huy trung tâm đơn.
     * **$N = 2 \dots 4$ (Semi-Circle Arc):** Đội hình vòng cung bán nguyệt.
     * **$N = 5 \dots 12$ (Radial Command Hub):** `Leader` ở đài chỉ huy 3 màn hình trung tâm, các `Worker` xếp vòng Elip bao quanh.
     * **$N > 12$ (Swarm Pod Matrix):** Ma trận cụm bàn làm việc hai bên lối đi trung tâm, sàn lưới Neon tự động co giãn và camera tự động căn chỉnh độ phóng đại (**Elastic Auto-Framing Zoom**).
2. **⚡ Đường Mạch Topology & Xung Dữ Liệu 3D (Floor Conduits & Data Packets):**
   * Vẽ đường mạch năng lượng dưới sàn nối từ `Leader` tới các `Subagent`. Khi agent phát ngôn hoặc cập nhật tiến độ, các hạt xung ánh sáng chạy dọc theo đường dây theo thời gian thực.
3. **🔐 Đa Phiên & Bảo Mật Mã Chứng Thực Kép (Multi-Session Dual-Token Auth):**
   * Mỗi lần một đội ngũ Agent gọi vào sẽ sinh một phiên (`sessionId`) độc lập kèm 2 mã bảo mật:
     * **`authToken` (`sk_...`):** Quyền ghi (Write) chỉ dành cho Agent/LLM để cập nhật tiến độ hoặc phát ngôn.
     * **`viewToken` (`vt_...`):** Quyền xem (Read) đính kèm trong `viewUrl` để bạn mở xem an toàn trên điện thoại hoặc chia sẻ cho đồng đội mà không sợ lộ quyền điều khiển.
4. **🔌 Hỗ Trợ Đa Nền Tảng (MCP Server + 1-Call Webhook API):**
   * **Stateful MCP Server (`stdio` & `/mcp` HTTP):** Tự động nhớ phiên đang hoạt động, LLM không cần truyền lại `sessionId` hay `authToken` ở mỗi lệnh gọi.
   * **1-Call Webhook (`POST /api/push`):** Đẩy JSON từ bất kỳ Skill, Bash script, GitHub Actions hay n8n nào chỉ bằng 1 lệnh duy nhất.
5. **📱 Đồ Họa Retina HiDPI & Cảm Ứng Đa Điểm (Mobile / iPad Ready):**
   * Sắc nét trên màn hình Retina/4K (`devicePixelRatio`), hỗ trợ xoay 3D bằng 1 ngón, phóng to/thu nhỏ bằng 2 ngón (Pinch-to-Zoom), kèm ngăn kéo **Nhật Ký Hoạt Động Trực Tiếp (Live Activity Feed)** và chuyển đổi ngôn ngữ **🇻🇳 VI / 🇺🇸 EN**.

---

## 🚀 Khởi Chạy Nhanh / Quick Start

### Cách 1: Chạy bằng Docker Compose (Khuyên dùng cho Mac mini / Home Server / VPS)

```bash
git clone https://github.com/your-username/agent-3d-topology.git
cd agent-3d-topology

# Khởi chạy Server ở chế độ chạy ngầm 24/7 (Port 3300)
docker compose up -d --build
```

Mở trình duyệt tại **`http://localhost:3300`** và bấm nút **"🚀 Chạy Mô Phỏng Swarm Biến Hình"** để trải nghiệm ngay!

#### 🌐 Public ra Internet qua Cloudflare Tunnel (Không cần mở Port Router)
1. Tạo một Tunnel miễn phí trên [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/) trỏ về `http://agent-3d-server:3300`.
2. Tạo file `.env` từ `.env.example` và điền `TUNNEL_TOKEN=...`:
   ```bash
   cp .env.example .env
   # Điền TUNNEL_TOKEN của bạn vào file .env
   docker compose --profile tunnel up -d
   ```

### Cách 2: Chạy Trực Tiếp bằng Node.js

```bash
npm install
npm start
# Chạy thử kịch bản mô phỏng đội ngũ Agent biến hình:
npm run demo
```

---

## 🤖 Tích Hợp MCP Server (Antigravity, Claude Desktop, Cursor, Cline)

Thêm cấu hình sau vào `mcp_config.json` hoặc `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agent-3d-topology": {
      "command": "node",
      "args": ["/duong-dan-tuyet-doi/agent-3d-topology/src/mcp/index.js"],
      "env": {
        "AGENT_3D_URL": "http://localhost:3300"
      }
    }
  }
}
```
*(Nếu bạn đã public server trên Mac mini qua tên miền riêng, chỉ cần đổi `AGENT_3D_URL` thành `https://agents.yourdomain.com`).*

### Các Công Cụ MCP (MCP Tools) Cung Cấp Cho LLM:
| Tên Tool | Công dụng |
| :--- | :--- |
| `init_3d_session` | Tạo phòng điều hành 3D mới, trả về `viewUrl` kèm mã xác thực để người dùng mở xem trực tiếp. |
| `upsert_agents` | Thêm hoặc cập nhật danh sách nhiều Agent cùng lúc (tự động tính toán lại đội hình 3D). |
| `update_agent_status` | Cập nhật `% tiến độ`, `status`, hoặc tự động thêm bàn mới nếu `agentId` chưa xuất hiện. |
| `agent_speak` | Bật bong bóng hội thoại 3D đếm ngược 5 giây trên đầu nhân vật theo thời gian thực. |
| `remove_agent` | Giải phóng bàn làm việc bằng hiệu ứng Hologram khi Subagent hoàn thành và thu gọn đội hình. |
| `close_session` | Đánh dấu hoàn thành phiên làm việc. |

---

## 📡 Tích Hợp Qua REST API / Webhook (Dành cho Skill, Python, CrewAI, cURL)

### 1. Gọi 1 Lệnh Duy Nhất (`POST /api/push` — Zero-Setup)
Phù hợp khi gọi nhanh từ **Skill** hoặc **Shell Script**: tự động tạo phiên nếu chưa có, cập nhật danh sách agent và bật bong bóng hội thoại trong 1 request:

```bash
curl -X POST "http://localhost:3300/api/push" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "team-alpha",
    "title": "Chiến Dịch Tối Ưu Hóa Hệ Thống",
    "agents": [
      { "id": "leader", "name": "Tổng Chỉ Huy", "role": "Orchestrator", "progress": 70, "isLeader": true },
      { "id": "dev_1", "name": "Kỹ Sư Backend", "role": "Developer", "progress": 85, "status": "Coding API" },
      { "id": "qa_1", "name": "Kiểm Thử Viên", "role": "QA Engineer", "progress": 100, "status": "Done" }
    ],
    "speak": {
      "agentId": "dev_1",
      "message": "Đã hoàn thành tích hợp WebSocket thời gian thực!"
    }
  }'
```

### 2. Quy Trình Bảo Mật Đa Phiên Chuẩn (`authToken` & `viewToken`)

```bash
# Bước 1: Tạo phiên mới -> Nhận sessionId, authToken (sk_...) và viewUrl (chứa vt_...)
curl -X POST "http://localhost:3300/api/sessions" \
  -H "Content-Type: application/json" \
  -d '{"title": "Swarm Session #1"}'

# Bước 2: Cập nhật trạng thái hoặc thêm Subagent mới vào phiên (yêu cầu Bearer authToken)
curl -X PATCH "http://localhost:3300/api/sessions/<SESSION_ID>/agents/subagent_01" \
  -H "Authorization: Bearer <AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Chuyên Gia Bảo Mật", "role": "SecOps", "progress": 60, "speakMessage": "Đang kiểm tra token!"}'

# Bước 3: Rút Subagent khỏi phòng khi xong việc (Tự động co giãn lại đội hình 3D)
curl -X DELETE "http://localhost:3300/api/sessions/<SESSION_ID>/agents/subagent_01" \
  -H "Authorization: Bearer <AUTH_TOKEN>"
```

---

## 📦 Xuất File HTML Độc Lập (Offline Standalone Mode)

Nếu bạn muốn xuất ra một file `.html` duy nhất (nhúng sẵn toàn bộ thư viện 3D) để gửi qua email/chat mà không cần mở server:

```bash
npm run export-html -- --count 8 --output my_office.html
```

---

## 🧪 Kiểm Thử Tự Động (Automated E2E Tests)

```bash
npm test
```

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.
