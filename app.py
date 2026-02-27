import os
from flask import Flask, request, jsonify
import google.generativeai as genai

app = Flask(__name__)

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash')

@app.route('/')
def index():
    # Template ki zarurat nahi — direct HTML return
    return '''
<!DOCTYPE html>
<html>
<head>
    <title>Handwriting Reader</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea, #764ba2);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 600px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 { text-align:center; color:#333; margin-bottom:30px; }
        .upload-area {
            border: 3px dashed #667eea;
            border-radius: 15px;
            padding: 40px;
            text-align: center;
            cursor: pointer;
            margin-bottom: 20px;
        }
        .upload-area:hover { background: #f0f0ff; }
        #preview {
            max-width: 100%;
            max-height: 300px;
            border-radius: 10px;
            display: none;
            margin: 15px auto;
        }
        button {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 18px;
            cursor: pointer;
        }
        button:disabled { opacity:0.5; }
        .result {
            margin-top: 25px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            border-left: 5px solid #667eea;
            display: none;
        }
        .result p { color:#555; line-height:1.8; white-space:pre-wrap; }
        .loading { text-align:center; display:none; margin-top:20px; color:#667eea; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Handwriting Reader</h1>
        <div class="upload-area" onclick="document.getElementById('fileInput').click()">
            <p>Click here to upload image</p>
            <input type="file" id="fileInput" accept="image/*"
                   style="display:none" onchange="previewImage(this)">
            <img id="preview" src="" alt="Preview">
        </div>
        <button id="analyzeBtn" onclick="analyzeImage()" disabled>
            Read Handwriting
        </button>
        <div class="loading" id="loading">Reading... please wait...</div>
        <div class="result" id="result">
            <h3>Extracted Text:</h3>
            <p id="resultText"></p>
        </div>
    </div>
    <script>
        function previewImage(input) {
            const file = input.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('preview').src = e.target.result;
                    document.getElementById('preview').style.display = 'block';
                    document.getElementById('analyzeBtn').disabled = false;
                }
                reader.readAsDataURL(file);
            }
        }
        async function analyzeImage() {
            const fileInput = document.getElementById('fileInput');
            const file = fileInput.files[0];
            if (!file) { alert('Upload image first!'); return; }
            const formData = new FormData();
            formData.append('image', file);
            document.getElementById('loading').style.display = 'block';
            document.getElementById('result').style.display = 'none';
            document.getElementById('analyzeBtn').disabled = true;
            try {
                const response = await fetch('/analyze', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                document.getElementById('resultText').textContent =
                    data.error ? 'Error: ' + data.error : data.text;
                document.getElementById('result').style.display = 'block';
            } catch (error) {
                document.getElementById('resultText').textContent = 'Error: ' + error.message;
                document.getElementById('result').style.display = 'block';
            }
            document.getElementById('loading').style.display = 'none';
            document.getElementById('analyzeBtn').disabled = false;
        }
    </script>
</body>
</html>
'''

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
