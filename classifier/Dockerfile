FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -c "from transformers import CLIPModel, CLIPProcessor; m='openai/clip-vit-base-patch32'; CLIPModel.from_pretrained(m); CLIPProcessor.from_pretrained(m)"
COPY app.py .
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]