// --- GLOW EFFECT LOGIC ---
const canvas = document.getElementById("glowCanvas");
const ctx = canvas.getContext("2d");

let innerWidth = window.innerWidth;
let innerHeight = window.innerHeight;

function resizeCanvas() {
    innerWidth = window.innerWidth;
    innerHeight = window.innerHeight;
    canvas.width = innerWidth;
    canvas.height = innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const cols = 50;
const rows = 50;
const cellSize = 60;
const cubeSize = 45;

let cubesData = [];

for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
        const cx = col * cellSize - (cols * cellSize) / 2 + cellSize / 2;
        const cy = row * cellSize - (rows * cellSize) / 2 + cellSize / 2;

        const x1 = cx * 0.7071 - cy * -0.7071;
        const y1 = cx * -0.7071 + cy * 0.7071;
        const baseZ2 = y1 * 0.866;

        const hue = 180 + ((col + row) / (cols + rows)) * 110;

        cubesData.push({
            col, row,
            cx, cy,
            baseZ2,
            hue,
            currentGlow: 0
        });
    }
}

cubesData.sort((a, b) => a.baseZ2 - b.baseZ2);

let cursorX = innerWidth / 2;
let cursorY = innerHeight / 2;
let hasMoved = false;

window.addEventListener('mousemove', (e) => {
    hasMoved = true;
    cursorX = e.clientX;
    cursorY = e.clientY;
});
document.addEventListener('mouseleave', () => {
    hasMoved = false;
});

const DEG2RAD = Math.PI / 180;
const cosZ = Math.cos(-45 * DEG2RAD);
const sinZ = Math.sin(-45 * DEG2RAD);
const cosX = Math.cos(60 * DEG2RAD);
const sinX = Math.sin(60 * DEG2RAD);

function project(x, y, z) {
    const x1 = x * cosZ - y * sinZ;
    const y1 = x * sinZ + y * cosZ;
    const x2 = x1;
    const y2 = y1 * cosX - z * sinX;

    const z2 = y1 * sinX + z * cosX;
    const scale = 2500 / (2500 - z2);

    return {
        sx: innerWidth / 2 + x2 * scale,
        sy: innerHeight / 2 + y2 * scale
    };
}

function drawPolygon(ctx, points, fillStyle, strokeStyle) {
    ctx.beginPath();
    ctx.moveTo(points[0].sx, points[0].sy);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].sx, points[i].sy);
    }
    ctx.closePath();
    if (fillStyle) {
        ctx.fillStyle = fillStyle;
        ctx.fill();
    }
    if (strokeStyle) {
        ctx.strokeStyle = strokeStyle;
        ctx.stroke();
    }
}

const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!hasMoved) {
        const time = Date.now() * 0.001;
        cursorX = innerWidth / 2 + Math.cos(time) * 150;
        cursorY = innerHeight / 2 + Math.sin(time) * 150;
    }

    let activeCubes = [];

    for (let i = 0; i < cubesData.length; i++) {
        const cube = cubesData[i];

        const pCenter = project(cube.cx, cube.cy, 0);
        const dx = cursorX - pCenter.sx;
        const dy = cursorY - pCenter.sy;

        let distance = Math.sqrt(dx * dx + dy * dy);

        const radius = 350;
        let targetGlow = 1 - (distance / radius);
        if (targetGlow < 0) targetGlow = 0;

        targetGlow = Math.pow(targetGlow, 1.8);
        const diff = targetGlow - cube.currentGlow;
        cube.currentGlow += diff * 0.15;

        if (cube.currentGlow > 0.005) {
            activeCubes.push(cube);

            if (targetGlow > 0.8) {
                document.documentElement.style.setProperty('--dynamic-hue', cube.hue);
            }
        } else {
            cube.currentGlow = 0;
        }
    }

    ctx.lineJoin = "round";

    activeCubes.forEach(cube => {
        const glow = cube.currentGlow;
        const zBottom = glow * 40;
        const zTop = zBottom + 30;

        const opacity = Math.min(glow * 1.5, 1);
        ctx.globalAlpha = opacity;

        const halfObj = cubeSize / 2;
        const xA = cube.cx - halfObj, yA = cube.cy - halfObj;
        const xB = cube.cx + halfObj, yB = cube.cy - halfObj;
        const xC = cube.cx + halfObj, yC = cube.cy + halfObj;
        const xD = cube.cx - halfObj, yD = cube.cy + halfObj;

        const pTA = project(xA, yA, zTop);
        const pTB = project(xB, yB, zTop);
        const pTC = project(xC, yC, zTop);
        const pTD = project(xD, yD, zTop);

        const pBA = project(xA, yA, zBottom);
        const pBD = project(xD, yD, zBottom);
        const pBC = project(xC, yC, zBottom);

        const hue = cube.hue;
        const strokeColor = `hsl(${hue}, 80%, 65%)`;

        // Draw Left Wall
        ctx.lineWidth = 1.5;
        drawPolygon(ctx, [pTA, pTD, pBD, pBA], `hsl(${hue}, 80%, 40%)`, strokeColor);

        // Draw Right Wall
        drawPolygon(ctx, [pTD, pTC, pBC, pBD], `hsl(${hue}, 80%, 25%)`, strokeColor);

        // Draw Top Face Solid
        drawPolygon(ctx, [pTA, pTB, pTC, pTD], `hsl(${hue}, 90%, 60%)`, strokeColor);

        // HIGH PERFORMANCE GLOW EFFECT (No shadowBlur!)
        // Instead of shadowBlur, we draw 2 large semi-transparent strokes which is 100x faster
        ctx.lineWidth = 10;
        ctx.globalAlpha = opacity * 0.25;
        drawPolygon(ctx, [pTA, pTB, pTC, pTD], null, strokeColor);

        ctx.lineWidth = 20;
        ctx.globalAlpha = opacity * 0.1;
        drawPolygon(ctx, [pTA, pTB, pTC, pTD], null, strokeColor);
    });

    requestAnimationFrame(animate);
};
animate();

// --- ORIGINAL IMGUL LOGIC ---
const fileInput = document.getElementById("fileUpload");
const fileList = document.getElementById("fileList");
const uploadBtn = document.getElementById("uploadBtn");
const dropArea = document.getElementById("dropArea");
const uploadedFilesDiv = document.getElementById("uploadedFiles");
const clearAllBtn = document.getElementById("clearAllBtn");
const copyAllBtn = document.getElementById("copyAllBtn");
const themeToggle = document.getElementById("themeToggle");

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const WEBSITE_URL = "/i/";
let selectedFiles = [];

themeToggle.onclick = () => {
    document.documentElement.classList.toggle("dark");
};

function updateFileList() {
    fileList.innerHTML = "";

    selectedFiles.forEach((file, index) => {
        const div = document.createElement("div");
        div.className = "bg-surface/80 backdrop-blur-md border border-white/10 rounded-lg p-4 relative z-20";

        div.innerHTML = `
<img src="${URL.createObjectURL(file)}" class="w-full h-32 object-cover rounded mb-3"/>
<p class="text-sm truncate">${file.name}</p>
<div class="w-full bg-slate-700 h-2 mt-2 rounded">
<div id="progress-${index}" class="h-2 bg-primary rounded" style="width:0%"></div>
</div>
<button class="px-3 py-1 mt-2 text-xs text-red-400 border border-red-500/30 rounded bg-red-500/10 hover:bg-red-500/20 transition relative z-20">Remove</button>
`;

        div.querySelector("button").onclick = () => {
            selectedFiles.splice(index, 1);
            updateFileList();
        };

        fileList.appendChild(div);
    });

    uploadBtn.classList.toggle("hidden", selectedFiles.length === 0);
}

function handleFiles(files) {
    Array.from(files).forEach(file => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            alert(file.name + " invalid type");
            return;
        }
        if (file.size > MAX_SIZE) {
            alert(file.name + " exceeds 10MB");
            return;
        }
        selectedFiles.push(file);
    });

    updateFileList();
}

fileInput.addEventListener("change", e => handleFiles(e.target.files));
dropArea.addEventListener("click", () => fileInput.click());
dropArea.addEventListener("dragover", e => e.preventDefault());
dropArea.addEventListener("drop", e => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
});

clearAllBtn.onclick = () => {
    uploadedFilesDiv.innerHTML = "";
    selectedFiles = [];
    fileList.innerHTML = "";
    uploadBtn.classList.add("hidden");
    fileInput.value = "";
};

copyAllBtn.onclick = () => {
    const links = Array.from(uploadedFilesDiv.querySelectorAll("a"))
        .map(a => a.href)
        .join("\n");

    if (!links) {
        alert("No uploaded files.");
        return;
    }

    navigator.clipboard.writeText(links)
        .then(() => alert("All links copied!"))
        .catch(() => alert("Clipboard failed."));
};

uploadBtn.addEventListener("click", () => {
    if (!selectedFiles.length) return;

    uploadBtn.innerText = "Uploading...";
    uploadBtn.disabled = true;

    const formData = new FormData();
    selectedFiles.forEach(f => formData.append("files[]", f));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/upload");

    xhr.upload.onprogress = e => {
        if (e.lengthComputable) {
            const percent = (e.loaded / e.total) * 100;
            selectedFiles.forEach((_, index) => {
                const bar = document.getElementById(`progress-${index}`);
                if (bar) bar.style.width = percent + "%";
            });
        }
    };

    xhr.onerror = () => {
        alert("Upload failed. Please try again.");
        resetUploadState();
    };

    xhr.onload = () => {
        if (xhr.status < 200 || xhr.status >= 300) {
            alert("Server error: " + xhr.status);
            resetUploadState();
            return;
        }

        let result;
        try {
            result = JSON.parse(xhr.responseText);
        } catch {
            alert("Invalid server response");
            resetUploadState();
            return;
        }

        if (!result || !Array.isArray(result.files)) {
            alert("Unexpected server format");
            resetUploadState();
            return;
        }

        const uploadedLinks = [];

        result.files.forEach(fileData => {
            if (fileData.status === "success" && fileData.url) {
                const fullURL = window.location.origin + WEBSITE_URL + fileData.url;
                uploadedLinks.push(fullURL);

                const card = document.createElement("div");
                card.className = "bg-surface/80 backdrop-blur-md border border-white/10 rounded-lg p-4 relative z-20";

                card.innerHTML = `
  <img src="${WEBSITE_URL + fileData.url}" class="w-full h-32 object-cover rounded mb-3"/>
  <p class="text-sm truncate mb-1">${fileData.file}</p>
  <a href="${fullURL}" target="_blank" class="text-primary text-sm hover:underline block mb-2 transition">View</a>
  <button class="px-3 py-1 bg-primary/20 hover:bg-primary/40 border border-primary/30 text-white rounded text-xs relative z-20 transition">Copy</button>
`;

                card.querySelector("button").onclick = () => {
                    navigator.clipboard.writeText(fullURL)
                        .then(() => alert("Link copied!"))
                        .catch(() => alert("Clipboard failed."));
                };

                uploadedFilesDiv.appendChild(card);
            }
        });

        if (uploadedLinks.length) {
            navigator.clipboard.writeText(uploadedLinks.join("\n"))
                .catch(() => { });
        }

        selectedFiles = [];
        fileList.innerHTML = "";
        fileInput.value = "";
        resetUploadState();
    };

    xhr.send(formData);
});

function resetUploadState() {
    uploadBtn.innerText = "Upload Files";
    uploadBtn.disabled = false;
}

document.addEventListener("paste", (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
        if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (!file) return;

            event.preventDefault();
            handleFiles([file]);
            uploadBtn.click();
            break;
        }
    }
});
