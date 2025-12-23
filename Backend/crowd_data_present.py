import matplotlib
matplotlib.use('Agg')  # Use non-GUI backend
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import matplotlib.dates as mdates
import csv
import json
import datetime
import sys
import os
from math import floor

# Accept output directory from command line for concurrent processing
output_dir = sys.argv[1] if len(sys.argv) > 1 else 'processed_data'

# try block to handle exception
try:
    human_count = []
    violate_count = []
    restricted_entry = []
    abnormal_activity = []
    
    crowd_data_path = os.path.join(output_dir, 'crowd_data.csv')
    with open(crowd_data_path, 'r') as file:
        reader = csv.reader(file, delimiter=',')
        next(reader)  # Skip header
        for row in reader:
            if len(row) >= 5:  # Make sure row has enough columns
                human_count.append(int(row[1]))
                violate_count.append(int(row[2]))
                restricted_entry.append(bool(int(row[3])))
                abnormal_activity.append(bool(int(row[4])))
    
    # Check if we have data
    if not human_count:
        print("No crowd data available to visualize")
        exit(0)
    
    video_data_path = os.path.join(output_dir, 'video_data.json')
    with open(video_data_path, 'r') as file:
        data = json.load(file)
        data_record_frame = data["DATA_RECORD_FRAME"]
        is_cam = data["IS_CAM"]
        vid_fps = data["VID_FPS"]
        start_time = data["START_TIME"]
    
    start_time = datetime.datetime.strptime(start_time, "%d/%m/%Y, %H:%M:%S")
    time_steps = data_record_frame / vid_fps
    data_length = len(human_count)
    
    time_axis = []
    graph_height = max(human_count) if human_count else 1
    
    fig, ax = plt.subplots(figsize=(12, 6))
    time = start_time
    for i in range(data_length):
        time += datetime.timedelta(seconds=time_steps)
        time_axis.append(time)
        next_time = time + datetime.timedelta(seconds=time_steps)
        rect_width = mdates.date2num(next_time) - mdates.date2num(time)
        if restricted_entry[i]:
            ax.add_patch(patches.Rectangle((mdates.date2num(time), 0), rect_width, graph_height / 10, facecolor='red', fill=True))
        if abnormal_activity[i]:
            ax.add_patch(patches.Rectangle((mdates.date2num(time), 0), rect_width, graph_height / 20, facecolor='blue', fill=True))
    
    violate_line, = plt.plot(time_axis, violate_count, linewidth=3, label="Violation Count", color='orange')
    crowd_line, = plt.plot(time_axis, human_count, linewidth=3, label="Crowd Count", color='cyan')
    plt.title("Crowd Data versus Time", fontsize=16, fontweight='bold')
    plt.xlabel("Time", fontsize=12)
    plt.ylabel("Count", fontsize=12)
    plt.grid(True, alpha=0.3)
    re_legend = patches.Patch(color="red", label="Restricted Entry Detected")
    an_legend = patches.Patch(color="blue", label="Abnormal Crowd Activity Detected")
    plt.legend(handles=[crowd_line, violate_line, re_legend, an_legend], loc='best')
    plt.tight_layout()
    
    # Save plot as image instead of showing GUI window
    output_image_path = os.path.join(output_dir, 'crowd_analysis.png')
    plt.savefig(output_image_path, dpi=150, bbox_inches='tight')
    plt.close()
    print("Crowd analysis plot saved to: processed_data/crowd_analysis.png")

except FileNotFoundError as e:
    print(f"Error: Required file not found - {e}")
    print("Make sure analysis has completed and generated the necessary data files")
except Exception as e:
    print(f"Error generating crowd analysis plot: {e}")
    import traceback
    traceback.print_exc()
