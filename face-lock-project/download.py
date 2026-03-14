import urllib.request
import os

files = [
    "face_recognition_model-shard2",
    "ssd_mobilenetv1_model-shard1",
    "ssd_mobilenetv1_model-shard2"
]
base = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/"

for f in files:
    out = os.path.join("c:\\dumbass\\face-lock-project\\models", f)
    if not os.path.exists(out):
        print(f"Downloading {f}...")
        urllib.request.urlretrieve(base + f, out)
print("Done")
