import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listAnnouncements, createAnnouncement, deleteAnnouncement } from '../src/announcement-service.js';

test('announcements service CRUD operations', async () => {
  const store = {
    announcements: [],
    image_ops: [],
    settings: {
      company_zero_accident_days: 1062,
      company_target_days: 1200,
      dept_zero_accident_days: 3664,
      dept_target_days: 3802,
      slide_interval_seconds: 60,
      show_clock: 1,
      show_safety: 1
    }
  };

  const mockDb = {
    prepare(query) {
      const stmt = {
        async all() {
          if (query.includes('FROM announcements')) {
            return { results: store.announcements };
          }
          if (query.includes('FROM announcement_settings')) {
            return { results: [store.settings] };
          }
          return { results: [] };
        },
        async first() {
          if (query.includes('FROM announcements')) {
            return store.announcements[0] || null;
          }
          if (query.includes('FROM announcement_settings')) {
            return store.settings;
          }
          if (query.includes('FROM image_operations')) {
            return store.image_ops[0] || null;
          }
          return null;
        },
        async run() {
          return { success: true };
        },
        bind(...args) {
          return {
            async all() {
              if (query.includes('FROM announcements')) {
                return { results: store.announcements };
              }
              if (query.includes('FROM announcement_settings')) {
                return { results: [store.settings] };
              }
              return { results: [] };
            },
            async first() {
              if (query.includes('FROM announcements')) {
                const id = args[0];
                return store.announcements.find(a => a.id === id) || null;
              }
              if (query.includes('FROM image_operations')) {
                return store.image_ops[0] || null;
              }
              return null;
            },
            async run() {
              if (query.includes('INSERT INTO announcements')) {
                store.announcements.push({
                  id: args[0],
                  title: args[1],
                  media_type: args[2],
                  file_id: args[3],
                  file_name: args[4],
                  file_url: args[5],
                  sort_order: args[6],
                  is_active: args[7]
                });
              } else if (query.includes('INSERT OR IGNORE INTO image_operations')) {
                store.image_ops.push({
                  id: args[0],
                  request_key: args[1],
                  slot: args[2],
                  folder_id: args[3],
                  file_id: args[4],
                  file_name: args[5],
                  mime_type: args[6],
                  payload_hash: args[7]
                });
              } else if (query.includes('DELETE FROM announcements')) {
                const id = args[0];
                store.announcements = store.announcements.filter(a => a.id !== id);
              }
              return { success: true };
            }
          };
        }
      };
      return stmt;
    }
  };

  const mockEnv = {
    DB: mockDb,
    ANNOUNCEMENT_FOLDER_ID: '1HH9TL8_Z3dzXrA8O-0Gx9ajq5Z2wj-h8',
    MAINTENANCE_MODE: 'false',
    GOOGLE_CLIENT_ID: 'mock_client_id',
    GOOGLE_CLIENT_SECRET: 'mock_client_secret',
    GOOGLE_REFRESH_TOKEN: 'mock_refresh_token'
  };

  const mockUser = { id: 'usr_1', username: 'admin', role: 'admin', can_delete: 1 };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes('/drive/v3/files/drive_id_123')) {
      return { ok: false, status: 404, json: async () => ({}) };
    }
    if (url.includes('oauth2') || url.includes('googleapis')) {
      return {
        ok: true,
        json: async () => ({ access_token: 'mock_token', expires_in: 3600, ids: ['drive_id_123'] }),
        arrayBuffer: async () => new ArrayBuffer(8)
      };
    }
    return originalFetch ? originalFetch(url) : { ok: true, json: async () => ({}) };
  };
  const createRes = await createAnnouncement(
    mockEnv,
    mockUser,
    {
      title: 'test-video.mp4',
      mediaType: 'video',
      image: { name: 'test-video.mp4', mime: 'video/mp4', bytes: 'AAAAAA==' }
    },
    'req_1'
  );

  assert.equal(createRes.title, 'test-video.mp4');
  assert.equal(store.announcements.length, 1);

  // 2. List announcements
  const listRes = await listAnnouncements(mockEnv);
  assert.equal(listRes.items.length, 1);
  assert.equal(listRes.settings.company_target_days, 1200);

  // 3. Delete announcement
  const deleteRes = await deleteAnnouncement(
    mockEnv,
    mockUser,
    store.announcements[0].id
  );

  assert.equal(deleteRes.success, true);
  assert.equal(store.announcements.length, 0);
});
