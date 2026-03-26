"""
RoxyMail — MongoDB Database Client
Motor async driver with index creation on startup.
"""

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING
from app.config import settings

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    """Connect to MongoDB and create indexes."""
    global client, db
    try:
        client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
        )
        db = client[settings.MONGODB_DB_NAME]

        # Verify connection
        await client.admin.command("ping")

        # Create indexes
        # Users
        await db.users.create_index("email", unique=True)
        await db.users.create_index("expires_at", expireAfterSeconds=0)

        # Messages
        await db.messages.create_index(
            [("user_id", ASCENDING), ("received_at", DESCENDING)]
        )
        await db.messages.create_index("message_id", unique=True)
        await db.messages.create_index("expires_at", expireAfterSeconds=0)

        # Refresh tokens
        await db.refresh_tokens.create_index("expires_at", expireAfterSeconds=0)

        print("✅ MongoDB connected and indexes created")
    except Exception as e:
        print(f"⚠️ MongoDB connection failed: {e}")
        print("⚠️ App will start but database operations will fail until MongoDB is available")
        # Still set client and db so the app can start
        if client is None:
            client = AsyncIOMotorClient(settings.MONGODB_URI)
            db = client[settings.MONGODB_DB_NAME]


async def close_db():
    """Close the MongoDB connection."""
    global client
    if client:
        client.close()
        print("🔌 MongoDB connection closed")


def get_db():
    """Get the database instance."""
    return db
