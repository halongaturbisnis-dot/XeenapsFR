
/**
 * XEENAPS PKM - GLOBAL CONFIGURATION
 */
const CONFIG = {
  FOLDERS: {
    MAIN_LIBRARY: '1CUvptRGnncn0M-vZdLCb1XBUmAeM9G8B'
  },
  STORAGE: {
    THRESHOLD: 5 * 1024 * 1024 * 1024, // 5 GB in bytes
    CRITICAL_THRESHOLD: 2 * 1024 * 1024 * 1024, // 2 GB for Link/Ref
    REGISTRY_SHEET: 'StorageNodes'
  },
  SPREADSHEETS: {
    KEYS: '1Ji8XL2ceTprNa1dYvhfTnMDkWwzC937kpfyP19D7NvI',
    AI_CONFIG: '1RVYM2-U5LRb8S8JElRSEv2ICHdlOp9pnulcAM8Nd44s',
    STORAGE_REGISTRY: '1qBzgjhUv_aAFh5cLb8SqIt83bOdUFRfRXZz4TxyEZDw',
    SHARBOX: '17oCBcTIkdq4zqY0RtlzgiFR2dk9vzq1wLZhQ2tiQTqc'
  },
  SCHEMAS: {
    SHARBOX_INBOX: [
      'id', 'senderName', 'senderPhotoUrl', 'senderAffiliation', 'senderUniqueAppId', 'senderEmail', 'senderPhone', 'senderSocialMedia', 'message', 'timestamp', 'status', 'isRead',
      'id_item', 'title', 'type', 'category', 'topic', 'subTopic', 'authors', 'publisher', 'year', 'fullDate', 'pubInfo', 'identifiers', 'source', 'format', 'url', 'fileId', 'imageView', 'youtubeId', 'tags', 'abstract', 'mainInfo', 'extractedJsonId', 'insightJsonId', 'storageNodeUrl', 'isFavorite', 'isBookmarked', 'createdAt', 'updatedAt', 'supportingReferences'
    ],
    SHARBOX_SENT: [
      'id', 'receiverName', 'receiverPhotoUrl', 'receiverUniqueAppId', 'receiverEmail', 'receiverPhone', 'receiverSocialMedia', 'message', 'timestamp', 'status',
      'id_item', 'title', 'type', 'category', 'topic', 'subTopic', 'authors', 'publisher', 'year', 'fullDate', 'pubInfo', 'identifiers', 'source', 'format', 'url', 'fileId', 'imageView', 'youtubeId', 'tags', 'abstract', 'mainInfo', 'extractedJsonId', 'insightJsonId', 'storageNodeUrl', 'isFavorite', 'isBookmarked', 'createdAt', 'updatedAt', 'supportingReferences'
    ]
  }
};
