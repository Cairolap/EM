// Media Announcements Management Logic
(function() {
  let announcementsList = [];

  function init() {
    loadAnnouncementsData();
    setupUploadHandlers();
    setupSettingsForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  async function loadAnnouncementsData() {
    try {
      const res = await callRPC('announcements.list');
      if (res && (res.success || res.items || res.announcements)) {
        announcementsList = res.announcements || res.items || [];
        renderMediaGrid();
        populateSettingsForm(res.settings || {});
      } else {
        showToast(res?.error || 'ไม่สามารถโหลดข้อมูลสื่อประชาสัมพันธ์ได้');
      }
    } catch (err) {
      console.error('Load announcements error:', err);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  }

  function renderMediaGrid() {
    const grid = document.getElementById('media-grid');
    const countLabel = document.getElementById('media-count-label');
    
    countLabel.textContent = `${announcementsList.length} รายการ`;
    grid.innerHTML = '';

    if (announcementsList.length === 0) {
      grid.innerHTML = '<div class="loading-state">ยังไม่มีสื่อประชาสัมพันธ์ ให้ลากหรือเลือกไฟล์มาอัปโหลด</div>';
      return;
    }

    announcementsList.forEach((item) => {
      const card = document.createElement('div');
      card.className = `media-card ${item.is_active ? 'is-active' : ''}`;
      
      const mediaUrl = `/api/v1/announcements/media/${item.id}`;
      const isVideo = item.media_type === 'video';

      const previewHtml = isVideo
        ? `<video src="${mediaUrl}" muted preload="metadata"></video>`
        : `<img src="${mediaUrl}" alt="${escapeHtml(item.title)}" loading="lazy">`;

      const typeBadge = isVideo
        ? `<span class="media-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg> Video</span>`
        : `<span class="media-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg> Image</span>`;

      card.innerHTML = `
        <div class="media-preview-box">
          ${previewHtml}
          ${typeBadge}
        </div>
        <div class="media-card-body">
          <div class="media-filename" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
          <div class="media-meta">${formatFileSize(item.file_size)} • ${isVideo ? 'MP4' : 'JPG/PNG'}</div>
          <div class="media-actions">
            <button class="btn-icon btn-toggle-active ${item.is_active ? 'active' : ''}" data-id="${item.id}" title="${item.is_active ? 'แสดงผลอยู่ (คลิกเพื่อปิด)' : 'ซ่อนอยู่ (คลิกเพื่อเปิด)'}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            </button>
            <button class="btn-icon btn-delete" data-id="${item.id}" title="ลบไฟล์ออกจาก Google Drive">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      `;

      // Event listeners
      card.querySelector('.btn-toggle-active').addEventListener('click', () => toggleMediaActive(item));
      card.querySelector('.btn-delete').addEventListener('click', () => deleteMedia(item));

      grid.appendChild(card);
    });
  }

  function populateSettingsForm(settings) {
    document.getElementById('company_last_incident').value = settings.company_last_incident || '2023-10-28';
    document.getElementById('company_target_days').value = settings.company_target_days || 1200;
    document.getElementById('dept_last_incident').value = settings.dept_last_incident || '2016-09-12';
    document.getElementById('dept_target_days').value = settings.dept_target_days || 3802;
    document.getElementById('slide_interval_sec').value = settings.slide_interval_sec || 60;
    document.getElementById('show_clock').checked = settings.show_clock !== undefined ? Boolean(settings.show_clock) : true;
    document.getElementById('show_safety').checked = settings.show_safety !== undefined ? Boolean(settings.show_safety) : true;
  }

  function setupUploadHandlers() {
    const dropzone = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('file-input');

    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileUpload(e.target.files[0]);
        fileInput.value = '';
      }
    });

    window.addEventListener('paste', (e) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        handleFileUpload(e.clipboardData.files[0]);
      }
    });
  }

  async function handleFileUpload(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4'];
    if (!allowedTypes.includes(file.type)) {
      showToast('รองรับเฉพาะไฟล์ JPG, PNG และ MP4 เท่านั้น');
      return;
    }

    const progressContainer = document.getElementById('upload-progress-container');
    const progressFill = document.getElementById('upload-progress-fill');

    progressContainer.style.display = 'block';
    progressFill.style.width = '20%';

    try {
      const reader = new FileReader();
      reader.onload = async function() {
        try {
          const base64Data = reader.result;
          progressFill.style.width = '60%';

          const isVideo = file.type.startsWith('video/');
          const mediaType = isVideo ? 'video' : 'image';

          const rawBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
          const res = await callRPC('announcements.create', {
            title: file.name,
            media_type: mediaType,
            mediaType: mediaType,
            mime_type: file.type,
            file_size: file.size,
            image: {
              mime: file.type,
              base64: rawBase64
            }
          });

          progressFill.style.width = '100%';
          setTimeout(() => {
            progressContainer.style.display = 'none';
            progressFill.style.width = '0%';
          }, 500);

          if (res && res.success) {
            showToast('อัปโหลดไฟล์ไปยัง Google Drive สำเร็จ');
            loadAnnouncementsData();
          } else {
            showToast(res?.error || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
          }
        } catch (err) {
          console.error('Upload error:', err);
          progressContainer.style.display = 'none';
          progressFill.style.width = '0%';
          showToast(err.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Upload file error:', err);
      progressContainer.style.display = 'none';
      showToast('ไม่สามารถอ่านไฟล์ได้');
    }
  }

  async function toggleMediaActive(item) {
    try {
      const newActive = item.is_active ? 0 : 1;
      const res = await callRPC('announcements.updateSettings', {
        media_id: item.id,
        is_active: newActive
      });
      if (res && res.success) {
        showToast(newActive ? 'เปิดการแสดงผลสื่อนี้แล้ว' : 'ปิดการแสดงผลสื่อนี้แล้ว');
        loadAnnouncementsData();
      } else {
        showToast(res.error || 'ไม่สามารถอัปเดตสถานะได้');
      }
    } catch (err) {
      console.error('Toggle active error:', err);
      showToast('เกิดข้อผิดพลาดในการสื่อสาร');
    }
  }

  async function deleteMedia(item) {
    if (!confirm(`คุณต้องการลบสื่อ "${item.title}" ออกจากระบบและ Google Drive ใช่หรือไม่?`)) {
      return;
    }

    try {
      const res = await callRPC('announcements.delete', { id: item.id });
      if (res && res.success) {
        showToast('ลบไฟล์สื่อและลบจาก Google Drive สำเร็จ');
        loadAnnouncementsData();
      } else {
        showToast(res.error || 'ไม่สามารถลบสื่อได้');
      }
    } catch (err) {
      console.error('Delete media error:', err);
      showToast('เกิดข้อผิดพลาดในการลบไฟล์');
    }
  }

  function setupSettingsForm() {
    const form = document.getElementById('form-settings');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const payload = {
        settings: {
          company_last_incident: document.getElementById('company_last_incident').value,
          company_target_days: Number(document.getElementById('company_target_days').value),
          dept_last_incident: document.getElementById('dept_last_incident').value,
          dept_target_days: Number(document.getElementById('dept_target_days').value),
          slide_interval_sec: Number(document.getElementById('slide_interval_sec').value),
          show_clock: document.getElementById('show_clock').checked ? 1 : 0,
          show_safety: document.getElementById('show_safety').checked ? 1 : 0
        }
      };

      try {
        const res = await callRPC('announcements.updateSettings', payload);
        if (res && res.success) {
          showToast('บันทึกการตั้งค่าทั้งหมดเรียบร้อยแล้ว');
        } else {
          showToast(res.error || 'ไม่สามารถบันทึกการตั้งค่าได้');
        }
      } catch (err) {
        console.error('Save settings error:', err);
        showToast('เกิดข้อผิดพลาดในการบันทึกการตั้งค่า');
      }
    });
  }

  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3500);
  }

  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();
