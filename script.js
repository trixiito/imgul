// --- GLOW EFFECT LOGIC ---
const gridElement = document.getElementById("grid");
const cols = 50;
const rows = 50;

for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
        const cube = document.createElement("div");
        cube.className = "cube";
        cube.innerHTML = `
    <div class="face top"></div>
    <div class="face left"></div>
    <div class="face right"></div>
`;
        const hue = 180 + ((col + row) / (cols + rows)) * 110;
        cube.style.setProperty('--hue', hue);
        cube.style.setProperty('--glow', 0);
        gridElement.appendChild(cube);
    }
}

let cubesData = [];
let gridRect = { left: 0, top: 0, width: 0, height: 0 };

const mapCubes = () => {
    const domCubes = document.querySelectorAll(".cube");
    gridRect = gridElement.getBoundingClientRect();

    cubesData = Array.from(domCubes).map((cube) => {
        const rect = cube.getBoundingClientRect();
        return {
            el: cube,
            cx: rect.left + rect.width / 2,
            cy: rect.top + rect.height / 2,
            currentGlow: 0,
            lastGlow: 0
        };
    });
};

setTimeout(mapCubes, 500);
window.addEventListener("resize", () => {
    clearTimeout(window.resizeTimer);
    window.resizeTimer = setTimeout(mapCubes, 300);
});

let cursorX = window.innerWidth / 2;
let cursorY = window.innerHeight / 2;
let hasMoved = false;

window.addEventListener('mousemove', (e) => {
    hasMoved = true;
    cursorX = e.clientX;
    cursorY = e.clientY;
});

// Detect when cursor leaves window and resume the idle loading animation
document.addEventListener('mouseleave', () => {
    hasMoved = false;
});

const animate = () => {
    if (cubesData.length > 0) {
        if (!hasMoved) {
            const time = Date.now() * 0.001;
            cursorX = window.innerWidth / 2 + Math.cos(time) * 150;
            cursorY = window.innerHeight / 2 + Math.sin(time) * 150;
        }

        cubesData.forEach(cube => {
            const dx = cursorX - cube.cx;
            const dy = cursorY - cube.cy;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const radius = 350;
            let targetGlow = 1 - (distance / radius);
            if (targetGlow < 0) targetGlow = 0;

            targetGlow = Math.pow(targetGlow, 1.8);
            const diff = targetGlow - cube.currentGlow;
            cube.currentGlow += diff * 0.15;

            let glowVal = Math.round(cube.currentGlow * 100) / 100;

            if (glowVal < 0.01 && targetGlow === 0) {
                glowVal = 0;
                cube.currentGlow = 0;
            }

            if (cube.lastGlow !== glowVal) {
                cube.el.style.setProperty('--glow', glowVal);
                cube.lastGlow = glowVal;

                // If this cube is currently the most glowing one (closest to cursor)
                // Use its inherent hue to drive the logo's color
                if (targetGlow > 0.8) {
                    const hue = cube.el.style.getPropertyValue('--hue');
                    document.documentElement.style.setProperty('--dynamic-hue', hue);
                }
            }
        });
    }
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
