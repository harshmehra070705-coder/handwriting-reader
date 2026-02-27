import os
from flask import Flask, render_template, request, jsonify
from google import genai

app = Flask(__name__)

# ✅ Gemini Client Setup
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    
    image = request.files['image']
    image_data = image.read()

    response = client.models.generate_content(
        model="gemini-1.5-flash",
        contents=[
            "Read the handwriting in this image and return the text exactly as written.",
            {
                "mime_type": image.content_type,
                "data": image_data
            }
        ]
    )

    return jsonify({'text': response.text})

if __name__ == '__main__':
    app.run(debug=True)