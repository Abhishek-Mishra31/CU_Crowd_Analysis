import { useState, useRef, useEffect } from 'react'
import './index.css'

const API_BASE_URL = 'http://localhost:5000/api'

interface AnalysisResult {
  video_data: {
    IS_CAM: boolean
    VID_FPS: number
    PROCESSED_FRAME_SIZE: number
    START_TIME: string
    END_TIME: string
  }
  crowd_data: Array<{
    Time: string
    'Human Count': string
    'Social Distance violate': string
    'Restricted Entry': string
    'Abnormal Activity': string
  }>
  movement_data: any[]
  summary: {
    max_crowd_count: number
    avg_crowd_count: number
    total_violations: number
    abnormal_activity_detected: boolean
    restricted_entry_detected: boolean
    total_frames_analyzed: number
  }
}

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {

    fetch(`${API_BASE_URL}/health`)
      .then(res => res.json())
      .then(data => console.log('API Status:', data))
      .catch(err => console.error('API not available:', err))
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('video/')) {
      handleFileSelect(file)
    } else {
      setError('Please upload a valid video file')
    }
  }

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setVideoPreview(url)
    setAnalysisResult(null)
    setError(null)
    setUploadedFilename(null)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('video', selectedFile)

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setUploadedFilename(data.filename)
        setIsUploading(false)
        handleAnalyze(data.filename)
      } else {
        throw new Error(data.error || 'Upload failed')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload video')
      setIsUploading(false)
    }
  }

  const handleAnalyze = async (filename?: string) => {
    const fileToAnalyze = filename || uploadedFilename
    if (!fileToAnalyze) return

    setIsAnalyzing(true)
    setError(null)
    setAnalysisProgress(0)


    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 1000)

    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename: fileToAnalyze }),
      })

      const data = await response.json()
      clearInterval(progressInterval)

      if (response.ok) {
        setAnalysisResult(data.data)
        setAnalysisProgress(100)
        setRequestId(data.request_id)
        setTimeout(() => setIsAnalyzing(false), 500)
      } else {
        throw new Error(data.error || 'Analysis failed')
      }
    } catch (err: any) {
      clearInterval(progressInterval)
      setError(err.message || 'Failed to analyze video')
      setIsAnalyzing(false)
      setAnalysisProgress(0)
    }
  }

  const resetAnalysis = () => {
    setSelectedFile(null)
    setVideoPreview(null)
    setAnalysisResult(null)
    setIsAnalyzing(false)
    setIsUploading(false)
    setUploadedFilename(null)
    setError(null)
    setAnalysisProgress(0)
  }

  return (
    <div className="min-h-screen p-4 md:p-8 lg:p-12">

      <header className="text-center mb-12 animate-float mt-16">
        <div className="inline-block">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text tracking-tight">
            Crowd Analysis AI
          </h1>
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>
        </div>
        <p className="text-base md:text-lg text-gray-700 max-w-3xl mx-auto mt-4 font-normal">
          Advanced AI-powered surveillance system using <span className="text-purple-600 font-semibold">YOLOv4-tiny</span> & <span className="text-indigo-600 font-semibold">Deep SORT</span>
        </p>
      </header>

      <div className="max-w-7xl mx-auto space-y-8">

        {error && (
          <div className="glass-card border-red-500/50 p-4 rounded-xl animate-slide-in-up">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <h3 className="text-lg font-semibold text-red-600">Error</h3>
                <p className="text-gray-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}


        <div className="glass-card rounded-2xl p-6 lg:p-8 space-y-5 animate-slide-in-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="text-4xl animate-float">🎬</div>
            <div>
              <h2 className="text-2xl font-bold gradient-text">Upload Video</h2>
              <p className="text-gray-600 text-sm mt-1">Drag & drop or click to browse</p>
            </div>
          </div>

          {!selectedFile ? (
            <div
              className={`upload-zone ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileInput}
                className="hidden"
              />
              <div className="text-center space-y-4 relative z-10">
                <div className="text-6xl pulse-ring">📹</div>
                <div>
                  <p className="text-xl font-semibold mb-2 text-gray-800">Drop your video here</p>
                  <p className="text-gray-600 text-base">or click to browse files</p>
                </div>
                
                {/* <div className="flex justify-center gap-4 text-sm text-gray-500">
                  <span className="px-4 py-2 glass-card rounded-lg">MP4</span>
                  <span className="px-4 py-2 glass-card rounded-lg">AVI</span>
                  <span className="px-4 py-2 glass-card rounded-lg">MOV</span>
                  <span className="px-4 py-2 glass-card rounded-lg">MKV</span>
                </div> */}
                
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {videoPreview && (
                <div className="neon-border rounded-2xl overflow-hidden">
                  <video
                    src={videoPreview}
                    controls
                    className="w-full max-h-80 object-cover"
                  />
                </div>
              )}

              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">📁</span>
                    <div>
                      <p className="font-semibold text-base text-gray-800">{selectedFile.name}</p>
                      <p className="text-sm text-gray-600">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  {uploadedFilename && (
                    <span className="text-2xl">✅</span>
                  )}
                </div>
              </div>

              {isAnalyzing && (
                <div className="glass-card rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="loading-spinner"></div>
                    <div className="flex-1">
                      <p className="font-semibold text-base mb-2 text-gray-800">Analyzing Video...</p>
                      <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 transition-all duration-500"
                          style={{ width: `${analysisProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-400 mt-2">{analysisProgress}% Complete</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                {!uploadedFilename ? (
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <span className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                        Uploading...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <span>⬆️</span> Upload & Analyze
                      </span>
                    )}
                  </button>
                ) : !isAnalyzing && !analysisResult && (
                  <button
                    onClick={() => handleAnalyze()}
                    className="btn-primary flex-1"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span>🚀</span> Start Analysis
                    </span>
                  </button>
                )}

                <button
                  onClick={resetAnalysis}
                  className="px-6 py-3 glass-card rounded-xl hover:bg-white/50 transition-all text-xl neon-glow"
                >
                  🔄
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl p-6 lg:p-8 animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="text-4xl animate-float" style={{ animationDelay: '0.5s' }}>📊</div>
            <div>
              <h2 className="text-2xl font-bold gradient-text">Analysis Results</h2>
              <p className="text-gray-600 text-sm mt-1">Real-time crowd monitoring data</p>
            </div>
          </div>

          {!analysisResult ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
              <div className="text-6xl mb-4 opacity-30 pulse-ring">📈</div>
              <p className="text-lg font-medium text-gray-700">Awaiting analysis...</p>
              <p className="text-gray-600 mt-2 text-sm">Upload a video to see detailed results</p>
            </div>
          ) : (
            <div className="space-y-5">

              <div className="stat-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Peak Crowd Count</p>
                    <p className="text-3xl font-bold gradient-text">
                      {analysisResult.summary.max_crowd_count}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Avg: {analysisResult.summary.avg_crowd_count.toFixed(1)} people
                    </p>
                  </div>
                  <div className="text-5xl opacity-70">👥</div>
                </div>
              </div>


              <div className="stat-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Social Distance Violations</p>
                    <p className="text-3xl font-bold text-yellow-600">
                      {analysisResult.summary.total_violations}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Across {analysisResult.summary.total_frames_analyzed} frames
                    </p>
                  </div>
                  <div className="text-5xl opacity-70">⚠️</div>
                </div>
              </div>

              <div className={`stat-card ${analysisResult.summary.abnormal_activity_detected
                ? 'border-2 border-red-500 neon-glow'
                : 'border-2 border-green-500/30'
                }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Abnormal Activity</p>
                    <p className={`text-xl font-bold ${analysisResult.summary.abnormal_activity_detected
                      ? 'text-red-600'
                      : 'text-green-600'
                      }`}>
                      {analysisResult.summary.abnormal_activity_detected ? 'DETECTED' : 'NONE DETECTED'}
                    </p>
                  </div>
                  <div className="text-5xl opacity-70">
                    {analysisResult.summary.abnormal_activity_detected ? '🚨' : '✅'}
                  </div>
                </div>
              </div>


              <div className={`stat-card ${analysisResult.summary.restricted_entry_detected
                ? 'border-2 border-orange-500 neon-glow'
                : 'border-2 border-green-500/30'
                }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Restricted Entry</p>
                    <p className={`text-xl font-bold ${analysisResult.summary.restricted_entry_detected
                      ? 'text-orange-600'
                      : 'text-green-600'
                      }`}>
                      {analysisResult.summary.restricted_entry_detected ? 'DETECTED' : 'NONE DETECTED'}
                    </p>
                  </div>
                  <div className="text-5xl opacity-70">
                    {analysisResult.summary.restricted_entry_detected ? '🚫' : '✅'}
                  </div>
                </div>
              </div>


              <div className="glass-card rounded-xl p-4">
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-gray-800">
                  <span>📹</span> Video Information
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">FPS</p>
                    <p className="font-semibold text-cyan-600">{analysisResult.video_data.VID_FPS}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Frame Size</p>
                    <p className="font-semibold text-purple-600">{analysisResult.video_data.PROCESSED_FRAME_SIZE}p</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600">Processing Time</p>
                    <p className="font-semibold text-pink-600">
                      {analysisResult.video_data.START_TIME} → {analysisResult.video_data.END_TIME}
                    </p>
                  </div>
                </div>
              </div>


              <div className="glass-card rounded-xl p-5 mt-4">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 gradient-text">
                  <span>🎨</span> Visual Analysis
                </h3>

                <div className="grid md:grid-cols-2 gap-4">

                  <div className="glass-card rounded-lg p-3 transition-all">
                    <h4 className="font-semibold mb-2 text-cyan-600 text-sm">📍 Heatmap</h4>
                    <div className="rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={`${API_BASE_URL}/visualizations/heatmap?request_id=${requestId}&t=${Date.now()}`}
                        alt="Crowd Heatmap"
                        className="w-full h-auto"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23222" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23666" font-size="16"%3EHeatmap not available%3C/text%3E%3C/svg%3E'
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-2">Stationary location analysis</p>
                  </div>


                  <div className="glass-card rounded-lg p-3 transition-all">
                    <h4 className="font-semibold mb-2 text-purple-600 text-sm">🔄 Movement Tracks</h4>
                    <div className="rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={`${API_BASE_URL}/visualizations/movement-tracks?request_id=${requestId}&t=${Date.now()}`}
                        alt="Movement Tracks"
                        className="w-full h-auto"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23222" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23666" font-size="16"%3EMovement tracks not available%3C/text%3E%3C/svg%3E'
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-2">Optical flow visualization</p>
                  </div>


                  <div className="glass-card rounded-lg p-3 transition-all">
                    <h4 className="font-semibold mb-2 text-pink-600 text-sm">📊 Crowd Analysis</h4>
                    <div className="rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={`${API_BASE_URL}/visualizations/crowd-analysis?request_id=${requestId}&t=${Date.now()}`}
                        alt="Crowd Analysis"
                        className="w-full h-auto"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23222" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23666" font-size="16"%3ECrowd analysis not available%3C/text%3E%3C/svg%3E%3C/svg%3E'
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-2">Time-series crowd data</p>
                  </div>


                  <div className="glass-card rounded-lg p-3 transition-all">
                    <h4 className="font-semibold mb-2 text-yellow-600 text-sm">⚡ Energy Distribution</h4>
                    <div className="rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={`${API_BASE_URL}/visualizations/energy-distribution?request_id=${requestId}&t=${Date.now()}`}
                        alt="Energy Distribution"
                        className="w-full h-auto"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23222" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23666" font-size="16"%3EEnergy distribution not available%3C/text%3E%3C/svg%3E'
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-2">Abnormal activity detection</p>
                  </div>
                </div>
              </div>


              <div className="glass-card rounded-xl p-5 mt-4">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 gradient-text">
                  <span>🎥</span> Processed Video
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  Watch the complete analysis with bounding boxes, tracking IDs, and real-time annotations
                </p>
                <div className="rounded-xl overflow-hidden border-2 border-purple-500/30 neon-glow">
                  <video
                    key={`processed-video-${Date.now()}`}
                    src={`${API_BASE_URL}/processed-video?request_id=${requestId}&t=${Date.now()}`}
                    controls
                    className="w-full bg-black"
                    onError={() => {
                      console.error('Error loading processed video');
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <p className="text-gray-600">
                    <span className="text-cyan-600">●</span> Bounding Boxes |
                    <span className="text-purple-600 ml-2">●</span> Tracking IDs |
                    <span className="text-pink-600 ml-2">●</span> Violation Markers
                  </p>
                  <a
                    href={`${API_BASE_URL}/processed-video?request_id=${requestId}`}
                    download="processed_video.mp4"
                    className="px-4 py-2 glass-card rounded-lg hover:bg-white/10 transition-all text-sm font-semibold neon-glow"
                  >
                    📥 Download Video
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>


        <div className="glass-card rounded-2xl p-6 lg:p-8 animate-slide-in-up" style={{ animationDelay: '0.4s' }}>
          <h2 className="text-2xl font-bold mb-6 text-center gradient-text">
            🎯 Powered by Advanced AI
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="feature-card text-center">
              <div className="text-4xl mb-3">🔍</div>
              <h3 className="font-bold text-base mb-2 text-cyan-600">Human Detection</h3>
              <p className="text-sm text-gray-700">YOLOv4-tiny neural network for real-time person detection</p>
            </div>
            <div className="feature-card text-center">
              <div className="text-4xl mb-3">🎯</div>
              <h3 className="font-bold text-base mb-2 text-purple-600">Object Tracking</h3>
              <p className="text-sm text-gray-700">Deep SORT algorithm for accurate multi-object tracking</p>
            </div>
            <div className="feature-card text-center">
              <div className="text-4xl mb-3">📏</div>
              <h3 className="font-bold text-base mb-2 text-pink-600">Distance Analysis</h3>
              <p className="text-sm text-gray-700">Real-time social distancing violation detection</p>
            </div>
            <div className="feature-card text-center">
              <div className="text-4xl mb-3">⚡</div>
              <h3 className="font-bold text-base mb-2 text-yellow-600">Energy Detection</h3>
              <p className="text-sm text-gray-700">Abnormal crowd activity monitoring using kinetic energy</p>
            </div>
          </div>
        </div>
      </div>


      <footer className="text-center mt-12 pb-6 text-gray-600 text-sm">
        <div className="h-px w-64 mx-auto bg-gradient-to-r from-transparent via-purple-400 to-transparent mb-4"></div>
        <p className="font-normal">
          Built with <span className="text-red-500">❤️</span> by <span className="text-purple-600 font-semibold">CIPHER</span> + <span className="text-indigo-600 font-semibold">Deep SORT</span> | Advanced AI Crowd Analysis System

        </p>
      </footer>
    </div >
  )
}

export default App
