# Start from an official Python base image
FROM python:3.14-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install the Python dependencies
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy your application code (the 'app' folder) into the container's /app folder
COPY ./app /app

# Expose the port the app will run on
EXPOSE 8000

#
# Command to run the application
# uvicorn: The ASGI server
# app.main: The file 'main.py' inside the 'app' folder
# app: The 'app = FastAPI()' object inside 'main.py'
# --host 0.0.0.0: Makes the server accessible from outside the container
# --port 8000: The port to run on (matches EXPOSE)
#
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]