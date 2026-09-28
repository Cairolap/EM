let prCurrentSettings = {};
let prPollInterval = null;

function renderPrAdminView() {
    elements.contentArea.innerHTML = `
        <div class="pr-admin-view fade-in">
            <!-- Top Actions Toolbar -->
            <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-bottom: 1.5rem;">
                <a href="/pr/display.html" target="_blank" class="btn btn-primary" style="background: linear-gradient(135deg, var(--primary), var(--secondary));">
                    <i class="fa-solid fa-tv"></i> เปิดหน้าจอ TV (Public View)
                </a>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 400px; gap: 2rem;">
                <!-- Left Column: Media Management -->
                <div style="display: flex; flex-direction: column; gap: 2rem;">
                    <!-- Media Management Card -->
                    <div class="card">
                        <div class="card-header">
                            <h2 class="card-title"><i class="fa-solid fa-images"></i> จัดการสื่อ (รูปภาพ / วิดีโอ)</h2>
                            <div class="badge badge-info" id="media-count-badge">0 รายการ</div>
                        </div>

                        <div class="upload-area" id="pr-drop-zone" onclick="document.getElementById('pr-file-upload').click()" 
                             style="border: 2px dashed var(--border-color); border-radius: 12px; padding: 2rem; text-align: center; cursor: pointer; transition: all 0.3s ease; background: var(--bg-secondary);">
                            <i class="fa-solid fa-cloud-arrow-up" style="font-size: 3rem; color: var(--primary); margin-bottom: 1rem; opacity: 0.7;"></i>
                            <p style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">คลิก หรือลากไฟล์มาวางเพื่ออัปโหลด</p>
                            <p style="font-size: 0.85rem; color: var(--text-secondary);">รองรับรูปภาพ (JPG, PNG) และวิดีโอ (MP4) | Ctrl + V เพื่อวาง</p>
                            <input type="file" id="pr-file-upload" style="display: none;" accept="image/*,video/mp4" multiple onchange="handlePrFiles(this.files)">
                        </div>

                        <div id="media-list" class="media-grid" style="margin-top: 1.5rem;">
                            <!-- Media Items will be rendered here -->
                            <div style="text-align: center; padding: 3rem; color: var(--text-tertiary);">
                                <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
                                <p style="margin-top: 1rem;">กำลังโหลดสื่อ...</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Column: Settings -->
                <div style="display: flex; flex-direction: column; gap: 2rem;">
                    <!-- Safety Stats Card -->
                    <div class="card">
                        <div class="card-header">
                            <h2 class="card-title"><i class="fa-solid fa-hard-hat" style="color: #f59e0b;"></i> สถิติความปลอดภัย</h2>
                        </div>
                        
                        <form onsubmit="savePrSettings(event)">
                            <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                                <!-- Company Stats -->
                                <div style="background: var(--bg-secondary); padding: 1rem; border-radius: 12px; border: 1px solid var(--border-color);">
                                    <h3 style="font-size: 0.9rem; margin-bottom: 1rem; color: var(--primary); text-transform: uppercase; letter-spacing: 0.5px;">ระดับบริษัท</h3>
                                    <div class="form-group" style="margin-bottom: 1rem;">
                                        <label style="font-size: 0.85rem; font-weight: 500;">วันที่เกิดอุบัติเหตุล่าสุด</label>
                                        <input type="date" id="company-date" class="form-control" style="width: 100%; padding: 0.6rem; border-radius: 8px; border: 1px solid var(--border-color); margin-top: 0.25rem;">
                                    </div>
                                    <div class="form-group">
                                        <label style="font-size: 0.85rem; font-weight: 500;">เป้าหมาย (วัน)</label>
                                        <input type="number" id="company-target" class="form-control" placeholder="เช่น 1000" style="width: 100%; padding: 0.6rem; border-radius: 8px; border: 1px solid var(--border-color); margin-top: 0.25rem;">
                                    </div>
                                </div>

                                <!-- Department Stats -->
                                <div style="background: var(--bg-secondary); padding: 1rem; border-radius: 12px; border: 1px solid var(--border-color);">
                                    <h3 style="font-size: 0.9rem; margin-bottom: 1rem; color: var(--secondary); text-transform: uppercase; letter-spacing: 0.5px;">แผนกซ่อมไฟฟ้า</h3>
                                    <div class="form-group" style="margin-bottom: 1rem;">
                                        <label style="font-size: 0.85rem; font-weight: 500;">วันที่เกิดอุบัติเหตุล่าสุด</label>
                                        <input type="date" id="dept-date" class="form-control" style="width: 100%; padding: 0.6rem; border-radius: 8px; border: 1px solid var(--border-color); margin-top: 0.25rem;">
                                    </div>
                                    <div class="form-group">
                                        <label style="font-size: 0.85rem; font-weight: 500;">เป้าหมาย (วัน)</label>
                                        <input type="number" id="dept-target" class="form-control" placeholder="เช่น 365" style="width: 100%; padding: 0.6rem; border-radius: 8px; border: 1px solid var(--border-color); margin-top: 0.25rem;">
                                    </div>
                                </div>

                                <!-- Display Settings -->
                                <div style="background: var(--bg-secondary); padding: 1rem; border-radius: 12px; border: 1px solid var(--border-color);">
                                    <h3 style="font-size: 0.9rem; margin-bottom: 1rem; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.5px;">การแสดงผล</h3>
                                    <div class="form-group" style="margin-bottom: 1rem;">
                                        <label style="font-size: 0.85rem; font-weight: 500;">เวลาเปลี่ยนสไลด์ (วินาที)</label>
                                        <input type="number" id="slide-interval" class="form-control" value="10" min="3" style="width: 100%; padding: 0.6rem; border-radius: 8px; border: 1px solid var(--border-color); margin-top: 0.25rem;">
                                    </div>
                                    <div style="display: flex; gap: 1.5rem;">
                                        <label style="font-weight: 500; display: flex; align-items: center; gap: 0.5rem; color: var(--text-primary); cursor: pointer; font-size: 0.9rem;">
                                            <input type="checkbox" id="show-clock" style="width: 18px; height: 18px;"> นาฬิกา
                                        </label>
                                        <label style="font-weight: 500; display: flex; align-items: center; gap: 0.5rem; color: var(--text-primary); cursor: pointer; font-size: 0.9rem;">
                                            <input type="checkbox" id="show-safety" style="width: 18px; height: 18px;"> สถิติปลอดภัย
                                        </label>
                                    </div>
                                </div>

                                <button type="submit" class="btn btn-success" style="width: 100%; justify-content: center; padding: 1rem; border-radius: 12px; font-size: 1rem;">
                                    <i class="fa-solid fa-save"></i> บันทึกการตั้งค่าทั้งหมด
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
        <style>
            .active-slide {
                border: 3px solid var(--primary) !important;
                box-shadow: 0 0 15px rgba(59, 130, 246, 0.4);
                transform: scale(1.02);
            }
            .playing-badge {
                position: absolute;
                top: 10px;
                left: 10px;
                background: var(--primary);
                color: white;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 0.75rem;
                font-weight: 600;
                display: none;
                z-index: 2;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }
            .active-slide .playing-badge {
                display: flex;
                align-items: center;
                gap: 5px;
            }
            .media-item {
                transition: all 0.3s ease;
                cursor: pointer;
                min-width: 0;
            }
            .media-item:hover {
                transform: translateY(-5px);
                box-shadow: var(--shadow-md);
            }
            .force-btn {
                background: var(--primary);
                color: white;
                border: none;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.2s;
                flex-shrink: 0;
            }
            .force-btn:hover {
                transform: scale(1.1);
                background: var(--success);
            }
            .upload-area:hover, .upload-area.drag-over {
                border-color: var(--primary) !important;
                background: var(--bg-tertiary) !important;
                transform: scale(1.01);
            }
            @media (max-width: 1100px) {
                .pr-admin-view > div:nth-child(2) {
                    grid-template-columns: 1fr !important;
                }
            }
        </style>
    `;

    loadPrSettings();
    initPrUploadEvents();

    // Start polling if not already started
    if (prPollInterval) clearInterval(prPollInterval);
    prPollInterval = setInterval(fetchPrState, 2000);
}

// Ensure polling stops when leaving view
const originalNavigateTo = window.navigateTo;
window.navigateTo = function(view) {
    if (view !== 'pr-admin' && prPollInterval) {
        clearInterval(prPollInterval);
        prPollInterval = null;
    }
    originalNavigateTo(view);
}

async function loadPrSettings() {
    try {
        const res = await fetch('/api/pr/settings');
        prCurrentSettings = await res.json();

        // Populate Form
        document.getElementById('company-date').value = prCurrentSettings.safetyStats?.company?.lastAccidentDate || '';
        document.getElementById('company-target').value = prCurrentSettings.safetyStats?.company?.targetDays || '';
        document.getElementById('dept-date').value = prCurrentSettings.safetyStats?.department?.lastAccidentDate || '';
        document.getElementById('dept-target').value = prCurrentSettings.safetyStats?.department?.targetDays || '';

        document.getElementById('slide-interval').value = prCurrentSettings.displaySettings?.slideInterval || 10;
        document.getElementById('show-clock').checked = prCurrentSettings.displaySettings?.showClock !== false;
        document.getElementById('show-safety').checked = prCurrentSettings.displaySettings?.showSafety !== false;

        renderPrMediaList(prCurrentSettings.media || []);
    } catch (err) {
        console.error('Failed to load PR settings', err);
    }
}

function renderPrMediaList(mediaList) {
    const container = document.getElementById('media-list');
    const countBadge = document.getElementById('media-count-badge');
    if (!container) return;

    if (countBadge) countBadge.textContent = `${mediaList.length} รายการ`;

    if (mediaList.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-tertiary); padding: 3rem; background: var(--bg-secondary); border-radius: 12px; border: 1px dashed var(--border-color);">ยังไม่มีสื่อประชาสัมพันธ์</div>';
        return;
    }

    container.innerHTML = mediaList.map((item, index) => `
        <div class="media-item" id="admin-slide-${index}" style="position: relative; border-radius: 12px; overflow: hidden; background: var(--bg-secondary); border: 1px solid var(--border-color); min-width: 0;">
            <div class="playing-badge"><i class="fa-solid fa-circle-play fa-beat"></i> กำลังแสดง</div>
            
            <div style="aspect-ratio: 16/9; overflow: hidden; background: #000;">
                ${item.type === 'video'
                    ? `<video class="media-preview" src="${item.url}#t=1" style="width: 100%; height: 100%; object-fit: cover;"></video>`
                    : `<img class="media-preview" src="${item.url}" style="width: 100%; height: 100%; object-fit: cover;">`
                }
            </div>

            <div style="position: absolute; top: 0.5rem; right: 0.5rem; z-index: 2;">
               ${item.type === 'video' ? '<span class="badge badge-info" style="box-shadow: 0 2px 4px rgba(0,0,0,0.2);"><i class="fa-solid fa-video"></i> Video</span>' : ''}
            </div>

            <div class="media-info" style="padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; background: var(--bg-primary); min-width: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; min-width: 0; width: 100%;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.85rem;" title="${item.filename}">${item.filename}</div>
                        <div style="font-size: 0.7rem; color: var(--text-tertiary);">${item.type === 'video' ? 'วิดีโอ MP4' : 'รูปภาพ'}</div>
                    </div>
                    <div style="display: flex; gap: 0.5rem; margin-left: 0.5rem; flex-shrink: 0;">
                        <button class="force-btn" onclick="forcePrSlide(${index})" title="แสดงทันทีบนจอ TV"><i class="fa-solid fa-bolt"></i></button>
                        <button class="btn btn-danger btn-sm" style="width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 50%; flex-shrink: 0;" onclick="deletePrMedia('${item.id}')" title="ลบ">
                            <i class="fa-solid fa-trash-can" style="font-size: 0.8rem;"></i>
                        </button>
                    </div>
                </div>
                ${item.type !== 'video' ? `
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; border-top: 1px solid var(--border-color); padding-top: 0.5rem;">
                    <span style="color: var(--text-secondary);">เวลาแสดงผล (วิ):</span>
                    <input type="number" min="1" value="${item.duration || prCurrentSettings.displaySettings?.slideInterval || 10}" 
                           onchange="updatePrMediaDuration('${item.id}', this.value)" 
                           style="width: 60px; padding: 0.2rem; border: 1px solid var(--border-color); border-radius: 4px; text-align: center; background: var(--bg-primary); color: var(--text-primary);">
                </div>
                ` : ''}
            </div>
        </div>
    `).join('');

    fetchPrState();
}

async function savePrSettings(e) {
    e.preventDefault();

    const newSettings = {
        safetyStats: {
            company: {
                lastAccidentDate: document.getElementById('company-date').value,
                targetDays: parseInt(document.getElementById('company-target').value) || 0
            },
            department: {
                lastAccidentDate: document.getElementById('dept-date').value,
                targetDays: parseInt(document.getElementById('dept-target').value) || 0
            }
        },
        displaySettings: {
            slideInterval: parseInt(document.getElementById('slide-interval').value) || 10,
            showClock: document.getElementById('show-clock').checked,
            showSafety: document.getElementById('show-safety').checked
        }
    };

    try {
        const res = await fetch('/api/pr/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings)
        });
        if (res.ok) {
            alert('บันทึกการตั้งค่าสื่อประชาสัมพันธ์เรียบร้อย');
            loadPrSettings(); 
        } else {
            alert('บันทึกไม่สำเร็จ');
        }
    } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการบันทึก');
    }
}

function handlePrFiles(files) {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    
    const uploadArea = document.getElementById('pr-drop-zone');
    if (!uploadArea) return;

    const originalContent = uploadArea.innerHTML;
    uploadArea.innerHTML = `
        <div style="padding: 1rem;">
            <i class="fa-solid fa-spinner fa-spin fa-2x" style="color: var(--primary); margin-bottom: 1rem;"></i>
            <p style="font-weight: 600; color: var(--text-primary);">กำลังอัปโหลด ${fileList.length} ไฟล์...</p>
        </div>
    `;
    uploadArea.style.pointerEvents = 'none';

    const uploadPromises = fileList.map(file => uploadPrFile(file));

    Promise.all(uploadPromises).finally(() => {
        uploadArea.innerHTML = originalContent;
        uploadArea.style.pointerEvents = 'auto';
        loadPrSettings(); 
    });
}

async function uploadPrFile(file) {
    if (file.size > 50 * 1024 * 1024) {
        alert(`ไฟล์ ${file.name} มีขนาดใหญ่เกินไป (สูงสุด 50MB)`);
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch('/api/pr/upload', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const error = await res.json();
            alert(`อัปโหลด ${file.name} ไม่สำเร็จ: ${error.message || 'Error'}`);
        }
    } catch (err) {
        console.error(err);
        alert(`เกิดข้อผิดพลาดในการอัปโหลด ${file.name}`);
    }
}

async function deletePrMedia(id) {
    if (!confirm('ต้องการลบสื่อนี้ใช่หรือไม่?')) return;

    try {
        const res = await fetch(`/api/pr/media/${id}`, { method: 'DELETE' });
        if (res.ok) {
            await loadPrSettings();
        } else {
            alert('ลบไม่สำเร็จ');
        }
    } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการลบ');
    }
}

async function updatePrMediaDuration(id, newDuration) {
    try {
        const res = await fetch(`/api/pr/media/${id}/duration`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ duration: parseInt(newDuration) || 10 })
        });
        if (!res.ok) {
            alert('อัปเดตเวลาไม่สำเร็จ');
        }
    } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการอัปเดตเวลา');
    }
}

async function fetchPrState() {
    if (AppState.currentView !== 'pr-admin') return;
    try {
        const res = await fetch('/api/pr/state');
        if (res.ok) {
            const state = await res.json();
            updatePrActiveSlideUI(state.currentSlideIndex);
        }
    } catch (err) { }
}

function updatePrActiveSlideUI(index) {
    document.querySelectorAll('#media-list .media-item').forEach((el, i) => {
        if (i === index) el.classList.add('active-slide');
        else el.classList.remove('active-slide');
    });
}

async function forcePrSlide(index) {
    try {
        updatePrActiveSlideUI(index);
        const res = await fetch('/api/pr/state/force', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index })
        });
        if (!res.ok) alert('การส่งคำสั่งขัดข้อง');
    } catch (err) {
        console.error('Failed to force slide', err);
    }
}

function initPrUploadEvents() {
    const dropZone = document.getElementById('pr-drop-zone');
    if (!dropZone) return;

    // Drag and Drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
    });

    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        handlePrFiles(files);
    }, false);

    // Paste events (Global but restricted to current view)
    if (!window._prPasteHandler) {
        window._prPasteHandler = (e) => {
            if (AppState.currentView !== 'pr-admin') return;
            
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            const files = [];
            for (const item of items) {
                if (item.kind === 'file') {
                    files.push(item.getAsFile());
                }
            }
            if (files.length > 0) {
                handlePrFiles(files);
            }
        };
        document.addEventListener('paste', window._prPasteHandler);
    }
}
