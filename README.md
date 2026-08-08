# Finger Frame Live AI / 手指取景框实时 AI

A browser-based live camera experience that turns the area framed by your fingers into a realtime AI scene. It combines MediaPipe hand tracking, Decart Lucy 2.5 over WebRTC, and Canvas compositing. The interface can switch between English and Chinese.

这是一个浏览器实时摄像头体验：用双手的拇指和食指框出画面，框内或框外会显示实时 AI 转换结果。项目结合了 MediaPipe 手势追踪、Decart Lucy 2.5 WebRTC 实时视频流和 Canvas 合成，并支持中英文界面切换。

## Features / 功能

- **Live finger frame** — tracks two hands and composites the generated stream inside or outside the moving frame.
- **Realtime styles** — switch among 3D animation, anime, cyberpunk, watercolor, LEGO, and a custom prompt.
- **Character replacement** — select item 7, upload a reference image, and update the current Lucy 2.5 session without leaving the camera view. The selected character thumbnail appears in the toolbar.
- **Inside/outside switch** — choose whether the replacement appears inside the finger frame (default) or outside it.
- **Gesture controls** — an OK gesture or three raised fingers toggles the inside/outside mode.
- **Palm split view** — hold one open palm upright to show the original feed on its left and the replacement on its right. The divider follows the palm and disappears when the hand is lowered.
- **Bilingual UI** — use the language button beside 🔑 to switch the complete interface between English and Chinese.

- **实时手指取景框**：追踪双手，用移动的手指框合成原始画面和替换画面。
- **实时风格**：支持 3D 动画、动漫、赛博朋克、水彩、LEGO 和自定义提示词。
- **角色替换**：点击第 7 项后选择参考图，通过当前 Lucy 2.5 会话实时替换角色，缩略图会显示在工具栏中。
- **框内/框外切换**：决定替换画面显示在手指框内（默认）还是框外。
- **手势控制**：OK 手势或三指手势可切换框内/框外模式。
- **手掌分屏**：单手竖直张开时，手掌左侧显示原始画面，右侧显示替换画面，分割线跟随手掌移动。
- **中英文界面**：点击右上角 🔑 左侧的语言按钮即可切换。

## Run locally / 本地运行

```bash
python3 -m http.server 8125
```

Open <http://localhost:8125>, allow camera access, and add a Decart API key from the 🔑 panel. `getUserMedia` requires localhost or HTTPS.

打开 <http://localhost:8125>，允许浏览器访问摄像头，然后在右上角 🔑 面板填写 Decart API 密钥。浏览器摄像头需要运行在 localhost 或 HTTPS 环境中。

For a camera-free tracking preview, open <http://localhost:8125/?demo>.

如需在没有摄像头的环境中检查界面与框选效果，可打开 <http://localhost:8125/?demo>。

## Controls / 操作

| Action / 操作 | Result / 效果 |
|---|---|
| Two L-shaped hands / 双手组成 L 形 | Create the tracked finger frame / 组成动态取景框 |
| OK 👌 or three fingers / OK 或三指 | Toggle replacement inside/outside / 切换框内或框外显示 |
| One upright open palm / 一只手掌竖直张开 | Enter palm-following split view / 进入跟随手掌的左右分屏 |
| Keys 1–7 / 数字键 1–7 | Select a style or character replacement / 选择风格或角色替换 |

## Privacy / 隐私

The Decart API key stays in browser storage and is used only for the realtime WebRTC session. Without a key, the app uses a local color-filter fallback so hand tracking and compositing can still be tested.

Decart API 密钥仅保存在浏览器中，并只用于实时 WebRTC 会话。未填写密钥时，页面会使用本地颜色滤镜作为替代，以便继续测试手势追踪和画面合成。

Based on the open-source [finger-frame-effect-ai](https://github.com/sophiamyang/finger-frame-effect-ai) project and its finger-frame family.
