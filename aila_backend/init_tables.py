from database import Base, engine
import models  # Changed from 'from models import *'

# Create all tables
Base.metadata.create_all(bind=engine)
print("✅ All tables created successfully!")
