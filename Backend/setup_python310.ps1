# Setup Python 3.10 Virtual Environment
# Run this script to create and activate Python 3.10 environment

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Python 3.10 Environment Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Remove old venv if exists
if (Test-Path "venv") {
    Write-Host "Removing old virtual environment..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force venv
}

# Step 2: Create new venv with Python 3.10
Write-Host "Creating virtual environment with Python 3.10..." -ForegroundColor Green
py -3.10 -m venv venv

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to create virtual environment!" -ForegroundColor Red
    Write-Host "Make sure Python 3.10 is installed." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Virtual environment created!" -ForegroundColor Green
Write-Host ""

# Step 3: Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Green
& .\venv\Scripts\Activate.ps1

# Step 4: Verify Python version
Write-Host ""
Write-Host "Verifying Python version..." -ForegroundColor Cyan
python --version

# Step 5: Upgrade pip
Write-Host ""
Write-Host "Upgrading pip..." -ForegroundColor Green
python -m pip install --upgrade pip

# Step 6: Install critical dependencies
Write-Host ""
Write-Host "Installing dependencies (this may take a few minutes)..." -ForegroundColor Green
Write-Host ""

Write-Host "Installing OpenCV..." -ForegroundColor Yellow
pip install opencv-python==4.5.4.58

Write-Host "Installing NumPy..." -ForegroundColor Yellow
pip install numpy==1.19.5

Write-Host "Installing Flask..." -ForegroundColor Yellow
pip install Flask==2.0.2 Flask-CORS==3.0.10

Write-Host "Installing imutils..." -ForegroundColor Yellow
pip install imutils==0.5.4

Write-Host "Installing scipy..." -ForegroundColor Yellow
pip install scipy==1.5.4

Write-Host "Installing pandas..." -ForegroundColor Yellow 
pip install pandas==1.1.5

Write-Host "Installing matplotlib..." -ForegroundColor Yellow
pip install matplotlib==3.3.4

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Make sure you see (venv) in your prompt" -ForegroundColor White
Write-Host "2. Run: python api_server.py" -ForegroundColor White
Write-Host ""
Write-Host "If you close this terminal, activate venv again with:" -ForegroundColor Yellow
Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host ""
