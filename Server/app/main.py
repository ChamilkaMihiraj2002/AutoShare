from fastapi import FastAPI

# Create an instance of the FastAPI class
app = FastAPI(title="My Awesome API")

@app.get("/")
def read_root():
    """A simple root endpoint that returns a welcome message."""
    return {"message": "Hello, FastAPI with Docker!"}

@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    """An endpoint with a path parameter and an optional query parameter."""
    return {"item_id": item_id, "q": q}