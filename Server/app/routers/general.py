from fastapi import APIRouter

router = APIRouter(tags=["General"])

@router.get("/")
def read_root():
    """
    A public endpoint that anyone can access.
    """
    return {"message": "Welcome! This is a public endpoint."}