# Amber: Add File Upload Endpoint

## Context

Amber is Grove's storage management service (R2-backed). The Worker API is 95% complete with list, download, delete, trash, restore, and export operations. The critical missing piece is **file upload**.

The Grove CLI (`@groveengine/cli`) needs to upload files via `grove amber upload <file>`.

## Requirements

### New API Endpoints

```
POST /api/storage/files
  Content-Type: multipart/form-data
  Body: {
    file: <binary>,
    path: "optional/prefix/path",
    metadata: { ... }  // optional JSON
  }
  Response: {
    id: "file-uuid",
    key: "tenant/path/filename.ext",
    size: 12345,
    contentType: "image/png",
    url: "https://amber.grove.place/...",
    createdAt: "2026-01-19T..."
  }

POST /api/storage/presign
  Request: { key, operation: "put" | "get", expiresIn?: 3600 }
  Response: {
    url: "https://r2-presigned-url...",
    expiresAt: "2026-01-19T..."
  }
```

### Implementation Details

1. **Multipart parsing**: Use Cloudflare's built-in request.formData()
2. **File validation**:
   - Max size: 100MB (configurable per tier)
   - Allowed MIME types: images, documents, common files
   - Block executables (.exe, .sh, etc.)
3. **Path handling**:
   - Prefix with tenant ID: `{tenantId}/{userPath}/{filename}`
   - Generate unique filename if collision
4. **R2 upload**: Use env.R2_BUCKET.put()
5. **D1 tracking**: Insert into files table with metadata
6. **Quota enforcement**: Check user's storage quota before upload

### Presigned URLs

For large files or direct browser uploads:
- Generate presigned PUT URL for client-side upload
- Validate upload completion via webhook or polling
- More efficient for large files (no Worker memory pressure)

## Existing Code Context

The Worker already has:
- `GET /api/storage/files` - List files
- `GET /api/storage/files/:id` - Get file metadata
- `DELETE /api/storage/files/:id` - Move to trash
- `GET /api/storage/download/:key` - Download file

Follow the existing patterns for auth, error handling, and response formatting.

## Success Criteria

- [ ] `POST /api/storage/files` accepts multipart upload
- [ ] Files stored in R2 with correct key structure
- [ ] File metadata tracked in D1
- [ ] Quota enforcement working
- [ ] Returns proper error for oversized/invalid files
- [ ] (Bonus) Presigned URL endpoint working
