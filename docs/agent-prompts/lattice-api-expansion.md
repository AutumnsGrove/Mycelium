# Lattice: Expand Blog API for CLI Integration

## Context

Lattice is Grove's core blog platform at `grove.place`. The current API is basic CRUD only. The Grove CLI (`@groveengine/cli`) needs a more comprehensive API for full blog management.

## Current API (Exists)

```
POST   /api/{tenant}/posts          Create post
GET    /api/{tenant}/posts          List posts
GET    /api/{tenant}/posts/{slug}   Get single post
PUT    /api/{tenant}/posts/{slug}   Update post (full replace)
DELETE /api/{tenant}/posts/{slug}   Delete post
GET    /api/{tenant}/drafts         List drafts
```

## Required Additions

### Post Lifecycle

```
PATCH  /api/{tenant}/posts/{slug}           Partial update
POST   /api/{tenant}/posts/{slug}/publish   Publish draft
POST   /api/{tenant}/posts/{slug}/unpublish Revert to draft
POST   /api/{tenant}/posts/{slug}/schedule  Schedule for future
  Request: { publishAt: "2026-02-01T10:00:00Z" }
```

### Revision History

```
GET    /api/{tenant}/posts/{slug}/revisions
  Response: [{ id, createdAt, summary }, ...]

POST   /api/{tenant}/posts/{slug}/restore
  Request: { revisionId }
```

### Media Management

```
POST   /api/{tenant}/media
  Content-Type: multipart/form-data
  Response: { id, url, alt, size, type }

GET    /api/{tenant}/media
  Query: ?limit=20&offset=0&type=image
  Response: { items: [...], total, hasMore }

DELETE /api/{tenant}/media/{id}

POST   /api/{tenant}/media/{id}/optimize
  Request: { width?, height?, quality? }
```

### Content Organization

```
GET    /api/{tenant}/tags
POST   /api/{tenant}/tags
  Request: { name, slug?, description? }
DELETE /api/{tenant}/tags/{slug}

GET    /api/{tenant}/series
POST   /api/{tenant}/series
  Request: { name, description?, posts: [slugs] }
PUT    /api/{tenant}/series/{id}
DELETE /api/{tenant}/series/{id}
```

### Bulk Operations

```
POST   /api/{tenant}/posts/bulk
  Request: {
    action: "publish" | "unpublish" | "delete" | "tag",
    slugs: ["post-1", "post-2"],
    data?: { tags: ["tag1"] }  // for tag action
  }
```

### Import/Export

```
POST   /api/{tenant}/export
  Request: { format: "json" | "markdown", include?: ["posts", "media"] }
  Response: { jobId } // async job

GET    /api/{tenant}/export/{jobId}
  Response: { status, downloadUrl? }

POST   /api/{tenant}/import
  Content-Type: multipart/form-data (zip file)
  Response: { imported: 10, skipped: 2, errors: [] }
```

## Implementation Priority

1. **High**: publish/unpublish, partial update (PATCH)
2. **Medium**: media upload, tags
3. **Lower**: revisions, series, bulk ops, import/export

## Success Criteria

- [ ] PATCH endpoint for partial updates
- [ ] Publish/unpublish endpoints working
- [ ] Media upload integrated with Amber
- [ ] Tags CRUD working
- [ ] (Bonus) Bulk operations
- [ ] (Bonus) Export functionality
