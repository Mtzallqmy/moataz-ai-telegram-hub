# File processing

`POST /api/v1/files` accepts up to ten files, applies configurable size limits, an allow-list, dangerous-extension rejection and magic-byte checks for critical formats. Internal names are UUIDs under `{userId}/{date}/`; original names are metadata only. Files use private Storage buckets.

TXT, Markdown, CSV and JSON extraction/chunking is implemented inline. PDF, DOCX, XLSX, PPTX, image OCR, audio transcription and video audio extraction create queued `file_processing_jobs`; no background worker is claimed in this phase. Production must connect that abstraction to a queue/worker and antivirus service before enabling broad uploads.
