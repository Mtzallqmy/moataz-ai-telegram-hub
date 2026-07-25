# RAG architecture

Extracted content is normalized into `file_extracted_contents` and overlapping `file_chunks`. The migration enables pgvector and provides a 1536-dimensional embedding column plus an HNSW cosine index.

Planned retrieval pipeline: ownership check → query embedding adapter → semantic search restricted to the user/conversation → token-budgeted context builder → citation builder → model request. Retrieved text is data, never a system instruction. Tool execution is disabled for instructions discovered inside documents. Embedding generation and semantic retrieval are deliberately not enabled until an embeddings provider and worker are configured.
