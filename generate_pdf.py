import os
import subprocess

html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>CyberSteer: Complete Engineering Documentation & Codebase</title>
    <style>
        @page {
            margin: 20mm 15mm 20mm 15mm;
            size: A4;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            background-color: #ffffff;
            margin: 0;
            padding: 0;
        }
        h1, h2, h3, h4 {
            color: #0f172a;
            page-break-after: avoid;
        }
        h1 {
            font-size: 26pt;
            border-bottom: 3px solid #00f2fe;
            padding-bottom: 8px;
            margin-bottom: 12px;
            color: #0369a1;
        }
        h2 {
            font-size: 18pt;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 6px;
            margin-top: 24px;
            color: #0284c7;
        }
        h3 {
            font-size: 13pt;
            margin-top: 18px;
            color: #334155;
        }
        p, li {
            font-size: 10pt;
            color: #334155;
        }
        ul, ol {
            margin-top: 4px;
            margin-bottom: 12px;
            padding-left: 24px;
        }
        li {
            margin-bottom: 4px;
        }
        pre {
            background-color: #0f172a;
            color: #e2e8f0;
            padding: 12px;
            border-radius: 4px;
            font-family: "Courier New", Courier, monospace;
            font-size: 8pt;
            line-height: 1.4;
            overflow-x: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
            page-break-inside: avoid;
            margin: 10px 0;
        }
        code {
            font-family: "Courier New", Courier, monospace;
            font-size: 8.5pt;
            background-color: #f1f5f9;
            color: #0284c7;
            padding: 2px 5px;
            border-radius: 3px;
        }
        .meta-box {
            background-color: #f8fafc;
            border-left: 4px solid #0284c7;
            padding: 12px 16px;
            margin: 14px 0;
            border-radius: 0 4px 4px 0;
        }
        .tag {
            display: inline-block;
            background-color: #e0f2fe;
            color: #0369a1;
            padding: 3px 8px;
            font-size: 8pt;
            font-weight: bold;
            border-radius: 3px;
            margin-right: 4px;
        }
        .page-break {
            page-break-before: always;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
            font-size: 9pt;
        }
        th, td {
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            text-align: left;
        }
        th {
            background-color: #f1f5f9;
            color: #0f172a;
        }
    </style>
</head>
<body>

    <h1>CyberSteer: Hand-Controlled Retro Highway Racer</h1>
    <div class="meta-box">
        <strong>Project Overview & Complete Technical Specification</strong><br>
        <em>Generated for deep analysis and LLM study (ChatGPT / Claude / Gemini)</em><br>
        <span class="tag">HTML5 Canvas 2D</span>
        <span class="tag">MediaPipe Hands AI</span>
        <span class="tag">Computer Vision</span>
        <span class="tag">Pure Vanilla JS</span>
        <span class="tag">16-Bit Pixel Aesthetic</span>
    </div>

    <h2>1. Executive Summary</h2>
    <p>
        <strong>CyberSteer</strong> is a browser-based, AI-driven highway racing and obstacle dodging game. It combines real-time client-side computer vision with a high-performance 60 FPS HTML5 2D Canvas game loop.
    </p>
    <p>
        Players can steer their cybernetic racing car either using their physical hands tracked live via webcam (using Google MediaPipe Hands ML models) or standard keyboard hotkeys (A/D or Arrow keys).
    </p>

    <h2>2. Architecture & Technology Stack</h2>
    <table>
        <tr>
            <th>Layer</th>
            <th>Technology</th>
            <th>Purpose</th>
        </tr>
        <tr>
            <td><strong>Core Engine</strong></td>
            <td>JavaScript (ES6+)</td>
            <td>Game physics, state machine, procedural traffic spawner, particle explosion system.</td>
        </tr>
        <tr>
            <td><strong>Computer Vision</strong></td>
            <td>Google MediaPipe Hands ML + CameraUtils CDN</td>
            <td>Real-time single-hand 21-landmark detection, palm centroid tracking, gesture zone classification with hysteresis.</td>
        </tr>
        <tr>
            <td><strong>Renderer</strong></td>
            <td>HTML5 2D Canvas API</td>
            <td>Hardware-accelerated procedural highway rendering, multi-vehicle obstacle rendering, dynamic lighting & headlight projection.</td>
        </tr>
        <tr>
            <td><strong>Interface & Styling</strong></td>
            <td>HTML5 & Vanilla CSS3</td>
            <td>Translucent dark glassmorphism modals, retro 16-bit arcade pixel typography (Press Start 2P), gold/cyan cyber palette.</td>
        </tr>
        <tr>
            <td><strong>Storage</strong></td>
            <td>Browser LocalStorage</td>
            <td>Persistent high-score tracking across sessions.</td>
        </tr>
    </table>

    <h2>3. Key Modules & Technical Implementation</h2>

    <h3>3.1. Computer Vision & Gesture Steering (<code>handControl.js</code>)</h3>
    <ul>
        <li><strong>MediaPipe Hands Integration:</strong> Initializes an in-browser ML model targeting 21 hand landmarks running asynchronously inside <code>requestAnimationFrame</code>.</li>
        <li><strong>Palm Center Calculation:</strong> Extracts Landmark 9 (Middle Finger MCP), normalized to [0, 1] horizontal coordinates.</li>
        <li><strong>Mirror Space Transformation:</strong> Converts camera coordinates <code>rawX = 1 - palmCenter.x</code> so moving hand right moves the car right from the user's natural perspective.</li>
        <li><strong>Hysteresis Zone Thresholding:</strong> Divides screen into LEFT (&lt; 0.38), CENTER (0.38 - 0.62), and RIGHT (&gt; 0.62). Implements a ±0.03 hysteresis buffer to eliminate jitter near boundaries.</li>
        <li><strong>Dynamic Neon Overlay:</strong> Visualizes the hand skeleton with glowing cyan lines, joint nodes, and palm reticle directly over the live camera feed.</li>
    </ul>

    <h3>3.2. Game Engine & Speed Progression (<code>game.js</code>)</h3>
    <ul>
        <li><strong>State Machine:</strong> Controls <code>MENU</code>, <code>PLAYING</code>, <code>PAUSED</code>, and <code>GAMEOVER</code> states with smooth modal transitions.</li>
        <li><strong>Steering Interpolation (Lerp):</strong> Smooths lane changes using linear interpolation <code>player.x += (targetX - player.x) * 0.18</code>.</li>
        <li><strong>Speed Progression:</strong> Starts at 50 mph and progresses through 75 mph, 90 mph, capping strictly at 100 mph. Continuous lerp makes speed transitions feel realistic.</li>
        <li><strong>Four-Wheel Obstacle Variety:</strong> Procedurally spawns 4 distinct vehicle classes (Cars, SUVs, Pickups, and Semi-Trucks) with custom pixel silhouettes, wheels, and taillights.</li>
        <li><strong>Particle Engine:</strong> Spawns 30 velocity-driven expanding debris particles with alpha decay on collisions.</li>
        <li><strong>AABB Collision Detection:</strong> Bounding box collision with customizable padding for forgiving yet precise collision boundaries.</li>
    </ul>

    <h3>3.3. Responsive Arcade UI & Layout (<code>index.html</code> & <code>style.css</code>)</h3>
    <ul>
        <li><strong>Dual-Panel Split Screen:</strong> Aligns the left game window and right live camera panel at 470px × 630px side-by-side.</li>
        <li><strong>Context-Aware Right Panel:</strong> Displays game instructions & controls during Menu mode, and dynamically expands to a full-screen live webcam feed during gameplay.</li>
        <li><strong>Pixel Font & Hierarchy:</strong> Imports Google Font <code>Press Start 2P</code> with gold headings (<code>#ffd700</code>), white body text (<code>#ffffff</code>), and cyan neon button accents (<code>#00f2fe</code>).</li>
    </ul>

    <div class="page-break"></div>

    <h2>4. Complete Source Code Repository</h2>

    <h3>4.1. <code>index.html</code></h3>
    <pre>""" + open("/Users/swopnabkarki/Desktop/hand controlled race/index.html").read().replace("<", "&lt;").replace(">", "&gt;") + """</pre>

    <div class="page-break"></div>

    <h3>4.2. <code>style.css</code></h3>
    <pre>""" + open("/Users/swopnabkarki/Desktop/hand controlled race/style.css").read().replace("<", "&lt;").replace(">", "&gt;") + """</pre>

    <div class="page-break"></div>

    <h3>4.3. <code>game.js</code></h3>
    <pre>""" + open("/Users/swopnabkarki/Desktop/hand controlled race/game.js").read().replace("<", "&lt;").replace(">", "&gt;") + """</pre>

    <div class="page-break"></div>

    <h3>4.4. <code>handControl.js</code></h3>
    <pre>""" + open("/Users/swopnabkarki/Desktop/hand controlled race/handControl.js").read().replace("<", "&lt;").replace(">", "&gt;") + """</pre>

    <h2>5. How to Run Locally</h2>
    <ol>
        <li>Start a local web server (required for webcam & MediaPipe CDN security policies):<br>
        <code>python3 -m http.server 8080</code></li>
        <li>Open your browser at: <code>http://localhost:8080</code></li>
        <li>Grant webcam permissions when prompted.</li>
        <li>Select <strong>Play Hand Mode</strong> to steer with hand gestures or <strong>Play Keyboard</strong> for keys!</li>
    </ol>

</body>
</html>
"""

html_path = "/Users/swopnabkarki/Desktop/hand controlled race/documentation.html"
pdf_path = "/Users/swopnabkarki/Desktop/hand controlled race/CyberSteer_Documentation.pdf"

with open(html_path, "w") as f:
    f.write(html_content)

chrome_bin = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
cmd = [
    chrome_bin,
    "--headless",
    "--disable-gpu",
    f"--print-to-pdf={pdf_path}",
    html_path
]

res = subprocess.run(cmd, capture_output=True, text=True)
print("PDF Generation Output:", res.stdout, res.stderr)
if os.path.exists(pdf_path):
    print(f"SUCCESS: PDF created at {pdf_path} (Size: {os.path.getsize(pdf_path)} bytes)")
else:
    print("FAILED: PDF not created")
