
Write-Host "Installing Crowd Analysis Backend Dependencies..." -ForegroundColor Cyan
Write-Host ""

Write-Host "Installing OpenCV..." -ForegroundColor Yellow
pip install opencv-python==4.5.4.58

Write-Host "Installing imutils..." -ForegroundColor Yellow
pip install imutils==0.5.4

Write-Host "Installing NumPy..." -ForegroundColor Yellow
pip install numpy==1.19.5

Write-Host "Installing Flask and Flask-CORS..." -ForegroundColor Yellow
pip install Flask==2.0.2
pip install Flask-CORS==3.0.10

Write-Host "Installing TensorFlow..." -ForegroundColor Yellow
pip install tensorflow==2.6.2

Write-Host "Installing other dependencies..." -ForegroundColor Yellow
pip install scipy==1.5.4
pip install pandas==1.1.5
pip install matplotlib==3.3.4

Write-Host ""
Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Make sure YOLOv4-tiny weights are in the YOLOv4-tiny folder"
Write-Host "2. Run: python api_server.py"
Write-Host ""
