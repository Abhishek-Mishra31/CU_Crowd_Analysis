import matplotlib
matplotlib.use('Agg')  # Use non-GUI backend
import matplotlib.pyplot as plt
import csv
import json
import sys
import os
import numpy as np
import pandas as pd
from math import ceil
from scipy.spatial.distance import euclidean

# Accept output directory from command line for concurrent processing
output_dir = sys.argv[1] if len(sys.argv) > 1 else 'processed_data'

video_data_path = os.path.join(output_dir, 'video_data.json')
with open(video_data_path, 'r') as file:
    data = json.load(file)
    data_record_frame = data["DATA_RECORD_FRAME"]
    frame_size = data["PROCESSED_FRAME_SIZE"]
    vid_fps = data["VID_FPS"]
    track_max_age = data["TRACK_MAX_AGE"]

track_max_age = 3
time_steps = data_record_frame/vid_fps
stationary_time = ceil(track_max_age / time_steps)
stationary_distance = frame_size * 0.01


tracks = []
movement_data_path = os.path.join(output_dir, 'movement_data.csv')
with open(movement_data_path, 'r') as file:
    reader = csv.reader(file, delimiter=',')
    for row in reader:
        # Lowered threshold to generate energy distribution for shorter videos
        # Original: stationary_time * 2, New: minimum 4 data points
        min_points = max(4, stationary_time) if 'stationary_time' in locals() else 4
        if len(row[3:]) > min_points:
            temp = []
            data = row[3:]
            for i in range(0, len(data), 2):
                temp.append([int(data[i]), int(data[i+1])])
            tracks.append(temp)

print("Tracks recorded: " + str(len(tracks)))

useful_tracks = []
for movement in tracks:
    check_index = stationary_time
    start_point = 0
    track = movement[:check_index]
    while check_index < len(movement):
        for i in movement[check_index:]:
            if euclidean(movement[start_point], i) > stationary_distance:
                track.append(i)
                start_point += 1
                check_index += 1
            else:
                start_point += 1
                check_index += 1
                break
        useful_tracks.append(track)
        track = movement[start_point:check_index]

energies = []
for movement in useful_tracks:
    for i in range(len(movement) - 1):
        speed = round(euclidean(movement[i], movement[i+1]) / time_steps , 2)
        energy = int(0.5 * speed ** 2)
        energies.append(energy)

c = len(energies)
print()
print("Useful movement data: " + str(c))

# Check if we have enough data to generate meaningful plot
if c == 0:
    print("No energy data available - creating placeholder plot")
    # Create a simple placeholder plot
    plt.figure(figsize=(10, 6))
    plt.text(0.5, 0.5, 'Insufficient movement data\nfor energy analysis', 
             ha='center', va='center', fontsize=16, color='gray')
    plt.xlim(0, 1)
    plt.ylim(0, 1)
    plt.axis('off')
    output_image_path = os.path.join(output_dir, 'energy_distribution.png')
    plt.savefig(output_image_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"Placeholder energy plot saved to: {output_image_path}")
elif c < 3:
    print("Limited energy data - creating simple plot")
    # Create a simple bar chart for very few data points
    plt.figure(figsize=(10, 6))
    plt.bar(range(len(energies)), energies, color='skyblue', alpha=0.7)
    plt.title('Energy Levels (Limited Data)', fontsize=14)
    plt.xlabel('Track Index', fontsize=12)
    plt.ylabel('Energy Level', fontsize=12)
    plt.grid(True, alpha=0.3)
    output_image_path = os.path.join(output_dir, 'energy_distribution.png')
    plt.savefig(output_image_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"Simple energy plot saved to: {output_image_path}")
else:
    # Normal processing for sufficient data
    energies = pd.Series(energies)
    x = { 'Energy': energies}
    df = pd.DataFrame(x)
    print("Kurtosis: " + str(df.kurtosis()[0]))
    print("Skew: " + str(df.skew()[0]))
    print("Summary of processed data")
    print(df.describe())
    print("Acceptable energy level (mean value ** 1.05) is " + str(int(df.Energy.mean() ** 1.05)))
    bins = np.linspace(int(min(energies)), int(max(energies)),100) 
    plt.xlim([min(energies)-5, max(energies)+5])
    plt.hist(energies, bins=bins, alpha=0.5)
    plt.title('Distribution of energies level')
    plt.xlabel('Energy level')
    plt.ylabel('Count')

    # Save plot as image instead of showing GUI window
    output_image_path = os.path.join(output_dir, 'energy_distribution.png')
    plt.savefig(output_image_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"Energy distribution plot saved to: {output_image_path}")

while df.skew()[0] > 7.5:
    print()
    c = len(energies)
    print("Useful movement data: " + str(c))
    energies = energies[abs(energies - np.mean(energies)) < 3 * np.std(energies)]
    x = { 'Energy': energies}
    df = pd.DataFrame(x)
    print("Outliers removed: " + str(c - df.Energy.count()))
    print("Kurtosis: " + str(df.kurtosis()[0]))
    print("Skew: " + str(df.skew()[0]))
    print("Summary of processed data")
    print(df.describe())
    print("Acceptable energy level (mean value ** 1.05) is " + str(int(df.Energy.mean() ** 1.05)))

    bins = np.linspace(int(min(energies)), int(max(energies)),100) 
    plt.xlim([min(energies)-5, max(energies)+5])
    plt.hist(energies, bins=bins, alpha=0.5)
    plt.title('Distribution of energies level')
    plt.xlabel('Energy level')
    plt.ylabel('Count')

    # Save cleaned plot as image
    output_image_path = os.path.join(output_dir, 'energy_distribution_cleaned.png')
    plt.savefig(output_image_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"Cleaned energy distribution plot saved to: {output_image_path}")
