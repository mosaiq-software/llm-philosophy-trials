from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import uvicorn

from app.routes import router

app = FastAPI()
app.include_router(router)
app.mount("/", StaticFiles(directory=".", check_dir=True), name="static")


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
