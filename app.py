import os
from flask import Flask, render_template, request, jsonify
import google.generativeai as genai

app = Flask(__name__)

# ✅ API key environment variable se lega (secure way)
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

model = genai.GenerativeModel('gemini-1.5-flash')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    
    image = request.files['image']
    image_data = image.read()
    
    response = model.generate_content([
        "Read the handwriting in this image and return the text",
        {"mime_type": image.content_type, "data": image_data}
    ])
    
    return jsonify({'text': response.text})

if __name__ == '__main__':
    app.run(debug=True)
