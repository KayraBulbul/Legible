from fastapi import APIRouter

from api.routes import auth, health, saved_pages

router = APIRouter()
router.include_router(health.router)
router.include_router(auth.router)
router.include_router(saved_pages.router)
